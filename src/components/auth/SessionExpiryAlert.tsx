'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, LogOut, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function SessionExpiryAlert() {
  const router = useRouter()
  const { sessionHealth, refreshSession, signOut, isAuthenticated } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Show alert if session is about to expire or has expired
    if (isAuthenticated && (!sessionHealth.isValid || sessionHealth.needsRefresh)) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [sessionHealth, isAuthenticated])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await refreshSession()
      setIsVisible(false)
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsVisible(false)
  }

  const handleContinueAnonymous = () => {
    signOut() // This will clear auth and allow anonymous mode
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  const isExpired = !sessionHealth.isValid
  const expiresInMinutes = sessionHealth.expiresIn
    ? Math.ceil(sessionHealth.expiresIn / 60)
    : 0

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top">
      <Alert variant={isExpired ? 'destructive' : 'default'} className="shadow-lg border-2">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="flex items-center justify-between pr-6">
          {isExpired ? 'Session Expired' : 'Session Expiring Soon'}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-background/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertTitle>
        <AlertDescription className="space-y-3 mt-2">
          <p className="text-sm">
            {isExpired
              ? 'Your session has expired. Please sign in again to continue or browse as an anonymous user.'
              : `Your session will expire in ${expiresInMinutes} minute${expiresInMinutes !== 1 ? 's' : ''}. Would you like to stay signed in?`}
          </p>

          <div className="flex flex-wrap gap-2">
            {isExpired ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => router.push('/login')}
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleContinueAnonymous}
                  className="flex-1"
                >
                  Continue Anonymous
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex-1"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Stay Signed In'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isRefreshing}
                >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
