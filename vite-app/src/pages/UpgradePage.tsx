import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Star, Zap, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

export function UpgradePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { fetchProfile, user } = useAuthStore()

  const success = searchParams.get('success') === 'true'
  const cancelled = searchParams.get('cancelled') === 'true'

  useEffect(() => {
    // If successful, refresh the user profile to get updated subscription
    if (success && user) {
      fetchProfile(user.id)
    }
  }, [success, user, fetchProfile])

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to SceneScout Pro!
          </h1>
          <p className="text-xl text-white/60 mb-8">
            Your subscription has been activated. You now have access to all Pro features.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/profile')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Start Exploring
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show cancellation state
  if (cancelled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">
            Upgrade Cancelled
          </h1>
          <p className="text-xl text-white/60 mb-8">
            No worries! You can upgrade to Pro anytime from your profile or the pricing page.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              View Pricing
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Continue with Free
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleUpgrade = () => {
    navigate('/pricing')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Upgrade to SceneScout Pro
          </h1>
          <p className="text-xl text-white/60">
            Unlock premium features and never miss an event again
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Free</CardTitle>
              <CardDescription className="text-white/60">
                Perfect for casual event discovery
              </CardDescription>
              <div className="text-3xl font-bold text-white">$0</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center text-white/80">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  Save up to 10 events
                </div>
                <div className="flex items-center text-white/80">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  Create 1 event plan
                </div>
                <div className="flex items-center text-white/80">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  Basic event notifications
                </div>
                <div className="flex items-center text-white/80">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  Standard support
                </div>
              </div>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                <Star className="h-4 w-4 mr-1" />
                Most Popular
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-white">Pro</CardTitle>
              <CardDescription className="text-white/60">
                For serious event enthusiasts
              </CardDescription>
              <div className="text-3xl font-bold text-white">
                $9.99
                <span className="text-base text-white/60 font-normal">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  <strong>Unlimited saved events</strong>
                </div>
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  <strong>Unlimited event plans</strong>
                </div>
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  AI-powered recommendations
                </div>
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  Advanced notifications
                </div>
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  Early access to new features
                </div>
                <div className="flex items-center text-white">
                  <Zap className="h-5 w-5 text-purple-400 mr-3" />
                  Priority support
                </div>
              </div>
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white"
          >
            Continue with Free Plan
          </Button>
        </div>
      </div>
    </div>
  )
}
