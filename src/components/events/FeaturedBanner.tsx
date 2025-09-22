'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Info, Heart, Share, Calendar, MapPin, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeaturedEvent } from '@/types'

interface FeaturedBannerProps {
  events: FeaturedEvent[]
  autoRotate?: boolean
  rotateInterval?: number
  className?: string
}

export function FeaturedBanner({ 
  events, 
  autoRotate = true, 
  rotateInterval = 8000,
  className 
}: FeaturedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const currentEvent = events[currentIndex]

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
    setIsVideoPlaying(false)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
    setIsVideoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsVideoPlaying(false)
  }

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date TBA'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Date TBA'
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const formatPrice = () => {
    if (currentEvent.is_free) return 'Free Event'
    if (currentEvent.price_min && currentEvent.price_max) {
      return `$${currentEvent.price_min} - $${currentEvent.price_max}`
    }
    if (currentEvent.price_min) return `From $${currentEvent.price_min}`
    return 'Price varies'
  }

  // Auto-rotate functionality
  useEffect(() => {
    if (autoRotate && events.length > 1 && !isVideoPlaying) {
      intervalRef.current = setInterval(nextSlide, rotateInterval)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRotate, events.length, rotateInterval, isVideoPlaying])

  // Reset video when changing slides
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsVideoPlaying(false)
    }
  }, [currentIndex])

  if (!currentEvent) return null

  const resolveImageSrc = () => {
    const candidates = [currentEvent.banner_image_url, currentEvent.image_url]
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim()
      }
    }
    return '/placeholder-event.jpg'
  }

  const heroImageSrc = resolveImageSrc()

  return (
    <div className={cn("relative w-full h-[60vh] lg:h-[80vh] overflow-hidden", className)}>
      {/* Background Media */}
      <div className="absolute inset-0">
        {currentEvent.featured_video_url ? (
          <>
            {/* Video */}
            <video
              ref={videoRef}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-500",
                isVideoPlaying ? "opacity-100" : "opacity-0"
              )}
              muted={isMuted}
              playsInline
              onEnded={() => setIsVideoPlaying(false)}
            >
              <source src={currentEvent.featured_video_url} type="video/mp4" />
            </video>
            
            {/* Fallback Image */}
            <div className={cn(
              "absolute inset-0 transition-opacity duration-500",
              isVideoPlaying ? "opacity-0" : "opacity-100"
            )}>
              <Image
                src={heroImageSrc}
                alt={currentEvent.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </>
        ) : (
          <Image
            src={heroImageSrc}
            alt={currentEvent.title}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end">
        <div className="container mx-auto px-6 lg:px-12 pb-16 lg:pb-24">
          <div className="max-w-2xl lg:max-w-3xl space-y-6">
            {/* Category Badge */}
            <div className="flex items-center space-x-3">
              <span className="bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full capitalize font-medium">
                {currentEvent.category}
              </span>
              {currentEvent.is_featured && (
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-4 py-2 rounded-full font-medium">
                  🔥 Featured
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
              {currentEvent.title}
            </h1>

            {/* Event Details */}
            <div className="flex flex-wrap items-center gap-6 text-white/90 text-lg">
              <div className="flex items-center space-x-2">
                <Calendar size={20} />
                <span>{formatDate(currentEvent.event_date || currentEvent.start_time || currentEvent.date)}</span>
              </div>
              
              {currentEvent.venue_name && (
                <div className="flex items-center space-x-2">
                  <MapPin size={20} />
                  <span>{currentEvent.venue_name}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <DollarSign size={20} />
                <span>{formatPrice()}</span>
              </div>
            </div>

            {/* Description */}
            {currentEvent.featured_description && (
              <p className="text-white/80 text-lg lg:text-xl max-w-2xl leading-relaxed">
                {currentEvent.featured_description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href={`/events/${currentEvent.id}`}
                className="bg-white text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors flex items-center space-x-2"
              >
                <Info size={20} />
                <span>More Info</span>
              </Link>

              {currentEvent.featured_video_url && (
                <button
                  onClick={toggleVideo}
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/30 transition-colors flex items-center space-x-2 border border-white/30"
                >
                  <Play size={20} />
                  <span>{isVideoPlaying ? 'Pause' : 'Play'} Preview</span>
                </button>
              )}

              <button className="bg-transparent text-white p-3 rounded-lg hover:bg-white/20 transition-colors border border-white/30">
                <Heart size={20} />
              </button>

              <button className="bg-transparent text-white p-3 rounded-lg hover:bg-white/20 transition-colors border border-white/30">
                <Share size={20} />
              </button>

              {currentEvent.featured_video_url && isVideoPlaying && (
                <button
                  onClick={toggleMute}
                  className="bg-transparent text-white p-3 rounded-lg hover:bg-white/20 transition-colors border border-white/30"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      {events.length > 1 && (
        <div className="absolute bottom-6 right-6 lg:right-12 flex space-x-2 z-20">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}

      {/* Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-200 flex items-center justify-center z-20"
          >
            ←
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-200 flex items-center justify-center z-20"
          >
            →
          </button>
        </>
      )}
    </div>
  )
}
