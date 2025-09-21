import { useUserLocation } from '@/hooks/useUserLocation'
import { useLocationEvents, useFeaturedEvents } from '@/hooks/useEvents'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
import { LocationDetector } from '@/components/location/LocationDetector'
import { LocationSelector } from '@/components/location/LocationSelector'
import { AutoDiscovery } from '@/components/location/AutoDiscovery'
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
  const userLocation = useUserLocation()
  const { data: featuredEvents, isLoading: isLoadingFeatured, error: featuredError } = useFeaturedEvents(5)
  const { data: locationEvents, isLoading: isLoadingLocationEvents } = useLocationEvents(userLocation.cityId)

  if (featuredError && !userLocation.loading) {
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
            {userLocation.loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-white/80">Getting your location...</span>
              </div>
            ) : (
              <div>
                <span className="text-white font-medium">
                  {userLocation.city}
                </span>
                <p className="text-sm text-white/60">
                  {userLocation.cityId 
                    ? `Showing events in your city` 
                    : 'Your city will be added soon - showing nearby events'
                  }
                </p>
              </div>
            )}
          </div>
          <LocationDetector />
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
                Discover amazing events in {userLocation.city || 'your city'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Location Selector for manual selection */}
      {userLocation.error && (
        <div className="px-8 mb-6">
          <LocationSelector onLocationSelected={() => window.location.reload()} />
        </div>
      )}

      {/* Auto Discovery for New Cities */}
      <AutoDiscovery onDiscoveryComplete={() => window.location.reload()} />

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