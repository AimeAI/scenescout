import { useCallback } from 'react'
import { posthog } from '@/providers/PostHogProvider'

/**
 * Event types for type-safe tracking
 */
export type TrackingEvent =
  | 'event_viewed'
  | 'event_saved'
  | 'event_unsaved'
  | 'reminder_created'
  | 'calendar_export'
  | 'search_performed'
  | 'category_filter'
  | 'map_opened'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'pwa_installed'
  | 'pwa_prompt_shown'
  | 'feedback_submitted'
  | 'feedback_opened'
  | 'share_event'
  | 'filter_applied'
  | 'sort_changed'
  | 'date_filter'
  | 'location_permission_granted'
  | 'location_permission_denied'
  | 'notification_permission_granted'
  | 'notification_permission_denied'
  | 'swipe_like'
  | 'swipe_dislike'
  | 'surprise_me_opened'
  | 'near_me_opened'
  | 'saved_events_opened'

/**
 * Base event properties
 */
interface BaseEventProperties {
  timestamp?: number
  [key: string]: any
}

/**
 * Event-specific properties
 */
interface EventViewedProperties extends BaseEventProperties {
  event_id: string
  event_title: string
  event_category?: string
  event_date?: string
  venue_name?: string
  source?: 'search' | 'recommendation' | 'near_me' | 'surprise_me' | 'saved' | 'category'
}

interface EventSavedProperties extends BaseEventProperties {
  event_id: string
  event_title: string
  event_category?: string
  total_saved_count?: number
}

interface ReminderCreatedProperties extends BaseEventProperties {
  event_id: string
  reminder_time: string
  notification_enabled: boolean
}

interface SearchPerformedProperties extends BaseEventProperties {
  query: string
  results_count: number
  filters_applied?: string[]
  location?: string
}

interface CategoryFilterProperties extends BaseEventProperties {
  category: string
  action: 'applied' | 'removed'
  active_filters?: string[]
}

interface FeedbackSubmittedProperties extends BaseEventProperties {
  feedback_type: 'bug' | 'feature' | 'general'
  rating?: number
  page?: string
}

interface SwipeEventProperties extends BaseEventProperties {
  event_id: string
  event_category?: string
  swipe_direction: 'like' | 'dislike'
  position_in_deck?: number
}

/**
 * Custom hook for tracking user events
 * Provides type-safe event tracking with PostHog
 *
 * @example
 * ```tsx
 * const { trackEvent, identifyUser } = useTracking()
 *
 * // Track event view
 * trackEvent('event_viewed', {
 *   event_id: '123',
 *   event_title: 'Concert at The Opera House',
 *   source: 'recommendation'
 * })
 *
 * // Identify user
 * identifyUser('user-123', {
 *   location: 'Toronto',
 *   saved_events_count: 5
 * })
 * ```
 */
