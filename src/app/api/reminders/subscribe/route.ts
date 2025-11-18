export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

// export const runtime = 'edge'

/**
 * POST /api/reminders/subscribe
 * Subscribe to push notifications
 *
 * Body: {
 *   subscription: PushSubscription object from browser,
 *   userId?: string (optional, defaults to anonymous)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()

    const { subscription, userId = 'anonymous' } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reminders/subscribe
 * Unsubscribe from push notifications
 *
 * Body: { endpoint: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint required' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
