import { useFeaturedEvents } from '@/hooks/useEvents'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function HomePageSimple() {
  const { data: featuredEvents, isLoading: featuredLoading, error: featuredError } = useFeaturedEvents(5)

  if (featuredError) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Unable to load events</h2>
        <p className="text-white/60">Please check your connection and try again.</p>
        <pre className="text-xs text-red-400 mt-4">{JSON.stringify(featuredError, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Test Banner */}
      <section className="bg-purple-900/20 py-8 px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">SceneScout is Loading</h1>
          <p className="text-white/80">Testing basic functionality...</p>
        </div>
      </section>

      {/* Featured Banner */}
      <section className="relative">
        {featuredLoading ? (
          <div className="h-[50vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
            <span className="ml-4 text-white">Loading events...</span>
          </div>
        ) : featuredEvents?.length ? (
          <FeaturedBanner events={featuredEvents} />
        ) : (
          <div className="h-[50vh] flex items-center justify-center bg-gradient-to-r from-purple-900/20 to-pink-900/20">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Welcome to SceneScout</h2>
              <p className="text-white/80 text-lg">Discover amazing events in your city</p>
              <p className="text-sm text-white/60 mt-2">
                Found {featuredEvents?.length || 0} featured events
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Simple Status Section */}
      <section className="px-8 py-8">
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">React App:</span>
              <span className="text-green-400">✓ Running</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Featured Events:</span>
              <span className={featuredEvents ? "text-green-400" : "text-yellow-400"}>
                {featuredEvents ? `✓ Loaded (${featuredEvents.length})` : "⚠ Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Location Services:</span>
              <span className="text-blue-400">⚡ Ready</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}