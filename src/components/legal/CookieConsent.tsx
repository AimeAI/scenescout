'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_CONSENT_KEY = 'scenescout_cookie_consent'
const COOKIE_PREFERENCES_KEY = 'scenescout_cookie_preferences'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      // Load saved preferences
      const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY)
      if (savedPrefs) {
        try {
          setPreferences(JSON.parse(savedPrefs))
        } catch (e) {
          console.error('Failed to parse cookie preferences:', e)
        }
      }
    }
  }, [])

  useEffect(() => {
    // Apply analytics preferences to PostHog
    if (typeof window !== 'undefined' && (window as any).posthog) {
      if (preferences.analytics) {
        (window as any).posthog.opt_in_capturing()
      } else {
        (window as any).posthog.opt_out_capturing()
      }
    }
  }, [preferences.analytics])

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)
    setShowCustomize(false)
  }

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
    })
  }

  const handleRejectAll = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
    })
  }

  const handleSaveCustom = () => {
    savePreferences(preferences)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Backdrop */}
      {showCustomize && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setShowCustomize(false)}
        />
      )}

      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-gray-900 to-black border border-purple-500/30 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              {/* Text Content */}
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">🍪</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      We use cookies
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      We use essential cookies to keep you logged in and analytics cookies to improve our service.
                      You can customize your preferences or accept all.{' '}
                      <Link
                        href="/privacy"
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        Learn more
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowCustomize(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-all"
                >
                  Customize
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg shadow-lg shadow-purple-500/30 transition-all"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customize Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Cookie Preferences
                </h2>
                <p className="text-sm text-gray-400">
                  Choose which cookies you want to allow
                </p>
              </div>
              <button
                onClick={() => setShowCustomize(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cookie Categories */}
            <div className="p-6 space-y-6">
              {/* Essential */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <h3 className="font-semibold text-white">Essential Cookies</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Required for the website to function. Cannot be disabled.
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    Always On
                  </div>
                </div>
                <ul className="mt-3 text-sm text-gray-400 space-y-1 ml-11">
                  <li>• Authentication and login sessions</li>
                  <li>• Security and fraud prevention</li>
                  <li>• User preferences and settings</li>
                </ul>
              </div>

              {/* Analytics */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="font-semibold text-white">Analytics Cookies</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Help us understand how you use the app to improve your experience.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
                  </label>
                </div>
                <ul className="mt-3 text-sm text-gray-400 space-y-1 ml-11">
                  <li>• PostHog analytics (anonymized)</li>
                  <li>• Page view tracking</li>
                  <li>• Feature usage statistics</li>
                </ul>
              </div>

              {/* Marketing */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📢</span>
                    <div>
                      <h3 className="font-semibold text-white">Marketing Cookies</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Used for personalized advertising. (Not currently used)
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-700 text-gray-400 text-xs font-medium rounded-full">
                    Not Used
                  </div>
                </div>
                <ul className="mt-3 text-sm text-gray-400 space-y-1 ml-11">
                  <li>• We don't currently use marketing cookies</li>
                  <li>• Future feature for personalized recommendations</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 p-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/settings/cookies"
                className="text-sm text-gray-400 hover:text-purple-400 transition-colors text-center sm:text-left"
              >
                View detailed cookie list →
              </Link>
              <div className="flex-1" />
              <button
                onClick={() => setShowCustomize(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg shadow-lg shadow-purple-500/30 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
