import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Calendar, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time?: string | null
  venue_name?: string | null
  image_url?: string | null
  video_url?: string | null
  price_min?: number | null
  price_max?: number | null
  is_free?: boolean
  category: string
}

interface FeaturedBannerProps {
  events: Event[]
}

export function FeaturedBanner({ events }: FeaturedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const currentEvent = events[currentIndex]

  // Auto-advance slides
  useEffect(() => {
    if (!isVideoPlaying && events.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
      }, 8000)
      return () => clearInterval(timer)
    }
  }, [events.length, isVideoPlaying])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
  }

  if (!currentEvent) return null

  return (
    <div className="relative h-[70vh] overflow-hidden">
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        {currentEvent.video_url && isVideoPlaying ? (
          <video
            className="w-full h-full object-cover"
            src={currentEvent.video_url}
            autoPlay
            muted
            loop
            onEnded={() => setIsVideoPlaying(false)}
          />
        ) : (
          <img
            src={currentEvent.image_url || '/placeholder-event.jpg'}
            alt={currentEvent.title}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="max-w-2xl">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                {currentEvent.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {currentEvent.title}
            </h1>

            {/* Description */}
            {currentEvent.description && (
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                {currentEvent.description}
              </p>
            )}

            {/* Event Details */}
            <div className="flex flex-wrap items-center gap-6 text-white/90 text-lg mb-8">
              <div className="flex items-center space-x-2">
                <Calendar size={20} />
                <span>{formatDate(currentEvent.date)}</span>
              </div>
              
              {currentEvent.time && (
                <div className="flex items-center space-x-2">
                  <Clock size={20} />
                  <span>{formatTime(currentEvent.time)}</span>
                </div>
              )}
              
              {currentEvent.venue_name && (
                <div className="flex items-center space-x-2">
                  <MapPin size={20} />
                  <span>{currentEvent.venue_name}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {currentEvent.video_url && !isVideoPlaying && (
                <Button
                  size="lg"
                  onClick={() => setIsVideoPlaying(true)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Play size={20} className="mr-2" />
                  Watch Preview
                </Button>
              )}
              
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Get Tickets
              </Button>
              
              <div className="text-white/80">
                {formatPrice(currentEvent.price_min ?? undefined, currentEvent.price_max ?? undefined, currentEvent.is_free)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {events.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
          >
            <ChevronLeft size={24} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
          >
            <ChevronRight size={24} />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {events.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}