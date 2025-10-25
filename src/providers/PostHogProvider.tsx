'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

/**
 * PostHog Analytics Provider with privacy-conscious settings
 * Features:
 * - Auto-capture pageviews
 * - Session recording (opt-in)
 * - Feature flags support
 * - IP masking and privacy controls
 * - Performance optimized lazy loading
 */

// Initialize PostHog on client-side only
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  const hasOptedOut = localStorage.getItem('posthog-opt-out') === 'true'
  const shouldRespectDNT = navigator.doNotTrack === '1'

  if (!hasOptedOut && !shouldRespectDNT) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',

      // Privacy settings
      ip: false, // Don't capture IP addresses
      respect_dnt: true, // Respect Do Not Track
      opt_out_capturing_by_default: false,

      // Session recording - disabled by default for privacy
      disable_session_recording: true,

      // Performance optimization
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug(false) // Disable debug in dev to reduce noise
        }
      },

      // Auto-capture settings
      autocapture: {
        dom_event_allowlist: ['click'], // Only capture clicks, not all interactions
        url_allowlist: undefined, // Capture on all pages
        element_allowlist: ['button', 'a'], // Only track meaningful interactions
      },

      // Batch events for efficiency
      batch_size: 10,
      batch_flush_interval_ms: 5000,

      // Persistence
      persistence: 'localStorage+cookie',

      // Cross-subdomain tracking
      cross_subdomain_cookie: false,

      // Security
      secure_cookie: true,

      // Feature flags
      bootstrap: {
        featureFlags: {},
      },
    })
  }
}

/**
 * Track pageviews automatically on route changes
 */
function PostHogPageView(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && typeof window !== 'undefined' && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }

      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

interface PostHogProviderProps {
  children: React.ReactNode
}

/**
 * PostHog Provider Component
 * Wraps the app with PostHog analytics context
 *
 * @example
 * ```tsx
 * <PostHogProvider>
 *   <App />
 * </PostHogProvider>
 * ```
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  // Only render provider if PostHog is configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('PostHog API key not configured. Analytics disabled.')
    }
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}

/**
 * Opt-out function for user privacy
 */
export function optOutOfAnalytics() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('posthog-opt-out', 'true')
    posthog?.opt_out_capturing()
  }
}

/**
 * Opt-in function to re-enable analytics
 */
export function optInToAnalytics() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('posthog-opt-out')
    posthog?.opt_in_capturing()
  }
}

/**
 * Check if user has opted out
 */
export function hasOptedOut(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('posthog-opt-out') === 'true'
}

/**
 * Enable session recording (user must opt-in)
 */
export function enableSessionRecording() {
  if (typeof window !== 'undefined' && posthog) {
    posthog.startSessionRecording()
    localStorage.setItem('posthog-session-recording', 'enabled')
  }
}

/**
 * Disable session recording
 */
export function disableSessionRecording() {
  if (typeof window !== 'undefined' && posthog) {
    posthog.stopSessionRecording()
    localStorage.removeItem('posthog-session-recording')
  }
}

export { posthog }
