'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { SwipeCard } from '@/components/surprise/SwipeCard'
import { X, Heart, RotateCcw, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSmartQueue } from '@/lib/events/smartQueue'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'
import { saveEvent, unsaveEvent } from '@/lib/saved/store'
import { calculateDistance } from '@/lib/location/distanceCalculator'
import toast from 'react-hot-toast'
import { CATEGORIES } from '@/lib/constants/categories'

const SWIPE_BATCH_SIZE = 20

export default function SurprisePage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [swipeQueue, setSwipeQueue] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [passedCount, setPassedCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      () => {
        // Fallback to SF if location denied
        setUserLocation({ lat: 37.7749, lng: -122.4194 })
      }
    )
  }, [])

  // Load events from multiple categories
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      try {
        const promises = CATEGORIES.map(async (category) => {
          const response = await fetch(
            `/api/search-events?q=${encodeURIComponent(category.query)}&limit=30${
              userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : ''
            }`
          )
          const data = await response.json()
          return data.success ? data.events || [] : []
        })

        const results = await Promise.all(promises)
        const allEvents = results.flat()

        // Deduplicate by ID
        const unique = allEvents.reduce((acc: any[], event: any) => {
          if (!acc.find(e => e.id === event.id)) {
            acc.push(event)
          }
          return acc
        }, [])

        // Add distance if location available
        const eventsWithDistance = userLocation
          ? unique.map(event => {
              if (event.lat && event.lng) {
                const distance = calculateDistance(userLocation, {
                  lat: event.lat,
                  lng: event.lng
                })
                return { ...event, distance }
              }
              return event
            })
          : unique

        setEvents(eventsWithDistance)

        // Create initial smart queue
        const queue = createSmartQueue(eventsWithDistance, {
          maxEvents: SWIPE_BATCH_SIZE,
          diversityWeight: 0.3,
          qualityWeight: 0.4
        })

        setSwipeQueue(queue)
      } catch (error) {
        console.error('Failed to load events:', error)
        toast.error('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    if (userLocation || !navigator.geolocation) {
      loadEvents()
    }
  }, [userLocation])

  const currentEvent = swipeQueue[currentIndex]

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentEvent) return

    if (direction === 'right') {
      // Save event
      saveEvent(currentEvent)
      setSavedCount(prev => prev + 1)
      toast.success('💜 Saved!', { duration: 1500 })

      // Track interaction
      if (isTrackingEnabled()) {
        trackEvent('save', {
          eventId: currentEvent.id,
          category: currentEvent.category || 'unknown',
          price: currentEvent.price_min,
          venue: currentEvent.venue_name
        })
      }
    } else {
      // Pass event
      setPassedCount(prev => prev + 1)

      // Track interaction
      if (isTrackingEnabled()) {
        trackEvent('vote_down', {
          eventId: currentEvent.id,
          category: currentEvent.category || 'unknown',
          price: currentEvent.price_min,
          venue: currentEvent.venue_name
        })
      }
    }

    // Move to next event
    const nextIndex = currentIndex + 1

    if (nextIndex >= swipeQueue.length) {
      // End of queue
      setIsComplete(true)
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  const handlePass = () => handleSwipe('left')
  const handleSave = () => handleSwipe('right')

  const handleInfo = () => {
    if (!currentEvent) return

    // Store event in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`event_${currentEvent.id}`, JSON.stringify(currentEvent))
    }

    router.push(`/events/${currentEvent.id}`)
  }

  const handleLoadMore = () => {
    // Create new queue from remaining events
    const queue = createSmartQueue(events, {
      maxEvents: SWIPE_BATCH_SIZE,
      diversityWeight: 0.3,
      qualityWeight: 0.4
    })

    setSwipeQueue(queue)
    setCurrentIndex(0)
    setSavedCount(0)
    setPassedCount(0)
    setIsComplete(false)
    toast.success('🎉 Loaded more events!', { duration: 2000 })
  }

  const handleViewSaved = () => {
    router.push('/saved')
  }

  const progress = swipeQueue.length > 0 ? ((currentIndex + 1) / swipeQueue.length) * 100 : 0

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-xl text-white">Loading surprises...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (isComplete) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="mb-8">
              <Sparkles className="w-24 h-24 text-purple-400 mx-auto mb-6 animate-pulse" />
              <h1 className="text-5xl font-bold text-white mb-4">All Caught Up!</h1>
              <p className="text-xl text-gray-300">
                You swiped through {swipeQueue.length} events
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-4xl font-bold text-green-400 mb-1">{savedCount}</div>
                  <div className="text-sm text-gray-400">Saved</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-red-400 mb-1">{passedCount}</div>
                  <div className="text-sm text-gray-400">Passed</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleViewSaved}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105"
              >
                View Saved Events →
              </button>

              <button
                onClick={handleLoadMore}
                className="w-full px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold text-lg transition-all"
              >
                <RotateCcw className="w-5 h-5 inline mr-2" />
                Keep Swiping
              </button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
        {/* Header */}
        <div className="relative z-10 p-6">
          <div className="max-w-md mx-auto">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-white mb-2">
                <span className="text-sm font-medium">
                  {currentIndex + 1} of {swipeQueue.length}
                </span>
                <span className="text-sm text-gray-400">
                  {savedCount} saved
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Swipe Cards */}
        <div className="relative h-[calc(100vh-200px)] max-w-md mx-auto px-4">
          <AnimatePresence mode="wait">
            {currentEvent && (
              <SwipeCard
                key={currentEvent.id}
                event={currentEvent}
                onSwipe={handleSwipe}
                onInfo={handleInfo}
                userLocation={userLocation}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-8 left-0 right-0 z-20">
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-center gap-6">
              {/* Pass Button */}
              <motion.button
                onClick={handlePass}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-colors group"
                disabled={!currentEvent}
              >
                <X className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
              </motion.button>

              {/* Save Button */}
              <motion.button
                onClick={handleSave}
                whileTap={{ scale: 0.9 }}
                className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-colors group"
                disabled={!currentEvent}
              >
                <Heart className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>

            {/* Helper Text */}
            <p className="text-center text-white/60 text-sm mt-4">
              Swipe or tap • Left to pass • Right to save
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
