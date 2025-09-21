'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { Maximize2, Minimize2, List, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLayout } from '@/components/layout/AppLayout'
import { MapFilters } from '@/components/map/MapFilters'
import { NetflixEventCard } from '@/components/events/NetflixEventCard'
import { Event, MapFilter, EventCategory, MapBounds } from '@/types'
import { filterEventsClientSide, transformEventRow } from '@/lib/event-normalizer'

// Dynamic import for EventMap to avoid SSR issues
const EventMap = dynamic(() => import('@/components/map/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-white/60">Loading map...</div>
    </div>
  )
})

type ViewMode = 'split' | 'map-only' | 'list-only'

export default function MapPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]) // Default center
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [filters, setFilters] = useState<MapFilter>({
    categories: [] as EventCategory[],
    dateRange: { 
      start: new Date(), 
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
    },
    priceRange: { min: 0, max: 1000 },
    isFree: false,
    showVideoOnly: false,
  })

  const { location, loading: locationLoading } = useUserLocation()

  useEffect(() => {
    if (location) {
      setMapCenter([location.latitude, location.longitude])
      fetchEvents(location.latitude, location.longitude)
    } else {
      fetchEvents()
    }
  }, [location])

  useEffect(() => {
    filterEvents()
  }, [events, filters, mapBounds])

  const fetchEvents = async (userLat?: number, userLng?: number) => {
    try {
      setLoading(true)

      // Build API URL with location parameters
      const params = new URLSearchParams()
      params.append('limit', '1000')
      
      if (userLat && userLng) {
        params.append('lat', userLat.toString())
        params.append('lng', userLng.toString())
        params.append('radius', '100') // 100km radius for map view
      }

      const response = await fetch(`/api/events?${params.toString()}`)
      
      if (!response.ok) {
        console.error('Failed to fetch events from API:', response.statusText)
        setEvents([]) // No fallback to mock data
        return
      }

      const { events: apiEvents } = await response.json()
      
      if (!Array.isArray(apiEvents)) {
        console.error('Invalid events data format')
        setEvents([])
        return
      }

      // Only use events with valid coordinates - no mock data
      const eventsWithCoords = apiEvents.filter((event: any) => {
        const lat = event.venue?.latitude || event.latitude
        const lng = event.venue?.longitude || event.longitude
        return lat && lng && !isNaN(lat) && !isNaN(lng) && 
               event.source !== 'mock' && !event.id.startsWith('mock-')
      })

      setEvents(eventsWithCoords)
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = filterEventsClientSide(events, {
      categories: filters.categories,
      dateFrom: filters.dateRange.start.toISOString(),
      dateTo: filters.dateRange.end.toISOString(),
      priceMin: filters.priceRange.min > 0 ? filters.priceRange.min : undefined,
      priceMax: filters.priceRange.max,
      isFree: filters.isFree,
    })

    // Video filter
    if (filters.showVideoOnly) {
      filtered = filtered.filter(event => event.video_url)
    }

    // Map bounds filter (only show events visible on map)
    if (mapBounds) {
      filtered = filtered.filter(event => {
        const latitude = event.venue?.latitude ?? null
        const longitude = event.venue?.longitude ?? null
        if (latitude == null || longitude == null) return false

        return (
          latitude >= mapBounds.south &&
          latitude <= mapBounds.north &&
          longitude >= mapBounds.west &&
          longitude <= mapBounds.east
        )
      })
    }

    setFilteredEvents(filtered)
  }

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event)
    
    // Scroll to event in list if in split view
    if (viewMode === 'split') {
      const eventElement = document.getElementById(`event-${event.id}`)
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleMapBoundsChange = (bounds: MapBounds) => {
    setMapBounds(bounds)
  }

  // No mock data - removed entirely

  return (
    <AppLayout>
      <div className="h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">Event Map</h1>
              <span className="text-sm text-white/60">
                {filteredEvents.length} events found
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list-only')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list-only' 
                    ? "bg-white/20 text-white" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
                title="List View"
              >
                <List size={16} />
              </button>
              
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'split' 
                    ? "bg-white/20 text-white" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
                title="Split View"
              >
                <Maximize2 size={16} />
              </button>
              
              <button
                onClick={() => setViewMode('map-only')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'map-only' 
                    ? "bg-white/20 text-white" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
                title="Map View"
              >
                <MapIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Event List */}
          {(viewMode === 'split' || viewMode === 'list-only') && (
            <div className={cn(
              "bg-gray-900 border-r border-white/10 flex flex-col",
              viewMode === 'split' ? "w-1/3" : "w-full"
            )}>
              {/* Filters */}
              <div className="flex-shrink-0 p-4">
                <MapFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  eventCount={filteredEvents.length}
                />
              </div>

              {/* Event List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {filteredEvents.map(event => (
                      <div
                        key={event.id}
                        id={`event-${event.id}`}
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          selectedEvent?.id === event.id && "ring-2 ring-purple-500"
                        )}
                        onClick={() => handleEventSelect(event)}
                      >
                        <NetflixEventCard
                          event={event}
                          size="medium"
                          showHoverPreview={false}
                        />
                      </div>
                    ))}
                    
                    {filteredEvents.length === 0 && (
                      <div className="text-center py-12 text-white/60">
                        <MapIcon size={48} className="mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-medium mb-2">No events found</h3>
                        <p className="text-sm">
                          Try adjusting your filters or zooming out on the map
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          {(viewMode === 'split' || viewMode === 'map-only') && (
            <div className={cn(
              "relative",
              viewMode === 'split' ? "flex-1" : "w-full"
            )}>
              <EventMap
                events={filteredEvents}
                center={mapCenter}
                zoom={12}
                height="100%"
                onEventSelect={handleEventSelect}
                onBoundsChange={handleMapBoundsChange}
                filters={filters}
                onFiltersChange={setFilters}
                showFilters={viewMode === 'map-only'}
                className="w-full h-full"
              />

              {/* Map-only filters */}
              {viewMode === 'map-only' && (
                <div className="absolute top-4 left-4 z-[1000] w-80">
                  <MapFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    eventCount={filteredEvents.length}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
