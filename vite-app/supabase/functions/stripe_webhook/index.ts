import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cryptoProvider = Deno.createHttpClient()

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const sigElements = signature.split(',')
  const timestamp = sigElements.find(el => el.startsWith('t='))?.substring(2)
  const signatures = sigElements.filter(el => el.startsWith('v1='))

  if (!timestamp || signatures.length === 0) {
    return false
  }

  const payload = `${timestamp}.${body}`
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  )

  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signatures.some(sig => {
    const providedSig = sig.substring(3) // Remove 'v1='
    return providedSig === expectedHex
  })
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Check for Stripe keys
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  
  if (!stripeKey || !webhookSecret) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `disabled: missing ${!stripeKey ? 'STRIPE_SECRET_KEY' : 'STRIPE_WEBHOOK_SECRET'}` 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!isValid) {
      throw new Error('Invalid webhook signature')
    }

    const event = JSON.parse(body)
    console.log(`Processing Stripe webhook: ${event.type}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const profileId = session.metadata?.profile_id

        if (!userId || !profileId) {
          console.error('Missing user_id or profile_id in session metadata')
          break
        }

        // Update user's subscription
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'pro',
            subscription_status: 'active',
            subscription_expires_at: null, // Set to null for active subscriptions
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update subscription:', error)
          throw error
        }

        console.log(`Updated subscription for user ${userId} to pro`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        const profileId = subscription.metadata?.profile_id

        if (!userId || !profileId) {
          console.error('Missing user_id or profile_id in subscription metadata')
          break
        }

        let subscriptionStatus = 'active'
        let subscriptionTier = 'pro'

        // Map Stripe statuses to our statuses
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          subscriptionStatus = 'cancelled'
          subscriptionTier = 'free'
        } else if (subscription.status === 'past_due') {
          subscriptionStatus = 'past_due'
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: subscriptionStatus,
            subscription_expires_at: subscription.current_period_end ? 
              new Date(subscription.current_period_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update subscription:', error)
          throw error
        }

        console.log(`Updated subscription for user ${userId} to ${subscriptionTier}/${subscriptionStatus}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        const profileId = subscription.metadata?.profile_id

        if (!userId || !profileId) {
          console.error('Missing user_id or profile_id in subscription metadata')
          break
        }

        // Downgrade to free
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'active',
            subscription_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to downgrade subscription:', error)
          throw error
        }

        console.log(`Downgraded subscription for user ${userId} to free`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})