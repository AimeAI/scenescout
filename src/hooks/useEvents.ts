import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { Event, EventCategory, EventFilters, MapBounds } from '@/types'
import { queryKeys } from '@/lib/react-query'
import { filterEventsClientSide, sortEvents, transformEventRow } from '@/lib/event-normalizer'

const supabase = createSafeSupabaseClient()

// Base query for fetching events with location awareness
export function useEvents(filters?: EventFilters, userLocation?: { latitude: number; longitude: number }) {
  return useQuery({
    queryKey: [...queryKeys.events, filters, userLocation],
    queryFn: async (): Promise<Event[]> => {
      const params = new URLSearchParams()
      
      // Add user location for radius-based filtering
      if (userLocation) {
        params.append('lat', userLocation.latitude.toString())
        params.append('lng', userLocation.longitude.toString())
      }
      
      if (filters?.categories?.length) {
        params.append('category', filters.categories[0])
      }
      
      if (filters?.showFeaturedOnly) {
        params.append('featured', 'true')
      }
      
      if (filters?.showFreeOnly) {
        params.append('isFree', 'true')
      }
      
      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds
        params.append('bounds', `${north},${south},${east},${west}`)
      }
      
      // Add advanced filters
      if (filters?.priceMin !== undefined) {
        params.append('priceMin', filters.priceMin.toString())
      }
      if (filters?.priceMax !== undefined) {
        params.append('priceMax', filters.priceMax.toString())
      }
      
      params.append('limit', '50')

      const response = await fetch(`/api/events?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const { events } = await response.json()
      
      if (!Array.isArray(events)) {
        throw new Error('Invalid response format')
      }

      const filtered = sortEvents(filterEventsClientSide(events, filters), filters?.sort)
      return filtered
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Infinite query for scrollable event lists
export function useInfiniteEvents(filters?: EventFilters, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.events, 'infinite', filters],
    queryFn: async ({ pageParam = 0 }): Promise<{ events: Event[]; nextCursor: number | null }> => {
      if (!supabase) {
        throw new Error('Supabase not configured. Please check your environment variables.')
      }

      const fetchMultiplier = 3
      const fetchSize = pageSize * fetchMultiplier
      const from = pageParam * fetchSize
      const to = from + fetchSize - 1

      const client = supabase!

      const { data, error } = await client
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .neq('status', 'inactive')
        .order('start_time', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const normalized = (data ?? []).map(transformEventRow)
      const filtered = sortEvents(filterEventsClientSide(normalized, filters), filters?.sort)
      const events = filtered.slice(0, pageSize)

      return {
        events,
        nextCursor: filtered.length > pageSize || (data?.length ?? 0) === fetchSize ? pageParam + 1 : null,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Featured events query
export function useFeaturedEvents() {
  return useQuery({
    queryKey: queryKeys.featuredEvents(),
    queryFn: async (): Promise<Event[]> => {
      if (!supabase) {
        throw new Error('Supabase not configured. Please check your environment variables.')
      }
      const nowIso = new Date().toISOString()

      const client = supabase!

      const { data, error } = await client
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_featured', true)
        .neq('status', 'inactive')
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const normalized = (data ?? []).map(transformEventRow)
      return sortEvents(filterEventsClientSide(normalized), 'date')
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Events by category query with location awareness
export function useEventsByCategory(category: EventCategory, userLocation?: { latitude: number; longitude: number }) {
  return useQuery({
    queryKey: queryKeys.eventsByCategory(category),
    queryFn: async (): Promise<Event[]> => {
      const params = new URLSearchParams()
      params.append('category', category)
      params.append('limit', '20')

      // Add user location for radius-based filtering
      if (userLocation) {
        params.append('lat', userLocation.latitude.toString())
        params.append('lng', userLocation.longitude.toString())
        params.append('radius', '100') // 100km radius for category queries
      }

      const response = await fetch(`/api/events?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events for category ${category}: ${response.statusText}`)
      }

      const { events } = await response.json()
      
      if (!Array.isArray(events)) {
        throw new Error('Invalid response format')
      }

      return sortEvents(filterEventsClientSide(events, { categories: [category] }), 'date').slice(0, 20)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Events within map bounds query
export function useEventsByBounds(bounds: MapBounds) {
  const boundsKey = `${bounds.north},${bounds.south},${bounds.east},${bounds.west}`
  
  return useQuery({
    queryKey: queryKeys.eventsByBounds(boundsKey),
    queryFn: async (): Promise<Event[]> => {
      if (!supabase) {
        throw new Error('Supabase not configured. Please check your environment variables.')
      }
      const nowIso = new Date().toISOString()

      const client = supabase!

      const { data, error } = await client
        .from('events')
        .select(`
          *,
          venue:venues!inner(name, latitude, longitude, address)
        `)
        .neq('status', 'inactive')
        .gte('start_time', nowIso)
        .gte('venue.latitude', bounds.south)
        .lte('venue.latitude', bounds.north)
        .gte('venue.longitude', bounds.west)
        .lte('venue.longitude', bounds.east)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const normalized = (data ?? []).map(transformEventRow)
      return sortEvents(normalized, 'date')
    },
    staleTime: 1000 * 60 * 3, // 3 minutes (map data changes frequently)
    enabled: !!(bounds.north && bounds.south && bounds.east && bounds.west),
  })
}

// Single event query
export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: async (): Promise<Event> => {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address, phone, website),
          city:cities(name, slug, timezone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return transformEventRow(data)
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!id,
  })
}

// Mutation for tracking event views
export function useTrackEventView() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!supabase) return
      const client = supabase!

      const { error } = await client.rpc('increment_event_views', {
        event_id: eventId
      })

      if (error) throw error
    },
    onSuccess: (_, eventId) => {
      // Optimistically update the event view count
      queryClient.setQueryData(
        queryKeys.event(eventId),
        (oldEvent: Event | undefined) => oldEvent ? {
          ...oldEvent,
          view_count: (oldEvent.view_count || 0) + 1
        } : oldEvent
      )
    },
  })
}

// Mutation for saving/unsaving events
export function useSaveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, save }: { eventId: string; save: boolean }) => {
      if (!supabase) return
      if (save) {
        const client = supabase!

        const { error } = await client
          .from('user_events')
          .insert({ event_id: eventId, user_id: (await supabase.auth.getUser()).data.user?.id })

        if (error) throw error
      } else {
        const client = supabase!

        const { error } = await client
          .from('user_events')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

        if (error) throw error
      }
    },
    onSuccess: () => {
      // Invalidate user favorites
      queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites() })
    },
  })
}

// Search events query
export function useSearchEvents(query: string, filters?: EventFilters) {
  return useQuery({
    queryKey: queryKeys.search(query, filters),
    queryFn: async (): Promise<Event[]> => {
      if (!query || query.trim().length < 2) return []

      if (!supabase) {
        throw new Error('Supabase not configured. Please check your environment variables.')
      }
      const client = supabase!

      let supabaseQuery = client
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .neq('status', 'inactive')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.name.ilike.%${query}%`)

      // Apply additional filters
      if (filters?.categories && filters.categories.length > 0) {
        // client-side filtering ensures category normalization, but narrow the result set slightly
        supabaseQuery = supabaseQuery.or(filters.categories.map(cat => `category.ilike.%${cat}%`).join(','))
      }

      const { data, error } = await supabaseQuery
        .order('start_time', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(120)

      if (error) throw error

      const normalized = (data ?? []).map(transformEventRow)
      return sortEvents(filterEventsClientSide(normalized, filters), filters?.sort).slice(0, 30)
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Helper function to generate placeholder image URLs for events without images
function getPlaceholderImage(eventId: string, category: string): string {
  const categoryImages = {
    music: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=225&fit=crop',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=225&fit=crop',
    arts: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=225&fit=crop',
    food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=225&fit=crop',
    tech: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=225&fit=crop',
    social: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=225&fit=crop',
    business: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop',
    education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=225&fit=crop',
  }
  return categoryImages[category as keyof typeof categoryImages] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=225&fit=crop'
}
