'use client'

import {
  Search,
  Calendar,
  Heart,
  MapPin,
  WifiOff,
  Filter,
  Sparkles,
  Navigation
} from 'lucide-react'
import { EmptyStateProps } from './EmptyState'

type EmptyStateVariant = Omit<EmptyStateProps, 'action' | 'secondaryAction'>

export const EMPTY_STATE_VARIANTS: Record<string, EmptyStateVariant> = {
  // No Search Results
  noSearchResults: {
    icon: Search,
    title: 'No Events Found',
    description: 'We couldn\'t find any events matching your search.',
    suggestions: [
      'Try different keywords or phrases',
      'Check your spelling',
      'Use more general search terms',
      'Try browsing categories instead'
    ]
  },

  // No Events in Category
  noCategoryEvents: {
    icon: Calendar,
    title: 'No Events Right Now',
    description: 'There aren\'t any events in this category at the moment.',
    suggestions: [
      'Check back later for new events',
      'Explore other categories',
      'Adjust your date filters',
      'Try expanding your search radius'
    ]
  },

  // No Saved Events
  noSavedEvents: {
    icon: Heart,
    title: 'No Saved Events Yet',
    description: (
      <>
        <p className="mb-2">You haven't saved any events yet.</p>
        <p className="text-sm">
          Tap the heart icon on any event to save it for later.
          Your saved events will appear here so you can easily find them.
        </p>
      </>
    ),
    suggestions: undefined
  },

  // Location Permission Denied
  locationDenied: {
    icon: MapPin,
    title: 'Location Access Needed',
    description: (
      <>
        <p className="mb-3">
          We need your location to show nearby events and personalized recommendations.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-left max-w-md mx-auto mb-3">
          <p className="text-sm font-medium text-white/90 mb-2">To enable location:</p>
          <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>Click the lock icon in your browser's address bar</li>
            <li>Select "Allow" for location permissions</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        <p className="text-xs text-gray-500">
          We only use your location to find nearby events. Your privacy is important to us.
        </p>
      </>
    ),
    suggestions: undefined
  },

  // Location Not Available (Browser doesn't support it)
  locationUnavailable: {
    icon: Navigation,
    title: 'Location Not Available',
    description: 'Your browser doesn\'t support location services or they\'re disabled.',
    suggestions: undefined
  },

  // No Internet Connection
  noConnection: {
    icon: WifiOff,
    title: 'You\'re Offline',
    description: 'Check your internet connection and try again.',
    suggestions: undefined
  },

  // No Nearby Events
  noNearbyEvents: {
    icon: MapPin,
    title: 'No Events Nearby',
    description: 'We couldn\'t find any events within your selected distance.',
    suggestions: [
      'Try increasing your search radius',
      'Check different time filters',
      'Browse all events in your city',
      'Try different event categories'
    ]
  },

  // No Filter Results
  noFilterResults: {
    icon: Filter,
    title: 'No Matching Events',
    description: 'No events match your current filters.',
    suggestions: [
      'Try removing some filters',
      'Adjust your price range',
      'Change your date range',
      'Select different categories'
    ]
  },

  // No Upcoming Events
  noUpcomingEvents: {
    icon: Calendar,
    title: 'No Upcoming Events',
    description: 'There are no upcoming events scheduled at this time.',
    suggestions: [
      'Check back later for new events',
      'Browse past events',
      'Explore different categories'
    ]
  },

  // Generic Error
  genericError: {
    emoji: '⚠️',
    title: 'Something Went Wrong',
    description: 'We encountered an error while loading events.',
    suggestions: [
      'Refresh the page',
      'Check your internet connection',
      'Try again in a few moments'
    ]
  },

  // Loading Error
  loadingError: {
    emoji: '😕',
    title: 'Failed to Load Events',
    description: 'We couldn\'t load events at this time. This might be a temporary issue.',
    suggestions: undefined
  },

  // No Surprise Events
  noSurpriseEvents: {
    icon: Sparkles,
    title: 'No More Surprises',
    description: 'You\'ve seen all available events for now.',
    suggestions: [
      'Check back later for new events',
      'Adjust your preferences',
      'Browse specific categories'
    ]
  },

  // Empty State for initial load (before search)
  searchInitial: {
    icon: Search,
    title: 'Search for Events',
    description: 'Enter keywords to discover concerts, comedy shows, sports events, and more.',
    suggestions: undefined
  },

  // No Events Today
  noEventsToday: {
    icon: Calendar,
    title: 'Nothing Happening Today',
    description: 'There are no events scheduled for today in your area.',
    suggestions: [
      'Try tomorrow or this weekend',
      'Check upcoming events',
      'Explore different locations'
    ]
  }
}

// Helper function to get empty state config with custom overrides
export function getEmptyState(
  variant: keyof typeof EMPTY_STATE_VARIANTS,
  overrides?: Partial<EmptyStateVariant>
): EmptyStateVariant {
  return {
    ...EMPTY_STATE_VARIANTS[variant],
    ...overrides
  }
}
