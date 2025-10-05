import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/test/create-reminder-test-events
 * Create test events with reminders that trigger immediately
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()

    // 1. Get active push subscription
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .limit(1)

    if (subError) {
      return NextResponse.json(
        { success: false, error: 'Failed to get subscription: ' + subError.message },
        { status: 500 }
      )
    }

    const subscription = subscriptions?.[0]
    const userId = subscription?.user_id || 'anonymous'
    const subscriptionId = subscription?.id || null

    console.log(`📬 Using subscription: ${subscriptionId} for user ${userId}`)

    // 2. Create event happening in 24 hours
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const event24h = {
      id: `test-24h-${Date.now()}`,
      title: '🎸 Test Event - 24 Hour Reminder',
      date: in24Hours.toISOString().split('T')[0],
      start_date: in24Hours.toISOString().split('T')[0], // Used by cron
      time: in24Hours.toTimeString().split(' ')[0].substring(0, 5),
      venue_name: 'Test Venue - 24h',
      city_name: 'Test City',
      description: 'This event is 24 hours away. You should receive a reminder NOW.',
      image_url: '/icon-192x192.png',
      price_min: 25
    }

    // 3. Create event happening in 3 hours
    const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000)

    const event3h = {
      id: `test-3h-${Date.now()}`,
      title: '🎭 Test Event - 3 Hour Reminder',
      date: in3Hours.toISOString().split('T')[0],
      start_date: in3Hours.toISOString().split('T')[0], // Used by cron
      time: in3Hours.toTimeString().split(' ')[0].substring(0, 5),
      venue_name: 'Test Venue - 3h',
      city_name: 'Test City',
      description: 'This event is 3 hours away. You should receive a reminder NOW.',
      image_url: '/icon-192x192.png',
      price_min: 15
    }

    // 4. Save both events to saved_events table
    const { data: savedEvents, error: saveError } = await supabase
      .from('saved_events')
      .insert([
        {
          user_id: userId,
          event_id: event24h.id,
          event_data: event24h
        },
        {
          user_id: userId,
          event_id: event3h.id,
          event_data: event3h
        }
      ])
      .select()

    if (saveError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save events: ' + saveError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Saved ${savedEvents?.length} test events`)

    // Note: The cron job will detect these events and send reminders automatically
    // when you call GET /api/cron/reminders

    return NextResponse.json({
      success: true,
      message: 'Test events created with immediate reminders',
      events: [
        {
          id: event24h.id,
          title: event24h.title,
          eventTime: in24Hours.toISOString(),
          reminderTime: now.toISOString()
        },
        {
          id: event3h.id,
          title: event3h.title,
          eventTime: in3Hours.toISOString(),
          reminderTime: now.toISOString()
        }
      ],
      subscription: {
        id: subscriptionId,
        userId
      },
      nextStep: 'Run: curl http://localhost:3000/api/cron/reminders'
    })

  } catch (error) {
    console.error('❌ Create test events error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/test/create-reminder-test-events
 * Clean up test events
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()

    // Delete test events from saved_events
    const { error: savedError } = await supabase
      .from('saved_events')
      .delete()
      .like('event_id', 'test-%')

    if (savedError) {
      console.error('❌ Failed to delete test events:', savedError)
    }

    // Delete test reminders from event_reminders
    const { error: reminderError } = await supabase
      .from('event_reminders')
      .delete()
      .like('event_id', 'test-%')

    if (reminderError) {
      console.error('❌ Failed to delete test reminders:', reminderError)
    }

    console.log('✅ Cleaned up test events and reminders')

    return NextResponse.json({
      success: true,
      message: 'Test events cleaned up'
    })

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
