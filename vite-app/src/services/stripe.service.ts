import { supabase } from '@/lib/supabaseClient'

export interface CheckoutSession {
  success: boolean
  url?: string
  sessionId?: string
  message?: string
  error?: string
}

export const stripeService = {
  // Create a checkout session for Pro subscription
  async createCheckoutSession(planId: 'pro-monthly' | 'pro-yearly' = 'pro-monthly'): Promise<CheckoutSession> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Please sign in to upgrade your subscription')
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ planId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      return result
    } catch (error) {
      console.error('Checkout error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  // Create checkout session via Supabase function
  async createCheckoutSessionSupabase(planId: 'pro-monthly' | 'pro-yearly' = 'pro-monthly'): Promise<CheckoutSession> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Please sign in to upgrade your subscription')
      }

      const { data, error } = await supabase.functions.invoke('stripe_checkout', {
        body: { planId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Checkout error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  // Redirect to checkout
  async redirectToCheckout(planId: 'pro-monthly' | 'pro-yearly' = 'pro-monthly'): Promise<void> {
    const result = await this.createCheckoutSessionSupabase(planId)
    
    if (result.success && result.url) {
      window.location.href = result.url
    } else {
      throw new Error(result.error || 'Failed to create checkout session')
    }
  },

  // Check subscription status
  async getSubscriptionStatus(): Promise<{ isPro: boolean; status?: string; expiresAt?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { isPro: false }
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Failed to fetch subscription status:', error)
        return { isPro: false }
      }

      return {
        isPro: profile?.subscription_tier === 'pro',
        status: profile?.subscription_status || undefined,
        expiresAt: profile?.subscription_expires_at || undefined
      }
    } catch (error) {
      console.error('Subscription status error:', error)
      return { isPro: false }
    }
  }
}