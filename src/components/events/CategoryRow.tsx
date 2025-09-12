'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryRow as CategoryRowType, Event, EventHoverInfo } from '@/types'
import { NetflixEventCard } from './NetflixEventCard'

interface CategoryRowProps {
  categoryRow: CategoryRowType
  onEventHover?: (info: EventHoverInfo) => void
  onVideoPlay?: (eventId: string) => void
  onLoadMore?: () => void
  className?: string
}

export function CategoryRow({ 
  categoryRow, 
  onEventHover,
  onVideoPlay,
  onLoadMore,
  className 
}: CategoryRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isScrolling, setIsScrolling] = useState(false)

  const checkScrollability = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  const scrollBy = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container || isScrolling) return

    setIsScrolling(true)
    
    const cardWidth = 256 + 16 // card width + gap
    const scrollAmount = cardWidth * 3 // Scroll 3 cards at a time
    const newScrollLeft = container.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })

    // Reset scrolling state after animation
    setTimeout(() => {
      setIsScrolling(false)
      checkScrollability()
    }, 300)
  }

  const handleScroll = () => {
    if (!isScrolling) {
      checkScrollability()
    }

    // Load more items when near the end
    const container = scrollContainerRef.current
    if (container && onLoadMore) {
      const { scrollLeft, scrollWidth, clientWidth } = container
      if (scrollLeft + clientWidth >= scrollWidth - 800) { // Load when 800px from end
        onLoadMore()
      }
    }
  }

  useEffect(() => {
    checkScrollability()
  }, [categoryRow.events])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [onLoadMore])

  if (categoryRow.events.length === 0 && !categoryRow.loading) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl lg:text-2xl font-bold text-white">
            {categoryRow.title}
          </h2>
          {categoryRow.loading && (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          )}
        </div>
        
        <button className="text-white/60 hover:text-white text-sm font-medium transition-colors">
          See All
        </button>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scrollBy('left')}
          disabled={!canScrollLeft || isScrolling}
          className={cn(
            "absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 z-10",
            "w-12 h-12 rounded-full bg-black/80 backdrop-blur-sm border border-white/20",
            "flex items-center justify-center text-white transition-all duration-200",
            "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/90",
            !canScrollLeft && "cursor-not-allowed opacity-30",
            canScrollLeft && "hover:shadow-lg shadow-black/50"
          )}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scrollBy('right')}
          disabled={!canScrollRight || isScrolling}
          className={cn(
            "absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 z-10",
            "w-12 h-12 rounded-full bg-black/80 backdrop-blur-sm border border-white/20",
            "flex items-center justify-center text-white transition-all duration-200",
            "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/90",
            !canScrollRight && "cursor-not-allowed opacity-30",
            canScrollRight && "hover:shadow-lg shadow-black/50"
          )}
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex space-x-4 px-6 lg:px-12 py-2">
            {categoryRow.events.map((event, index) => (
              <div key={`${event.id}-${index}`} className="flex-shrink-0">
                <NetflixEventCard
                  event={event}
                  size="medium"
                  showHoverPreview={true}
                  onHover={onEventHover}
                  onVideoPlay={onVideoPlay}
                />
              </div>
            ))}
            
            {/* Loading Skeleton */}
            {categoryRow.loading && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`loading-${index}`}
                    className="flex-shrink-0 w-64 h-36 bg-gray-800 rounded-lg animate-pulse"
                  />
                ))}
              </>
            )}
            
            {/* Load More Trigger */}
            {categoryRow.hasMore && !categoryRow.loading && (
              <div className="flex-shrink-0 w-64 h-36 flex items-center justify-center">
                <button
                  onClick={onLoadMore}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-6 py-3 text-white/80 hover:text-white transition-all duration-200"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none z-5" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none z-5" />
      </div>
    </div>
  )
}