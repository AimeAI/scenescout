'use client'

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Search, ExternalLink, MapPin, Calendar, DollarSign } from 'lucide-react'

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface SearchMapProps {
  userLocation: { lat: number, lng: number }
}

export function SearchMap({ userLocation }: SearchMapProps) {
  const [searchQuery, setSearchQuery] = useState('halloween haunted houses')
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      console.log(`🔍 Searching for: ${searchQuery}`)
      
      const response = await fetch(`/api/search-events?q=${encodeURIComponent(searchQuery)}&location=toronto`)
      const result = await response.json()
      
      if (result.success) {
        setEvents(result.events)
        console.log(`✅ Found ${result.events.length} events`)
      } else {
        console.log('❌ No events found')
        setEvents([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-search on component mount
  useEffect(() => {
    handleSearch()
  }, [])

  const createHalloweenIcon = () => {
    return L.divIcon({
      html: '<div style="background: #ff6b35; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px;">🎃</div>',
      className: 'halloween-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-96 bg-gray-900 text-white p-4 overflow-y-auto">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for events..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 disabled:opacity-50"
            >
              <Search size={16} />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          <div className="text-sm text-gray-400">
            Found {events.length} events • Real venues with verified links
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                selectedEvent?.id === event.id
                  ? 'bg-blue-900 border-blue-500'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              }`}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg line-clamp-2">{event.title}</h3>
                <span className="text-xs bg-orange-600 px-2 py-1 rounded">🎃</span>
              </div>
              
              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                {event.description}
              </p>
              
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin size={12} />
                  {event.venue_name}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={12} />
                  {new Date(event.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={12} />
                  {event.price_min === 0 ? 'Free' : `From $${event.price_min}`}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">
                  Source: {event.source.replace('_', ' ')}
                </span>
                {event.external_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(event.external_url, '_blank')
                    }}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink size={12} />
                    Visit
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {events.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>No events found. Try a different search term.</p>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Searching for events...</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={10}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location */}
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>📍 You are here</Popup>
          </Marker>
          
          {/* Event markers */}
          {events.map((event) => (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createHalloweenIcon()}
              eventHandlers={{
                click: () => setSelectedEvent(event)
              }}
            >
              <Popup>
                <div className="p-2 max-w-xs">
                  <h3 className="font-bold mb-2">{event.title}</h3>
                  <p className="text-sm mb-2">{event.venue_name}</p>
                  <p className="text-sm mb-2">{new Date(event.date).toLocaleDateString()}</p>
                  <p className="text-sm mb-3">
                    {event.price_min === 0 ? 'Free' : `From $${event.price_min}`}
                  </p>
                  {event.external_url && (
                    <button
                      onClick={() => window.open(event.external_url, '_blank')}
                      className="w-full bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                    >
                      Visit Event Page
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Selected Event Details */}
        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 z-[1000]">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">{selectedEvent.venue_name}</p>
            <p className="text-sm mb-3 line-clamp-2">{selectedEvent.description}</p>
            <div className="flex justify-between items-center">
              <span className="font-bold">
                {selectedEvent.price_min === 0 ? 'FREE' : `From $${selectedEvent.price_min}`}
              </span>
              {selectedEvent.external_url && (
                <button 
                  onClick={() => window.open(selectedEvent.external_url, '_blank')}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Visit Event
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
