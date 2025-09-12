'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { createIcon } from './MapMarkerIcon'
import { cn } from '@/lib/utils'
import { MapMarker, MapFilter, Event, EventCategory, MapBounds } from '@/types'
import { NetflixEventCard } from '../events/NetflixEventCard'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface EventMapProps {
  events: Event[]
  center?: [number, number]
  zoom?: number
  height?: string
  onEventSelect?: (event: Event) => void
  onBoundsChange?: (bounds: MapBounds) => void
  filters?: MapFilter
  onFiltersChange?: (filters: MapFilter) => void
  showFilters?: boolean
  showEventList?: boolean
  className?: string
}

// Category color mappings for markers
const categoryColors: Record<EventCategory, string> = {
  music: '#8B5CF6', // Purple
  sports: '#10B981', // Green
  arts: '#F97316', // Orange
  food: '#EF4444', // Red
  tech: '#3B82F6', // Blue
  social: '#EAB308', // Yellow
  business: '#6366F1', // Indigo
  education: '#14B8A6', // Teal
  health: '#EC4899', // Pink
  family: '#84CC16', // Lime
  other: '#6B7280', // Gray
}

// Category icons/pictograms
const categoryIcons: Record<EventCategory, string> = {
  music: '🎵',
  sports: '⚽',
  arts: '🎨',
  food: '🍽️',
  tech: '💻',
  social: '👥',
  business: '💼',
  education: '📚',
  health: '🏥',
  family: '👨‍👩‍👧‍👦',
  other: '📍',
}

function MapController({ 
  onBoundsChange, 
  onEventSelect,
  markers
}: {
  onBoundsChange?: (bounds: MapBounds) => void
  onEventSelect?: (event: Event) => void
  markers: MapMarker[]
}) {
  const map = useMap()

  useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds()
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        })
      }
    },
    zoomend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds()
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        })
      }
    }
  })

  return null
}

function EventMapComponent({
  events,
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 12,
  height = '100vh',
  onEventSelect,
  onBoundsChange,
  filters,
  onFiltersChange,
  showFilters = true,
  showEventList = false,
  className
}: EventMapProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map>(null)

  // Convert events to map markers
  const markers: MapMarker[] = events
    .filter(event => event.venue?.latitude && event.venue?.longitude)
    .map(event => ({
      id: event.id,
      eventId: event.id,
      latitude: event.venue!.latitude!,
      longitude: event.venue!.longitude!,
      category: event.category as EventCategory,
      title: event.title,
      date: event.event_date || event.date,
      venue: event.venue_name || 'Unknown Venue',
      price: event.price_min ? `$${event.price_min}` : event.is_free ? 'Free' : 'Price varies',
      priceRange: event.price_min && event.price_max ? { min: event.price_min, max: event.price_max } : undefined,
      imageUrl: event.image_url,
      videoUrl: event.video_url,
      size: event.is_featured ? 'large' : 'medium',
    }))

  // Filter markers based on current filters
  const filteredMarkers = markers.filter(marker => {
    if (!filters) return true
    
    const categoryMatch = filters.categories.length === 0 || filters.categories.includes(marker.category)
    const dateMatch = true // TODO: Implement date filtering
    const priceMatch = true // TODO: Implement price filtering
    const videoMatch = !filters.showVideoOnly || marker.videoUrl
    
    return categoryMatch && dateMatch && priceMatch && videoMatch
  })

  const handleMarkerClick = (marker: MapMarker) => {
    const event = events.find(e => e.id === marker.eventId)
    if (event) {
      setSelectedEvent(event)
      onEventSelect?.(event)
    }
  }

  const createCustomMarker = (marker: MapMarker) => {
    const color = categoryColors[marker.category] || categoryColors.other
    const icon = categoryIcons[marker.category] || categoryIcons.other
    
    return createIcon({
      category: marker.category,
      color,
      icon,
      size: marker.size,
      isHovered: hoveredMarker === marker.id,
      isFeatured: marker.size === 'large'
    })
  }

  // Create cluster icon
  const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount()
    const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large'
    
    return L.divIcon({
      html: `
        <div class="cluster-marker cluster-${size}">
          <div class="cluster-inner">
            <span class="cluster-count">${count}</span>
          </div>
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true),
    })
  }

  useEffect(() => {
    setMapReady(true)
  }, [])

  if (!mapReady) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-900 rounded-lg", className)} style={{ height }}>
        <div className="text-white">Loading map...</div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <style jsx>{`
        .cluster-marker {
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }
        .cluster-small { width: 30px; height: 30px; }
        .cluster-medium { width: 40px; height: 40px; }
        .cluster-large { width: 50px; height: 50px; }
        .cluster-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .cluster-count {
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden"
        ref={mapRef}
        maxZoom={18}
        minZoom={3}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        <MapController 
          onBoundsChange={onBoundsChange}
          onEventSelect={onEventSelect}
          markers={filteredMarkers}
        />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {filteredMarkers.map((marker) => {
            const event = events.find(e => e.id === marker.eventId)!
            
            return (
              <Marker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                icon={createCustomMarker(marker)}
                eventHandlers={{
                  click: () => handleMarkerClick(marker),
                  mouseover: () => setHoveredMarker(marker.id),
                  mouseout: () => setHoveredMarker(null),
                }}
              >
                <Popup
                  closeButton={false}
                  className="custom-popup"
                  maxWidth={300}
                  minWidth={280}
                >
                  <div className="bg-gray-900 text-white p-0 rounded-lg overflow-hidden">
                    <NetflixEventCard
                      event={event}
                      size="small"
                      showHoverPreview={false}
                      className="border-none shadow-none"
                    />
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        {/* Zoom to fit all markers */}
        <button
          onClick={() => {
            if (mapRef.current && filteredMarkers.length > 0) {
              const group = new L.featureGroup(
                filteredMarkers.map(marker => 
                  L.marker([marker.latitude, marker.longitude])
                )
              )
              mapRef.current.fitBounds(group.getBounds().pad(0.1))
            }
          }}
          className="bg-black/80 backdrop-blur-sm text-white p-2 rounded-lg border border-white/20 hover:bg-black/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Toggle full screen */}
        <button
          onClick={() => {
            if (mapRef.current) {
              if (document.fullscreenElement) {
                document.exitFullscreen()
              } else {
                mapRef.current.getContainer().requestFullscreen()
              }
            }
          }}
          className="bg-black/80 backdrop-blur-sm text-white p-2 rounded-lg border border-white/20 hover:bg-black/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20 max-w-xs">
        <h3 className="text-sm font-semibold mb-2">Event Categories</h3>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full border border-white/30"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event count indicator */}
      <div className="absolute top-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-white/20">
        <span className="text-sm">
          {filteredMarkers.length} event{filteredMarkers.length !== 1 ? 's' : ''} visible
        </span>
      </div>
    </div>
  )
}

// Export as dynamic component to avoid SSR issues
const EventMap = dynamic(() => Promise.resolve(EventMapComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-900 rounded-lg h-96">
      <div className="text-white">Loading map...</div>
    </div>
  ),
})

export default EventMap