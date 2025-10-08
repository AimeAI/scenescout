'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { readInteractions, isTrackingEnabled } from '@/lib/tracking/client'
import { computeAffinity } from '@/lib/tracking/affinity'
import { Sparkles, TrendingUp, ChevronRight } from 'lucide-react'
import { PriceBadge } from '@/components/events/PriceBadge'
import { toggleSaved, isSaved } from '@/lib/saved/store'

interface ForYouHeroProps {
  allEvents: any[]
  onEventClick: (event: any) => void
  categories: Array<{ id: string; title: string; emoji: string }>
}

export function ForYouHero({ allEvents, onEventClick, categories }: ForYouHeroProps) {
  const router = useRouter()
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check if user has interaction history
  const interactions = useMemo(() => {
    if (!isMounted || !isTrackingEnabled()) return []
    return readInteractions()
  }, [isMounted])

  // Compute affinity and get top categories
  const { topCategories, recommendedEvents } = useMemo(() => {
    if (interactions.length === 0) {
      return { topCategories: [], recommendedEvents: [] }
    }

    const affinity = computeAffinity(interactions)

    // Get top 3 categories by affinity score
    const top = Object.entries(affinity.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([categoryId, score]) => {
        const category = categories.find(c => c.id === categoryId)
        return {
          id: categoryId,
          title: category?.title || categoryId,
          emoji: category?.emoji || '✨',
          score
        }
      })
      .filter(cat => cat.score > 0)

    // Get recommended events from top affinity categories
    const topCategoryIds = top.map(c => c.id)
    const recommended = allEvents
      .filter(event => {
        const eventCategory = event.category || event.category_id
        return topCategoryIds.includes(eventCategory)
      })
      .sort((a, b) => {
        // Sort by affinity score of category, then by date
        const aCategory = a.category || a.category_id
        const bCategory = b.category || b.category_id
        const aScore = affinity.categories[aCategory] || 0
        const bScore = affinity.categories[bCategory] || 0
        if (aScore !== bScore) return bScore - aScore
        return new Date(a.date || a.start_date).getTime() - new Date(b.date || b.start_date).getTime()
      })
      .slice(0, 10)

    return { topCategories: top, recommendedEvents: recommended }
  }, [interactions, allEvents, categories])

  // Load saved events
  useEffect(() => {
    if (isMounted) {
      const saved = localStorage.getItem('savedEvents')
      if (saved) {
        setSavedEvents(new Set(JSON.parse(saved)))
      }
    }
  }, [isMounted])

  const handleSaveEvent = (event: any, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSaved(event.id, event)
    setSavedEvents(new Set([...savedEvents]))
  }

  // Show after just 1 interaction to demonstrate personalization immediately
  // Don't render if we don't have enough data
  if (interactions.length < 1 || topCategories.length === 0 || recommendedEvents.length === 0) {
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl mb-8 mx-8"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 opacity-90" />

      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
      </div>

      <div className="relative px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-6 h-6 text-white" />
              <h2 className="text-3xl font-bold text-white">For You</h2>
            </motion.div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white/90 text-sm">Based on your taste:</p>
              {topCategories.map((cat, index) => (
                <motion.span
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/30"
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.title}</span>
                  <span className="text-white/70">({(cat.score * 100).toFixed(0)}%)</span>
                </motion.span>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/taste')}
            className="flex items-center gap-1 text-white/90 hover:text-white text-sm transition-colors group"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline">View taste profile</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Event Carousel */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory scroll-smooth">
            {recommendedEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="flex-shrink-0 w-72 cursor-pointer group snap-start"
                onClick={() => onEventClick(event)}
              >
                <div className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group-hover:scale-105 relative h-full">
                  {/* Save Button */}
                  <button
                    onClick={(e) => handleSaveEvent(event, e)}
                    className="absolute top-2 left-2 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
                  >
                    {isSaved(event.id) ? '❤️' : '🤍'}
                  </button>

                  {/* Recommended Badge */}
                  <div className="absolute top-2 right-2 z-10 bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </div>

                  {/* Event Image */}
                  <div className="relative h-40 overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}

                    {/* Fallback gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl text-white ${event.image_url ? 'hidden' : 'flex'}`}>
                      {categories.find(c => c.id === (event.category || event.category_id))?.emoji || '🎉'}
                    </div>

                    {/* Date badge */}
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                        {event.date || event.start_date
                          ? new Date(event.date || event.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: new Date(event.date || event.start_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })
                          : 'TBA'}
                      </span>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-gray-900">
                      {event.title}
                    </h3>

                    <p className="text-xs text-gray-500 mb-2">
                      📍 {event.venue_name || 'Venue TBA'}
                    </p>

                    <div className="flex justify-between items-center">
                      <PriceBadge event={event} size="sm" showTooltip={false} />

                      {event.time && event.time !== '19:00:00' && (
                        <span className="text-xs text-gray-500">
                          {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Scroll Hint */}
          {recommendedEvents.length > 3 && (
            <div className="absolute right-0 top-0 bottom-4 w-20 bg-gradient-to-l from-purple-600 to-transparent pointer-events-none flex items-center justify-end pr-4">
              <ChevronRight className="w-6 h-6 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/taste')}
            className="inline-flex items-center gap-2 text-white hover:text-white/80 text-sm font-medium transition-colors group"
          >
            <span>See your full taste profile</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
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
