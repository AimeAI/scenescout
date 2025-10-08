'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEventsStartingSoon, formatDistance } from '@/hooks/useEventsStartingSoon'
import { PriceBadge } from '@/components/events/PriceBadge'
import { Clock, MapPin, ChevronRight, Flame } from 'lucide-react'
import { useState } from 'react'

interface HappeningNowBannerProps {
  allEvents: any[]
  onEventClick: (event: any) => void
  categories: Array<{ id: string; title: string; emoji: string }>
}

export function HappeningNowBanner({
  allEvents,
  onEventClick,
  categories
}: HappeningNowBannerProps) {
  const eventsStartingSoon = useEventsStartingSoon(allEvents, 3)
  const [showAll, setShowAll] = useState(false)

  // Don't render if no upcoming events
  if (eventsStartingSoon.length === 0) {
    return null
  }

  // Show top 3 by default, or all if expanded
  const displayEvents = showAll
    ? eventsStartingSoon
    : eventsStartingSoon.slice(0, 3)

  const happeningNowCount = eventsStartingSoon.filter(e => e.isHappeningNow).length
  const upcomingCount = eventsStartingSoon.filter(e => !e.isHappeningNow).length

  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl mb-8 mx-8"
    >
      {/* Gradient Background - Orange to Red */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-500 to-red-600 opacity-95" />

      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            animation: 'pulse 3s ease-in-out infinite'
          }}
        />
      </div>

      <div className="relative px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-2"
            >
              <Flame className="w-7 h-7 text-white animate-pulse" />
              <h2 className="text-3xl font-bold text-white">Happening Now</h2>
            </motion.div>

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-white/90 text-sm">
                {happeningNowCount > 0 && (
                  <span className="font-semibold">
                    {happeningNowCount} starting now
                  </span>
                )}
                {happeningNowCount > 0 && upcomingCount > 0 && <span> · </span>}
                {upcomingCount > 0 && (
                  <span>{upcomingCount} in the next 3 hours</span>
                )}
              </p>

              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/30">
                <Clock className="w-3 h-3" />
                Live updates
              </span>
            </div>
          </div>
        </div>

        {/* Event Cards Carousel */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory scroll-smooth">
            <AnimatePresence mode="popLayout">
              {displayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="flex-shrink-0 w-80 cursor-pointer group snap-start"
                  onClick={() => onEventClick(event)}
                >
                  <div className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group-hover:scale-105 relative h-full">
                    {/* Happening Now Badge */}
                    {event.isHappeningNow && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3" />
                        NOW
                      </div>
                    )}

                    {/* Time Badge */}
                    <div className="absolute top-2 left-2 z-10 bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.timeLabel}
                    </div>

                    {/* Event Image */}
                    <div className="relative h-44 overflow-hidden">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={e => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget
                              .nextElementSibling as HTMLElement
                            if (fallback) fallback.classList.remove('hidden')
                          }}
                        />
                      ) : null}

                      {/* Fallback gradient */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-5xl text-white ${
                          event.image_url ? 'hidden' : 'flex'
                        }`}
                      >
                        {categories.find(
                          c => c.id === (event.category || event.category_id)
                        )?.emoji || '🔥'}
                      </div>
                    </div>

                    {/* Event Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-base mb-2 line-clamp-2 text-gray-900">
                        {event.title}
                      </h3>

                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <p className="text-xs text-gray-600 truncate">
                          {event.venue_name || 'Venue TBA'}
                        </p>
                      </div>

                      {event.distance && (
                        <p className="text-xs text-orange-600 font-medium mb-2">
                          📍 {formatDistance(event.distance)}
                        </p>
                      )}

                      <div className="flex justify-between items-center mt-3">
                        <PriceBadge event={event} size="sm" showTooltip={false} />

                        {/* Category badge */}
                        <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
                          {categories.find(
                            c => c.id === (event.category || event.category_id)
                          )?.title || 'Event'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Scroll Hint */}
          {eventsStartingSoon.length > 3 && !showAll && (
            <div className="absolute right-0 top-0 bottom-4 w-20 bg-gradient-to-l from-red-600 to-transparent pointer-events-none flex items-center justify-end pr-4">
              <ChevronRight className="w-6 h-6 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* See All Button */}
        {eventsStartingSoon.length > 3 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 text-white hover:text-white/80 text-sm font-medium transition-colors group bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full backdrop-blur-sm border border-white/20"
            >
              <span>
                {showAll
                  ? 'Show Less'
                  : `See All ${eventsStartingSoon.length} Events`}
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  showAll ? 'rotate-90' : 'group-hover:translate-x-1'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </motion.section>
  )
}
