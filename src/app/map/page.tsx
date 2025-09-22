'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { SimpleEventMap } from '@/components/map/SimpleEventMap'
import { EventGrid } from '@/components/events/EventGrid'

export default function MapPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: 'all',
    time: 'all',
    price: 'all',
    radius: 25
  })
  const [userLocation, setUserLocation] = useState({ lat: 43.6532, lng: -79.3832 })
  const [stats, setStats] = useState(null)
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')

  useEffect(() => {
    getUserLocation()
    loadEvents()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [filters, userLocation])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location error:', error)
          // Keep default Toronto location
        }
      )
    }
  }

  const loadEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category: filters.category,
        time: filters.time,
        price: filters.price,
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        radius: filters.radius.toString(),
        limit: '100'
      })

      const response = await fetch(`/api/events/stored?${params}`)
      const data = await response.json()

      if (data.success) {
        setEvents(data.events)
        setStats(data.stats)
        console.log(`📍 Loaded ${data.events.length} events for map`)
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterType: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const handleEventClick = (event) => {
    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
  }

  const getEventsByCategory = () => {
    const categories = {}
    events.forEach(event => {
      if (!categories[event.category]) {
        categories[event.category] = []
      }
      categories[event.category].push(event)
    })
    return categories
  }

  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow'
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch (e) {
      return dateStr
    }
  }

  const eventsByCategory = getEventsByCategory()

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-3xl font-bold mb-4">🗺️ Event Map & Filters</h1>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="all">All Categories</option>
                <option value="music">🎵 Music</option>
                <option value="food">🍽️ Food & Drink</option>
                <option value="tech">💻 Tech</option>
                <option value="arts">🎨 Arts</option>
                <option value="sports">⚽ Sports</option>
                <option value="social">👥 Social</option>
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">When</label>
              <select
                value={filters.time}
                onChange={(e) => handleFilterChange('time', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price</label>
              <select
                value={filters.price}
                onChange={(e) => handleFilterChange('price', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Only</option>
                <option value="paid">Paid Events</option>
              </select>
            </div>

            {/* Radius Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Radius (km)</label>
              <select
                value={filters.radius}
                onChange={(e) => handleFilterChange('radius', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">View</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 rounded text-xs font-semibold ${
                    viewMode === 'map' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🗺️ Map
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded text-xs font-semibold ${
                    viewMode === 'grid' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📋 Grid
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Actions</label>
              <button
                onClick={loadEvents}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 rounded px-3 py-2 font-semibold disabled:opacity-50"
              >
                {loading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-2xl font-bold text-blue-500">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Events</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-2xl font-bold text-green-500">{stats.freeEvents}</div>
                <div className="text-xs text-gray-400">Free Events</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-2xl font-bold text-purple-500">{stats.paidEvents}</div>
                <div className="text-xs text-gray-400">Paid Events</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-2xl font-bold text-orange-500">{events.length}</div>
                <div className="text-xs text-gray-400">Filtered Results</div>
              </div>
            </div>
          )}
        </div>

        {/* Map and Events */}
        <div className="p-6">
          {viewMode === 'map' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map Area */}
              <div className="bg-gray-800 rounded-lg p-6 h-96 lg:h-[600px]">
                <h2 className="text-xl font-semibold mb-4">📍 Event Locations</h2>
                
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                      <p>Loading events...</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    <SimpleEventMap
                      events={events}
                      center={userLocation}
                      onEventClick={handleEventClick}
                    />
                  </div>
                )}
              </div>

              {/* Events List */}
              <div className="space-y-4 h-96 lg:h-[600px] overflow-y-auto">
                <h2 className="text-xl font-semibold">📋 Filtered Events</h2>
                
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold line-clamp-2">{event.title}</h3>
                        <div className="flex gap-2 ml-2">
                          {event.price_min === 0 ? (
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">FREE</span>
                          ) : (
                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">${event.price_min}</span>
                          )}
                          <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs capitalize">
                            {event.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{event.venue_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{formatDate(event.date, event.time)}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-4">🔍</div>
                    <p>No events found with current filters</p>
                    <p className="text-sm mt-2">Try adjusting your filters above</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">📋 All Events ({events.length})</h2>
              <EventGrid events={events} onEventClick={handleEventClick} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
