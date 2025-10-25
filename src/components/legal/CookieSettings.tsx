'use client'

import { useState, useEffect } from 'react'

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_PREFERENCES_KEY = 'scenescout_cookie_preferences'

export function CookieSettings() {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load saved preferences
    const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY)
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs))
      } catch (e) {
        console.error('Failed to parse cookie preferences:', e)
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

  const handleSave = () => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Essential Cookies */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <h3 className="text-lg font-semibold">Essential Cookies</h3>
              <p className="text-sm text-gray-400 mt-1">
                Required for the website to function properly
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
            Always On
          </div>
        </div>
        <p className="text-sm text-gray-300">
          These cookies are necessary for authentication, security, and core functionality.
          They cannot be disabled.
        </p>
      </div>

      {/* Analytics Cookies */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h3 className="text-lg font-semibold">Analytics Cookies</h3>
              <p className="text-sm text-gray-400 mt-1">
                Help us improve your experience by understanding how you use the app
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
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-300 mb-3">
          We use PostHog to analyze user behavior patterns (anonymized). This helps us:
        </p>
        <ul className="text-sm text-gray-400 space-y-1 ml-4">
          <li>• Identify and fix bugs faster</li>
          <li>• Understand which features are most useful</li>
          <li>• Optimize performance and user experience</li>
          <li>• Make data-driven product decisions</li>
        </ul>
        {preferences.analytics && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-400">
              ✓ Analytics enabled. We're collecting anonymized usage data to improve SceneScout.
            </p>
          </div>
        )}
      </div>

      {/* Marketing Cookies (Future) */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-lg opacity-60">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📢</span>
            <div>
              <h3 className="text-lg font-semibold">Marketing Cookies</h3>
              <p className="text-sm text-gray-400 mt-1">
                Personalized advertising (not currently used)
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-gray-700 text-gray-400 text-xs font-medium rounded-full">
            Not Used
          </div>
        </div>
        <p className="text-sm text-gray-300">
          We don't currently use marketing cookies or show ads. This option is reserved for
          future personalization features.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
        <div>
          <p className="font-semibold">Save Your Preferences</p>
          <p className="text-sm text-gray-400 mt-1">
            Your choices will be saved in your browser
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`px-6 py-2 font-medium rounded-lg transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
