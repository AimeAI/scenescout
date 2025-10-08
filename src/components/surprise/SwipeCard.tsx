'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { MapPin, Calendar, Clock, Info } from 'lucide-react'
import { PriceBadge } from '@/components/events/PriceBadge'
import { formatDistance } from '@/lib/location/distanceCalculator'

interface SwipeCardProps {
  event: any
  onSwipe: (direction: 'left' | 'right') => void
  onInfo: () => void
  userLocation?: { lat: number; lng: number } | null
}

export function SwipeCard({ event, onSwipe, onInfo, userLocation }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 100

    if (info.offset.x > threshold) {
      // Swipe right - save
      onSwipe('right')
    } else if (info.offset.x < -threshold) {
      // Swipe left - pass
      onSwipe('left')
    }
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div className="relative w-full h-full bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
        {/* Event Image */}
        <div className="relative h-3/5">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 flex items-center justify-center">
              <span className="text-9xl">🎉</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900" />

          {/* Info Button */}
          <button
            onClick={onInfo}
            className="absolute top-6 right-6 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <Info className="w-6 h-6 text-white" />
          </button>

          {/* Category Badge */}
          <div className="absolute top-6 left-6">
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
              {event.category || 'Event'}
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div className="absolute bottom-0 w-full p-8 space-y-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 line-clamp-2">
              {event.title}
            </h2>

            <p className="text-gray-300 text-lg mb-4 line-clamp-2">
              {event.description || event.venue_name}
            </p>
          </div>

          {/* Event Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            {event.date && (
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-sm">{event.date}</span>
              </div>
            )}

            {/* Time */}
            {event.time && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm">{event.time}</span>
              </div>
            )}

            {/* Location */}
            {event.venue_name && (
              <div className="flex items-center gap-2 text-white col-span-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                <span className="text-sm line-clamp-1">{event.venue_name}</span>
              </div>
            )}

            {/* Distance */}
            {userLocation && event.distance !== undefined && (
              <div className="flex items-center gap-2 text-white">
                <span className="text-sm font-medium text-purple-400">
                  {formatDistance(event.distance)} away
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <PriceBadge event={event} size="lg" showTooltip={false} />
          </div>
        </div>

        {/* Swipe Indicators */}
        <motion.div
          className="absolute top-1/3 left-12 text-9xl font-bold text-green-500 opacity-0"
          style={{
            opacity: useTransform(x, [0, 100], [0, 1])
          }}
        >
          ♥
        </motion.div>

        <motion.div
          className="absolute top-1/3 right-12 text-9xl font-bold text-red-500 opacity-0"
          style={{
            opacity: useTransform(x, [-100, 0], [1, 0])
          }}
        >
          ✕
        </motion.div>
      </div>
    </motion.div>
  )
}
