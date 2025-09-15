import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/auth'
import { stripeService } from '@/services/stripe.service'

const Pricing: React.FC = () => {
  const { user, profile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (planId: 'pro-monthly' | 'pro-yearly') => {
    if (!user) {
      setError('Please sign in to upgrade your subscription')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await stripeService.redirectToCheckout(planId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout process')
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for casual event discovery',
      features: [
        'Browse all events',
        'Basic search and filters',
        'Save up to 10 events',
        'Community features'
      ],
      cta: 'Current Plan',
      current: profile?.subscription_tier === 'free' || !profile?.subscription_tier
    },
    {
      id: 'pro-monthly',
      name: 'Pro',
      price: '$9',
      period: 'month',
      description: 'For serious event enthusiasts',
      features: [
        'Everything in Free',
        'Unlimited saved events',
        'Advanced search filters',
        'Custom event plans',
        'Priority customer support',
        'Early access to new features'
      ],
      cta: 'Upgrade to Pro',
      current: profile?.subscription_tier === 'pro',
      popular: true
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">
              SceneScout
            </Link>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button variant="outline" asChild>
                  <Link to="/profile">Profile</Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Unlock the full power of SceneScout with our Pro plan, or continue exploring with our free tier.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <Alert className="border-red-500 bg-red-500/10 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-8 bg-gray-900 border-gray-800 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Zap size={16} className="mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">/{plan.period}</span>
                </div>
                <p className="text-gray-400">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check size={20} className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.current
                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
                disabled={plan.current || loading}
                onClick={() => {
                  if (plan.id === 'pro-monthly') {
                    handleUpgrade('pro-monthly')
                  } else if (!user) {
                    setError('Please sign in to upgrade')
                  }
                }}
              >
                {loading && plan.id === 'pro-monthly' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {plan.current ? 'Current Plan' : plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-4">
            Have questions? We're here to help.
          </p>
          <div className="space-x-4">
            <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Back to Home
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pricing