import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { venuesService, type VenueFilters, type VenueWithDistance } from '@/services/venues.service'

// Query keys
export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  list: (filters: VenueFilters) => [...venueKeys.lists(), filters] as const,
  details: () => [...venueKeys.all, 'detail'] as const,
  detail: (id: string) => [...venueKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radius: number) => [...venueKeys.all, 'nearby', lat, lng, radius] as const,
  search: (query: string) => [...venueKeys.all, 'search', query] as const,
  stats: () => [...venueKeys.all, 'stats'] as const,
  categories: () => [...venueKeys.all, 'categories'] as const,
}

// Get venues with filters
export function useVenues(filters: VenueFilters = {}) {
  return useQuery({
    queryKey: venueKeys.list(filters),
    queryFn: () => venuesService.getVenues(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get nearby venues
export function useNearbyVenues(
  lat?: number, 
  lng?: number, 
  radius = 5,
  limit = 50
) {
  return useQuery({
    queryKey: venueKeys.nearby(lat!, lng!, radius),
    queryFn: () => venuesService.getNearbyVenues(lat!, lng!, radius, limit),
    enabled: lat != null && lng != null,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get single venue
export function useVenue(id: string) {
  return useQuery({
    queryKey: venueKeys.detail(id),
    queryFn: () => venuesService.getVenue(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Search venues
export function useVenueSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: venueKeys.search(query),
    queryFn: () => venuesService.searchVenues(query, limit),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get venue categories
export function useVenueCategories() {
  return useQuery({
    queryKey: venueKeys.categories(),
    queryFn: () => venuesService.getVenueCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Get venue statistics
export function useVenueStats() {
  return useQuery({
    queryKey: venueKeys.stats(),
    queryFn: () => venuesService.getVenueStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get venues by source
export function useVenuesBySource(
  source: 'google_places' | 'yelp' | 'manual',
  filters: VenueFilters = {}
) {
  return useQuery({
    queryKey: [...venueKeys.lists(), source, filters],
    queryFn: () => venuesService.getVenuesBySource(source, filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}