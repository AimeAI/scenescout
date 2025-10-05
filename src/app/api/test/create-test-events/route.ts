import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

/**
 * POST /api/test/create-test-events
 * Create test saved events for reminder testing (dev only)
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Test endpoint only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { userId = 'test-user' } = body

    const supabase = getServiceSupabaseClient()
    const now = new Date()

    // Create test events at different times
    const testEvents = [
      {
        id: 'test-24h',
        title: 'Event in 24 Hours',
        start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        venue_name: 'Test Venue 1',
        city_name: 'Toronto',
        image_url: '/icon-192x192.png'
      },
      {
        id: 'test-3h',
        title: 'Event in 3 Hours',
        start_date: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        venue_name: 'Test Venue 2',
        city_name: 'Toronto',
        image_url: '/icon-192x192.png'
      },
      {
        id: 'test-1h',
        title: 'Event in 1 Hour (No Reminder)',
        start_date: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        venue_name: 'Test Venue 3',
        city_name: 'Toronto',
        image_url: '/icon-192x192.png'
      },
      {
        id: 'test-tomorrow',
        title: 'Event Tomorrow at 8pm',
        start_date: new Date(now.getTime() + 32 * 60 * 60 * 1000).toISOString(),
        venue_name: 'Test Venue 4',
        city_name: 'Toronto',
        image_url: '/icon-192x192.png'
      }
    ]

    // Delete existing test events for this user
    await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', userId)
      .in('event_id', testEvents.map(e => e.id))

    // Insert test events
    const { data, error } = await supabase
      .from('saved_events')
      .insert(
        testEvents.map(event => ({
          user_id: userId,
          event_id: event.id,
          event_data: event
        }))
      )
      .select()

    if (error) {
      console.error('❌ Failed to create test events:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Created ${testEvents.length} test events for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Created ${testEvents.length} test events`,
      events: testEvents.map(e => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        hoursUntil: Math.round((new Date(e.start_date).getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10
      })),
      userId
    })

  } catch (error: any) {
    console.error('❌ Create test events error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/test/create-test-events
 * Clean up test events (dev only)
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Test endpoint only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { userId = 'test-user' } = body

    const supabase = getServiceSupabaseClient()

    // Delete test events
    await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', userId)
      .like('event_id', 'test-%')

    // Also clean up any test reminders
    await supabase
      .from('event_reminders')
      .delete()
      .eq('user_id', userId)
      .like('event_id', 'test-%')

    console.log(`✅ Cleaned up test events for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Test events cleaned up'
    })

  } catch (error: any) {
    console.error('❌ Clean up test events error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
