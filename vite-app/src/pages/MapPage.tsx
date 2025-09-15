import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import { Search, Filter, Grid, List, MapPin, Building2 } from 'lucide-react'
import { useLocalEvents } from '@/hooks/useLocationEvents'
import { useNearbyVenues } from '@/hooks/useVenues'
import { useBackgroundIngestion } from '@/hooks/useBackgroundIngestion'
import { apiIngestionService } from '@/services/api-ingestion.service'
import { locationService } from '@/services/location.service'
import { EventCard } from '@/components/events/EventCard'
import { VenueCard } from '@/components/venues/VenueCard'
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

// Venue marker icon (different color)
const VenueIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path fill="#10b981" stroke="#065f46" stroke-width="1" 
            d="M12.5,0 C19.4,0 25,5.6 25,12.5 C25,19.4 12.5,41 12.5,41 C12.5,41 0,19.4 0,12.5 C0,5.6 5.6,0 12.5,0 Z"/>
      <circle fill="white" cx="12.5" cy="12.5" r="6"/>
      <path fill="#065f46" d="M12.5,7 L10,10 L11.5,10 L11.5,17 L13.5,17 L13.5,10 L15,10 Z"/>
    </svg>
  `),
  shadowUrl: '/leaflet/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Component to handle map events
function MapEventHandler() {
  useMapEvents({
    moveend: async (e) => {
      const map = e.target
      const center = map.getCenter()
      const bounds = map.getBounds()
      
      // Calculate radius from bounds (rough approximation)
      const ne = bounds.getNorthEast()
      const radius = Math.min(
        map.distance([center.lat, center.lng], [ne.lat, center.lng]),
        map.distance([center.lat, center.lng], [center.lat, ne.lng])
      )
      
      // Trigger real-time venue ingestion for the new area
      try {
        await apiIngestionService.ingestNearbyVenues({
          lat: center.lat,
          lng: center.lng,
          radius: Math.min(radius, 3000) // Max 3km radius
        })
      } catch (error) {
        console.error('Background ingestion failed:', error)
      }
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
  const [contentType, setContentType] = useState<'events' | 'venues' | 'both'>('both')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([43.6532, -79.3832]) // Toronto default
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<EventFilters>({})
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  
  // Get location-based events within 50km
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useLocalEvents(50)
  
  // Get nearby venues within 10km
  const { data: venues = [], isLoading: venuesLoading } = useNearbyVenues(
    currentLocation?.lat,
    currentLocation?.lng,
    10,
    100
  )
  
  // Set map center to user location when available
  useEffect(() => {
    locationService.getCurrentLocation().then((location) => {
      setMapCenter([location.latitude, location.longitude])
      setCurrentLocation({ lat: location.latitude, lng: location.longitude })
    }).catch(() => {
      // Keep default center if location fails
      setMapCenter([43.6532, -79.3832])
      setCurrentLocation({ lat: 43.6532, lng: -79.3832 })
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

  // Filter venues based on search
  const filteredVenues = useMemo(() => {
    return venues.filter(venue =>
      !searchQuery ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [venues, searchQuery])

  if (eventsError) {
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
        
        {/* Event Markers */}
        {(contentType === 'events' || contentType === 'both') && eventsWithLocation.map((event) => (
          <Marker
            key={`event-${event.id}`}
            position={[event.latitude!, event.longitude!]}
            icon={DefaultIcon}
            eventHandlers={{
              click: () => setSelectedEvent(event)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center mb-2">
                  <Badge className="bg-blue-500 text-white text-xs mr-2">Event</Badge>
                  <span className="text-xs text-gray-500">{event.category}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{event.venue_name}</p>
                <p className="text-xs text-gray-500 mb-2">{new Date(event.date).toLocaleDateString()}</p>
                {(event.price_min || event.is_free) && (
                  <p className="text-xs text-green-600 mb-2">
                    {event.is_free ? 'Free' : `From $${event.price_min}`}
                  </p>
                )}
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

        {/* Venue Markers */}
        {(contentType === 'venues' || contentType === 'both') && filteredVenues.map((venue) => (
          <Marker
            key={`venue-${venue.id}`}
            position={[venue.latitude!, venue.longitude!]}
            icon={VenueIcon}
            eventHandlers={{
              click: () => setSelectedVenue(venue)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center mb-2">
                  <Badge className="bg-green-500 text-white text-xs mr-2">Venue</Badge>
                  <span className="text-xs text-gray-500">{venue.venue_type}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{venue.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{venue.address}</p>
                {venue.rating && (
                  <p className="text-xs text-yellow-600 mb-2">★ {venue.rating.toFixed(1)}</p>
                )}
                {venue.distance && (
                  <p className="text-xs text-gray-500 mb-2">
                    {venue.distance < 1 
                      ? `${Math.round(venue.distance * 1000)}m away`
                      : `${venue.distance.toFixed(1)}km away`
                    }
                  </p>
                )}
                <Button 
                  size="sm" 
                  onClick={() => setSelectedVenue(venue)}
                  className="w-full"
                >
                  View Venue
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )

  const renderListView = () => {
    const isLoading = eventsLoading || venuesLoading
    const hasEvents = eventsWithLocation.length > 0
    const hasVenues = filteredVenues.length > 0
    const hasContent = hasEvents || hasVenues

    return (
      <div className="h-full overflow-y-auto bg-black p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !hasContent ? (
          <div className="text-center py-12 text-white/60">
            <MapPin size={48} className="mx-auto mb-4" />
            <p>No {contentType === 'both' ? 'events or venues' : contentType} found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Events Section */}
            {(contentType === 'events' || contentType === 'both') && hasEvents && (
              <div>
                <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Events ({eventsWithLocation.length})
                </h2>
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
              </div>
            )}

            {/* Venues Section */}
            {(contentType === 'venues' || contentType === 'both') && hasVenues && (
              <div>
                <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Venues ({filteredVenues.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVenues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      size="small"
                      showDistance={true}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedVenue?.id === venue.id && "ring-2 ring-green-500"
                      )}
                      onClick={() => setSelectedVenue(venue)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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

            {/* Content Type Toggle */}
            <div className="flex items-center bg-gray-900 rounded-lg p-1">
              <Button
                variant={contentType === 'events' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setContentType('events')}
                className="h-8 text-xs"
              >
                <MapPin size={14} className="mr-1" />
                Events
              </Button>
              <Button
                variant={contentType === 'venues' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setContentType('venues')}
                className="h-8 text-xs"
              >
                <Building2 size={14} className="mr-1" />
                Venues
              </Button>
              <Button
                variant={contentType === 'both' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setContentType('both')}
                className="h-8 text-xs"
              >
                Both
              </Button>
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
          {eventsLoading || venuesLoading ? 'Loading...' : (
            <>
              {contentType === 'events' && `${eventsWithLocation.length} events found`}
              {contentType === 'venues' && `${filteredVenues.length} venues found`}
              {contentType === 'both' && `${eventsWithLocation.length} events, ${filteredVenues.length} venues found`}
            </>
          )}
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

      {/* Selected Venue Details Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedVenue.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVenue(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              
              {selectedVenue.images && selectedVenue.images.length > 0 && (
                <img
                  src={selectedVenue.images[0]}
                  alt={selectedVenue.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="space-y-4 text-white">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-500">
                    {selectedVenue.venue_type?.charAt(0).toUpperCase() + selectedVenue.venue_type?.slice(1) || 'Venue'}
                  </Badge>
                  {selectedVenue.rating && (
                    <Badge className="bg-yellow-500">
                      ★ {selectedVenue.rating.toFixed(1)}
                    </Badge>
                  )}
                  {selectedVenue.distance && (
                    <Badge variant="outline" className="border-white/30 text-white">
                      {selectedVenue.distance < 1 
                        ? `${Math.round(selectedVenue.distance * 1000)}m away`
                        : `${selectedVenue.distance.toFixed(1)}km away`
                      }
                    </Badge>
                  )}
                </div>

                {selectedVenue.description && (
                  <p className="text-white/80">{selectedVenue.description}</p>
                )}
                
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Address:</span>
                    <p>{selectedVenue.address}</p>
                  </div>
                  
                  {selectedVenue.phone && (
                    <div>
                      <span className="text-white/60">Phone:</span>
                      <p>{selectedVenue.phone}</p>
                    </div>
                  )}

                  {selectedVenue.opening_hours && (
                    <div>
                      <span className="text-white/60">Hours:</span>
                      <div className="text-xs mt-1">
                        {Array.isArray(selectedVenue.opening_hours) 
                          ? selectedVenue.opening_hours.join(', ')
                          : selectedVenue.opening_hours
                        }
                      </div>
                    </div>
                  )}

                  {selectedVenue.amenities && selectedVenue.amenities.length > 0 && (
                    <div>
                      <span className="text-white/60">Amenities:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedVenue.amenities.map((amenity: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs border-white/20 text-white">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  {selectedVenue.website && (
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => window.open(selectedVenue.website!, '_blank')}
                    >
                      Visit Website
                    </Button>
                  )}
                  {selectedVenue.phone && (
                    <Button 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10"
                      onClick={() => window.open(`tel:${selectedVenue.phone}`, '_self')}
                    >
                      Call Venue
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    View Events
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