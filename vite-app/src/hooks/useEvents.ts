import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsService, type EventFilters } from '@/services/events.service'
import { userEventsService } from '@/services/user-events.service'

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  featured: () => [...eventKeys.all, 'featured'] as const,
  nearby: (lat: number, lng: number) => [...eventKeys.all, 'nearby', lat, lng] as const,
  search: (query: string) => [...eventKeys.all, 'search', query] as const,
  userSaved: (userId: string) => [...eventKeys.all, 'userSaved', userId] as const,
}

// Get events with filters (location-aware)
export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsService.getEvents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get events for user's current city
export function useLocationEvents(cityId?: string, filters: EventFilters = {}) {
  const locationFilters = cityId ? { ...filters, cityId } : filters;
  
  return useQuery({
    queryKey: [...eventKeys.list(locationFilters), 'location'],
    queryFn: () => eventsService.getEvents(locationFilters),
    enabled: true, // Always enabled, will show general events if no cityId
    staleTime: 5 * 60 * 1000,
  })
}

// Get featured events
export function useFeaturedEvents(limit = 10) {
  return useQuery({
    queryKey: [...eventKeys.featured(), limit],
    queryFn: () => eventsService.getFeaturedEvents(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get single event
export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getEvent(id),
    enabled: !!id,
  })
}

// Get nearby events
export function useNearbyEvents(lat?: number, lng?: number, radius = 10) {
  return useQuery({
    queryKey: eventKeys.nearby(lat!, lng!),
    queryFn: () => eventsService.getNearbyEvents(lat!, lng!, radius),
    enabled: lat != null && lng != null,
    staleTime: 5 * 60 * 1000,
  })
}

// Search events
export function useSearchEvents(query: string) {
  return useQuery({
    queryKey: eventKeys.search(query),
    queryFn: () => eventsService.searchEvents(query),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Infinite scroll events
export function useInfiniteEvents(filters: EventFilters = {}) {
  return useInfiniteQuery({
    queryKey: [...eventKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam }) => eventsService.getEventsInfinite(pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
  })
}

// Get user's saved events
export function useSavedEvents(userId: string) {
  return useQuery({
    queryKey: eventKeys.userSaved(userId),
    queryFn: () => userEventsService.getSavedEvents(userId),
    enabled: !!userId,
  })
}

// Check if event is saved
export function useIsEventSaved(eventId: string) {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), 'saved'],
    queryFn: () => userEventsService.isEventSaved(eventId),
    enabled: !!eventId,
  })
}

// Save event mutation
export function useSaveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userEventsService.saveEvent,
    onSuccess: (_, eventId) => {
      // Invalidate saved events queries
      queryClient.invalidateQueries({ queryKey: eventKeys.userSaved('') })
      queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'saved'] })
    },
  })
}

// Unsave event mutation
export function useUnsaveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userEventsService.unsaveEvent,
    onSuccess: (_, eventId) => {
      // Invalidate saved events queries
      queryClient.invalidateQueries({ queryKey: eventKeys.userSaved('') })
      queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'saved'] })
    },
  })
}

// Track event view
export function useTrackEventView() {
  return useMutation({
    mutationFn: eventsService.incrementViews,
  })
}