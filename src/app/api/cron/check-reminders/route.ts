import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint to check and send reminders for upcoming events
 * Runs periodically via Vercel Cron Jobs
 *
 * Security: Protected by CRON_SECRET environment variable
 * Schedule: Configured in vercel.json
 *
 * Sends two types of reminders:
 * - 24 hours before event: "Event tomorrow!"
 * - 3 hours before event: "Event starts soon!"
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Step 1: Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('❌ [CRON-REMINDERS] CRON_SECRET not configured')
      return NextResponse.json({
        success: false,
        error: 'CRON_SECRET not configured'
      }, { status: 500 })
    }

    // Check bearer token or query param
    const providedSecret = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('secret')

    if (providedSecret !== cronSecret) {
      console.error('❌ [CRON-REMINDERS] Invalid cron secret')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    console.log('✅ [CRON-REMINDERS] Starting cron job')

    // Step 2: Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 3: Find events happening in 24 hours (first reminder window)
    console.log('🔍 [CRON-REMINDERS] Checking for events in 24-hour window')

    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in24HoursPlus30Min = new Date(in24Hours.getTime() + 30 * 60 * 1000) // 30-minute window

    const { data: events24h, error: error24h } = await supabase
      .from('events')
      .select('*')
      .gte('start_time', in24Hours.toISOString())
      .lte('start_time', in24HoursPlus30Min.toISOString())
      .eq('status', 'active')

    if (error24h) {
      console.error('❌ [CRON-REMINDERS] Error fetching 24h events:', error24h)
    }

    console.log(`📊 [CRON-REMINDERS] Found ${events24h?.length || 0} events in 24-hour window`)

    // Step 4: Find events happening in 3 hours (second reminder window)
    console.log('🔍 [CRON-REMINDERS] Checking for events in 3-hour window')

    const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const in3HoursPlus30Min = new Date(in3Hours.getTime() + 30 * 60 * 1000) // 30-minute window

    const { data: events3h, error: error3h } = await supabase
      .from('events')
      .select('*')
      .gte('start_time', in3Hours.toISOString())
      .lte('start_time', in3HoursPlus30Min.toISOString())
      .eq('status', 'active')

    if (error3h) {
      console.error('❌ [CRON-REMINDERS] Error fetching 3h events:', error3h)
    }

    console.log(`📊 [CRON-REMINDERS] Found ${events3h?.length || 0} events in 3-hour window`)

    // Step 5: Get all pending reminders for these events
    const allEventIds = [
      ...(events24h || []).map(e => e.id),
      ...(events3h || []).map(e => e.id)
    ]

    if (allEventIds.length === 0) {
      console.log('ℹ️ [CRON-REMINDERS] No events found in reminder windows')
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        stats: {
          events24h: 0,
          events3h: 0,
          remindersSent: 0,
          remindersFailed: 0,
          duration: `${Date.now() - startTime}ms`
        }
      })
    }

    const { data: pendingReminders, error: remindersError } = await supabase
      .from('user_reminders')
      .select('*, events(*)')
      .in('event_id', allEventIds)
      .eq('status', 'pending')
      .lte('reminder_time', new Date().toISOString())

    if (remindersError) {
      console.error('❌ [CRON-REMINDERS] Error fetching pending reminders:', remindersError)
      throw new Error(`Failed to fetch reminders: ${remindersError.message}`)
    }

    console.log(`📊 [CRON-REMINDERS] Found ${pendingReminders?.length || 0} pending reminders`)

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('ℹ️ [CRON-REMINDERS] No pending reminders found')
      return NextResponse.json({
        success: true,
        message: 'No pending reminders to send',
        stats: {
          events24h: events24h?.length || 0,
          events3h: events3h?.length || 0,
          remindersSent: 0,
          remindersFailed: 0,
          duration: `${Date.now() - startTime}ms`
        }
      })
    }

    // Step 6: Process each reminder
    console.log('🔔 [CRON-REMINDERS] Processing reminders...')

    let sentCount = 0
    let failedCount = 0
    const results = []

    for (const reminder of pendingReminders) {
      try {
        console.log(`📤 [CRON-REMINDERS] Processing reminder ${reminder.id} for event ${reminder.event_id}`)

        // Get user's push subscriptions
        const { data: pushSubscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', reminder.user_id)
          .eq('enabled', true)

        if (!pushSubscriptions || pushSubscriptions.length === 0) {
          console.log(`⚠️ [CRON-REMINDERS] No push subscriptions for user ${reminder.user_id}`)

          // Update reminder status to failed
          await supabase
            .from('user_reminders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', reminder.id)

          failedCount++
          results.push({
            reminderId: reminder.id,
            eventId: reminder.event_id,
            userId: reminder.user_id,
            success: false,
            reason: 'No push subscriptions found'
          })
          continue
        }

        // Send push notification to each subscription
        const webpush = await import('web-push')

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@scenescout.app'

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.error('❌ [CRON-REMINDERS] VAPID keys not configured')
          failedCount++
          results.push({
            reminderId: reminder.id,
            eventId: reminder.event_id,
            userId: reminder.user_id,
            success: false,
            reason: 'VAPID keys not configured'
          })
          continue
        }

        webpush.default.setVapidDetails(
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        )

        // Calculate time until event
        const eventStartTime = new Date(reminder.events.start_time)
        const hoursUntil = Math.round((eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60))
        const timeText = hoursUntil >= 24 ? 'tomorrow' : `in ${hoursUntil} hours`

        const payload = JSON.stringify({
          title: `🎭 ${reminder.events.title} starts ${timeText}!`,
          body: `at ${reminder.events.venue_name}`,
          icon: reminder.events.image_url || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: `reminder-${reminder.id}`,
          data: {
            eventId: reminder.event_id,
            reminderId: reminder.id,
            type: 'event_reminder',
            url: reminder.events.ticket_url || `/events/${reminder.event_id}`
          }
        })

        let pushSent = 0
        let pushFailed = 0

        for (const subscription of pushSubscriptions) {
          try {
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            }

            await webpush.default.sendNotification(pushSubscription, payload)
            pushSent++
            console.log(`✅ [CRON-REMINDERS] Sent push to subscription ${subscription.id}`)
          } catch (pushError: any) {
            console.error(`❌ [CRON-REMINDERS] Failed to send push to subscription ${subscription.id}:`, pushError.message)
            pushFailed++
          }
        }

        // Update reminder status
        if (pushSent > 0) {
          await supabase
            .from('user_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id)

          sentCount++
          results.push({
            reminderId: reminder.id,
            eventId: reminder.event_id,
            userId: reminder.user_id,
            success: true,
            pushSent,
            pushFailed
          })
        } else {
          await supabase
            .from('user_reminders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', reminder.id)

          failedCount++
          results.push({
            reminderId: reminder.id,
            eventId: reminder.event_id,
            userId: reminder.user_id,
            success: false,
            reason: 'All push notifications failed'
          })
        }

      } catch (error: any) {
        console.error(`❌ [CRON-REMINDERS] Error processing reminder ${reminder.id}:`, error)

        await supabase
          .from('user_reminders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', reminder.id)

        failedCount++
        results.push({
          reminderId: reminder.id,
          eventId: reminder.event_id,
          userId: reminder.user_id,
          success: false,
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime

    console.log(`✅ [CRON-REMINDERS] Cron job completed in ${duration}ms`)
    console.log(`📊 [CRON-REMINDERS] Sent: ${sentCount}, Failed: ${failedCount}`)

    return NextResponse.json({
      success: true,
      message: 'Reminder check completed',
      stats: {
        events24h: events24h?.length || 0,
        events3h: events3h?.length || 0,
        pendingReminders: pendingReminders.length,
        remindersSent: sentCount,
        remindersFailed: failedCount,
        duration: `${duration}ms`
      },
      results
    })

  } catch (error: any) {
    const duration = Date.now() - startTime

    console.error('❌ [CRON-REMINDERS] Cron job failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      duration: `${duration}ms`
    }, { status: 500 })
  }
}
