export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { validateRequestBody, safeErrorResponse, checkRateLimit } from '@/lib/validation/api-validator'
import { sanitizeEvent } from '@/lib/validation/sanitize'

// export const runtime = 'edge'

// Validation schema for creating reminders
const createReminderSchema = z.object({
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
  eventId: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long'),
  eventData: z.object({
    date: z.string().optional(),
    start_date: z.string().optional(),
    time: z.string().optional(),
    start_time: z.string().optional(),
  }).passthrough(), // Allow additional fields
  subscriptionId: z.string()
    .max(500, 'Subscription ID too long')
    .optional(),
}).refine(
  (data) => data.eventData.date || data.eventData.start_date,
  'Event must have a date field'
)

// Rate limit: 20 reminders per minute per user
const REMINDER_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000,
}

/**
 * POST /api/reminders/create
 * Create reminder(s) for an event
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'reminders-create', REMINDER_RATE_LIMIT)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    // Validate request body
    const validation = await validateRequestBody(request, createReminderSchema)
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

    const { userId, eventId, eventData, subscriptionId } = validation.data!

    // Sanitize event data to prevent XSS
    const sanitizedEventData = sanitizeEvent(eventData)

    const supabase = getServiceSupabaseClient()

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

    // Use sanitized event data for reminders
    const sanitizedReminders = reminders.map(r => ({
      ...r,
      event_data: sanitizedEventData
    }))

    // Insert reminders
    const { data, error } = await supabase
      .from('event_reminders')
      .insert(sanitizedReminders)
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
    return safeErrorResponse(error, 'Failed to create reminders')
  }
}

// Validation schema for deleting reminders
const deleteReminderSchema = z.object({
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
  eventId: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long'),
})

/**
 * DELETE /api/reminders/create
 * Delete all reminders for an event
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, deleteReminderSchema)
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
    return safeErrorResponse(error, 'Failed to delete reminders')
  }
}
