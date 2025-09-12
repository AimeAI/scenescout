import { useState } from 'react'
import { Search, Filter, Sparkles, TrendingUp, Calendar, MapPin } from 'lucide-react'
import { useEvents, useInfiniteEvents } from '@/hooks/useEvents'
import { EventCard } from '@/components/events/EventCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import type { EventCategory } from '@/services/events.service'

const categories: { id: EventCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Events', icon: '🎉' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'arts', label: 'Arts & Culture', icon: '🎨' },
  { id: 'food', label: 'Food & Drink', icon: '🍽️' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' }
]

const sortOptions = [
  { id: 'relevance', label: 'Most Relevant', icon: <Sparkles size={16} /> },
  { id: 'date', label: 'Date', icon: <Calendar size={16} /> },
  { id: 'popular', label: 'Most Popular', icon: <TrendingUp size={16} /> },
  { id: 'distance', label: 'Distance', icon: <MapPin size={16} /> }
]

export function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteEvents({
    categories: selectedCategory === 'all' ? undefined : [selectedCategory],
    search: searchQuery || undefined,
    sortBy: sortBy as any
  })

  const events = data?.pages.flatMap(page => page) ?? []

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Unable to load events</h2>
          <p className="text-white/60">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-900/20 to-pink-900/20 py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              Discover Amazing Events
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Find the perfect events tailored to your interests and location
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search events, artists, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters & Controls */}
        <div className="mb-8">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2",
                  selectedCategory === category.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-white/70 hover:bg-gray-700 hover:text-white"
                )}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-white/60 text-sm">Sort by:</span>
                <div className="flex bg-gray-800 rounded-lg p-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={cn(
                        "px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors",
                        sortBy === option.id
                          ? "bg-purple-600 text-white"
                          : "text-white/70 hover:text-white"
                      )}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-white/60 hover:text-white"
              >
                <Filter size={16} className="mr-2" />
                More Filters
              </Button>
            </div>

            <div className="text-sm text-white/60">
              {isLoading ? 'Loading...' : `${events.length} events found`}
            </div>
          </div>

          {/* Advanced Filters (Hidden by default) */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Date Range</label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Input
                      type="date"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Price Range</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Min"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Input
                      placeholder="Max"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Distance</label>
                  <Input
                    placeholder="Within miles"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <Sparkles size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No events found</h3>
            <p>Try adjusting your search criteria or browse different categories</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  size="small"
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="text-center mt-12">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isFetchingNextPage ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Events'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}