export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { queryCache, CACHE_KEYS, CACHE_TTL, invalidateCache } from '@/lib/query-cache'

// export const runtime = 'edge'

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

    const startTime = Date.now()

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('event_reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('sent', false)
      .maybeSingle()

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
        .select('id, user_id, event_id, remind_at, sent, created_at')
        .single()

      if (error) {
        console.error('❌ Failed to update reminder:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      const queryTime = Date.now() - startTime
      if (queryTime > 500) {
        console.warn(`⚠️ Slow query detected: reminder update took ${queryTime}ms`)
      }

      // Invalidate user's reminders cache
      invalidateCache(CACHE_KEYS.USER_REMINDERS(userId))

      console.log(`✅ Reminder updated: ${data.id} (${queryTime}ms)`)
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
      .select('id, user_id, event_id, remind_at, sent, created_at')
      .single()

    if (error) {
      console.error('❌ Failed to create reminder:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const queryTime = Date.now() - startTime
    if (queryTime > 500) {
      console.warn(`⚠️ Slow query detected: reminder insert took ${queryTime}ms`)
    }

    // Invalidate user's reminders cache
    invalidateCache(CACHE_KEYS.USER_REMINDERS(userId))

    console.log(`✅ Reminder created: ${data.id} (${queryTime}ms)`)

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

    // Get user_id before deleting for cache invalidation
    const { data: reminder } = await supabase
      .from('event_reminders')
      .select('user_id')
      .eq('id', reminderId)
      .single()

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

    // Invalidate user's reminders cache if we found the user_id
    if (reminder?.user_id) {
      invalidateCache(CACHE_KEYS.USER_REMINDERS(reminder.user_id))
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

    // Check cache first
    const cacheKey = CACHE_KEYS.USER_REMINDERS(userId)
    const cached = queryCache.get<any>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        reminders: cached.reminders,
        cached: true
      })
    }

    const startTime = Date.now()

    const { data, error } = await supabase
      .from('event_reminders')
      .select('id, user_id, event_id, event_data, remind_at, sent, created_at')
      .eq('user_id', userId)
      .eq('sent', false)
      .gte('remind_at', new Date().toISOString())
      .order('remind_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('❌ Failed to fetch reminders:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const queryTime = Date.now() - startTime
    if (queryTime > 500) {
      console.warn(`⚠️ Slow query detected: reminders GET took ${queryTime}ms`)
    }

    const response = { reminders: data }

    // Cache the result for 60 seconds
    queryCache.set(cacheKey, response, CACHE_TTL.USER_REMINDERS)

    return NextResponse.json({
      success: true,
      ...response,
      cached: false,
      queryTime
    })

  } catch (error) {
    console.error('❌ Get reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
