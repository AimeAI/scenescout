import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import { Search, Filter, Grid, List, MapPin } from 'lucide-react'
import { useLocalEvents } from '@/hooks/useLocationEvents'
import { useBackgroundIngestion } from '@/hooks/useBackgroundIngestion'
import { locationService } from '@/services/location.service'
import { EventCard } from '@/components/events/EventCard'
import { EventFiltersModal } from '@/components/filters/EventFiltersModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EventFilters } from '@/services/events.service'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'

const DefaultIcon = L.icon({
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Component to handle map events
function MapEventHandler() {
  const { debouncedIngestForLocation } = useBackgroundIngestion()
  
  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const center = map.getCenter()
      const bounds = map.getBounds()
      
      // Calculate radius from bounds (rough approximation)
      const ne = bounds.getNorthEast()
      const radius = Math.min(
        map.distance([center.lat, center.lng], [ne.lat, center.lng]),
        map.distance([center.lat, center.lng], [center.lat, ne.lng])
      )
      
      // Trigger background ingestion for the new area
      debouncedIngestForLocation(center.lat, center.lng, Math.min(radius, 5000))
    }
  })
  
  return null
}

interface MapEvent {
  id: string
  title: string
  description: string | null
  date: string
  time?: string | null
  venue_name?: string | null
  venue_address?: string | null
  latitude?: number | null
  longitude?: number | null
  image_url?: string | null
  video_url?: string | null
  price_min?: number | null
  price_max?: number | null
  is_free?: boolean
  category: string
}

export function MapPage() {
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([43.6532, -79.3832]) // Toronto default
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<EventFilters>({})
  
  // Get location-based events within 50km
  const { data: events = [], isLoading, error } = useLocalEvents(50)
  
  // Set map center to user location when available
  useEffect(() => {
    locationService.getCurrentLocation().then((location) => {
      setMapCenter([location.latitude, location.longitude])
    }).catch(() => {
      // Keep default center if location fails
      setMapCenter([43.6532, -79.3832])
    })
  }, [])

  // Filter events with location data
  const eventsWithLocation = useMemo(() => {
    return events.filter(event => 
      event.latitude && 
      event.longitude && 
      (!searchQuery || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [events, searchQuery])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Unable to load map</h2>
          <p className="text-white/60">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  const renderMapView = () => (
    <div className="h-full relative">
      <MapContainer
        center={mapCenter}
        zoom={12}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventHandler />
        {eventsWithLocation.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude!, event.longitude!]}
            eventHandlers={{
              click: () => setSelectedEvent(event)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{event.venue_name}</p>
                <p className="text-xs text-gray-500 mb-2">{new Date(event.date).toLocaleDateString()}</p>
                <Button 
                  size="sm" 
                  onClick={() => setSelectedEvent(event)}
                  className="w-full"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )

  const renderListView = () => (
    <div className="h-full overflow-y-auto bg-black p-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : eventsWithLocation.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <MapPin size={48} className="mx-auto mb-4" />
          <p>No events found with location data</p>
          {searchQuery && (
            <p className="text-sm mt-2">Try adjusting your search terms</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventsWithLocation.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              size="small"
              className={cn(
                "cursor-pointer transition-all",
                selectedEvent?.id === event.id && "ring-2 ring-purple-500"
              )}
              onClick={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search events, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-white/40"
              />
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowFilters(true)}
              className="text-white/60 hover:text-white"
            >
              <Filter size={16} className="mr-2" />
              Filters
              {Object.keys(filters).length > 0 && (
                <Badge className="ml-2 bg-purple-600">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-900 rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="h-8"
            >
              <Grid size={16} />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="h-8"
            >
              <MapPin size={16} />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-white/60">
          {isLoading ? 'Loading...' : `${eventsWithLocation.length} events found`}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          renderMapView()
        ) : viewMode === 'list' ? (
          renderListView()
        ) : (
          // Split view
          <div className="h-full flex">
            {/* List Side */}
            <div className="w-1/2 border-r border-gray-800">
              {renderListView()}
            </div>
            
            {/* Map Side */}
            <div className="w-1/2">
              {renderMapView()}
            </div>
          </div>
        )}
      </div>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedEvent.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              
              {selectedEvent.image_url && (
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="space-y-4 text-white">
                <p className="text-white/80">{selectedEvent.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Date:</span>
                    <p>{new Date(selectedEvent.date).toLocaleDateString()}</p>
                  </div>
                  {selectedEvent.time && (
                    <div>
                      <span className="text-white/60">Time:</span>
                      <p>{selectedEvent.time}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-white/60">Venue:</span>
                    <p>{selectedEvent.venue_name}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Category:</span>
                    <p className="capitalize">{selectedEvent.category}</p>
                  </div>
                </div>

                {selectedEvent.venue_address && (
                  <div>
                    <span className="text-white/60">Address:</span>
                    <p className="text-sm">{selectedEvent.venue_address}</p>
                  </div>
                )}

                <div className="flex space-x-4 pt-4">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Get Tickets
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    Save Event
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      <EventFiltersModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
        currentFilters={filters}
      />
    </div>
  )
}