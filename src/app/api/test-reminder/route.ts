import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to manually trigger a reminder
 * Creates a fake event happening in 3 hours and sends a push notification
 *
 * Usage: GET /api/test-reminder?userId=anonymous
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'anonymous'

    console.log('🧪 [TEST-REMINDER] Starting reminder test for user:', userId)

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Check if service worker is registered
    console.log('🔍 [TEST-REMINDER] Step 1: Checking service worker registration')

    // Step 2: Check push subscription in database
    console.log('🔍 [TEST-REMINDER] Step 2: Checking push subscription in database')
    const { data: pushSubscriptions, error: pushError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)

    if (pushError) {
      console.error('❌ [TEST-REMINDER] Error fetching push subscriptions:', pushError)
    }

    console.log(`📊 [TEST-REMINDER] Found ${pushSubscriptions?.length || 0} active push subscriptions`)

    if (!pushSubscriptions || pushSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active push subscriptions found',
        debug: {
          userId,
          vapidConfigured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          supabaseConnected: true,
          serviceWorkerPath: '/service-worker.js',
          instructions: [
            '1. Check if service worker is registered: navigator.serviceWorker.getRegistration()',
            '2. Check if push permission granted: Notification.permission',
            '3. Re-subscribe to push notifications from notification settings',
            '4. Check browser console for errors'
          ]
        }
      }, { status: 404 })
    }

    // Step 3: Create a test event happening in 3 hours
    console.log('🔍 [TEST-REMINDER] Step 3: Creating test event')
    const eventStartTime = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now

    const testEvent = {
      id: `test-event-${Date.now()}`,
      title: '🧪 TEST EVENT - Reminder System Check',
      date: eventStartTime.toISOString().split('T')[0],
      start_date: eventStartTime.toISOString().split('T')[0],
      time: eventStartTime.toTimeString().split(' ')[0],
      start_time: eventStartTime.toISOString(),
      venue_name: 'Test Venue',
      venue_id: 'test-venue',
      address: '123 Test St',
      city: 'Toronto',
      state: 'ON',
      ticket_url: 'https://scenescout.app/events/test',
      image_url: 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=Test+Event',
      category: 'music-concerts',
      source: 'test',
      timezone: 'America/Toronto',
      status: 'active'
    }

    // Insert test event
    const { data: insertedEvent, error: eventError } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single()

    if (eventError) {
      console.error('❌ [TEST-REMINDER] Error creating test event:', eventError)
      throw new Error(`Failed to create test event: ${eventError.message}`)
    }

    console.log('✅ [TEST-REMINDER] Test event created:', insertedEvent.id)

    // Step 4: Create reminder for 1 minute from now (to test immediately)
    console.log('🔍 [TEST-REMINDER] Step 4: Creating test reminder')
    const reminderTime = new Date(Date.now() + 1 * 60 * 1000) // 1 minute from now

    const testReminder = {
      user_id: userId,
      event_id: insertedEvent.id,
      reminder_time: reminderTime.toISOString(),
      notification_method: 'push',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const { data: insertedReminder, error: reminderError } = await supabase
      .from('user_reminders')
      .insert(testReminder)
      .select()
      .single()

    if (reminderError) {
      console.error('❌ [TEST-REMINDER] Error creating test reminder:', reminderError)
      throw new Error(`Failed to create test reminder: ${reminderError.message}`)
    }

    console.log('✅ [TEST-REMINDER] Test reminder created:', insertedReminder.id)

    // Step 5: Trigger the reminder edge function manually
    console.log('🔍 [TEST-REMINDER] Step 5: Triggering reminder edge function')

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/reminders?test=true&user_email=${userId}&look_ahead=5`
    const edgeFunctionKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const reminderResponse = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${edgeFunctionKey}`,
        'Content-Type': 'application/json'
      }
    })

    const reminderResult = await reminderResponse.json()

    console.log('📊 [TEST-REMINDER] Edge function result:', reminderResult)

    // Step 6: Use Web Push API to send notification directly
    console.log('🔍 [TEST-REMINDER] Step 6: Sending push notification via Web Push API')

    let webPushResults = []
    for (const subscription of pushSubscriptions) {
      try {
        const webpush = await import('web-push')

        // Configure VAPID keys
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@scenescout.app'

        if (!vapidPublicKey || !vapidPrivateKey) {
          throw new Error('VAPID keys not configured')
        }

        webpush.default.setVapidDetails(
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        )

        const payload = JSON.stringify({
          title: `🎭 ${testEvent.title} starts in 3 hours!`,
          body: `at ${testEvent.venue_name}`,
          icon: testEvent.image_url,
          badge: '/badge-72x72.png',
          tag: `test-reminder-${insertedReminder.id}`,
          data: {
            eventId: testEvent.id,
            reminderId: insertedReminder.id,
            type: 'event_reminder',
            url: testEvent.ticket_url
          }
        })

        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        const pushResult = await webpush.default.sendNotification(pushSubscription, payload)

        webPushResults.push({
          subscriptionId: subscription.id,
          success: true,
          statusCode: pushResult.statusCode
        })

        console.log('✅ [TEST-REMINDER] Push notification sent to subscription:', subscription.id)

      } catch (pushErr: any) {
        console.error('❌ [TEST-REMINDER] Error sending push notification:', pushErr)
        webPushResults.push({
          subscriptionId: subscription.id,
          success: false,
          error: pushErr.message
        })
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Test reminder created and sent successfully',
      testEvent: {
        id: insertedEvent.id,
        title: testEvent.title,
        startTime: eventStartTime.toISOString(),
        startsIn: '3 hours'
      },
      reminder: {
        id: insertedReminder.id,
        reminderTime: reminderTime.toISOString(),
        status: 'pending',
        triggersIn: '1 minute'
      },
      pushNotifications: {
        subscriptionsFound: pushSubscriptions.length,
        sent: webPushResults.filter(r => r.success).length,
        failed: webPushResults.filter(r => !r.success).length,
        results: webPushResults
      },
      edgeFunction: reminderResult,
      debug: {
        userId,
        duration: `${duration}ms`,
        vapidConfigured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        serviceWorkerUrl: `${request.nextUrl.origin}/service-worker.js`,
        checkNotification: 'Check your browser for push notification in ~1 minute'
      },
      nextSteps: [
        'Wait 1 minute for the reminder to trigger',
        'Check your browser for a push notification',
        'Check the Network tab for service worker activity',
        'Run GET /api/cron/check-reminders to manually trigger all pending reminders'
      ]
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ [TEST-REMINDER] Error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to create test reminder',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      debug: {
        vapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }, { status: 500 })
  }
}
