import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { type Session } from '@supabase/supabase-js'
import {
  authHelpers,
  sessionHelpers,
  setupAuthListeners,
  checkSessionHealth,
  type AuthUser,
  type AuthError
} from '@/lib/auth'

interface UseAuthReturn {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionHealth: {
    isValid: boolean
    expiresIn: number | null
    needsRefresh: boolean
  }
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  error: AuthError | null
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [sessionHealth, setSessionHealth] = useState({
    isValid: false,
    expiresIn: null as number | null,
    needsRefresh: false
  })

  // Check session health periodically
  const updateSessionHealth = useCallback(async () => {
    const health = await checkSessionHealth()
    setSessionHealth(health)

    // If session is expired, clear user state
    if (!health.isValid && session) {
      setUser(null)
      setSession(null)
      setError({
        message: 'Your session has expired. Please sign in again.',
        code: 'SESSION_EXPIRED'
      })
    }
  }, [session])

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const refreshedSession = await sessionHelpers.refreshSessionIfNeeded()
      if (refreshedSession) {
        setSession(refreshedSession)
        setError(null)
      } else {
        setSession(null)
        setUser(null)
        setError({
          message: 'Failed to refresh session. Please sign in again.',
          code: 'REFRESH_FAILED'
        })
      }
    } catch (err) {
      setError({
        message: 'Failed to refresh session. Please sign in again.',
        code: 'REFRESH_ERROR'
      })
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      await authHelpers.signOut()
      setUser(null)
      setSession(null)
      setError(null)
      router.push('/')
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true)

        // Get session
        const currentSession = await authHelpers.getSession()
        setSession(currentSession)

        if (currentSession) {
          // Get user with profile
          const userWithProfile = await authHelpers.getUserWithProfile()
          setUser(userWithProfile)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error loading user:', err)
        setError({
          message: 'Failed to load user information',
          code: 'LOAD_ERROR'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Setup auth state listeners
  useEffect(() => {
    const { data: { subscription } } = setupAuthListeners({
      onSignedIn: (newSession) => {
        setSession(newSession)
        setError(null)
        // Reload user data
        authHelpers.getUserWithProfile().then(setUser)
      },
      onSignedOut: () => {
        setUser(null)
        setSession(null)
        setError(null)
      },
      onTokenRefreshed: (newSession) => {
        setSession(newSession)
        setError(null)
      },
      onError: (authError) => {
        setError(authError)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Check session health periodically (every 2 minutes)
  useEffect(() => {
    if (session) {
      updateSessionHealth()

      const interval = setInterval(() => {
        updateSessionHealth()
      }, 2 * 60 * 1000) // 2 minutes

      return () => clearInterval(interval)
    }
  }, [session, updateSessionHealth])

  // Auto-refresh session when it needs refresh
  useEffect(() => {
    if (sessionHealth.needsRefresh && session) {
      refreshSession()
    }
  }, [sessionHealth.needsRefresh, session, refreshSession])

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    sessionHealth,
    signOut,
    refreshSession,
    error
  }
}
