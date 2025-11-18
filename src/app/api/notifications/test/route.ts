import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
 * POST /api/notifications/test
 * Send a test notification to a user or all subscriptions
 *
 * Body: {
 *   userId?: string (optional, sends to all if not provided),
 *   title?: string,
 *   body?: string,
 *   eventId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Configure web-push
    configureWebPush()

    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const {
      userId,
      title = '🎉 Test Notification from SceneScout!',
      body: notificationBody = 'This is a test notification. Your push notifications are working!',
      eventId = 'test-event'
    } = body

    // Fetch subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Failed to fetch subscriptions:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: userId
          ? `No subscriptions found for user: ${userId}`
          : 'No subscriptions found'
      }, { status: 404 })
    }

    console.log(`📬 Sending test notification to ${subscriptions.length} subscription(s)...`)

    // Send test notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const payload = JSON.stringify({
          title,
          body: notificationBody,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            eventId,
            url: eventId === 'test-event' ? '/' : `/events/${eventId}`,
            isTest: true
          },
          actions: [
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        })

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload
          )

          console.log(`✅ Test notification sent to ${sub.user_id || 'anonymous'}`)
          return { success: true, userId: sub.user_id }

        } catch (pushError: any) {
          console.error(`❌ Failed to send test notification:`, pushError)

          // If subscription is invalid/expired, delete it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)

            console.log(`🗑️ Deleted expired subscription ${sub.id}`)
          }

          return { success: false, userId: sub.user_id, error: pushError.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`📊 Test notifications: ${successful} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
      message: `Test notification sent to ${successful} subscription(s)`
    })

  } catch (error) {
    console.error('❌ Test notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/test?userId=xxx
 * Get subscription info for testing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, created_at, last_used_at')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscriptions: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('❌ Get subscriptions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
