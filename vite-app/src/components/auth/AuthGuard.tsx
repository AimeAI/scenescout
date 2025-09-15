import { useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

interface AuthGuardProps {
  requireSubscription?: 'pro'
  requireAdmin?: boolean
}

export function AuthGuard({ requireSubscription, requireAdmin }: AuthGuardProps) {
  const location = useLocation()
  const { user, profile, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="text-gray-400">You need to be signed in to access this page.</p>
          <Button asChild>
            <Link to={`/auth?next=${location.pathname}`}>
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Check admin requirements (for Pro subscribers or admin users)
  if (requireAdmin) {
    const isAdmin = profile?.subscription_tier === 'pro' || (profile as any)?.is_admin === true
    if (!isAdmin) {
      return (
        <div className="h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access Required</h1>
            <p className="text-gray-400">
              This page is restricted to administrators and Pro subscribers only.
            </p>
            <div className="space-y-3 pt-4">
              <Button asChild className="bg-purple-600 hover:bg-purple-700 w-full">
                <Link to="/pricing">
                  Upgrade to Pro
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-gray-700 text-white hover:bg-gray-800 w-full">
                <Link to="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }

  // Check subscription requirements
  if (requireSubscription === 'pro') {
    if (profile?.subscription_tier !== 'pro') {
      return (
        <div className="h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Upgrade to Pro Required</h1>
            <p className="text-gray-400">
              This feature is available to Pro subscribers only. Upgrade now to unlock unlimited access.
            </p>
            <div className="space-y-3 pt-4">
              <Button asChild className="bg-purple-600 hover:bg-purple-700 w-full">
                <Link to="/pricing">
                  Upgrade to Pro
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-gray-700 text-white hover:bg-gray-800 w-full">
                <Link to="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }

  return <Outlet />
}
