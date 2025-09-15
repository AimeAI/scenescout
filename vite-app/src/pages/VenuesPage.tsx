import React, { useState, useMemo } from 'react'
import { Search, Filter, MapPin, Building2, Star } from 'lucide-react'
import { useVenues, useVenueCategories, useVenueStats } from '@/hooks/useVenues'
import { useLocationService } from '@/hooks/useLocation'
import { VenueCard } from '@/components/venues/VenueCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VenueFilters } from '@/services/venues.service'

export function VenuesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'rating' | 'created'>('name')
  const [showFilters, setShowFilters] = useState(false)

  // Get user location for distance calculations
  const { location } = useLocationService()

  // Build filters
  const filters: VenueFilters = useMemo(() => ({
    search: searchQuery || undefined,
    categories: selectedCategory === 'all' ? undefined : [selectedCategory],
    sortBy,
    latitude: location?.latitude,
    longitude: location?.longitude,
    limit: 50
  }), [searchQuery, selectedCategory, sortBy, location])

  // Fetch data
  const { data: venues = [], isLoading, error } = useVenues(filters)
  const { data: categories = [] } = useVenueCategories()
  const { data: stats } = useVenueStats()

  // Filter and sort venues
  const displayVenues = useMemo(() => {
    let filtered = venues

    if (sortBy === 'rating') {
      filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === 'distance' && location) {
      filtered = [...filtered].sort((a, b) => (a.distance || 999) - (b.distance || 999))
    } else if (sortBy === 'created') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }, [venues, sortBy, location])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Unable to load venues</h2>
          <p className="text-white/60">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Discover Venues
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Find the perfect venues for your next event or night out
            </p>
            
            {stats && (
              <div className="flex justify-center space-x-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                  <div className="text-white/60">Total Venues</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{stats.recentlyAdded}</div>
                  <div className="text-white/60">Added Today</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-white/40"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.type} value={category.type}>
                    {category.type.charAt(0).toUpperCase() + category.type.slice(1)} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="created">Newest</SelectItem>
              </SelectContent>
            </Select>

            {/* Results count */}
            <div className="text-white/60 whitespace-nowrap">
              {isLoading ? 'Loading...' : `${displayVenues.length} venues`}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="text-white hover:text-white"
            >
              All ({stats?.total || 0})
            </Button>
            {categories.slice(0, 8).map(category => (
              <Button
                key={category.type}
                variant={selectedCategory === category.type ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category.type)}
                className="text-white hover:text-white"
              >
                {category.type.charAt(0).toUpperCase() + category.type.slice(1)} ({category.count})
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : displayVenues.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={64} className="mx-auto text-white/30 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No venues found</h3>
            <p className="text-white/60 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search criteria'
                : 'We\'re working on adding more venues to this area'
              }
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                }}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  size="medium"
                  showDistance={!!location}
                  onClick={() => window.location.href = `/venues/${venue.id}`}
                />
              ))}
            </div>

            {/* Load More - if we implement pagination */}
            {displayVenues.length === 50 && (
              <div className="text-center mt-12">
                <Button 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Load More Venues
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Section */}
      {stats && stats.bySource.length > 0 && (
        <div className="bg-gray-900 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Venue Sources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.bySource.map(source => (
                <div key={source.source} className="text-center">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="text-3xl font-bold text-white mb-2">{source.count}</div>
                    <div className="text-white/60 capitalize">
                      {source.source.replace('_', ' ')} Venues
                    </div>
                    {source.source === 'google_places' && (
                      <Badge className="bg-blue-500 mt-2">Google Places</Badge>
                    )}
                    {source.source === 'yelp' && (
                      <Badge className="bg-red-500 mt-2">Yelp</Badge>
                    )}
                    {source.source === 'manual' && (
                      <Badge className="bg-gray-500 mt-2">Manually Added</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}