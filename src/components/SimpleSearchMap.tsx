'use client'

import { useState, useEffect } from 'react'
import { Search, ExternalLink, MapPin, Calendar, DollarSign } from 'lucide-react'

interface SimpleSearchMapProps {
  userLocation: { lat: number, lng: number }
}

export function SimpleSearchMap({ userLocation }: SimpleSearchMapProps) {
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
        if (result.events.length > 0) {
          setSelectedEvent(result.events[0]) // Auto-select first event
        }
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

  // Calculate map bounds to show all events
  const getMapBounds = () => {
    if (events.length === 0) return { center: userLocation, zoom: 10 }
    
    const lats = events.map(e => e.latitude)
    const lngs = events.map(e => e.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    
    return {
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      },
      zoom: 9
    }
  }

  const mapBounds = getMapBounds()

  return (
    <div className="h-screen flex bg-black text-white">
      {/* Sidebar */}
      <div className="w-96 bg-gray-900 p-4 overflow-y-auto border-r border-gray-700">
        {/* Search Bar */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4 text-orange-500">🎃 Event Search</h1>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for events..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded flex items-center gap-2 disabled:opacity-50"
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
                  ? 'bg-orange-900 border-orange-500'
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
                <span className="text-xs text-green-400">
                  ✓ {event.source.replace('_', ' ')}
                </span>
                {event.external_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(event.external_url, '_blank')
                    }}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
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

      {/* Interactive Map Area */}
      <div className="flex-1 relative bg-gray-800">
        {/* Map with Event Markers */}
        <div className="h-full relative overflow-hidden">
          {/* Map Background */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
                linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.02) 50%, transparent 70%)
              `
            }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />
          </div>

          {/* Event Markers */}
          <div className="absolute inset-0 p-8">
            <div className="relative h-full">
              {events.map((event, index) => {
                // Calculate position based on coordinates (simplified projection)
                const x = ((event.longitude + 79.5) / 0.5) * 100 // Normalize longitude
                const y = ((43.9 - event.latitude) / 0.3) * 100 // Normalize latitude
                
                return (
                  <div
                    key={event.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                      selectedEvent?.id === event.id ? 'scale-125 z-20' : 'scale-100 z-10'
                    }`}
                    style={{
                      left: `${Math.max(5, Math.min(95, x))}%`,
                      top: `${Math.max(5, Math.min(95, y))}%`
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {/* Marker */}
                    <div className={`relative ${selectedEvent?.id === event.id ? 'animate-pulse' : ''}`}>
                      <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-2xl shadow-lg ${
                        selectedEvent?.id === event.id 
                          ? 'bg-orange-500 shadow-orange-500/50' 
                          : 'bg-red-600 hover:bg-red-500'
                      }`}>
                        🎃
                      </div>
                      
                      {/* Price tag */}
                      {event.price_min > 0 && (
                        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          ${event.price_min}
                        </div>
                      )}
                      {event.price_min === 0 && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          FREE
                        </div>
                      )}
                      
                      {/* Venue label */}
                      <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {event.venue_name}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg">
            <h3 className="font-bold mb-2">🗺️ Toronto Area Events</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span>Halloween Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span>Selected Event</span>
              </div>
            </div>
          </div>

          {/* Event Counter */}
          <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{events.length}</div>
              <div className="text-xs">Events Found</div>
            </div>
          </div>
        </div>
        
        {/* Selected Event Details */}
        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 bg-white text-black rounded-lg shadow-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">📍 {selectedEvent.venue_name}</p>
            <p className="text-sm text-gray-600 mb-2">📅 {new Date(selectedEvent.date).toLocaleDateString()}</p>
            <p className="text-sm mb-3 line-clamp-2">{selectedEvent.description}</p>
            <div className="flex justify-between items-center">
              <span className="font-bold">
                {selectedEvent.price_min === 0 ? 'FREE EVENT' : `From $${selectedEvent.price_min}`}
              </span>
              {selectedEvent.external_url && (
                <button 
                  onClick={() => window.open(selectedEvent.external_url, '_blank')}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Visit Official Site
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
