import { useState } from 'react'
import { Heart, Calendar, MapPin, Share2, Trash2, Search } from 'lucide-react'
import { useSavedEvents } from '@/hooks/useEvents'
import { useAuthStore } from '@/stores/auth'
import { EventCard } from '@/components/events/EventCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

const viewModes = ['grid', 'list'] as const
type ViewMode = typeof viewModes[number]

const sortOptions = [
  { id: 'saved_date', label: 'Recently Saved' },
  { id: 'event_date', label: 'Event Date' },
  { id: 'title', label: 'Title' },
  { id: 'category', label: 'Category' }
]

export function SavedPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('saved_date')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  
  const { user } = useAuthStore()
  const { data: savedEvents = [], isLoading, error } = useSavedEvents(user?.id || '')

  // Filter and sort events
  const filteredEvents = savedEvents
    .filter(event => {
      if (!searchQuery) return true
      return (
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'event_date':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'category':
          return a.category.localeCompare(b.category)
        default: // saved_date
          return new Date(b.saved_at || b.date).getTime() - new Date(a.saved_at || a.date).getTime()
      }
    })

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const selectAllEvents = () => {
    setSelectedEvents(
      selectedEvents.length === filteredEvents.length 
        ? [] 
        : filteredEvents.map(event => event.id)
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Unable to load saved events</h2>
          <p className="text-white/60">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center">
                <Heart className="mr-3 text-red-500" size={32} />
                Saved Events
              </h1>
              <p className="text-white/60 mt-2">
                {isLoading ? 'Loading...' : `${filteredEvents.length} saved events`}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-2 rounded text-sm transition-colors",
                  viewMode === 'grid'
                    ? "bg-purple-600 text-white"
                    : "text-white/70 hover:text-white"
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-2 rounded text-sm transition-colors",
                  viewMode === 'list'
                    ? "bg-purple-600 text-white"
                    : "text-white/70 hover:text-white"
                )}
              >
                List
              </button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative max-w-md">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                <Input
                  placeholder="Search saved events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-white/40"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-white/60 text-sm">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white rounded px-3 py-1 text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedEvents.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-white/60 text-sm">
                  {selectedEvents.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={16} className="mr-2" />
                  Remove Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Share2 size={16} className="mr-2" />
                  Share Selected
                </Button>
              </div>
            )}
          </div>

          {filteredEvents.length > 0 && (
            <div className="mt-4 flex items-center">
              <button
                onClick={selectAllEvents}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {selectedEvents.length === filteredEvents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={64} className="mx-auto mb-6 text-gray-600" />
            <h3 className="text-2xl font-bold text-white mb-4">
              {savedEvents.length === 0 ? 'No saved events yet' : 'No events match your search'}
            </h3>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              {savedEvents.length === 0 
                ? 'Start exploring events and save your favorites to see them here'
                : 'Try adjusting your search terms to find your saved events'
              }
            </p>
            {savedEvents.length === 0 && (
              <Button className="bg-purple-600 hover:bg-purple-700">
                Discover Events
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <EventCard
                      event={event}
                      size="small"
                      className={cn(
                        selectedEvents.includes(event.id) && "ring-2 ring-purple-500"
                      )}
                    />
                    <button
                      onClick={() => toggleEventSelection(event.id)}
                      className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 border-white bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-purple-600 transition-colors"
                    >
                      {selectedEvents.includes(event.id) && (
                        <div className="w-3 h-3 bg-purple-600 rounded-full" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors",
                      selectedEvents.includes(event.id) && "border-purple-500"
                    )}
                  >
                    <button
                      onClick={() => toggleEventSelection(event.id)}
                      className="p-4 flex items-center justify-center hover:bg-gray-800 transition-colors"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center",
                        selectedEvents.includes(event.id) && "bg-purple-600 border-purple-600"
                      )}>
                        {selectedEvents.includes(event.id) && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </button>

                    <div className="w-48 h-32 flex-shrink-0">
                      <img
                        src={event.image_url || '/placeholder-event.jpg'}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-white line-clamp-1">
                          {event.title}
                        </h3>
                        <span className="text-xs text-white/60 bg-gray-800 px-2 py-1 rounded-full">
                          {event.category}
                        </span>
                      </div>

                      <p className="text-white/70 text-sm mb-3 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center text-white/60 text-sm">
                            <Calendar size={14} className="mr-2" />
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                          </div>
                          {event.venue_name && (
                            <div className="flex items-center text-white/60 text-sm">
                              <MapPin size={14} className="mr-2" />
                              <span className="truncate">{event.venue_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            View Details
                          </Button>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            Get Tickets
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}