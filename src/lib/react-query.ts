import { QueryClient, DefaultOptions } from '@tanstack/react-query'

// Optimized query configuration with performance monitoring
const queryConfig: DefaultOptions = {
  queries: {
    // Adaptive stale time based on data type
    staleTime: 1000 * 60 * 5, // 5 minutes base
    // Optimized garbage collection time
    gcTime: 1000 * 60 * 30, // 30 minutes
    // Smart retry logic
    retry: (failureCount, error: any) => {
      // Don't retry client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) return false;
      // Don't retry more than 2 times
      if (failureCount >= 2) return false;
      // Retry server errors and network errors
      return true;
    },
    // Exponential backoff with jitter
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * Math.pow(2, attemptIndex) + Math.random() * 1000, 30000);
    },
    // Optimized refetch settings
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    // Smart background refetch (disabled by default, controlled by optimization system)
    refetchInterval: false,
    // Network mode for better offline handling
    networkMode: 'online',
  },
  mutations: {
    // Smart mutation retry
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    // Mutation retry delay
    retryDelay: 1000,
    // Network mode
    networkMode: 'online',
  },
}

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: queryConfig,
    // Global error handler for performance monitoring
    defaultOptions: {
      ...queryConfig,
      queries: {
        ...queryConfig.queries,
        onError: (error: any) => {
          // Track query errors for optimization
          console.error('Query error:', error);
          // This will be picked up by the optimization system
        },
        onSuccess: (data: any) => {
          // Track successful queries for optimization
          // This can be used for cache optimization
        },
      },
      mutations: {
        ...queryConfig.mutations,
        onError: (error: any) => {
          // Track mutation errors
          console.error('Mutation error:', error);
        },
      },
    },
  });

  // Add query cache event listeners for performance monitoring
  client.getQueryCache().subscribe((event) => {
    if (event?.type === 'queryAdded') {
      // Track when queries are added to cache
    } else if (event?.type === 'queryRemoved') {
      // Track when queries are removed from cache
    }
  });

  return client;
}

// Query key factories for consistent caching
export const queryKeys = {
  // Events
  events: ['events'] as const,
  eventsByCategory: (category: string) => [...queryKeys.events, 'category', category] as const,
  eventsByCity: (citySlug: string) => [...queryKeys.events, 'city', citySlug] as const,
  eventsByBounds: (bounds: string) => [...queryKeys.events, 'bounds', bounds] as const,
  featuredEvents: () => [...queryKeys.events, 'featured'] as const,
  trendingEvents: () => [...queryKeys.events, 'trending'] as const,
  nearbyEvents: (lat: number, lng: number, radius: number) => 
    [...queryKeys.events, 'nearby', lat, lng, radius] as const,
  
  // Event details
  event: (id: string) => ['event', id] as const,
  eventRecommendations: (id: string) => [...queryKeys.event(id), 'recommendations'] as const,
  
  // Cities
  cities: ['cities'] as const,
  city: (slug: string) => ['city', slug] as const,
  cityStats: (slug: string) => [...queryKeys.city(slug), 'stats'] as const,
  
  // Venues
  venues: ['venues'] as const,
  venue: (id: string) => ['venue', id] as const,
  venueEvents: (id: string) => [...queryKeys.venue(id), 'events'] as const,
  
  // User data
  user: ['user'] as const,
  userProfile: () => [...queryKeys.user, 'profile'] as const,
  userEvents: () => [...queryKeys.user, 'events'] as const,
  userPlans: () => [...queryKeys.user, 'plans'] as const,
  userFavorites: () => [...queryKeys.user, 'favorites'] as const,
  
  // Plans
  plans: ['plans'] as const,
  plan: (id: string) => ['plan', id] as const,
  planEvents: (id: string) => [...queryKeys.plan(id), 'events'] as const,
  
  // Search
  search: (query: string, filters?: Record<string, any>) => 
    ['search', query, filters] as const,
  searchSuggestions: (query: string) => ['search', 'suggestions', query] as const,
  
  // Analytics
  analytics: ['analytics'] as const,
  eventViews: (eventId: string) => [...queryKeys.analytics, 'event-views', eventId] as const,
  userActivity: () => [...queryKeys.analytics, 'user-activity'] as const,
} as const

