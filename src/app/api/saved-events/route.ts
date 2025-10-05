import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

/**
 * POST /api/saved-events
 * Save an event to the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const { userId = 'anonymous', eventId, eventData } = body

    if (!eventId || !eventData) {
      return NextResponse.json(
        { success: false, error: 'eventId and eventData required' },
        { status: 400 }
      )
    }

    // Upsert to saved_events table
    const { data, error } = await supabase
      .from('saved_events')
      .upsert({
        user_id: userId,
        event_id: eventId,
        event_data: eventData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,event_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to save event to database:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Event saved to database: ${eventId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      savedEventId: data.id
    })

  } catch (error) {
    console.error('❌ Save event error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/saved-events
 * Remove a saved event from the database
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
      .from('saved_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) {
      console.error('❌ Failed to delete saved event:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Event unsaved from database: ${eventId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Unsave event error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/saved-events?userId=xxx
 * Get all saved events for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'anonymous'

    const { data, error } = await supabase
      .from('saved_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('❌ Get saved events error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
