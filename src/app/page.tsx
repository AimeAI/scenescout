'use client'

import { useState, useEffect } from 'react'
import { createSafeSupabaseClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
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
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([])
  const [categoryRows, setCategoryRows] = useState<CategoryRowType[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredEvent, setHoveredEvent] = useState<EventHoverInfo | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  const supabase = createSafeSupabaseClient()

  useEffect(() => {
    fetchFeaturedEvents()
    fetchCategoryEvents()
  }, [])

  const fetchFeaturedEvents = async () => {
    try {
      if (!supabase) {
        console.log('Supabase not configured, using mock data')
        setFeaturedEvents(mockFeaturedEvents)
        return
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(name),
          city:cities(name, slug)
        `)
        .eq('is_featured', true)
        .eq('is_approved', true)
        .gte('date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching featured events:', error)
        // Use mock data as fallback
        setFeaturedEvents(mockFeaturedEvents)
        return
      }

      const transformedEvents: FeaturedEvent[] = data.map(event => ({
        ...event,
        event_date: event.date,
        venue_name: event.venue?.name,
        city_name: event.city?.name,
        hotness_score: Math.random() * 100, // TODO: Implement real hotness calculation
        featured_description: event.description?.slice(0, 200) + '...',
      })) as FeaturedEvent[]

      setFeaturedEvents(transformedEvents.length > 0 ? transformedEvents : mockFeaturedEvents)
    } catch (error) {
      console.error('Error fetching featured events:', error)
      setFeaturedEvents(mockFeaturedEvents)
    }
  }

  const fetchCategoryEvents = async () => {
    try {
      const categoryData: CategoryRowType[] = []

      if (!supabase) {
        console.log('Supabase not configured, using mock category data')
        // Use mock data for all categories
        for (const category of categories) {
          categoryData.push({
            id: category.id,
            title: category.title,
            category: category.id,
            events: generateMockEvents(category.id, 10)
          })
        }
        setCategoryRows(categoryData)
        setLoading(false)
        return
      }

      for (const category of categories) {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            venue:venues(name),
            city:cities(name, slug)
          `)
          .eq('category', category.id)
          .eq('is_approved', true)
          .gte('date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error(`Error fetching ${category.id} events:`, error)
          // Use mock data for this category
          categoryData.push({
            id: category.id,
            title: category.title,
            category: category.id,
            events: generateMockEvents(category.id, 10),
            loading: false,
          })
          continue
        }

        const transformedEvents: Event[] = data.map(event => ({
          ...event,
          event_date: event.date,
          venue_name: event.venue?.name,
          city_name: event.city?.name,
        })) as Event[]

        categoryData.push({
          id: category.id,
          title: category.title,
          category: category.id,
          events: transformedEvents.length > 0 ? transformedEvents : generateMockEvents(category.id, 10),
          loading: false,
          hasMore: transformedEvents.length === 20,
        })
      }

      setCategoryRows(categoryData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching category events:', error)
      // Generate all mock data
      const mockCategoryRows = categories.map(category => ({
        id: category.id,
        title: category.title,
        category: category.id,
        events: generateMockEvents(category.id, 10),
        loading: false,
      }))
      setCategoryRows(mockCategoryRows)
      setLoading(false)
    }
  }

  const handleEventHover = (info: EventHoverInfo) => {
    setHoveredEvent(info.isVisible ? info : null)
  }

  const handleVideoPlay = (eventId: string) => {
    setPlayingVideoId(eventId)
  }

  const handleLoadMoreCategory = async (categoryId: string) => {
    setCategoryRows(prev => 
      prev.map(row => 
        row.id === categoryId ? { ...row, loading: true } : row
      )
    )

    // TODO: Implement load more functionality
    setTimeout(() => {
      setCategoryRows(prev => 
        prev.map(row => 
          row.id === categoryId 
            ? { 
                ...row, 
                loading: false, 
                events: [...row.events, ...generateMockEvents(categoryId as EventCategory, 5)]
              } 
            : row
        )
      )
    }, 1000)
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
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
                <div>📅 {new Date(hoveredEvent.event.event_date || hoveredEvent.event.date).toLocaleDateString()}</div>
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

// Mock data for fallback
const mockFeaturedEvents: FeaturedEvent[] = [
  {
    id: '1',
    title: 'Electric Nights Festival',
    description: 'The biggest electronic music festival in the city with world-class DJs',
    date: '2024-02-15',
    event_date: '2024-02-15',
    venue_id: '1',
    venue_name: 'Metropolitan Stadium',
    city_id: '1',
    city_name: 'New York',
    category: 'music',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    banner_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
    price_min: 75,
    price_max: 250,
    is_featured: true,
    is_free: false,
    is_approved: true,
    hotness_score: 95,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    submitted_by: 'admin'
  },
  // Add more mock events...
]

function generateMockEvents(category: EventCategory, count: number): Event[] {
  const mockTitles = {
    music: ['Live Jazz Night', 'Rock Concert', 'DJ Set', 'Classical Symphony', 'Folk Festival'],
    sports: ['Basketball Game', 'Soccer Match', 'Tennis Tournament', 'Marathon', 'Boxing Match'],
    arts: ['Art Gallery Opening', 'Theater Performance', 'Dance Show', 'Poetry Reading', 'Film Screening'],
    food: ['Wine Tasting', 'Food Truck Rally', 'Cooking Class', 'Restaurant Opening', 'Farmers Market'],
    tech: ['Tech Conference', 'Startup Demo', 'Coding Workshop', 'AI Symposium', 'Blockchain Summit'],
    social: ['Networking Event', 'Meetup', 'Community Gathering', 'Social Mixer', 'Speed Networking'],
    business: ['Business Conference', 'Trade Show', 'Workshop', 'Seminar', 'Industry Forum'],
    education: ['Workshop', 'Seminar', 'Lecture', 'Book Club', 'Study Group'],
    health: ['Fitness Class', 'Wellness Workshop', 'Meditation Session', 'Health Fair', 'Yoga Class'],
    family: ['Family Fun Day', 'Kids Workshop', 'Parent Meetup', 'Story Time', 'Playground Event'],
    other: ['Community Event', 'Celebration', 'Festival', 'Market', 'Pop-up Event']
  }

  return Array.from({ length: count }, (_, i) => {
    const eventDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    return ({
      id: `${category}-${i}`,
      title: mockTitles[category]?.[i % 5] || `${category} Event ${i}`,
      description: `An amazing ${category} event you won't want to miss`,
      date: eventDate,
      event_date: eventDate,
      venue_id: `venue-${i}`,
      venue_name: `Venue ${i + 1}`,
      city_id: 'city-1',
      city_name: 'New York',
      category,
      image_url: `https://images.unsplash.com/photo-${1500000000000 + i}?w=400&h=225&fit=crop`,
      price_min: Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 10 : undefined,
      is_featured: Math.random() > 0.8,
      is_free: Math.random() > 0.7,
      is_approved: true,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_by: 'user'
    })
  })
}