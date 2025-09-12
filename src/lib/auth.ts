import { supabase } from './supabase'
import { type User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  profile?: {
    id: string
    name: string
    username?: string
    avatar_url?: string
    subscription_tier: 'free' | 'pro' | 'premium'
    subscription_status: 'active' | 'cancelled' | 'past_due'
  }
}

// Auth state management
export const authHelpers = {
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  },

  // Get current session
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Get user with profile
  getUserWithProfile: async (): Promise<AuthUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      ...user,
      profile
    } as AuthUser
  },

  // Sign in with email and password
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  // Sign up with email and password
  signUpWithEmail: async (email: string, password: string, metadata?: {
    name?: string
    username?: string
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  // Sign in with OAuth providers
  signInWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(error.message)
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      throw new Error(error.message)
    }
  },

  // Update password
  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      throw new Error(error.message)
    }
  },

  // Update user metadata
  updateUser: async (attributes: {
    email?: string
    password?: string
    data?: Record<string, any>
  }) => {
    const { error } = await supabase.auth.updateUser(attributes)

    if (error) {
      throw new Error(error.message)
    }
  }
}

// Profile management
export const profileHelpers = {
  // Get user profile
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  // Update user profile
  updateProfile: async (userId: string, updates: {
    name?: string
    username?: string
    bio?: string
    location?: string
    avatar_url?: string
    preferences?: Record<string, any>
  }) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      throw new Error(error.message)
    }
  },

  // Check if username is available
  isUsernameAvailable: async (username: string, excludeUserId?: string) => {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data } = await query

    return !data || data.length === 0
  },

  // Get user's subscription status
  getSubscriptionStatus: async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    return data
  }
}

// Subscription helpers
export const subscriptionHelpers = {
  // Check if user has active subscription
  hasActiveSubscription: async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    return !!data
  },

  // Check if user has specific subscription tier
  hasSubscriptionTier: async (userId: string, tier: 'pro' | 'premium'): Promise<boolean> => {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!data) return false

    // TODO: Map plan_id to tier based on your Stripe price IDs
    const tierMapping: Record<string, string> = {
      'price_pro_monthly': 'pro',
      'price_pro_yearly': 'pro',
      'price_premium_monthly': 'premium',
      'price_premium_yearly': 'premium'
    }

    return tierMapping[data.plan_id] === tier
  },

  // Get user's current plan
  getCurrentPlan: async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    return data
  }
}

// Permission helpers
export const permissionHelpers = {
  // Check if user can create events
  canCreateEvents: async (userId: string): Promise<boolean> => {
    const profile = await profileHelpers.getProfile(userId)
    return profile.subscription_tier === 'pro' || profile.subscription_tier === 'premium'
  },

  // Check if user can create unlimited plans
  canCreateUnlimitedPlans: async (userId: string): Promise<boolean> => {
    const profile = await profileHelpers.getProfile(userId)
    return profile.subscription_tier !== 'free'
  },

  // Check if user can access premium features
  canAccessPremiumFeatures: async (userId: string): Promise<boolean> => {
    const profile = await profileHelpers.getProfile(userId)
    return profile.subscription_tier === 'premium'
  },

  // Check if user is admin
  isAdmin: async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single()

    return !!data
  },

  // Check if user can moderate content
  canModerate: async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('admin_users')
      .select('permissions')
      .eq('user_id', userId)
      .single()

    return data?.permissions?.includes('moderate') ?? false
  }
}

// Auth event listeners
export const setupAuthListeners = () => {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session?.user.email)
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out')
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed')
    }
  })
}