/**
 * PostHog Tracking Integration Examples
 *
 * This file demonstrates how to integrate PostHog tracking
 * into existing components without being intrusive.
 *
 * Copy these patterns into your actual components.
 */

import { useTracking } from '@/hooks/useTracking'
import { useEffect } from 'react'

// ============================================================================
// EXAMPLE 1: Event Detail Page
// ============================================================================

export function EventDetailPageExample({ eventId, eventData }: any) {
  const { trackEventView } = useTracking()

  useEffect(() => {
    // Track event view when component mounts
    trackEventView({
      event_id: eventId,
      event_title: eventData.title,
      event_category: eventData.category,
      event_date: eventData.date,
      venue_name: eventData.venue,
      source: 'direct', // or pass from route query
    })
  }, [eventId, trackEventView])

  return <div>{/* Event detail UI */}</div>
}

// ============================================================================
// EXAMPLE 2: Save Event Button
// ============================================================================

export function SaveEventButtonExample({ event }: any) {
  const { trackEventSave, incrementUserProperty } = useTracking()

  const handleSave = async (isSaved: boolean) => {
    // Save/unsave logic
    await toggleSaveEvent(event.id)

    // Track the action
    trackEventSave(
      {
        event_id: event.id,
        event_title: event.title,
        event_category: event.category,
        total_saved_count: getUserSavedCount(),
      },
      !isSaved // Pass true for unsave
    )

    // Increment user's saved events count
    if (isSaved) {
      incrementUserProperty('saved_events_count', 1)
    } else {
      incrementUserProperty('saved_events_count', -1)
    }
  }

  return <button onClick={() => handleSave(false)}>Save</button>
}

// ============================================================================
// EXAMPLE 3: Search Component
// ============================================================================

export function SearchComponentExample() {
  const { trackSearch } = useTracking()

  const handleSearch = async (query: string, filters: string[]) => {
    const results = await performSearch(query, filters)

    // Track search with results
    trackSearch({
      query,
      results_count: results.length,
      filters_applied: filters,
      location: getUserLocation(),
    })

    return results
  }

  return <div>{/* Search UI */}</div>
}

// ============================================================================
// EXAMPLE 4: Category Filter (QuickChips)
// ============================================================================

export function QuickChipsExample() {
  const { trackCategoryFilter } = useTracking()

  const handleCategoryToggle = (category: string, isActive: boolean) => {
    // Toggle category logic
    toggleCategory(category)

    // Track the interaction
    trackCategoryFilter({
      category,
      action: isActive ? 'applied' : 'removed',
      active_filters: getActiveFilters(),
    })
  }

  return <div>{/* QuickChips UI */}</div>
}

// ============================================================================
// EXAMPLE 5: Onboarding Flow
// ============================================================================

export function OnboardingFlowExample() {
  const { trackOnboarding, identifyUser, setUserProperties } = useTracking()

  const handleOnboardingComplete = (userData: any) => {
    // Track completion
    trackOnboarding(true, 3)

    // Identify user with their preferences
    identifyUser(userData.userId, {
      location: userData.location,
      preferred_categories: userData.categories,
      notification_enabled: userData.notifications,
      onboarding_completed_at: new Date().toISOString(),
    })
  }

  const handleOnboardingSkip = () => {
    trackOnboarding(false, 1)
  }

  return <div>{/* Onboarding UI */}</div>
}

// ============================================================================
// EXAMPLE 6: Surprise Me / Swipe Interface
// ============================================================================

export function SurpriseMeExample() {
  const { trackSwipe, trackEvent } = useTracking()

  useEffect(() => {
    // Track when user opens Surprise Me
    trackEvent('surprise_me_opened', {})
  }, [trackEvent])

  const handleSwipe = (event: any, direction: 'like' | 'dislike', position: number) => {
    trackSwipe({
      event_id: event.id,
      event_category: event.category,
      swipe_direction: direction,
      position_in_deck: position,
    })

    if (direction === 'like') {
      // Auto-save liked events
      // trackEventSave(...) - called separately in save logic
    }
  }

  return <div>{/* Swipe UI */}</div>
}

// ============================================================================
// EXAMPLE 7: PWA Install Prompt
// ============================================================================

export function PWAInstallPromptExample() {
  const { trackPWAInstall, trackEvent } = useTracking()

  const handlePromptShown = () => {
    trackEvent('pwa_prompt_shown', {
      platform: navigator.platform,
    })
  }

  const handleInstallClick = () => {
    // Install logic
    trackPWAInstall()
  }

  return <div>{/* Install prompt UI */}</div>
}

// ============================================================================
// EXAMPLE 8: Feedback Widget
// ============================================================================

