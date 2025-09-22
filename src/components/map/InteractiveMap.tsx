'use client'

import { useEffect, useRef } from 'react'

interface Event {
  id: string
  title: string
  latitude: number
  longitude: number
  venue_name: string
  category: string
  price_min: number
  date: string
  time: string
  external_url: string
}

interface InteractiveMapProps {
  events: Event[]
  center: { lat: number; lng: number }
  onEventClick: (event: Event) => void
}

export function InteractiveMap({ events, center, onEventClick }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Create map
      const map = L.map(mapRef.current).setView([center.lat, center.lng], 12)

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      mapInstanceRef.current = map

      // Add CSS for Leaflet
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center])

  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer)
        }
      })

      // Add event markers
      events.forEach((event) => {
        if (event.latitude && event.longitude) {
          const categoryColors = {
            music: '#8B5CF6',
            food: '#F59E0B',
            tech: '#3B82F6',
            arts: '#EF4444',
            sports: '#10B981',
            social: '#F97316',
            default: '#6B7280'
          }

          const color = categoryColors[event.category] || categoryColors.default
          
          const marker = L.circleMarker([event.latitude, event.longitude], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map)

          const popupContent = `
            <div class="p-2 min-w-[200px]">
              <h3 class="font-semibold text-sm mb-2">${event.title}</h3>
              <div class="space-y-1 text-xs text-gray-600">
                <div>📍 ${event.venue_name}</div>
                <div>📅 ${event.date} at ${event.time}</div>
                <div class="flex gap-2 mt-2">
                  ${event.price_min === 0 
                    ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">FREE</span>'
                    : `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">$${event.price_min}</span>`
                  }
                  <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs capitalize">${event.category}</span>
                </div>
              </div>
              <button 
                onclick="window.open('${event.external_url}', '_blank')"
                class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                View Event
              </button>
            </div>
          `

          marker.bindPopup(popupContent)
          
          marker.on('click', () => {
            onEventClick(event)
          })
        }
      })
    })
  }, [events, onEventClick])

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full rounded-lg" />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-semibold text-sm mb-2 text-gray-800">Event Categories</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-700">Music</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700">Food</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">Tech</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">Arts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">Sports</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-700">Social</span>
          </div>
        </div>
      </div>
    </div>
  )
}
