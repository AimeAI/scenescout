import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Configure web-push (add these to .env.local)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@scenescout.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

/**
 * GET /api/reminders/send
 * Cron job to send pending reminders
 *
 * Runs every 15 minutes via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron or in development
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const supabase = getServiceSupabaseClient()

    // Fetch pending reminders (due within next 15 mins)
    const now = new Date()
    const future = new Date(now.getTime() + 15 * 60 * 1000) // +15 mins

    const { data: reminders, error: fetchError } = await supabase
      .from('event_reminders')
      .select(`
        *,
        push_subscriptions!inner (
          endpoint,
          keys
        )
      `)
      .lte('remind_at', future.toISOString())
      .eq('sent', false)
      .limit(100) // Process 100 at a time

    if (fetchError) {
      console.error('❌ Failed to fetch reminders:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!reminders || reminders.length === 0) {
      console.log('✅ No pending reminders')
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No pending reminders'
      })
    }

    console.log(`📬 Processing ${reminders.length} reminders...`)

    const results = await Promise.allSettled(
      reminders.map(async (reminder) => {
        const event = reminder.event_data
        const subscription = reminder.push_subscriptions

        // Construct push notification payload
        const payload = JSON.stringify({
          title: `Reminder: ${event.title}`,
          body: `${event.title} is coming up soon at ${event.venue_name || 'the venue'}!`,
          icon: event.image_url || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            eventId: event.id,
            url: `/events/${event.id}`
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

        // Send push notification
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            payload
          )

          // Mark as sent
          await supabase
            .from('event_reminders')
            .update({ sent: true })
            .eq('id', reminder.id)

          console.log(`✅ Sent reminder ${reminder.id}`)
          return { success: true, id: reminder.id }

        } catch (pushError: any) {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, pushError)

          // If subscription is invalid/expired, delete it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', reminder.subscription_id)

            console.log(`🗑️ Deleted expired subscription ${reminder.subscription_id}`)
          }

          return { success: false, id: reminder.id, error: pushError.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`📊 Sent ${successful} reminders, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: reminders.length
    })

  } catch (error) {
    console.error('❌ Send reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
