'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEvents } from '@/hooks/useEvents'
import { useRealtimeFilters } from '@/hooks/useRealtimeFilters'
import { RealtimeEventStream } from '@/components/realtime/RealtimeEventStream'
import { RealtimeFilters } from '@/components/realtime/RealtimeFilters'
import { PushNotifications } from '@/components/realtime/PushNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventCategory, MapBounds } from '@/types'
import { cn } from '@/lib/utils'

// Dynamically import the map to avoid SSR issues
const EventMap = dynamic(() => import('@/components/map/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-900 rounded-lg h-96">
      <div className="text-white">Loading real-time map...</div>
    </div>
  ),
})

export default function RealtimeDemoPage() {
  const [activeTab, setActiveTab] = useState('map')
  const [mapBounds, setMapBounds] = useState<MapBounds>()
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load initial events
  const { data: events = [], isLoading } = useEvents()

  // Real-time filters
  const {
    filters,
    filteredEvents,
    isConnected,
    activeFilterCount,
    updateFilters,
    clearFilters,
    recentUpdates
  } = useRealtimeFilters({
    bounds: mapBounds,
    maxResults: 50
  })

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const demoFeatures = [
    {
      title: 'Real-time Event Streaming',
      description: 'Live updates as new events are added, modified, or removed',
      icon: '📡',
      status: isConnected ? 'Connected' : 'Offline'
    },
    {
      title: 'Interactive Map Updates',
      description: 'Real-time marker animations and map boundary filtering',
      icon: '🗺️',
      status: mapBounds ? 'Active' : 'Ready'
    },
    {
      title: 'Live Filtering & Search',
      description: 'Instant results with debounced search and category filtering',
      icon: '🔍',
      status: activeFilterCount > 0 ? `${activeFilterCount} active` : 'Ready'
    },
    {
      title: 'Push Notifications',
      description: 'Browser notifications for relevant events matching your preferences',
      icon: '🔔',
      status: 'Notification' in window ? 'Supported' : 'Not supported'
    },
    {
      title: 'Mobile Optimized',
      description: 'Responsive design with efficient data usage for mobile devices',
      icon: '📱',
      status: 'Responsive'
    }
  ]

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white",
      isFullscreen && "h-screen overflow-hidden"
    )}>
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Real-time Features Demo</h1>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Live Updates Active' : 'Offline Mode'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {recentUpdates.length > 0 && (
                <Badge variant="secondary">
                  {recentUpdates.length} live update{recentUpdates.length !== 1 ? 's' : ''}
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Feature Overview */}
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold mb-4">Real-time Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                        <p className="text-sm text-gray-300 mb-2">{feature.description}</p>
                        <Badge 
                          variant={feature.status.includes('active') || feature.status === 'Connected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {feature.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Demo Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="map">Real-time Map</TabsTrigger>
            <TabsTrigger value="stream">Event Stream</TabsTrigger>
            <TabsTrigger value="filters">Live Filters</TabsTrigger>
            <TabsTrigger value="notifications">Push Notifications</TabsTrigger>
          </TabsList>

          {/* Real-time Map Tab */}
          <TabsContent value="map" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Interactive Real-time Map</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <span>Events in view: {filteredEvents.length}</span>
                  {mapBounds && (
                    <span>• Map bounds active</span>
                  )}
                </div>
              </div>

              <div className={cn(
                "rounded-lg overflow-hidden border border-white/20",
                isFullscreen ? "h-screen" : "h-[600px]"
              )}>
                <EventMap
                  events={events}
                  center={[40.7128, -74.0060]}
                  zoom={12}
                  height="100%"
                  onBoundsChange={setMapBounds}
                  showRealtime={true}
                  showRealtimeStats={true}
                  className="w-full h-full"
                />
              </div>

              {!isFullscreen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="font-semibold mb-2">Map Features</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>✓ Real-time marker updates with animations</li>
                      <li>✓ Live event clustering and bounds filtering</li>
                      <li>✓ Interactive popups with event details</li>
                      <li>✓ Category-based marker styling</li>
                      <li>✓ Connection status and update notifications</li>
                    </ul>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="font-semibold mb-2">Performance Optimizations</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>✓ Efficient WebSocket connections</li>
                      <li>✓ Debounced map boundary updates</li>
                      <li>✓ Marker clustering for large datasets</li>
                      <li>✓ Smooth animations with Framer Motion</li>
                      <li>✓ Mobile-optimized touch interactions</li>
                    </ul>
                  </Card>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Event Stream Tab */}
          <TabsContent value="stream" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Event Stream</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                >
                  Clear Filters ({activeFilterCount})
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RealtimeEventStream
                    bounds={mapBounds}
                    categories={selectedCategories}
                    maxUpdates={10}
                    showNotifications={true}
                    className="h-[600px] overflow-y-auto"
                  />
                </div>

                <div className="space-y-4">
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="font-semibold mb-3">Stream Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Connection:</span>
                        <span className={cn(
                          "font-medium",
                          isConnected ? "text-green-400" : "text-red-400"
                        )}>
                          {isConnected ? 'Live' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Updates received:</span>
                        <span className="font-medium text-blue-400">{recentUpdates.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Filtered events:</span>
                        <span className="font-medium">{filteredEvents.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Active filters:</span>
                        <span className="font-medium">{activeFilterCount}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="font-semibold mb-3">Stream Features</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>✓ Live event insertion/updates/deletions</li>
                      <li>✓ Animated notifications</li>
                      <li>✓ Auto-refresh on connection loss</li>
                      <li>✓ Efficient memory management</li>
                      <li>✓ Rate limiting and debouncing</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Live Filters Tab */}
          <TabsContent value="filters" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Real-time Filtering & Search</h3>

              <RealtimeFilters
                initialFilters={filters}
                bounds={mapBounds}
                onFiltersChange={updateFilters}
                onEventsChange={(events) => {
                  // Handle filtered events if needed
                }}
                compact={false}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">Filter Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Processing time:</span>
                      <span className="font-medium text-green-400">&lt; 50ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Debounce delay:</span>
                      <span className="font-medium">200ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Memory usage:</span>
                      <span className="font-medium text-blue-400">Optimized</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">Filter Capabilities</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ Real-time text search</li>
                    <li>✓ Category filtering with counts</li>
                    <li>✓ Geographic bounds filtering</li>
                    <li>✓ Price and date range filters</li>
                    <li>✓ Quick filter presets</li>
                  </ul>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Push Notification System</h3>

              <PushNotifications />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">Notification Features</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ Browser push notifications</li>
                    <li>✓ Customizable event filters</li>
                    <li>✓ Location-based alerts</li>
                    <li>✓ Price and category filtering</li>
                    <li>✓ Notification history</li>
                  </ul>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">Technical Implementation</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ Service Worker integration</li>
                    <li>✓ VAPID key authentication</li>
                    <li>✓ Background sync support</li>
                    <li>✓ Offline queue management</li>
                    <li>✓ Cross-device synchronization</li>
                  </ul>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}