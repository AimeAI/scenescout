'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  venue_name: string
  price_min: number
  external_url: string
  category: string
  image_url?: string
}

interface NetflixCategoryRowProps {
  title: string
  emoji: string
  events: Event[]
  onEventClick: (event: Event) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

export function NetflixCategoryRow({ 
  title, 
  emoji, 
  events, 
  onEventClick, 
  onLoadMore, 
  hasMore, 
  loading 
}: NetflixCategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const getEventImage = (event: Event) => {
    if (event.image_url && event.image_url.startsWith('http')) {
      return event.image_url
    }
    
    const categoryImages = {
      sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300&h=200&fit=crop',
      music: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop',
      food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&h=200&fit=crop',
      tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop',
      arts: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
      social: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
      default: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=200&fit=crop'
    }
    
    return categoryImages[event.category] || categoryImages.default
  }

  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow'
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch (e) {
      return dateStr
    }
  }

  if (events.length === 0 && !loading && !hasMore) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>{emoji}</span>
            {title}
          </h2>
          <span className="text-gray-400 text-sm">No events found</span>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No {title.toLowerCase()} events available right now.</p>
          <p className="text-sm mt-2">Check back later for updates!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2">
          <span className="text-xl sm:text-2xl md:text-3xl">{emoji}</span>
          <span className="truncate">{title}</span>
        </h2>
        <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0 ml-2">
          {events.length} events
        </span>
      </div>

      {/* Scrollable Row */}
      <div className="relative group">
        {/* Left Arrow - Hidden on mobile */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Arrow - Hidden on mobile */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Events Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory -mx-2 px-2 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              onClick={() => onEventClick(event)}
              className="flex-shrink-0 w-56 sm:w-64 md:w-72 cursor-pointer group/item snap-start"
            >
              <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 group-hover/item:scale-105">
                {/* Event Image */}
                <div className="relative h-32 sm:h-36 md:h-40 overflow-hidden">
                  <img
                    src={getEventImage(event)}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling.style.display = 'flex'
                    }}
                  />
                  
                  {/* Fallback gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center text-4xl text-white hidden">
                    🎪
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

                  {/* Date */}
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {formatDate(event.date, event.time)}
                    </span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-2 sm:p-3">
                  <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 line-clamp-1">
                    📍 {event.venue_name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-300 line-clamp-2">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className="flex-shrink-0 w-56 sm:w-64 md:w-72 flex items-center justify-center snap-start">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Load More clicked for category')
                  onLoadMore()
                }}
                disabled={loading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-800 text-white p-4 sm:p-6 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 sm:gap-3 min-h-[150px] sm:min-h-[180px] md:min-h-[200px] justify-center w-full border-2 border-orange-500 hover:border-orange-400"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                    <span className="text-sm font-semibold">Loading more...</span>
                    <span className="text-xs opacity-75">Finding more events...</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl animate-pulse">➕</span>
                    <span className="text-lg font-bold">Load More</span>
                    <span className="text-sm opacity-75">Click to see more events</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
