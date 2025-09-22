'use client'

import { useEffect, useRef, useState } from 'react'

interface Event {
  id: string
  title: string
  latitude: number
  longitude: number
  venue_name: string
  category: string
  price_min: number
  date: string
  external_url: string
}

interface SimpleEventMapProps {
  events: Event[]
  center: { lat: number; lng: number }
  onEventClick: (event: Event) => void
}

export function SimpleEventMap({ events, center, onEventClick }: SimpleEventMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)

  const categoryColors = {
    music: '#8B5CF6',
    food: '#F59E0B', 
    tech: '#3B82F6',
    arts: '#EF4444',
    sports: '#10B981',
    social: '#F97316',
    default: '#6B7280'
  }

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat: number, lng: number, canvasWidth: number, canvasHeight: number) => {
    // Simple projection centered on Toronto
    const centerLat = center.lat
    const centerLng = center.lng
    
    // Scale factor (adjust for zoom level)
    const scale = 8000
    
    const x = (canvasWidth / 2) + ((lng - centerLng) * scale)
    const y = (canvasHeight / 2) - ((lat - centerLat) * scale)
    
    return { x, y }
  }

  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas

    // Clear canvas
    ctx.fillStyle = '#1F2937'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, height)
      ctx.stroke()
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(width, i)
      ctx.stroke()
    }

    // Draw center marker
    const centerPos = latLngToCanvas(center.lat, center.lng, width, height)
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.arc(centerPos.x, centerPos.y, 8, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw events
    events.forEach((event) => {
      const pos = latLngToCanvas(event.latitude, event.longitude, width, height)
      
      // Skip if outside canvas
      if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) return

      const color = categoryColors[event.category] || categoryColors.default
      const isHovered = hoveredEvent?.id === event.id
      const isSelected = selectedEvent?.id === event.id
      
      // Draw event marker
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isHovered || isSelected ? 10 : 6, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw border
      ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000'
      ctx.lineWidth = isSelected ? 3 : 1
      ctx.stroke()

      // Draw price indicator
      if (event.price_min === 0) {
        ctx.fillStyle = '#10B981'
        ctx.font = '10px Arial'
        ctx.fillText('F', pos.x - 3, pos.y + 3)
      }
    })
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked event
    const clickedEvent = events.find(event => {
      const pos = latLngToCanvas(event.latitude, event.longitude, canvas.width, canvas.height)
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      return distance <= 10
    })

    if (clickedEvent) {
      setSelectedEvent(clickedEvent)
      onEventClick(clickedEvent)
    } else {
      setSelectedEvent(null)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find hovered event
    const hoveredEvent = events.find(event => {
      const pos = latLngToCanvas(event.latitude, event.longitude, canvas.width, canvas.height)
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      return distance <= 10
    })

    setHoveredEvent(hoveredEvent || null)
    canvas.style.cursor = hoveredEvent ? 'pointer' : 'default'
  }

  useEffect(() => {
    drawMap()
  }, [events, center, hoveredEvent, selectedEvent])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        drawMap()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className="w-full h-full rounded-lg"
      />
      
      {/* Tooltip */}
      {hoveredEvent && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white p-3 rounded-lg max-w-xs z-10">
          <h4 className="font-semibold text-sm">{hoveredEvent.title}</h4>
          <p className="text-xs text-gray-300 mt-1">📍 {hoveredEvent.venue_name}</p>
          <p className="text-xs text-gray-300">📅 {hoveredEvent.date}</p>
          <div className="flex gap-2 mt-2">
            {hoveredEvent.price_min === 0 ? (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">FREE</span>
            ) : (
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">${hoveredEvent.price_min}</span>
            )}
            <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs capitalize">
              {hoveredEvent.category}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Event Categories</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(categoryColors).filter(([key]) => key !== 'default').map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="capitalize">{category}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-green-400 font-bold">F</span>
            <span>Free Event</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{events.length}</div>
          <div className="text-xs text-gray-300">Events Nearby</div>
        </div>
      </div>
    </div>
  )
}