// Prefetch strategies for common data patterns
export const prefetchStrategies = {
  // Prefetch related events when viewing an event
  eventDetails: (eventId: string, queryClient: QueryClient) => {
    // Prefetch recommendations
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventRecommendations(eventId),
      staleTime: 1000 * 60 * 15, // 15 minutes
    })
  },
  
  // Prefetch city data when browsing events
  cityContext: (citySlug: string, queryClient: QueryClient) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.city(citySlug),
      staleTime: 1000 * 60 * 30, // 30 minutes (cities change slowly)
    })
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.cityStats(citySlug),
      staleTime: 1000 * 60 * 10, // 10 minutes
    })
  },
  
  // Prefetch next page of events for infinite scroll
  infiniteEvents: (
    nextPage: number, 
    category: string, 
    queryClient: QueryClient
  ) => {
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.eventsByCategory(category), 'infinite', nextPage],
      staleTime: 1000 * 60 * 5,
    })
  },
}

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all event-related queries
  invalidateEvents: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events })
  },
  
  // Invalidate specific event
  invalidateEvent: (eventId: string, queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) })
    // Also invalidate any category/city queries that might include this event
    queryClient.invalidateQueries({ queryKey: queryKeys.events })
  },
  
  // Invalidate user-specific data after authentication
  invalidateUserData: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user })
  },
  
  // Clear all cached data (useful for logout)
  clearAllCache: (queryClient: QueryClient) => {
    queryClient.clear()
  },
}

// Optimistic update utilities
export const optimisticUpdates = {
  // Optimistically add event to favorites
  addToFavorites: (eventId: string, queryClient: QueryClient) => {
    queryClient.setQueryData(
      queryKeys.userFavorites(),
      (oldData: any[] = []) => [...oldData, eventId]
    )
  },
  
  // Optimistically remove event from favorites
  removeFromFavorites: (eventId: string, queryClient: QueryClient) => {
    queryClient.setQueryData(
      queryKeys.userFavorites(),
      (oldData: any[] = []) => oldData.filter(id => id !== eventId)
    )
  },
  
  // Optimistically update event view count
  incrementEventViews: (eventId: string, queryClient: QueryClient) => {
    queryClient.setQueryData(
      queryKeys.event(eventId),
      (oldEvent: any) => oldEvent ? {
        ...oldEvent,
        view_count: (oldEvent.view_count || 0) + 1
      } : oldEvent
    )
  },
}

// Background sync utilities for offline support
export const backgroundSync = {
  // Sync critical data in the background
  syncCriticalData: (queryClient: QueryClient) => {
    // Sync user favorites
    queryClient.refetchQueries({ 
      queryKey: queryKeys.userFavorites(),
      type: 'active'
    })
    
    // Sync user plans
    queryClient.refetchQueries({
      queryKey: queryKeys.userPlans(),
      type: 'active'
    })
  },
  
  // Preload data for offline usage
  preloadForOffline: (queryClient: QueryClient, userLocation?: [number, number]) => {
    if (userLocation) {
      // Preload nearby events
      queryClient.prefetchQuery({
        queryKey: queryKeys.nearbyEvents(userLocation[0], userLocation[1], 10),
        staleTime: 1000 * 60 * 60, // 1 hour
      })
    }
    
    // Preload featured events
    queryClient.prefetchQuery({
      queryKey: queryKeys.featuredEvents(),
      staleTime: 1000 * 60 * 30, // 30 minutes
    })
    
    // Preload trending events
    queryClient.prefetchQuery({
      queryKey: queryKeys.trendingEvents(),
      staleTime: 1000 * 60 * 15, // 15 minutes
    })
  },
}

// Query error handling
export const errorHandling = {
  // Determine if error should trigger retry
  shouldRetry: (error: any, retryCount: number) => {
    // Don't retry client errors (4xx)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    
    // Don't retry more than 3 times
    if (retryCount >= 3) {
      return false
    }
    
    // Retry server errors (5xx) and network errors
    return true
  },
  
  // Get user-friendly error message
  getErrorMessage: (error: any) => {
    if (error?.message === 'Network request failed') {
      return 'Please check your internet connection'
    }
    
    if (error?.status === 404) {
      return 'The requested data could not be found'
    }
    
    if (error?.status >= 500) {
      return 'Server error. Please try again later'
    }
    
    return error?.message || 'An unexpected error occurred'
  },
}

export default queryConfig
