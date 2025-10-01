'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleSaved, isSaved } from '@/lib/saved/store'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  venue_name: string
  address: string
  price_min: number
  external_url: string
  category: string
  image_url?: string
  latitude: number
  longitude: number
}

interface NetflixCarouselProps {
  events: Event[]
  onEventClick: (event: Event) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

const CATEGORIES = [
  { id: 'all', title: 'All Events', emoji: '🎯' },
  { id: 'trending', title: 'Trending Now', emoji: '🔥' },
  { id: 'sports', title: 'Sports', emoji: '⚽' },
  { id: 'music', title: 'Music', emoji: '🎵' },
  { id: 'food', title: 'Food & Drink', emoji: '🍽️' },
  { id: 'tech', title: 'Tech', emoji: '💻' },
  { id: 'arts', title: 'Arts & Culture', emoji: '🎨' },
  { id: 'social', title: 'Social', emoji: '👥' },
  { id: 'free', title: 'Free Events', emoji: '🎁' }
]

export function NetflixCarousel({ events, onEventClick, onLoadMore, hasMore, loading }: NetflixCarouselProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    filterEvents()
  }, [events, selectedCategory])

  const filterEvents = () => {
    let filtered = events

    switch (selectedCategory) {
      case 'all':
        filtered = events
        break
      case 'trending':
        filtered = events.filter(e => e.price_min > 50 || 
          ['scotiabank arena', 'massey hall', 'phoenix concert theatre'].some(venue => 
            e.venue_name.toLowerCase().includes(venue)
          ))
        break
      case 'free':
        filtered = events.filter(e => e.price_min === 0)
        break
      default:
        filtered = events.filter(e => e.category === selectedCategory)
    }

    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setFilteredEvents(filtered)
  }

  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return `Today ${timeStr ? `at ${formatTime(timeStr)}` : ''}`
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow ${timeStr ? `at ${formatTime(timeStr)}` : ''}`
      } else {
        const options: Intl.DateTimeFormatOptions = { 
          month: 'short', 
          day: 'numeric',
          weekday: 'short'
        }
        return `${date.toLocaleDateString('en-US', options)} ${timeStr ? `at ${formatTime(timeStr)}` : ''}`
      }
    } catch (e) {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    } catch (e) {
      return timeStr
    }
  }

  const getCategoryGradient = (category: string) => {
    const gradients = {
      sports: 'from-green-500 to-blue-500',
      music: 'from-purple-500 to-pink-500',
      food: 'from-yellow-500 to-red-500',
      tech: 'from-blue-500 to-indigo-500',
      arts: 'from-pink-500 to-purple-500',
      social: 'from-indigo-500 to-purple-500',
      default: 'from-gray-500 to-gray-700'
    }
    return gradients[category] || gradients.default
  }

  const getEventImage = (event: Event) => {
    if (event.image_url && event.image_url.startsWith('http')) {
      return event.image_url
    }

    // Generate category-based placeholder
    const categoryImages = {
      sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=200&fit=crop',
      music: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
      food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
      tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop',
      arts: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop',
      social: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=200&fit=crop',
      default: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop'
    }

    return categoryImages[event.category] || categoryImages.default
  }

  const handleSaveEvent = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation()

    if (process.env.NEXT_PUBLIC_FEATURE_SAVED_V1 !== 'true') return

    const wasSaved = isSaved(event.id)
    toggleSaved(event.id)

    // Track save/unsave
    if (isTrackingEnabled()) {
      trackEvent(wasSaved ? 'unsave' : 'save', {
        eventId: event.id,
        category: event.category,
        price: event.price_min,
        venue: event.venue_name
      })
    }

    // Force re-render to update heart icon
    forceUpdate(prev => prev + 1)
  }

  return (
    <div className="space-y-8">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition ${
              selectedCategory === category.id
                ? 'bg-white text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <span>{category.emoji}</span>
            <span className="font-medium">{category.title}</span>
          </button>
        ))}
      </div>

      {/* Events Count */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {CATEGORIES.find(c => c.id === selectedCategory)?.title || 'Events'}
        </h2>
        <span className="text-gray-400">
          {filteredEvents.length} events
        </span>
      </div>

      {/* Events Carousel */}
      {filteredEvents.length > 0 ? (
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  transition={{ duration: 0.2 }}
                  className="cursor-pointer group"
                  onClick={() => onEventClick(event)}
                >
                  <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition">
                    {/* Event Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getEventImage(event)}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to gradient if image fails
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling.style.display = 'flex'
                        }}
                      />
                      
                      {/* Fallback gradient */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(event.category)} items-center justify-center text-4xl text-white hidden`}
                      >
                        {CATEGORIES.find(c => c.id === event.category)?.emoji || '🎪'}
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Price Badge */}
                      <div className="absolute top-2 right-2">
                        {event.price_min === 0 ? (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                            FREE
                          </span>
                        ) : (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                            ${event.price_min}
                          </span>
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-black/70 text-white px-2 py-1 rounded text-xs capitalize">
                          {event.category}
                        </span>
                      </div>

                      {/* Save Button */}
                      {process.env.NEXT_PUBLIC_FEATURE_SAVED_V1 === 'true' && (
                        <button
                          onClick={(e) => handleSaveEvent(e, event)}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors z-10"
                          aria-label={isSaved(event.id) ? 'Unsave event' : 'Save event'}
                        >
                          {isSaved(event.id) ? '❤️' : '🤍'}
                        </button>
                      )}

                      {/* Date/Time Overlay */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="text-white text-sm font-medium">
                          {formatDate(event.date, event.time)}
                        </div>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span className="line-clamp-1">{event.venue_name}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                        {event.description}
                      </p>

                      {/* Action Indicator */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Click to view
                        </span>
                        <div className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          View Event →
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className="text-center mt-8">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded font-semibold disabled:opacity-50"
              >
                {loading ? 'Loading More...' : 'Load More Events'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
          <p className="text-gray-400">
            No events found in the {CATEGORIES.find(c => c.id === selectedCategory)?.title.toLowerCase()} category.
          </p>
        </div>
      )}
    </div>
  )
}
