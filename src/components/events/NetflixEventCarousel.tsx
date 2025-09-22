'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, MapPin, Calendar, DollarSign } from 'lucide-react'

interface EventCategory {
  title: string
  emoji: string
  category: string
  gradient: string
}

const CATEGORIES: EventCategory[] = [
  { title: "Tonight's Hottest", emoji: "🔥", category: 'trending', gradient: 'from-red-500 to-orange-500' },
  { title: "Live Music", emoji: "🎵", category: 'music', gradient: 'from-purple-500 to-pink-500' },
  { title: "Sports Events", emoji: "🏈", category: 'sports', gradient: 'from-green-500 to-blue-500' },
  { title: "Food & Drinks", emoji: "🍔", category: 'food', gradient: 'from-yellow-500 to-red-500' },
  { title: "Tech Meetups", emoji: "💻", category: 'tech', gradient: 'from-blue-500 to-indigo-500' },
  { title: "Pop-up Shows", emoji: "🎪", category: 'arts', gradient: 'from-pink-500 to-purple-500' },
  { title: "Free Today", emoji: "🎁", category: 'free', gradient: 'from-green-500 to-teal-500' }
]

export function NetflixEventCarousel({ userLocation }: { userLocation: { lat: number, lng: number } }) {
  const [categories, setCategories] = useState<Map<string, any[]>>(new Map())
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('event_updates')
      .on('broadcast', { event: 'new_events' }, () => {
        loadEvents()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [userLocation])

  const loadEvents = async () => {
    const { data: events } = await supabase
      .rpc('get_nearby_events', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: 25
      })
      .order('event_date', { ascending: true })
      .limit(200)

    // Group by category
    const grouped = new Map()
    CATEGORIES.forEach(cat => {
      const categoryEvents = events?.filter(e => 
        cat.category === 'trending' ? e.view_count > 100 :
        cat.category === 'free' ? (!e.ticket_price_min || e.ticket_price_min === 0) :
        e.categories?.includes(cat.category)
      ) || []
      grouped.set(cat.category, categoryEvents)
    })
    
    setCategories(grouped)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Netflix-style Hero */}
      <div className="relative h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
        <div className="absolute bottom-0 left-0 p-12 z-20">
          <h1 className="text-6xl font-bold mb-4">What's Happening Near You</h1>
          <p className="text-xl text-gray-300 mb-8">
            Live events within 25km • Updated every 30 minutes
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition">
              Browse All
            </button>
            <button className="px-8 py-3 bg-gray-800 font-bold rounded hover:bg-gray-700 transition">
              My Interests
            </button>
          </div>
        </div>
      </div>

      {/* Category Rows */}
      <div className="px-12 -mt-32 relative z-30">
        {CATEGORIES.map((category) => (
          <div key={category.category} className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">{category.emoji}</span>
              {category.title}
              <span className="text-sm text-gray-400 ml-2">
                ({categories.get(category.category)?.length || 0} events)
              </span>
            </h2>
            
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                <AnimatePresence>
                  {categories.get(category.category)?.slice(0, 20).map((event) => (
                    <motion.div
                      key={event.id}
                      className="flex-shrink-0 w-64 cursor-pointer"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                      onHoverStart={() => setHoveredCard(event.id)}
                      onHoverEnd={() => setHoveredCard(null)}
                    >
                      <div className="relative rounded-lg overflow-hidden bg-gray-800">
                        {/* Event Image */}
                        <div className={`h-36 bg-gradient-to-br ${category.gradient}`}>
                          {event.featured_image_url && (
                            <img 
                              src={event.featured_image_url} 
                              alt={event.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        
                        {/* Event Info */}
                        <div className="p-4">
                          <h3 className="font-semibold mb-1 line-clamp-2">
                            {event.name}
                          </h3>
                          <div className="text-sm text-gray-400 space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              {event.venue_name || 'Venue TBA'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(event.event_date).toLocaleDateString()}
                            </div>
                            {event.ticket_price_min !== null && (
                              <div className="flex items-center gap-1">
                                <DollarSign size={12} />
                                {event.ticket_price_min === 0 ? 'Free' : `From $${event.ticket_price_min}`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hover Details */}
                        {hoveredCard === event.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent p-4 flex flex-col justify-end"
                          >
                            <p className="text-sm mb-3 line-clamp-3">
                              {event.description || 'No description available'}
                            </p>
                            <button className="w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition">
                              View Details
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
