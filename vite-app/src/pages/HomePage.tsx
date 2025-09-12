import { useFeaturedEvents } from '@/hooks/useEvents'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const categories = [
  { id: 'music' as const, title: '🎵 Music Events', icon: '🎵' },
  { id: 'sports' as const, title: '⚽ Sports & Recreation', icon: '⚽' },
  { id: 'arts' as const, title: '🎨 Arts & Culture', icon: '🎨' },
  { id: 'food' as const, title: '🍽️ Food & Drink', icon: '🍽️' },
  { id: 'tech' as const, title: '💻 Tech & Innovation', icon: '💻' },
  { id: 'social' as const, title: '👥 Social & Networking', icon: '👥' },
]

export function HomePage() {
  const { data: featuredEvents, isLoading: featuredLoading, error: featuredError } = useFeaturedEvents(5)

  if (featuredError) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Unable to load events</h2>
        <p className="text-white/60">Please check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Featured Banner */}
      <section className="relative">
        {featuredLoading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : featuredEvents?.length ? (
          <FeaturedBanner events={featuredEvents} />
        ) : (
          <div className="h-[70vh] flex items-center justify-center bg-gradient-to-r from-purple-900/20 to-pink-900/20">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Welcome to SceneScout</h2>
              <p className="text-white/80 text-lg">Discover amazing events in your city</p>
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