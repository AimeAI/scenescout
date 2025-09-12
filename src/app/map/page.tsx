'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { Maximize2, Minimize2, List, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import AppLayout from '@/components/layout/AppLayout'
import { MapFilters } from '@/components/map/MapFilters'
import { NetflixEventCard } from '@/components/events/NetflixEventCard'
import { Event, MapFilter, EventCategory, MapBounds } from '@/types'

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
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]) // NYC default
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

  const supabase = createSafeSupabaseClient()

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, filters, mapBounds])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      
      // Get user's location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapCenter([position.coords.latitude, position.coords.longitude])
          },
          (error) => {
            console.log('Geolocation not available:', error)
          },
          { timeout: 5000 }
        )
      }

      if (!supabase) {
        console.log('Supabase not configured, using mock events for map')
        setEvents(generateMockEvents())
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(name, latitude, longitude, address),
          city:cities(name, slug)
        `)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('Error fetching events:', error)
        setEvents(generateMockEvents())
        return
      }

      const transformedEvents: Event[] = data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
      })) as Event[]

      setEvents(transformedEvents.length > 0 ? transformedEvents : generateMockEvents())
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents(generateMockEvents())
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(event => 
        filters.categories.includes(event.category as EventCategory)
      )
    }

    // Date range filter
    filtered = filtered.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= filters.dateRange.start && eventDate <= filters.dateRange.end
    })

    // Price filter
    if (filters.isFree) {
      filtered = filtered.filter(event => event.is_free)
    } else {
      filtered = filtered.filter(event => {
        if (event.is_free) return true
        if (!event.price_min) return true
        return event.price_min <= filters.priceRange.max
      })
    }

    // Video filter
    if (filters.showVideoOnly) {
      filtered = filtered.filter(event => event.video_url)
    }

    // Map bounds filter (only show events visible on map)
    if (mapBounds) {
      filtered = filtered.filter(event => {
        if (!event.venue?.latitude || !event.venue?.longitude) return false
        
        return (
          event.venue.latitude >= mapBounds.south &&
          event.venue.latitude <= mapBounds.north &&
          event.venue.longitude >= mapBounds.west &&
          event.venue.longitude <= mapBounds.east
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

  // Mock event generation for fallback
  const generateMockEvents = (): Event[] => {
    const categories: EventCategory[] = ['music', 'sports', 'arts', 'food', 'tech', 'social']
    const venues = [
      { name: 'Madison Square Garden', lat: 40.7505, lng: -73.9934 },
      { name: 'Brooklyn Bowl', lat: 40.7214, lng: -73.9618 },
      { name: 'Lincoln Center', lat: 40.7722, lng: -73.9838 },
      { name: 'Central Park', lat: 40.7851, lng: -73.9683 },
      { name: 'Times Square', lat: 40.7580, lng: -73.9855 },
      { name: 'High Line', lat: 40.7480, lng: -74.0048 },
    ]

    return Array.from({ length: 100 }, (_, i) => {
      const venue = venues[i % venues.length]
      const category = categories[i % categories.length]
      
      const eventDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      
      return {
        id: `mock-${i}`,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Event ${i + 1}`,
        description: `An amazing ${category} event you won't want to miss`,
        date: eventDate,
        event_date: eventDate,
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
        submitted_by: 'system'
      }
    })
  }

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