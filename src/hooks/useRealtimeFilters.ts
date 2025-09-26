import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Event, EventFilters, EventCategory, MapBounds } from '@/types'
import { filterEventsClientSide, sortEvents } from '@/lib/event-normalizer'
import { queryKeys } from '@/lib/react-query'
import { useRealtimeEvents } from './useRealtimeEvents'

interface UseRealtimeFiltersOptions {
  initialFilters?: EventFilters
  bounds?: MapBounds
  debounceMs?: number
  maxResults?: number
}

// Hook for real-time filtering and search
export function useRealtimeFilters({
  initialFilters = {},
  bounds,
  debounceMs = 300,
  maxResults = 100
}: UseRealtimeFiltersOptions = {}) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<EventFilters>(initialFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounce search query
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setIsFiltering(true)
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setIsFiltering(false)
    }, debounceMs)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchQuery, debounceMs])

  // Setup real-time updates with current filters
  const { isConnected, updates } = useRealtimeEvents({
    bounds,
    categories: filters.categories,
    enabled: true,
    onEventUpdate: (update) => {
      // Real-time filter application
      applyFiltersRealtime([update.event])
    }
  })

  // Get all cached events from React Query
  const getAllCachedEvents = useCallback((): Event[] => {
    const eventsCache = queryClient.getQueriesData({ queryKey: queryKeys.events })
    const allEvents: Event[] = []

    eventsCache.forEach(([, data]) => {
      if (Array.isArray(data)) {
        allEvents.push(...data)
      }
    })

    // Remove duplicates by ID
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    )

    return uniqueEvents
  }, [queryClient])

  // Apply filters in real-time
  const applyFiltersRealtime = useCallback((newEvents?: Event[]) => {
    setIsFiltering(true)

    // Use a timeout to batch rapid filter changes
    setTimeout(() => {
      const allEvents = newEvents || getAllCachedEvents()
      
      // Apply text search filter
      let searchFiltered = allEvents
      if (debouncedQuery.trim()) {
        const query = debouncedQuery.toLowerCase().trim()
        searchFiltered = allEvents.filter(event => 
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.venue_name?.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      }

      // Apply other filters
      const filtered = filterEventsClientSide(searchFiltered, {
        ...filters,
        bounds
      })

      // Sort and limit results
      const sorted = sortEvents(filtered, filters.sort || 'date')
      const limited = sorted.slice(0, maxResults)

      setFilteredEvents(limited)
      setIsFiltering(false)
    }, 50) // Small delay to batch rapid changes
  }, [getAllCachedEvents, debouncedQuery, filters, bounds, maxResults])

  // Apply filters when they change
  useEffect(() => {
    applyFiltersRealtime()
  }, [applyFiltersRealtime])

  // Filter update functions
  const updateFilters = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const addCategory = useCallback((category: EventCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories ? [...prev.categories, category] : [category]
    }))
  }, [])

  const removeCategory = useCallback((category: EventCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories?.filter(c => c !== category) || []
    }))
  }, [])

  const toggleCategory = useCallback((category: EventCategory) => {
    setFilters(prev => {
      const categories = prev.categories || []
      const hasCategory = categories.includes(category)
      
      return {
        ...prev,
        categories: hasCategory 
          ? categories.filter(c => c !== category)
          : [...categories, category]
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchQuery('')
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    
    if (filters.categories?.length) count += filters.categories.length
    if (filters.dateRange) count += 1
    if (filters.priceRange) count += 1
    if (filters.showFreeOnly) count += 1
    if (filters.showFeaturedOnly) count += 1
    if (filters.showVideoOnly) count += 1
    if (debouncedQuery.trim()) count += 1
    
    return count
  }, [filters, debouncedQuery])

  // Quick filter presets
  const applyPreset = useCallback((preset: string) => {
    switch (preset) {
      case 'free':
        updateFilters({ showFreeOnly: true })
        break
      case 'featured':
        updateFilters({ showFeaturedOnly: true })
        break
      case 'video':
        updateFilters({ showVideoOnly: true })
        break
      case 'today':
        updateFilters({ 
          dateRange: {
            start: new Date(),
            end: new Date()
          }
        })
        break
      case 'this-weekend':
        const now = new Date()
        const friday = new Date(now)
        friday.setDate(now.getDate() + (5 - now.getDay()))
        const sunday = new Date(friday)
        sunday.setDate(friday.getDate() + 2)
        
        updateFilters({
          dateRange: {
            start: friday,
            end: sunday
          }
        })
        break
      case 'music':
        updateFilters({ categories: ['music'] })
        break
      case 'food':
        updateFilters({ categories: ['food'] })
        break
      case 'arts':
        updateFilters({ categories: ['arts'] })
        break
      default:
        break
    }
  }, [updateFilters])

  return {
    // Current state
    filters,
    searchQuery,
    debouncedQuery,
    filteredEvents,
    isFiltering,
    isConnected,
    activeFilterCount,
    
    // Filter update functions
    updateFilters,
    updateSearchQuery,
    addCategory,
    removeCategory,
    toggleCategory,
    clearFilters,
    clearSearch,
    applyPreset,
    
    // Real-time updates
    recentUpdates: updates,
    
    // Manual refresh
    refresh: applyFiltersRealtime
  }
}

// Hook for real-time category filtering with counts
export function useRealtimeCategoryCounts() {
  const queryClient = useQueryClient()
  const [categoryCounts, setCategoryCounts] = useState<Record<EventCategory, number>>({
    music: 0,
    sports: 0,
    arts: 0,
    food: 0,
    tech: 0,
    social: 0,
    business: 0,
    education: 0,
    health: 0,
    family: 0,
    other: 0
  })

  const { updates } = useRealtimeEvents({
    enabled: true,
    onEventUpdate: () => {
      // Recalculate counts when events change
      updateCounts()
    }
  })

  const updateCounts = useCallback(() => {
    const eventsCache = queryClient.getQueriesData({ queryKey: queryKeys.events })
    const allEvents: Event[] = []

    eventsCache.forEach(([, data]) => {
      if (Array.isArray(data)) {
        allEvents.push(...data)
      }
    })

    // Count events by category
    const counts = allEvents.reduce((acc, event) => {
      const category = event.category as EventCategory
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<EventCategory, number>)

    // Ensure all categories have a count  
    const categories: EventCategory[] = ['music', 'sports', 'arts', 'food', 'tech', 'social', 'business', 'education', 'health', 'family', 'other']
    const fullCounts = categories.reduce((acc, category) => {
      acc[category] = counts[category] || 0
      return acc
    }, {} as Record<EventCategory, number>)

    setCategoryCounts(fullCounts)
  }, [queryClient])

  useEffect(() => {
    updateCounts()
  }, [updateCounts, updates])

  return categoryCounts
}

// Hook for real-time map bounds filtering
export function useRealtimeMapFilters(initialBounds?: MapBounds) {
  const queryClient = useQueryClient()
  const [bounds, setBounds] = useState<MapBounds | undefined>(initialBounds)
  const [mapEvents, setMapEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { isConnected, updates } = useRealtimeEvents({
    bounds,
    enabled: !!bounds,
    onEventUpdate: (update) => {
      // Update map events in real-time
      updateMapEvents([update.event])
    }
  })

  const updateMapEvents = useCallback((newEvents?: Event[]) => {
    if (!bounds) return

    setIsLoading(true)
    
    setTimeout(() => {
      const eventsCache = queryClient.getQueriesData({ queryKey: queryKeys.events })
      const allEvents: Event[] = []

      eventsCache.forEach(([, data]) => {
        if (Array.isArray(data)) {
          allEvents.push(...data)
        }
      })

      // Filter events within bounds
      const eventsInBounds = allEvents.filter(event => {
        if (!event.venue?.latitude || !event.venue?.longitude) return false
        
        const { latitude, longitude } = event.venue
        return (
          latitude >= bounds.south &&
          latitude <= bounds.north &&
          longitude >= bounds.west &&
          longitude <= bounds.east
        )
      })

      setMapEvents(eventsInBounds)
      setIsLoading(false)
    }, 100)
  }, [bounds, queryClient])

  useEffect(() => {
    updateMapEvents()
  }, [updateMapEvents, bounds])

  return {
    bounds,
    setBounds,
    mapEvents,
    isLoading,
    isConnected,
    recentUpdates: updates,
    refresh: updateMapEvents
  }
}