export function FeedbackWidgetExample() {
  const { trackFeedback, trackEvent } = useTracking()

  const handleFeedbackOpen = () => {
    trackEvent('feedback_opened', {
      page: window.location.pathname,
    })
  }

  const handleFeedbackSubmit = (feedback: any) => {
    trackFeedback({
      feedback_type: feedback.type,
      rating: feedback.rating,
      page: window.location.pathname,
    })
  }

  return <div>{/* Feedback UI */}</div>
}

// ============================================================================
// EXAMPLE 9: Reminder Creation
// ============================================================================

export function ReminderButtonExample({ event }: any) {
  const { trackReminder } = useTracking()

  const handleCreateReminder = (reminderTime: string) => {
    // Create reminder logic
    const notificationEnabled = checkNotificationPermission()

    trackReminder({
      event_id: event.id,
      reminder_time: reminderTime,
      notification_enabled: notificationEnabled,
    })
  }

  return <button>Set Reminder</button>
}

// ============================================================================
// EXAMPLE 10: Map Page
// ============================================================================

export function MapPageExample() {
  const { trackEvent } = useTracking()

  useEffect(() => {
    trackEvent('map_opened', {
      events_count: getVisibleEventsCount(),
      location: getUserLocation(),
    })
  }, [trackEvent])

  return <div>{/* Map UI */}</div>
}

// ============================================================================
// EXAMPLE 11: User Identification (Login/Signup)
// ============================================================================

export function LoginExample() {
  const { identifyUser, setUserProperties } = useTracking()

  const handleLogin = async (userId: string) => {
    // Login logic
    const user = await getUserData(userId)

    // Identify user in PostHog
    identifyUser(userId, {
      email: user.email,
      name: user.name,
      signup_date: user.createdAt,
      location: user.location,
      saved_events_count: user.savedEvents?.length || 0,
    })
  }

  return <div>{/* Login UI */}</div>
}

// ============================================================================
// EXAMPLE 12: Calendar Export
// ============================================================================

export function CalendarExportExample({ event }: any) {
  const { trackEvent } = useTracking()

  const handleExport = (format: 'ics' | 'google') => {
    // Export logic
    trackEvent('calendar_export', {
      event_id: event.id,
      format,
    })
  }

  return <button>Add to Calendar</button>
}

// ============================================================================
// EXAMPLE 13: Near Me Page
// ============================================================================

export function NearMePageExample() {
  const { trackEvent } = useTracking()

  useEffect(() => {
    trackEvent('near_me_opened', {
      location_permission: checkLocationPermission(),
    })
  }, [trackEvent])

  const handleLocationPermission = (granted: boolean) => {
    trackEvent(
      granted ? 'location_permission_granted' : 'location_permission_denied',
      {}
    )
  }

  return <div>{/* Near Me UI */}</div>
}

// ============================================================================
// EXAMPLE 14: Feature Flags Usage
// ============================================================================

export function FeatureFlagExample() {
  const { isFeatureEnabled, getFeatureFlag } = useTracking()

  // Check if a feature is enabled
  const showNewUI = isFeatureEnabled('new-event-card-design')

  // Get feature flag variant
  const experimentVariant = getFeatureFlag('recommendation-algorithm')

  return (
    <div>
      {showNewUI ? <NewEventCard /> : <OldEventCard />}
      {experimentVariant === 'variant-a' && <VariantA />}
      {experimentVariant === 'variant-b' && <VariantB />}
    </div>
  )
}

// ============================================================================
// EXAMPLE 15: Performance Tracking
// ============================================================================

export function PerformanceTrackingExample() {
  const { trackEvent } = useTracking()

  const trackAPIPerformance = async (endpoint: string) => {
    const startTime = performance.now()

    try {
      const response = await fetch(endpoint)
      const endTime = performance.now()
      const duration = endTime - startTime

      trackEvent('api_call' as any, {
        endpoint,
        duration,
        success: response.ok,
        status: response.status,
      })

      return response
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      trackEvent('api_call' as any, {
        endpoint,
        duration,
        success: false,
        error: (error as Error).message,
      })

      throw error
    }
  }

  return null
}

// Helper functions (implement these in your actual code)
function toggleSaveEvent(id: string) {}
function getUserSavedCount() { return 0 }
function performSearch(query: string, filters: string[]) { return [] }
function getUserLocation() { return 'Toronto' }
function toggleCategory(category: string) {}
function getActiveFilters() { return [] }
function checkNotificationPermission() { return false }
function getVisibleEventsCount() { return 0 }
function getUserData(userId: string) { return {} }
function checkLocationPermission() { return false }
function NewEventCard() { return null }
function OldEventCard() { return null }
function VariantA() { return null }
function VariantB() { return null }
