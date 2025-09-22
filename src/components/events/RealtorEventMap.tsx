'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface EventMapProps {
  userLocation: { lat: number, lng: number }
  filters?: {
    categories?: string[]
    priceRange?: [number, number]
    dateRange?: [Date, Date]
  }
}

export function RealtorEventMap({ userLocation, filters = {} }: EventMapProps) {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMapEvents()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('map_events')
      .on('broadcast', { event: 'new_events' }, () => {
        loadMapEvents()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [userLocation, filters])

  const loadMapEvents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('events')
        .select(`
          id, name, description, event_date, start_time,
          venue_name, latitude, longitude, categories,
          ticket_price_min, featured_image_url, ticket_url,
          trending_score
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('trending_score', { ascending: false })
        .limit(500)

      // Apply filters
      if (filters.categories?.length) {
        query = query.overlaps('categories', filters.categories)
      }
      
      if (filters.priceRange) {
        query = query
          .gte('ticket_price_min', filters.priceRange[0])
          .lte('ticket_price_min', filters.priceRange[1])
      }

      const { data, error } = await query

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading map events:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCustomIcon = (category: string, price: number) => {
    const colors = {
      music: '#8b5cf6',
      sports: '#10b981', 
      food: '#f59e0b',
      tech: '#3b82f6',
      arts: '#ec4899',
      other: '#6b7280'
    }

    const color = colors[category as keyof typeof colors] || colors.other
    const isFree = price === 0

    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          ${isFree ? '<span style="color: white; font-size: 12px; font-weight: bold;">F</span>' : ''}
          ${price > 0 ? `<span style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); background: black; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap;">$${price}</span>` : ''}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        <Marker 
          position={[userLocation.lat, userLocation.lng]}
          icon={L.divIcon({
            html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            className: 'user-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })}
        >
          <Popup>You are here</Popup>
        </Marker>

        {/* Event markers with clustering */}
        <MarkerClusterGroup>
          {events.map((event) => {
            const primaryCategory = event.categories?.[0] || 'other'
            const icon = createCustomIcon(primaryCategory, event.ticket_price_min || 0)
            
            return (
              <Marker
                key={event.id}
                position={[event.latitude, event.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => setSelectedEvent(event)
                }}
              >
                <Popup>
                  <div className="p-2 max-w-xs">
                    <h3 className="font-bold text-lg mb-1">{event.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{event.venue_name}</p>
                    <p className="text-sm mb-2">
                      {new Date(event.event_date).toLocaleDateString()}
                      {event.start_time && ` at ${event.start_time}`}
                    </p>
                    {event.ticket_price_min === 0 ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">FREE</span>
                    ) : (
                      <span className="text-sm font-bold">From ${event.ticket_price_min}</span>
                    )}
                    {event.ticket_url && (
                      <button 
                        onClick={() => window.open(event.ticket_url, '_blank')}
                        className="mt-2 w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Get Tickets
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Filter Controls */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-bold mb-2">Filter Events</h3>
        <div className="space-y-2">
          {['All', 'Music', 'Sports', 'Food', 'Tech', 'Arts', 'Free'].map(filter => (
            <label key={filter} className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">{filter}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Selected Event Panel */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl p-4 z-[1000]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold">{selectedEvent.name}</h3>
            <button 
              onClick={() => setSelectedEvent(null)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">{selectedEvent.venue_name}</p>
          <p className="text-sm mb-3 line-clamp-3">{selectedEvent.description}</p>
          <div className="flex justify-between items-center">
            <span className="font-bold">
              {selectedEvent.ticket_price_min === 0 ? 'FREE' : `From $${selectedEvent.ticket_price_min}`}
            </span>
            {selectedEvent.ticket_url && (
              <button 
                onClick={() => window.open(selectedEvent.ticket_url, '_blank')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Get Tickets
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      )}
    </div>
  )
}
