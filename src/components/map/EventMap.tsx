'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface EventMapProps {
  events: any[]
  userLocation: { lat: number; lng: number }
  onEventClick: (event: any) => void
}

export default function EventMap({ events, userLocation, onEventClick }: EventMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [userLocation.lat, userLocation.lng],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current)
    }

    // Clear existing markers
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        mapRef.current!.removeLayer(layer)
      }
    })

    // Add user location marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup('📍 You are here')

    // Add event markers
    events.forEach(event => {
      if (!event.lat || !event.lng || !mapRef.current) return

      const eventIcon = L.divIcon({
        className: 'custom-event-marker',
        html: '<div style="width:32px;height:32px;background:linear-gradient(135deg,#f97316 0%,#dc2626 100%);border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🔥</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      const marker = L.marker([event.lat, event.lng], { icon: eventIcon }).addTo(mapRef.current)
      marker.bindPopup('<strong>' + event.title + '</strong><br>' + (event.venue_name || ''))
      marker.on('click', () => onEventClick(event))
    })

    if (events.length > 0 && events.some(e => e.lat && e.lng)) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        ...events.filter(e => e.lat && e.lng).map(e => [e.lat, e.lng])
      ])
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [events, userLocation, onEventClick])

  return <div ref={mapContainerRef} className="h-96 rounded-lg overflow-hidden shadow-xl" style={{ zIndex: 1 }} />
}
