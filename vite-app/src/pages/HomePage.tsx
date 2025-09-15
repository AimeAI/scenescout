import { useLocationEvents } from '@/hooks/useLocationEvents'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { MapPin, RefreshCw } from 'lucide-react'

const categories = [
  { id: 'music' as const, title: '🎵 Music Events', icon: '🎵' },
  { id: 'sports' as const, title: '⚽ Sports & Recreation', icon: '⚽' },
  { id: 'arts' as const, title: '🎨 Arts & Culture', icon: '🎨' },
  { id: 'food' as const, title: '🍽️ Food & Drink', icon: '🍽️' },
  { id: 'tech' as const, title: '💻 Tech & Innovation', icon: '💻' },
  { id: 'social' as const, title: '👥 Social & Networking', icon: '👥' },
]

export function HomePage() {
  const {
    location,
    locationError,
    isGettingLocation,
    featuredEvents,
    isLoadingFeatured,
    featuredError,
    refetchLocation
  } = useLocationEvents()

  if (featuredError && !isGettingLocation) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Unable to load events</h2>
        <p className="text-white/60">Please check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Location Banner */}
      <section className="bg-gray-900/50 border-b border-gray-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin size={20} className="text-purple-400" />
            {isGettingLocation ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-white/80">Getting your location...</span>
              </div>
            ) : location ? (
              <div>
                <span className="text-white font-medium">
                  {location.city ? `${location.city}, ${location.state}` : 'Your Location'}
                </span>
                <p className="text-sm text-white/60">
                  Showing events within 50km of your location
                </p>
              </div>
            ) : (
              <div>
                <span className="text-white font-medium">Toronto, ON</span>
                <p className="text-sm text-white/60">
                  {locationError || 'Using default location'}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetchLocation}
            disabled={isGettingLocation}
            className="text-white/60 hover:text-white"
          >
            <RefreshCw size={16} className={isGettingLocation ? 'animate-spin' : ''} />
          </Button>
        </div>
      </section>

      {/* Featured Banner */}
      <section className="relative">
        {isLoadingFeatured ? (
          <div className="h-[70vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : featuredEvents?.length ? (
          <FeaturedBanner events={featuredEvents} />
        ) : (
          <div className="h-[70vh] flex items-center justify-center bg-gradient-to-r from-purple-900/20 to-pink-900/20">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Welcome to SceneScout</h2>
              <p className="text-white/80 text-lg">
                {location ? `Discover amazing events near ${location.city}` : 'Discover amazing events in your city'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Category Rows */}
      <section className="px-8 py-8 space-y-8">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category.id}
            title={category.title}
            icon={category.icon}
          />
        ))}
      </section>
    </div>
  )
}