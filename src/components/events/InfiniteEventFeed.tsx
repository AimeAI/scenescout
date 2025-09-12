'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useIntersection } from '@/hooks/useIntersection'
import { useVirtualizer } from '@tanstack/react-virtual'
import { NetflixEventCard } from './NetflixEventCard'
import { Event, EventFilters, EventHoverInfo } from '@/types'
import { useInfiniteEvents } from '@/hooks/useEvents'
import { cn } from '@/lib/utils'

interface InfiniteEventFeedProps {
  filters?: EventFilters
  onEventHover?: (info: EventHoverInfo) => void
  onVideoPlay?: (eventId: string) => void
  itemHeight?: number
  overscan?: number
  className?: string
}

export function InfiniteEventFeed({
  filters,
  onEventHover,
  onVideoPlay,
  itemHeight = 200, // Height of each event card
  overscan = 5, // Number of items to render outside visible area
  className
}: InfiniteEventFeedProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(800)

  // Infinite query for events
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteEvents(filters, 20)

  // Flatten all pages into single array
  const allEvents = data?.pages.flatMap(page => page.events) ?? []

  // Intersection observer for triggering load more
  const isIntersecting = useIntersection(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Load more when intersection is detected
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (parentRef.current) {
        setContainerHeight(parentRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: allEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  })

  const items = virtualizer.getVirtualItems()

  // Handle event interactions
  const handleEventHover = useCallback((event: Event, element: HTMLElement) => {
    if (onEventHover) {
      const rect = element.getBoundingClientRect()
      onEventHover({
        event,
        isVisible: true,
        position: { x: rect.left, y: rect.top }
      })
    }
  }, [onEventHover])

  const handleEventHoverEnd = useCallback(() => {
    if (onEventHover) {
      onEventHover({
        event: {} as Event,
        isVisible: false,
        position: { x: 0, y: 0 }
      })
    }
  }, [onEventHover])

  if (isLoading) {
    return (
      <div className={cn("flex flex-col space-y-4 p-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-full h-48 bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <div className="text-red-400 text-lg font-medium mb-2">
            Error loading events
          </div>
          <p className="text-white/60 text-sm">
            {error.message || 'Something went wrong'}
          </p>
        </div>
      </div>
    )
  }

  if (allEvents.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <div className="text-white/60 text-lg font-medium mb-2">
            No events found
          </div>
          <p className="text-white/40 text-sm">
            Try adjusting your filters or search terms
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={cn("h-full overflow-auto scrollbar-hide", className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const event = allEvents[virtualItem.index]
          if (!event) return null

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="p-2 h-full">
                <NetflixEventCard
                  event={event}
                  size="medium"
                  showHoverPreview={true}
                  onVideoPlay={onVideoPlay}
                  onHover={(info) => handleEventHover(event, info.event as any)}
                  className="h-full"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Load more trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center p-8"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center space-x-2 text-white/60">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Loading more events...</span>
            </div>
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
            >
              Load More Events
            </button>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!hasNextPage && allEvents.length > 0 && (
        <div className="text-center p-8 text-white/40 text-sm border-t border-white/5">
          You've reached the end! {allEvents.length} events shown.
        </div>
      )}
    </div>
  )
}