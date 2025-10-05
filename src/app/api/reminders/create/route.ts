import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

/**
 * POST /api/reminders/create
 * Create reminder(s) for an event
 *
 * Body: {
 *   userId: string (optional, defaults to 'anonymous'),
 *   eventId: string,
 *   eventData: any,
 *   subscriptionId?: string (optional, from push_subscriptions)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const { userId = 'anonymous', eventId, eventData, subscriptionId } = body

    if (!eventId || !eventData) {
      return NextResponse.json(
        { success: false, error: 'eventId and eventData required' },
        { status: 400 }
      )
    }

    // Get event date/time
    const eventDate = eventData.date || eventData.start_date
    if (!eventDate) {
      return NextResponse.json(
        { success: false, error: 'Event must have a date' },
        { status: 400 }
      )
    }

    const eventTime = eventData.time || eventData.start_time || '19:00' // Default to 7pm if no time

    // Parse event datetime
    const eventDateTime = new Date(`${eventDate}T${eventTime}`)

    if (isNaN(eventDateTime.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid event date/time' },
        { status: 400 }
      )
    }

    // Calculate reminder times
    const oneDayBefore = new Date(eventDateTime)
    oneDayBefore.setHours(eventDateTime.getHours() - 24)

    const threeHoursBefore = new Date(eventDateTime)
    threeHoursBefore.setHours(eventDateTime.getHours() - 3)

    // Only create reminders that are in the future
    const now = new Date()
    const reminders = []

    if (oneDayBefore > now) {
      reminders.push({
        user_id: userId,
        event_id: eventId,
        event_data: eventData,
        remind_at: oneDayBefore.toISOString(),
        subscription_id: subscriptionId || null,
        sent: false
      })
    }

    if (threeHoursBefore > now) {
      reminders.push({
        user_id: userId,
        event_id: eventId,
        event_data: eventData,
        remind_at: threeHoursBefore.toISOString(),
        subscription_id: subscriptionId || null,
        sent: false
      })
    }

    if (reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Event is too soon, no reminders created',
        created: 0
      })
    }

    // Insert reminders
    const { data, error } = await supabase
      .from('event_reminders')
      .insert(reminders)
      .select()

    if (error) {
      console.error('❌ Failed to create reminders:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Created ${data.length} reminder(s) for event ${eventId}`)

    return NextResponse.json({
      success: true,
      created: data.length,
      reminders: data.map(r => ({
        id: r.id,
        remind_at: r.remind_at
      }))
    })

  } catch (error) {
    console.error('❌ Create reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reminders/create
 * Delete all reminders for an event
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const { userId = 'anonymous', eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('event_reminders')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) {
      console.error('❌ Failed to delete reminders:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Deleted reminders for event ${eventId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Delete reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
