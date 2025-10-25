import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { pushSubscriptionSchema } from '@/lib/validation/schemas'

// Remove edge runtime - incompatible with validation middleware
// export const runtime = 'edge'

// Validation schema for push subscription
const subscribeSchema = z.object({
  subscription: pushSubscriptionSchema,
  userId: z.string()
    .max(500, 'User ID too long')
    .default('anonymous'),
})

// Validation schema for unsubscribe
const unsubscribeSchema = z.object({
  endpoint: z.string()
    .url('Invalid endpoint')
    .max(2000, 'Endpoint too long'),
})

// Rate limit: 10 subscriptions per minute
const SUBSCRIBE_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000,
}

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body directly
    const body = await request.json()
    const validation = subscribeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid request',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { subscription, userId } = validation.data
    const supabase = getServiceSupabaseClient()

    // Extract keys from subscription
    const keys = {
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || ''
    }

    // Upsert subscription (update if exists, insert if new)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys,
        user_agent: request.headers.get('user-agent') || '',
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to save subscription:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Push subscription saved:', data.id)

    return NextResponse.json({
      success: true,
      subscriptionId: data.id
    })

  } catch (error) {
    console.error('❌ Subscribe error:', error)
    return safeErrorResponse(error, 'Failed to subscribe to notifications')
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, unsubscribeSchema)
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

    const { endpoint } = validation.data!
    const supabase = getServiceSupabaseClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('❌ Failed to delete subscription:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Push subscription deleted')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Unsubscribe error:', error)
    return safeErrorResponse(error, 'Failed to unsubscribe from notifications')
  }
}
