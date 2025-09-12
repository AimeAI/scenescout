import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { Event, EventCategory, EventFilters, MapBounds } from '@/types'
import { queryKeys } from '@/lib/react-query'

const supabase = createSafeSupabaseClient()

// Base query for fetching events
export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: [...queryKeys.events, filters],
    queryFn: async (): Promise<Event[]> => {
      if (!supabase) {
        console.log('Supabase not configured, returning mock events data')
        return generateMockEvents()
      }

      let query = supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())

      // Apply filters
      if (filters?.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories)
      }

      if (filters?.city) {
        query = query.eq('city_id', filters.city)
      }

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo)
      }

      if (filters?.isFree) {
        query = query.eq('is_free', true)
      } else if (filters?.priceMax) {
        query = query.or(`is_free.eq.true,price_min.lte.${filters.priceMax}`)
      }

      if (filters?.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
      }

      // Apply sorting
      switch (filters?.sort) {
        case 'date':
          query = query.order('date', { ascending: true })
          break
        case 'price':
          query = query.order('price_min', { ascending: true, nullsFirst: false })
          break
        case 'popularity':
          query = query.order('view_count', { ascending: false, nullsFirst: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(50)

      if (error) throw error

      return data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
      })) as Event[]
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
        console.log('Supabase not configured, returning mock infinite events data')
        const mockEvents = generateMockEvents().slice(pageParam * pageSize, (pageParam + 1) * pageSize)
        return {
          events: mockEvents,
          nextCursor: mockEvents.length === pageSize ? pageParam + 1 : null,
        }
      }

      let query = supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())

      // Apply filters (same as useEvents)
      if (filters?.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories)
      }

      if (filters?.city) {
        query = query.eq('city_id', filters.city)
      }

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo)
      }

      if (filters?.isFree) {
        query = query.eq('is_free', true)
      } else if (filters?.priceMax) {
        query = query.or(`is_free.eq.true,price_min.lte.${filters.priceMax}`)
      }

      if (filters?.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
      }

      // Apply pagination
      query = query.range(pageParam * pageSize, (pageParam + 1) * pageSize - 1)

      // Apply sorting
      switch (filters?.sort) {
        case 'date':
          query = query.order('date', { ascending: true })
          break
        case 'price':
          query = query.order('price_min', { ascending: true, nullsFirst: false })
          break
        case 'popularity':
          query = query.order('view_count', { ascending: false, nullsFirst: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error

      const events = data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
      })) as Event[]

      return {
        events,
        nextCursor: events.length === pageSize ? pageParam + 1 : null,
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
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_featured', true)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
        hotness_score: Math.random() * 100, // TODO: Implement real hotness scoring
      })) as Event[]
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Events by category query
export function useEventsByCategory(category: EventCategory) {
  return useQuery({
    queryKey: queryKeys.eventsByCategory(category),
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('category', category)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
      })) as Event[]
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
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues!inner(name, latitude, longitude, address)
        `)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .gte('venue.latitude', bounds.south)
        .lte('venue.latitude', bounds.north)
        .gte('venue.longitude', bounds.west)
        .lte('venue.longitude', bounds.east)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
      })) as Event[]
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

      return {
        ...data,
        event_date: data.date,
        venue_name: data.venue?.name,
        city_name: data.city?.name,
      } as Event
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
      const { error } = await supabase.rpc('increment_event_views', {
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
      if (save) {
        const { error } = await supabase
          .from('user_events')
          .insert({ event_id: eventId, user_id: (await supabase.auth.getUser()).data.user?.id })

        if (error) throw error
      } else {
        const { error } = await supabase
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

      let supabaseQuery = supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.name.ilike.%${query}%`)

      // Apply additional filters
      if (filters?.categories && filters.categories.length > 0) {
        supabaseQuery = supabaseQuery.in('category', filters.categories)
      }

      if (filters?.city) {
        supabaseQuery = supabaseQuery.eq('city_id', filters.city)
      }

      const { data, error } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      return data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
      })) as Event[]
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Mock data generation for fallback when Supabase is not configured
function generateMockEvents(count = 50): Event[] {
  const categories: EventCategory[] = ['music', 'sports', 'arts', 'food', 'tech', 'social', 'business', 'education']
  const venues = [
    { name: 'Madison Square Garden', lat: 40.7505, lng: -73.9934 },
    { name: 'Brooklyn Bowl', lat: 40.7214, lng: -73.9618 },
    { name: 'Lincoln Center', lat: 40.7722, lng: -73.9838 },
    { name: 'Central Park', lat: 40.7851, lng: -73.9683 },
    { name: 'Times Square', lat: 40.7580, lng: -73.9855 },
    { name: 'High Line', lat: 40.7480, lng: -74.0048 },
  ]

  return Array.from({ length: count }, (_, i) => {
    const venue = venues[i % venues.length]
    const category = categories[i % categories.length]
    
    return {
      id: `mock-${i}`,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Event ${i + 1}`,
      description: `An amazing ${category} event you won't want to miss`,
      event_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      venue_id: `venue-${i}`,
      venue_name: venue.name,
      venue: {
        name: venue.name,
        latitude: venue.lat + (Math.random() - 0.5) * 0.01,
        longitude: venue.lng + (Math.random() - 0.5) * 0.01,
        address: `${venue.name} Address`,
      } as any,
      city_id: 'nyc',
      city_name: 'New York',
      category: category,
      image_url: `https://images.unsplash.com/photo-${1500000000000 + i}?w=400&h=225&fit=crop`,
      video_url: Math.random() > 0.7 ? `https://sample-videos.com/zip/10/mp4/SampleVideo_${(i % 5) + 1}280x720_1mb.mp4` : undefined,
      price_min: Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 10 : undefined,
      is_featured: Math.random() > 0.8,
      is_free: Math.random() > 0.7,
      is_approved: true,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_by: 'system',
      view_count: Math.floor(Math.random() * 1000)
    } as Event
  })
}