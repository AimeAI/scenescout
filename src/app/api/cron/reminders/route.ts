import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max for Vercel

// Lazy initialize web-push to avoid build errors when env vars are not set
let webpushConfigured = false

function configureWebPush() {
  if (webpushConfigured) return

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@scenescout.app'

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )
    webpushConfigured = true
  }
}

/**
 * GET /api/cron/reminders
 * Cron job to check saved events and send reminders
 *
 * Runs every hour via Vercel Cron
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Configure web-push
    configureWebPush()

    // Verify this is called by Vercel Cron or in development
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error('❌ Unauthorized cron attempt')
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const supabase = getServiceSupabaseClient()

    console.log('🔔 Starting reminder check...')

    // Get all saved events from database
    const { data: savedEvents, error: fetchError } = await supabase
      .from('saved_events')
      .select('*')

    if (fetchError) {
      console.error('❌ Failed to fetch saved events:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!savedEvents || savedEvents.length === 0) {
      console.log('ℹ️ No saved events found')
      return NextResponse.json({
        success: true,
        message: 'No saved events to check',
        checked: 0,
        sent: 0
      })
    }

    console.log(`📋 Checking ${savedEvents.length} saved events...`)

    const now = new Date()
    const remindersToSend: Array<{
      savedEvent: any
      type: '24h' | '3h'
      timeUntil: number
    }> = []

    // Check each saved event for reminder opportunities
    for (const savedEvent of savedEvents) {
      const eventData = savedEvent.event_data

      const eventDateStr = eventData.start_date || eventData.date
      if (!eventDateStr) {
        console.log(`⚠️ Event ${eventData.id} has no date`)
        continue
      }

      // Combine date and time for accurate calculation
      const eventTime = eventData.time || eventData.start_time || '19:00'
      const eventDate = new Date(`${eventDateStr}T${eventTime}`)

      if (isNaN(eventDate.getTime())) {
        console.log(`⚠️ Event ${eventData.id} has invalid date: ${eventDateStr}T${eventTime}`)
        continue
      }

      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      console.log(`📅 Event ${eventData.title}: ${hoursUntil.toFixed(1)}h until event`)

      // 24-hour reminder (23-25 hours before event)
      if (hoursUntil >= 23 && hoursUntil <= 25) {
        // Check if 24h reminder already sent
        const { data: existing24h } = await supabase
          .from('event_reminders')
          .select('id')
          .eq('user_id', savedEvent.user_id)
          .eq('event_id', savedEvent.event_id)
          .eq('sent', true)
          .gte('remind_at', new Date(eventDate.getTime() - 25 * 60 * 60 * 1000).toISOString())
          .lte('remind_at', new Date(eventDate.getTime() - 23 * 60 * 60 * 1000).toISOString())

        if (!existing24h || existing24h.length === 0) {
          remindersToSend.push({
            savedEvent,
            type: '24h',
            timeUntil: hoursUntil
          })
        } else {
          console.log(`✓ 24h reminder already sent for event ${eventData.id}`)
        }
      }

      // 3-hour reminder (2.5-3.5 hours before event)
      if (hoursUntil >= 2.5 && hoursUntil <= 3.5) {
        // Check if 3h reminder already sent
        const { data: existing3h } = await supabase
          .from('event_reminders')
          .select('id')
          .eq('user_id', savedEvent.user_id)
          .eq('event_id', savedEvent.event_id)
          .eq('sent', true)
          .gte('remind_at', new Date(eventDate.getTime() - 3.5 * 60 * 60 * 1000).toISOString())
          .lte('remind_at', new Date(eventDate.getTime() - 2.5 * 60 * 60 * 1000).toISOString())

        if (!existing3h || existing3h.length === 0) {
          remindersToSend.push({
            savedEvent,
            type: '3h',
            timeUntil: hoursUntil
          })
        } else {
          console.log(`✓ 3h reminder already sent for event ${eventData.id}`)
        }
      }
    }

    console.log(`📬 Found ${remindersToSend.length} reminders to send`)

    if (remindersToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        checked: savedEvents.length,
        sent: 0
      })
    }

    // Send reminders
    let sentCount = 0
    let failedCount = 0

    for (const reminder of remindersToSend) {
      try {
        const { savedEvent, type, timeUntil } = reminder
        const eventData = savedEvent.event_data

        // Get push subscription for this user
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', savedEvent.user_id)

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`⚠️ No subscriptions for user ${savedEvent.user_id}`)
          continue
        }

        const reminderText = type === '24h'
          ? 'is tomorrow!'
          : 'is starting soon!'

        const payload = JSON.stringify({
          title: `🎉 ${eventData.title}`,
          body: `${eventData.title} ${reminderText} Don't miss it!`,
          icon: eventData.image_url || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            eventId: eventData.id,
            url: `/events/${eventData.id}`,
            type: `reminder-${type}`
          },
          actions: [
            {
              action: 'view',
              title: 'View Event'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        })

        // Send to all subscriptions for this user
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys
              },
              payload
            )

            console.log(`✅ Sent ${type} reminder to user ${savedEvent.user_id} for event ${eventData.id}`)
            sentCount++

            // Create reminder record to prevent duplicates
            await supabase
              .from('event_reminders')
              .insert({
                user_id: savedEvent.user_id,
                event_id: savedEvent.event_id,
                event_data: eventData,
                remind_at: now.toISOString(),
                subscription_id: subscription.id,
                sent: true
              })

          } catch (pushError: any) {
            console.error(`❌ Push failed for subscription ${subscription.id}:`, pushError.message)
            failedCount++

            // If subscription is expired, delete it
            if (pushError.statusCode === 410 || pushError.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id)

              console.log(`🗑️ Deleted expired subscription ${subscription.id}`)
            }
          }
        }

      } catch (error: any) {
        console.error(`❌ Error processing reminder:`, error)
        failedCount++
      }
    }

    const duration = Date.now() - startTime

    console.log(`✅ Reminder check complete: ${sentCount} sent, ${failedCount} failed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} reminders`,
      checked: savedEvents.length,
      sent: sentCount,
      failed: failedCount,
      duration: `${duration}ms`
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('❌ Cron reminder error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: `${duration}ms`
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/reminders
 * Manual trigger for testing (dev only)
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Manual trigger only available in development' },
      { status: 403 }
    )
  }

  // Call GET handler
  return GET(request)
}
