'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Pause, Heart, Share, MoreHorizontal, Calendar, MapPin, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Event, EventHoverInfo } from '@/types'

interface NetflixEventCardProps {
  event: Event
  size?: 'small' | 'medium' | 'large'
  showHoverPreview?: boolean
  onHover?: (info: EventHoverInfo) => void
  onVideoPlay?: (eventId: string) => void
  className?: string
}

export function NetflixEventCard({ 
  event, 
  size = 'medium',
  showHoverPreview = true,
  onHover,
  onVideoPlay,
  className 
}: NetflixEventCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  const sizeClasses = {
    small: 'aspect-video w-48 h-28',
    medium: 'aspect-video w-64 h-36', 
    large: 'aspect-video w-80 h-45'
  }

  const imageSrc =
    typeof event.image_url === 'string' && event.image_url.trim().length > 0
      ? event.image_url.trim()
      : '/placeholder-event.jpg'

  const handleMouseEnter = () => {
    // Delay hover effect to prevent accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true)
      
      if (showHoverPreview && onHover && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        onHover({
          event,
          isVisible: true,
          position: { x: rect.left, y: rect.top }
        })
      }

      // Auto-play video after hover delay
      if (event.video_url && videoRef.current) {
        setTimeout(() => {
          if (isHovered && videoRef.current) {
            videoRef.current.play()
            setIsVideoPlaying(true)
            onVideoPlay?.(event.id)
          }
        }, 500)
      }
    }, 300)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    setIsHovered(false)
    
    if (onHover) {
      onHover({
        event,
        isVisible: false,
        position: { x: 0, y: 0 }
      })
    }

    // Stop video playback
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsVideoPlaying(false)
    }
  }

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsSaved(!isSaved)
    // TODO: Implement save/unsave API call
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // TODO: Implement share functionality
    navigator.share?.({
      title: event.title,
      text: event.description ?? undefined,
      url: `/events/${event.id}`
    })
  }

  const formatPrice = () => {
    if (event.is_free) return 'Free'
    if (event.price_min && event.price_max) {
      return `$${event.price_min} - $${event.price_max}`
    }
    if (event.price_min) return `From $${event.price_min}`
    return 'Price varies'
  }

  const formatDate = () => {
    const rawValue = event.event_date || event.start_time || event.date || event.created_at
    if (!rawValue) return 'TBD'

    // Parse date string properly to avoid timezone issues
    // If it's a date-only string (YYYY-MM-DD), parse it as local date
    const dateStr = String(rawValue)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only format: parse as local date to avoid timezone shift
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const formatted = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      })
      console.log(`📅 Date parsing: "${dateStr}" -> ${year}-${month}-${day} -> ${formatted}`)
      return formatted
    }

    // Otherwise use standard Date parsing
    const date = new Date(rawValue)
    if (Number.isNaN(date.getTime())) return 'TBD'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-gray-900 transition-all duration-300",
        "hover:scale-105 hover:z-20",
        sizeClasses[size],
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/events/${event.id}`} className="block w-full h-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className={cn(
              "object-cover transition-all duration-300",
              isHovered && "scale-110"
            )}
            sizes={`${size === 'small' ? '192px' : size === 'medium' ? '256px' : '320px'}`}
          />
        </div>

        {/* Video Overlay */}
        {event.video_url && (
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              isVideoPlaying ? "opacity-100" : "opacity-0"
            )}
            muted
            playsInline
            loop
            onLoadedData={() => setIsVideoLoaded(true)}
          >
            <source src={event.video_url} type="video/mp4" />
          </video>
        )}

        {/* Gradient Overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-70"
        )} />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full capitalize">
              {event.category}
            </span>
          </div>

          {/* Video Play Indicator */}
          {event.video_url && (
            <div className="absolute top-3 right-3">
              <div className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-full">
                {isVideoPlaying ? <Pause size={12} /> : <Play size={12} />}
              </div>
            </div>
          )}

          {/* Event Info */}
          <div className="space-y-1">
            <h3 className="text-white font-semibold text-sm line-clamp-2">
              {event.title}
            </h3>
            
            <div className="flex items-center space-x-3 text-white/80 text-xs">
              <div className="flex items-center space-x-1">
                <Calendar size={10} />
                <span>{formatDate()}</span>
              </div>
              
              {event.venue_name && (
                <div className="flex items-center space-x-1">
                  <MapPin size={10} />
                  <span className="truncate max-w-20">{event.venue_name}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <DollarSign size={10} />
                <span>{formatPrice()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover Actions */}
        <div className={cn(
          "absolute top-3 right-3 flex space-x-1 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <button
            onClick={toggleSaved}
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-all duration-200",
              isSaved 
                ? "bg-red-500/90 text-white" 
                : "bg-black/60 text-white/80 hover:bg-black/80 hover:text-white"
            )}
          >
            <Heart size={14} className={isSaved ? "fill-current" : ""} />
          </button>
          
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-sm transition-all duration-200"
          >
            <Share size={14} />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // TODO: Show context menu
            }}
            className="p-2 rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-sm transition-all duration-200"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Popular Indicator */}
        {event.is_featured && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              🔥 Popular
            </span>
          </div>
        )}
      </Link>
    </div>
  )
}
