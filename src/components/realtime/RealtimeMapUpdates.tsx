'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { createIcon } from '../map/MapMarkerIcon'
import { Event, EventCategory, MapBounds } from '@/types'
import { cn } from '@/lib/utils'

interface RealtimeMapUpdatesProps {
  bounds?: MapBounds
  onBoundsChange?: (bounds: MapBounds) => void
  showAnimations?: boolean
  animationDuration?: number
}

// Component to handle real-time map marker updates
export function RealtimeMapUpdates({
  bounds,
  onBoundsChange,
  showAnimations = true,
  animationDuration = 2000
}: RealtimeMapUpdatesProps) {
  const map = useMap()
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const animationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const [recentUpdates, setRecentUpdates] = useState<string[]>([])

  const { isConnected, updates } = useRealtimeEvents({
    bounds,
    enabled: true,
    onEventUpdate: (update) => {
      handleRealtimeMarkerUpdate(update.type, update.event)
    }
  })

  // Handle real-time marker updates
  const handleRealtimeMarkerUpdate = (
    type: 'insert' | 'update' | 'delete',
    event: Event
  ) => {
    const eventId = event.id
    const existingMarker = markersRef.current.get(eventId)

    if (type === 'delete') {
      if (existingMarker) {
        // Animate marker removal
        if (showAnimations) {
          animateMarkerRemoval(existingMarker, eventId)
        } else {
          map.removeLayer(existingMarker)
          markersRef.current.delete(eventId)
        }
      }
    } else if (type === 'insert' || type === 'update') {
      if (!event.venue?.latitude || !event.venue?.longitude) return

      const position: [number, number] = [event.venue.latitude, event.venue.longitude]

      if (existingMarker) {
        // Update existing marker
        updateExistingMarker(existingMarker, event, position, type === 'update')
      } else {
        // Create new marker
        createNewMarker(event, position, type === 'insert')
      }

      // Track recent updates for UI feedback
      setRecentUpdates(prev => {
        const updated = [eventId, ...prev.filter(id => id !== eventId)].slice(0, 5)
        return updated
      })

      // Remove from recent updates after delay
      setTimeout(() => {
        setRecentUpdates(prev => prev.filter(id => id !== eventId))
      }, 5000)
    }
  }

  // Create new marker with animation
  const createNewMarker = (event: Event, position: [number, number], shouldAnimate: boolean) => {
    const marker = L.marker(position, {
      icon: createIcon({
        category: event.category as EventCategory,
        color: getCategoryColor(event.category as EventCategory),
        icon: getCategoryIcon(event.category as EventCategory),
        size: event.is_featured ? 'large' : 'medium',
        isHovered: false,
        isFeatured: event.is_featured || false
      }),
      opacity: shouldAnimate ? 0 : 1
    })

    // Add popup
    marker.bindPopup(`
      <div class="bg-gray-900 text-white p-4 rounded-lg max-w-xs">
        <h3 class="font-semibold mb-2">${event.title}</h3>
        <p class="text-sm text-gray-300 mb-2">${event.venue_name || 'Unknown Venue'}</p>
        <p class="text-xs text-gray-400">${new Date(event.start_time || event.date || '').toLocaleDateString()}</p>
      </div>
    `, {
      closeButton: false,
      maxWidth: 300,
      className: 'custom-popup'
    })

    // Add to map
    marker.addTo(map)
    markersRef.current.set(event.id, marker)

    // Animate appearance
    if (shouldAnimate && showAnimations) {
      animateMarkerAppearance(marker, event.id)
    }
  }

  // Update existing marker
  const updateExistingMarker = (
    marker: L.Marker,
    event: Event,
    position: [number, number],
    shouldAnimate: boolean
  ) => {
    // Update position if needed
    const currentPosition = marker.getLatLng()
    if (currentPosition.lat !== position[0] || currentPosition.lng !== position[1]) {
      marker.setLatLng(position)
    }

    // Update icon
    marker.setIcon(createIcon({
      category: event.category as EventCategory,
      color: getCategoryColor(event.category as EventCategory),
      icon: getCategoryIcon(event.category as EventCategory),
      size: event.is_featured ? 'large' : 'medium',
      isHovered: false,
      isFeatured: event.is_featured || false
    }))

    // Update popup
    marker.setPopupContent(`
      <div class="bg-gray-900 text-white p-4 rounded-lg max-w-xs">
        <h3 class="font-semibold mb-2">${event.title}</h3>
        <p class="text-sm text-gray-300 mb-2">${event.venue_name || 'Unknown Venue'}</p>
        <p class="text-xs text-gray-400">${new Date(event.start_time || event.date || '').toLocaleDateString()}</p>
        <div class="mt-2 text-xs text-blue-400">Recently updated</div>
      </div>
    `)

    // Animate update
    if (shouldAnimate && showAnimations) {
      animateMarkerUpdate(marker, event.id)
    }
  }

  // Animate marker appearance
  const animateMarkerAppearance = (marker: L.Marker, eventId: string) => {
    let opacity = 0
    const fadeIn = setInterval(() => {
      opacity += 0.1
      marker.setOpacity(opacity)
      
      if (opacity >= 1) {
        clearInterval(fadeIn)
        
        // Pulse effect
        let pulses = 0
        const pulse = setInterval(() => {
          marker.setOpacity(pulses % 2 === 0 ? 0.7 : 1)
          pulses++
          
          if (pulses >= 6) {
            clearInterval(pulse)
            marker.setOpacity(1)
          }
        }, 200)
      }
    }, 50)

    // Clear animation after duration
    const timer = setTimeout(() => {
      clearInterval(fadeIn)
      marker.setOpacity(1)
    }, animationDuration)

    animationTimersRef.current.set(eventId, timer)
  }

  // Animate marker update
  const animateMarkerUpdate = (marker: L.Marker, eventId: string) => {
    let pulses = 0
    const pulse = setInterval(() => {
      marker.setOpacity(pulses % 2 === 0 ? 0.5 : 1)
      pulses++
      
      if (pulses >= 4) {
        clearInterval(pulse)
        marker.setOpacity(1)
      }
    }, 300)

    // Clear animation after duration
    const timer = setTimeout(() => {
      clearInterval(pulse)
      marker.setOpacity(1)
    }, animationDuration)

    animationTimersRef.current.set(eventId, timer)
  }

  // Animate marker removal
  const animateMarkerRemoval = (marker: L.Marker, eventId: string) => {
    let opacity = 1
    const fadeOut = setInterval(() => {
      opacity -= 0.2
      marker.setOpacity(opacity)
      
      if (opacity <= 0) {
        clearInterval(fadeOut)
        map.removeLayer(marker)
        markersRef.current.delete(eventId)
      }
    }, 100)

    // Clear animation after duration
    const timer = setTimeout(() => {
      clearInterval(fadeOut)
      if (map.hasLayer(marker)) {
        map.removeLayer(marker)
      }
      markersRef.current.delete(eventId)
    }, animationDuration)

    animationTimersRef.current.set(eventId, timer)
  }

  // Update bounds when map moves
  useEffect(() => {
    const handleMoveEnd = () => {
      if (onBoundsChange) {
        const bounds = map.getBounds()
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        })
      }
    }

    map.on('moveend', handleMoveEnd)
    map.on('zoomend', handleMoveEnd)

    return () => {
      map.off('moveend', handleMoveEnd)
      map.off('zoomend', handleMoveEnd)
    }
  }, [map, onBoundsChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all animation timers
      animationTimersRef.current.forEach(timer => clearTimeout(timer))
      animationTimersRef.current.clear()
      
      // Remove all markers
      markersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker)
        }
      })
      markersRef.current.clear()
    }
  }, [map])

  return null // This component doesn't render anything visible
}

