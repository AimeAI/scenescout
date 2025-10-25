import { supabase } from './supabase'
import { type User, type AuthChangeEvent, type Session } from '@supabase/supabase-js'

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

export interface AuthError {
  message: string
  code?: string
  status?: number
}

// Session expiry detection
export const sessionHelpers = {
  // Check if session is expired or about to expire
  isSessionExpired: async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return true

      const expiresAt = session.expires_at
      if (!expiresAt) return false

      // Consider expired if less than 5 minutes remaining
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now

      return timeUntilExpiry < 300 // 5 minutes
    } catch {
      return true
    }
  },

  // Refresh session if expired or about to expire
  refreshSessionIfNeeded: async (): Promise<Session | null> => {
    try {
      const isExpired = await sessionHelpers.isSessionExpired()

      if (isExpired) {
        const { data: { session }, error } = await supabase.auth.refreshSession()

        if (error) {
          console.error('Failed to refresh session:', error)
          return null
        }

        return session
      }

      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Error refreshing session:', error)
      return null
    }
  },

  // Get time until session expires (in seconds)
  getTimeUntilExpiry: async (): Promise<number | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.expires_at) return null

      const now = Math.floor(Date.now() / 1000)
      return Math.max(0, session.expires_at - now)
    } catch {
      return null
    }
  }
}

// Auth state management
export const authHelpers = {
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      // Check session validity first
      const isExpired = await sessionHelpers.isSessionExpired()
      if (isExpired) return false

      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    } catch {
      return false
    }
  },

  // Get current session with automatic refresh
  getSession: async () => {
    try {
      return await sessionHelpers.refreshSessionIfNeeded()
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  },

  // Get user with profile
  getUserWithProfile: async (): Promise<AuthUser | null> => {
    try {
      // Refresh session if needed
      await sessionHelpers.refreshSessionIfNeeded()

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
    } catch (error) {
      console.error('Error getting user with profile:', error)
      return null
    }
  },

  // Sign in with email and password
  signInWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }

      // Migrate anonymous user data if exists
      if (data.user) {
        await migrateAnonymousData(data.user.id)
      }

      return data
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to sign in. Please check your connection and try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Sign up with email and password
  signUpWithEmail: async (email: string, password: string, metadata?: {
    name?: string
    username?: string
  }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }

      // Migrate anonymous user data if exists
      if (data.user) {
        await migrateAnonymousData(data.user.id)
      }

      return data
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to create account. Please check your connection and try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Sign in with OAuth providers
  signInWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }

      return data
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to sign in with OAuth. Please try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Sign out with full cleanup
  signOut: async () => {
    try {
      // Clear all user data
      await clearUserData()

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to sign out. Please try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to send password reset email. Please try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Update password
  updatePassword: async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to update password. Please try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  },

  // Update user metadata
  updateUser: async (attributes: {
    email?: string
    password?: string
    data?: Record<string, any>
  }) => {
    try {
      const { error } = await supabase.auth.updateUser(attributes)

      if (error) {
        throw {
          message: formatAuthError(error.message),
          code: error.status?.toString(),
          status: error.status
        } as AuthError
      }
    } catch (error) {
      if ((error as AuthError).code) throw error
      throw {
        message: 'Failed to update user information. Please try again.',
        code: 'NETWORK_ERROR'
      } as AuthError
    }
  }
}

// Format auth error messages to be user-friendly
function formatAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email or password is incorrect. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'Signups not allowed for this instance': 'New signups are currently disabled.',
    'Email rate limit exceeded': 'Too many attempts. Please try again later.',
    'Invalid Refresh Token': 'Your session has expired. Please sign in again.',
    'Token has expired or is invalid': 'Your session has expired. Please sign in again.'
  }

  return errorMap[message] || message
}

// Clear all user data (localStorage, session storage, etc.)
async function clearUserData(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Clear user ID
    localStorage.removeItem('user_id')

    // Clear saved events (keep for anonymous user)
    // We don't clear these as they should persist for anonymous users

    // Clear push subscription
    localStorage.removeItem('push_subscription_endpoint')
    localStorage.removeItem('push_permission_asked')

    // Clear any cached user data
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('user_') || key?.startsWith('profile_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // Emit event to notify components
    window.dispatchEvent(new Event('userSignedOut'))

    console.log('User data cleared successfully')
  } catch (error) {
    console.error('Error clearing user data:', error)
  }
}

// Migrate anonymous user data to authenticated user
async function migrateAnonymousData(userId: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const anonymousUserId = 'anonymous'

    // Get anonymous saved events from database
    const response = await fetch(`/api/saved-events?userId=${anonymousUserId}`)
    if (!response.ok) {
      console.log('No anonymous data to migrate')
      return
    }

    const { events } = await response.json()

    if (!events || events.length === 0) {
      console.log('No anonymous saved events to migrate')
      return
    }

    console.log(`Migrating ${events.length} saved events from anonymous to user ${userId}`)

    // Migrate each saved event
    for (const savedEvent of events) {
      await fetch('/api/saved-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          eventId: savedEvent.event_id,
          eventData: savedEvent.event_data
        })
      })
    }

    // Delete anonymous data
    for (const savedEvent of events) {
      await fetch('/api/saved-events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: anonymousUserId,
          eventId: savedEvent.event_id
        })
      })
    }

    // Update localStorage user_id
    localStorage.setItem('user_id', userId)

    console.log(`Successfully migrated ${events.length} events to user ${userId}`)
  } catch (error) {
    console.error('Error migrating anonymous data:', error)
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

// Auth event listeners with comprehensive session handling
export const setupAuthListeners = (callbacks?: {
  onSignedIn?: (session: Session) => void
  onSignedOut?: () => void
  onSessionExpired?: () => void
  onTokenRefreshed?: (session: Session) => void
  onError?: (error: AuthError) => void
}) => {
  return supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
    try {
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email)

        // Update user_id in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_id', session.user.id)
        }

        callbacks?.onSignedIn?.(session)
      }
      else if (event === 'SIGNED_OUT') {
        console.log('User signed out')

        // Clear user data and reset to anonymous
        await clearUserData()

        callbacks?.onSignedOut?.()
      }
      else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed successfully')
        callbacks?.onTokenRefreshed?.(session)
      }
      else if (event === 'USER_UPDATED' && session) {
        console.log('User data updated')
      }
      else if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery initiated')
      }
    } catch (error) {
      console.error('Auth state change error:', error)
      callbacks?.onError?.({
        message: 'An error occurred during authentication',
        code: 'AUTH_STATE_ERROR'
      })
    }
  })
}

// Check session health and notify if expired
export const checkSessionHealth = async (): Promise<{
  isValid: boolean
  expiresIn: number | null
  needsRefresh: boolean
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { isValid: false, expiresIn: null, needsRefresh: false }
    }

    const expiresAt = session.expires_at
    if (!expiresAt) {
      return { isValid: true, expiresIn: null, needsRefresh: false }
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = expiresAt - now

    return {
      isValid: expiresIn > 0,
      expiresIn: Math.max(0, expiresIn),
      needsRefresh: expiresIn < 300 // Less than 5 minutes
    }
  } catch (error) {
    console.error('Error checking session health:', error)
    return { isValid: false, expiresIn: null, needsRefresh: false }
  }
}
