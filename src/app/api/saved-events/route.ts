export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { validateRequestBody, validateSearchParams, safeErrorResponse, checkRateLimit } from '@/lib/validation/api-validator'
import { sanitizeEvent, sanitizeEvents } from '@/lib/validation/sanitize'
import { queryCache, CACHE_KEYS, CACHE_TTL, invalidateCache } from '@/lib/query-cache'

// export const runtime = 'edge'

// Validation schema for saving events
const saveEventSchema = z.object({
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
  eventId: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long'),
  eventData: z.object({}).passthrough(), // Allow any event data structure
})

// Validation schema for deleting events
const deleteEventSchema = z.object({
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
  eventId: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long'),
})

// Validation schema for getting saved events
const getSavedEventsSchema = z.object({
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
})

// Rate limit: 30 save/delete operations per minute
const SAVED_EVENTS_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000,
}

/**
 * POST /api/saved-events
 * Save an event to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'saved-events', SAVED_EVENTS_RATE_LIMIT)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    // Validate request body
    const validation = await validateRequestBody(request, saveEventSchema)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString(),
        },
        { status: validation.status || 400 }
      )
    }

    const { userId, eventId, eventData } = validation.data!

    // Sanitize event data to prevent XSS
    const sanitizedEventData = sanitizeEvent(eventData)

    const supabase = getServiceSupabaseClient()

    const startTime = Date.now()

    // Upsert to saved_events table with sanitized data
    const { data, error } = await supabase
      .from('saved_events')
      .upsert({
        user_id: userId,
        event_id: eventId,
        event_data: sanitizedEventData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,event_id'
      })
      .select('id, user_id, event_id, created_at')
      .single()

    if (error) {
      console.error('❌ Failed to save event to database:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const queryTime = Date.now() - startTime
    if (queryTime > 500) {
      console.warn(`⚠️ Slow query detected: saved_events upsert took ${queryTime}ms`)
    }

    // Invalidate user's saved events cache
    invalidateCache(CACHE_KEYS.SAVED_EVENTS(userId))

    console.log(`✅ Event saved to database: ${eventId} for user ${userId} (${queryTime}ms)`)

    return NextResponse.json({
      success: true,
      savedEventId: data.id
    })

  } catch (error) {
    console.error('❌ Save event error:', error)
    return safeErrorResponse(error, 'Failed to save event')
  }
}

/**
 * DELETE /api/saved-events
 * Remove a saved event from the database
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, deleteEventSchema)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString(),
        },
        { status: validation.status || 400 }
      )
    }

    const { userId, eventId } = validation.data!
    const supabase = getServiceSupabaseClient()

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

    // Invalidate user's saved events cache
    invalidateCache(CACHE_KEYS.SAVED_EVENTS(userId))

    console.log(`✅ Event unsaved from database: ${eventId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Unsave event error:', error)
    return safeErrorResponse(error, 'Failed to delete saved event')
  }
}

/**
 * GET /api/saved-events?userId=xxx
 * Get all saved events for a user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate query parameters
    const validation = validateSearchParams(request, getSavedEventsSchema)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString(),
        },
        { status: validation.status || 400 }
      )
    }

    const { userId } = validation.data!

    // Check cache first
    const cacheKey = CACHE_KEYS.SAVED_EVENTS(userId)
    const cached = queryCache.get<any>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        events: cached.events,
        count: cached.count,
        cached: true
      })
    }

    const supabase = getServiceSupabaseClient()
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('saved_events')
      .select('id, user_id, event_id, event_data, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const queryTime = Date.now() - startTime
    if (queryTime > 500) {
      console.warn(`⚠️ Slow query detected: saved_events GET took ${queryTime}ms`)
    }

    // Sanitize event data before returning
    const sanitizedData = data?.map(item => ({
      ...item,
      event_data: sanitizeEvent(item.event_data)
    })) || []

    const response = {
      events: sanitizedData,
      count: sanitizedData.length
    }

    // Cache the result for 30 seconds
    queryCache.set(cacheKey, response, CACHE_TTL.SAVED_EVENTS)

    return NextResponse.json({
      success: true,
      ...response,
      cached: false,
      queryTime
    })

  } catch (error) {
    console.error('❌ Get saved events error:', error)
    return safeErrorResponse(error, 'Failed to fetch saved events')
  }
}