export function useTracking() {
  /**
   * Track a custom event with properties
   */
  const trackEvent = useCallback(
    <T extends BaseEventProperties>(
      eventName: TrackingEvent,
      properties?: T
    ) => {
      if (typeof window === 'undefined' || !posthog) return

      try {
        posthog.capture(eventName, {
          ...properties,
          timestamp: Date.now(),
          page_url: window.location.href,
          page_path: window.location.pathname,
        })
      } catch (error) {
        console.error('Failed to track event:', error)
      }
    },
    []
  )

  /**
   * Track event view with structured data
   */
  const trackEventView = useCallback(
    (properties: EventViewedProperties) => {
      trackEvent('event_viewed', properties)
    },
    [trackEvent]
  )

  /**
   * Track event save/unsave
   */
  const trackEventSave = useCallback(
    (properties: EventSavedProperties, unsave = false) => {
      trackEvent(unsave ? 'event_unsaved' : 'event_saved', properties)
    },
    [trackEvent]
  )

  /**
   * Track search interaction
   */
  const trackSearch = useCallback(
    (properties: SearchPerformedProperties) => {
      trackEvent('search_performed', properties)
    },
    [trackEvent]
  )

  /**
   * Track category filter interaction
   */
  const trackCategoryFilter = useCallback(
    (properties: CategoryFilterProperties) => {
      trackEvent('category_filter', properties)
    },
    [trackEvent]
  )

  /**
   * Track reminder creation
   */
  const trackReminder = useCallback(
    (properties: ReminderCreatedProperties) => {
      trackEvent('reminder_created', properties)
    },
    [trackEvent]
  )

  /**
   * Track feedback submission
   */
  const trackFeedback = useCallback(
    (properties: FeedbackSubmittedProperties) => {
      trackEvent('feedback_submitted', properties)
    },
    [trackEvent]
  )

  /**
   * Track swipe interactions
   */
  const trackSwipe = useCallback(
    (properties: SwipeEventProperties) => {
      const eventName = properties.swipe_direction === 'like' ? 'swipe_like' : 'swipe_dislike'
      trackEvent(eventName, properties)
    },
    [trackEvent]
  )

  /**
   * Track onboarding completion
   */
  const trackOnboarding = useCallback(
    (completed: boolean, step?: number) => {
      trackEvent(completed ? 'onboarding_completed' : 'onboarding_skipped', {
        step,
        completed,
      })
    },
    [trackEvent]
  )

  /**
   * Track PWA installation
   */
  const trackPWAInstall = useCallback(() => {
    trackEvent('pwa_installed', {
      platform: navigator.platform,
      user_agent: navigator.userAgent,
    })
  }, [trackEvent])

  /**
   * Identify user with properties
   */
  const identifyUser = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      if (typeof window === 'undefined' || !posthog) return

      try {
        posthog.identify(userId, {
          ...properties,
          last_seen: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Failed to identify user:', error)
      }
    },
    []
  )

  /**
   * Set user properties (without identifying)
   */
  const setUserProperties = useCallback(
    (properties: Record<string, any>) => {
      if (typeof window === 'undefined' || !posthog) return

      try {
        posthog.people.set(properties)
      } catch (error) {
        console.error('Failed to set user properties:', error)
      }
    },
    []
  )

  /**
   * Increment a user property
   */
  const incrementUserProperty = useCallback(
    (property: string, value: number = 1) => {
      if (typeof window === 'undefined' || !posthog) return

      try {
        posthog.people.increment(property, value)
      } catch (error) {
        console.error('Failed to increment user property:', error)
      }
    },
    []
  )

  /**
   * Reset user identity (useful for logout)
   */
  const resetUser = useCallback(() => {
    if (typeof window === 'undefined' || !posthog) return

    try {
      posthog.reset()
    } catch (error) {
      console.error('Failed to reset user:', error)
    }
  }, [])

  /**
   * Check if feature flag is enabled
   */
  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      if (typeof window === 'undefined' || !posthog) return false

      try {
        return posthog.isFeatureEnabled(flagKey) || false
      } catch (error) {
        console.error('Failed to check feature flag:', error)
        return false
      }
    },
    []
  )

  /**
   * Get feature flag variant
   */
  const getFeatureFlag = useCallback(
    (flagKey: string): string | boolean | undefined => {
      if (typeof window === 'undefined' || !posthog) return undefined

      try {
        return posthog.getFeatureFlag(flagKey)
      } catch (error) {
        console.error('Failed to get feature flag:', error)
        return undefined
      }
    },
    []
  )

  return {
    // Core tracking
    trackEvent,

    // Specific event tracking
    trackEventView,
    trackEventSave,
    trackSearch,
    trackCategoryFilter,
    trackReminder,
    trackFeedback,
    trackSwipe,
    trackOnboarding,
    trackPWAInstall,

    // User management
    identifyUser,
    setUserProperties,
    incrementUserProperty,
    resetUser,

    // Feature flags
    isFeatureEnabled,
    getFeatureFlag,
  }
}

/**
 * Hook for tracking performance metrics
 */
export function usePerformanceTracking() {
  const { trackEvent } = useTracking()

  const trackPageLoad = useCallback(() => {
    if (typeof window === 'undefined' || !performance) return

    // Wait for load to complete
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (perfData) {
        trackEvent('page_load' as TrackingEvent, {
          dns_time: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp_time: perfData.connectEnd - perfData.connectStart,
          request_time: perfData.responseStart - perfData.requestStart,
          response_time: perfData.responseEnd - perfData.responseStart,
          dom_processing_time: perfData.domComplete - perfData.domLoading,
          load_time: perfData.loadEventEnd - perfData.loadEventStart,
          total_time: perfData.loadEventEnd - perfData.fetchStart,
        })
      }
    })
  }, [trackEvent])

  const trackAPICall = useCallback(
    (endpoint: string, duration: number, success: boolean) => {
      trackEvent('api_call' as TrackingEvent, {
        endpoint,
        duration,
        success,
      })
    },
    [trackEvent]
  )

  return {
    trackPageLoad,
    trackAPICall,
  }
}