// Helper functions for marker styling
const getCategoryColor = (category: EventCategory): string => {
  const colors = {
    music: '#8B5CF6',
    sports: '#10B981',
    arts: '#F97316',
    food: '#EF4444',
    tech: '#3B82F6',
    social: '#EAB308',
    business: '#6366F1',
    education: '#14B8A6',
    health: '#EC4899',
    family: '#84CC16',
    other: '#6B7280'
  }
  return colors[category] || colors.other
}

const getCategoryIcon = (category: EventCategory): string => {
  const icons = {
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
    other: '📍'
  }
  return icons[category] || icons.other
}

// Component for displaying real-time map statistics
export function RealtimeMapStats({
  bounds,
  className
}: {
  bounds?: MapBounds
  className?: string
}) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    newToday: 0,
    activeViewers: 0
  })

  const { isConnected, updates } = useRealtimeEvents({
    bounds,
    enabled: true,
    onEventUpdate: (update) => {
      if (update.type === 'insert') {
        setStats(prev => ({
          ...prev,
          totalEvents: prev.totalEvents + 1,
          newToday: prev.newToday + 1
        }))
      } else if (update.type === 'delete') {
        setStats(prev => ({
          ...prev,
          totalEvents: Math.max(0, prev.totalEvents - 1)
        }))
      }
    }
  })

  return (
    <div className={cn("bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20", className)}>
      <h3 className="text-sm font-semibold mb-3 flex items-center">
        <div className={cn(
          "w-2 h-2 rounded-full mr-2",
          isConnected ? "bg-green-500" : "bg-red-500"
        )} />
        Live Map Stats
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Total Events:</span>
          <span className="font-medium">{stats.totalEvents}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">New Today:</span>
          <span className="font-medium text-green-400">{stats.newToday}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Recent Updates:</span>
          <span className="font-medium text-blue-400">{updates.length}</span>
        </div>
      </div>
      
      {updates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Last update: {new Date(updates[0].timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}