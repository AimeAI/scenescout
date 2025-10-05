import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

/**
 * POST /api/reminders/set
 * Set a reminder for an event
 *
 * Body: {
 *   userId: string,
 *   eventId: string,
 *   eventData: object (full event details),
 *   remindAt: string (ISO timestamp),
 *   subscriptionId?: string (optional, for linking to push subscription)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const { userId, eventId, eventData, remindAt, subscriptionId } = body

    // Validation
    if (!userId || !eventId || !eventData || !remindAt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate remindAt is a future timestamp
    const remindAtDate = new Date(remindAt)
    if (remindAtDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Reminder time must be in the future' },
        { status: 400 }
      )
    }

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('event_reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('sent', false)
      .single()

    if (existing) {
      // Update existing reminder
      const { data, error } = await supabase
        .from('event_reminders')
        .update({
          remind_at: remindAt,
          event_data: eventData,
          subscription_id: subscriptionId
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to update reminder:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      console.log('✅ Reminder updated:', data.id)
      return NextResponse.json({
        success: true,
        reminderId: data.id,
        action: 'updated'
      })
    }

    // Create new reminder
    const { data, error } = await supabase
      .from('event_reminders')
      .insert({
        user_id: userId,
        event_id: eventId,
        event_data: eventData,
        remind_at: remindAt,
        subscription_id: subscriptionId,
        sent: false
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create reminder:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Reminder created:', data.id)

    return NextResponse.json({
      success: true,
      reminderId: data.id,
      action: 'created'
    })

  } catch (error) {
    console.error('❌ Set reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reminders/set
 * Cancel a reminder
 *
 * Body: { reminderId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()
    const { reminderId } = body

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: 'Reminder ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('event_reminders')
      .delete()
      .eq('id', reminderId)

    if (error) {
      console.error('❌ Failed to delete reminder:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Reminder deleted:', reminderId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Delete reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reminders/set?userId=xxx
 * Get all reminders for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('sent', false)
      .gte('remind_at', new Date().toISOString())
      .order('remind_at', { ascending: true })

    if (error) {
      console.error('❌ Failed to fetch reminders:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reminders: data
    })

  } catch (error) {
    console.error('❌ Get reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
