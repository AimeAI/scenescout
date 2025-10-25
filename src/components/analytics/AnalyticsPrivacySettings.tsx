'use client'

import { useState, useEffect } from 'react'
import {
  optOutOfAnalytics,
  optInToAnalytics,
  hasOptedOut,
  enableSessionRecording,
  disableSessionRecording,
} from '@/providers/PostHogProvider'

/**
 * Privacy Settings Component for Analytics
 *
 * Allows users to control their analytics preferences:
 * - Opt-out of all tracking
 * - Enable/disable session recording
 *
 * Add this to your settings/privacy page
 */
export function AnalyticsPrivacySettings() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [sessionRecordingEnabled, setSessionRecordingEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check current opt-out status
    const optedOut = hasOptedOut()
    setAnalyticsEnabled(!optedOut)

    // Check session recording status
    const recordingEnabled = localStorage.getItem('posthog-session-recording') === 'enabled'
    setSessionRecordingEnabled(recordingEnabled)

    setIsLoading(false)
  }, [])

  const handleAnalyticsToggle = () => {
    if (analyticsEnabled) {
      optOutOfAnalytics()
      setAnalyticsEnabled(false)
      // Disable session recording too if analytics is disabled
      if (sessionRecordingEnabled) {
        disableSessionRecording()
        setSessionRecordingEnabled(false)
      }
    } else {
      optInToAnalytics()
      setAnalyticsEnabled(true)
    }
  }

  const handleSessionRecordingToggle = () => {
    if (!analyticsEnabled) {
      // Can't enable session recording if analytics is disabled
      return
    }

    if (sessionRecordingEnabled) {
      disableSessionRecording()
      setSessionRecordingEnabled(false)
    } else {
      enableSessionRecording()
      setSessionRecordingEnabled(true)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-800 rounded-lg" />
        <div className="h-20 bg-gray-800 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Toggle */}
      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Analytics & Usage Data
            </h3>
            <p className="text-sm text-gray-400">
              Help us improve SceneScout by sharing anonymous usage data. We track
              which features you use, events you view, and how you interact with
              the app. Your IP address is never stored.
            </p>
          </div>
          <button
            onClick={handleAnalyticsToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              analyticsEnabled ? 'bg-purple-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={analyticsEnabled}
          >
            <span className="sr-only">Enable analytics</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {analyticsEnabled && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-300">
              ✓ Analytics enabled - Thank you for helping us improve!
            </p>
          </div>
        )}

        {!analyticsEnabled && (
          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-xs text-gray-400">
              Analytics disabled - We'll stop collecting usage data
            </p>
          </div>
        )}
      </div>

      {/* Session Recording Toggle */}
      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Session Recording
              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                Opt-in
              </span>
            </h3>
            <p className="text-sm text-gray-400">
              Allow us to record your session to better understand how you use the
              app. This helps us identify bugs and improve the user experience.
              Recordings are automatically anonymized.
            </p>
            {!analyticsEnabled && (
              <p className="text-sm text-yellow-400 mt-2">
                ⚠ Session recording requires analytics to be enabled
              </p>
            )}
          </div>
          <button
            onClick={handleSessionRecordingToggle}
            disabled={!analyticsEnabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              sessionRecordingEnabled && analyticsEnabled
                ? 'bg-purple-600'
                : 'bg-gray-700'
            } ${!analyticsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={sessionRecordingEnabled && analyticsEnabled}
          >
            <span className="sr-only">Enable session recording</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                sessionRecordingEnabled && analyticsEnabled
                  ? 'translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {sessionRecordingEnabled && analyticsEnabled && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-300">
              ✓ Session recording enabled - Your sessions may be recorded
            </p>
          </div>
        )}
      </div>

      {/* Privacy Information */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">
          Your Privacy Matters
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            <span>
              <strong className="text-gray-300">No IP tracking:</strong> We never
              store your IP address
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            <span>
              <strong className="text-gray-300">Do Not Track respected:</strong> We
              honor your browser's DNT setting
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            <span>
              <strong className="text-gray-300">Anonymous by default:</strong> All
              data is anonymized unless you sign in
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            <span>
              <strong className="text-gray-300">Your choice:</strong> You can
              opt-out at any time
            </span>
          </li>
        </ul>
      </div>

      {/* What We Track */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">
          What We Track (When Enabled)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <h4 className="text-gray-300 font-medium mb-2">✓ We Track:</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Pages you visit</li>
              <li>• Events you view and save</li>
              <li>• Search queries</li>
              <li>• Feature usage</li>
              <li>• App performance</li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-300 font-medium mb-2">✗ We Don't Track:</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Your IP address</li>
              <li>• Personal information</li>
              <li>• Passwords or credentials</li>
              <li>• Private conversations</li>
              <li>• Sensitive form data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for footer or settings menu
 */
export function AnalyticsPrivacyToggle() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  useEffect(() => {
    setAnalyticsEnabled(!hasOptedOut())
  }, [])

  const handleToggle = () => {
    if (analyticsEnabled) {
      optOutOfAnalytics()
      setAnalyticsEnabled(false)
    } else {
      optInToAnalytics()
      setAnalyticsEnabled(true)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className="text-sm text-gray-400 hover:text-white transition-colors"
    >
      {analyticsEnabled ? '📊 Analytics: On' : '🔒 Analytics: Off'}
    </button>
  )
}
