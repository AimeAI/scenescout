'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
import { useFeaturedEvents, useEventsByCategory } from '@/hooks/useEvents'
import { FeaturedEvent, CategoryRow as CategoryRowType, Event, EventHoverInfo, EventCategory } from '@/types'

const categories: { id: EventCategory; title: string }[] = [
  { id: 'music', title: '🎵 Music Events' },
  { id: 'sports', title: '⚽ Sports & Recreation' },
  { id: 'arts', title: '🎨 Arts & Culture' },
  { id: 'food', title: '🍽️ Food & Drink' },
  { id: 'tech', title: '💻 Tech & Innovation' },
  { id: 'social', title: '👥 Social & Networking' },
  { id: 'business', title: '💼 Business Events' },
  { id: 'education', title: '📚 Learning & Education' }
]

export default function HomePage() {
  const [hoveredEvent, setHoveredEvent] = useState<EventHoverInfo | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  
  // Fetch featured events using the hook
  const { data: featuredEventsData, isLoading: featuredLoading, error: featuredError } = useFeaturedEvents()
  
  // Fetch events for all categories at the top level
  const musicEvents = useEventsByCategory('music')
  const sportsEvents = useEventsByCategory('sports')
  const artsEvents = useEventsByCategory('arts')
  const foodEvents = useEventsByCategory('food')
  const techEvents = useEventsByCategory('tech')
  const socialEvents = useEventsByCategory('social')
  const businessEvents = useEventsByCategory('business')
  const educationEvents = useEventsByCategory('education')
  
  // Transform to FeaturedEvent type
  const featuredEvents: FeaturedEvent[] = (featuredEventsData || []).map(event => ({
    ...event,
    featured_description: event.description ? `${event.description.slice(0, 200)}...` : undefined,
    hotness_score: typeof event.hotness_score === 'number' ? event.hotness_score : Math.random() * 100,
  }))

  // Build category rows using the pre-fetched data
  const categoryQueries = [musicEvents, sportsEvents, artsEvents, foodEvents, techEvents, socialEvents, businessEvents, educationEvents]
  const categoryRows: CategoryRowType[] = categories.map((category, index) => {
    const query = categoryQueries[index]
    return {
      id: category.id,
      title: category.title,
      category: category.id,
      events: query.data?.slice(0, 20) || [],
      loading: query.isLoading,
      hasMore: (query.data?.length || 0) >= 20,
    }
  })

  const handleEventHover = (info: EventHoverInfo) => {
    setHoveredEvent(info.isVisible ? info : null)
  }

  const handleVideoPlay = (eventId: string) => {
    setPlayingVideoId(eventId)
  }

  const handleLoadMoreCategory = async (categoryId: string) => {
    // TODO: Implement load more functionality with pagination
    console.log('Load more for category:', categoryId)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Featured Banner */}
        <FeaturedBanner 
          events={featuredEvents}
          autoRotate={true}
          rotateInterval={8000}
        />

        {/* Category Rows */}
        <div className="space-y-8 py-8">
          {categoryRows.map((categoryRow, index) => (
            <CategoryRow
              key={categoryRow.id}
              categoryRow={categoryRow}
              onEventHover={handleEventHover}
              onVideoPlay={handleVideoPlay}
              onLoadMore={() => handleLoadMoreCategory(categoryRow.id)}
            />
          ))}
        </div>

        {/* Loading State */}
        {featuredLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        
        {/* Error State */}
        {featuredError && (
          <div className="flex items-center justify-center min-h-[400px] text-white/60">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Unable to load events</h3>
              <p className="text-sm">Please check your connection and try again.</p>
            </div>
          </div>
        )}

        {/* Event Hover Preview */}
        {hoveredEvent && hoveredEvent.isVisible && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoveredEvent.position.x + 280, // Offset to avoid overlap
              top: hoveredEvent.position.y,
            }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-80 shadow-2xl">
              <h3 className="text-white font-semibold text-lg mb-2">
                {hoveredEvent.event.title}
              </h3>
              <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                {hoveredEvent.event.description}
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div>📅 {new Date(hoveredEvent.event.event_date || hoveredEvent.event.start_time || hoveredEvent.event.date || Date.now()).toLocaleDateString()}</div>
                <div>📍 {hoveredEvent.event.venue_name}</div>
                <div>🏷️ {hoveredEvent.event.category}</div>
                {hoveredEvent.event.price_min && (
                  <div>💰 From ${hoveredEvent.event.price_min}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

