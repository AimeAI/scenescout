'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { trackEvent, readInteractions, isTrackingEnabled } from '@/lib/tracking/client'
import { computeAffinity, reorderRows } from '@/lib/tracking/affinity'
import { PriceBadge } from '@/components/events/PriceBadge'
import { manageDynamicRails, isDynamicCategoriesEnabled } from '@/lib/personalization/dynamic-categories'
import { Sidebar } from '@/components/nav/Sidebar'
import { SearchBar } from '@/components/search/SearchBar'
import { QuickChips, type ChipState } from '@/components/filters/QuickChips'
import { applyChipFilters } from '@/lib/filters/applyChips'
import { Thumbs } from '@/components/events/Thumbs'
import { toggleSaved, isSaved } from '@/lib/saved/store'
import { CategoryRail } from '@/components/events/CategoryRail'
import { getHiddenEventIds } from '@/lib/thumbs'
import { clearAllEventCache } from '@/lib/events/clearCache'
import { motion, AnimatePresence } from 'framer-motion'
import { generateDynamicCategories, mergeCategoriesWithDynamic } from '@/lib/personalization/dynamicCategories'
import toast from 'react-hot-toast'
import { SaveConfirmationModal } from '@/components/reminders/SaveConfirmationModal'
import { isFirstSave, markSaveModalSeen } from '@/lib/notifications/requestPermission'
import { PersonalizedRails } from '@/components/personalization/PersonalizedRails'
import { ForYouHero } from '@/components/personalization/ForYouHero'
import { HappeningNowBanner } from '@/components/spontaneity/HappeningNowBanner'

// Enhanced categories with better naming and coverage
// Using simple keywords that work with both Ticketmaster and EventBrite
// NOTE: These are DEFAULT categories. Users can customize via /settings
// Import user preferences to allow customization
import { getUserPreferences, getEnabledSearchCategories } from '@/lib/user-preferences'

const DEFAULT_CATEGORIES = [
  // Music & Entertainment
  { id: 'music-concerts', title: 'Music & Concerts', emoji: '🎵', query: 'concert' },
  { id: 'nightlife-dj', title: 'Nightlife & DJ Sets', emoji: '🌃', query: 'dance' },
  { id: 'comedy-improv', title: 'Comedy & Improv', emoji: '😂', query: 'comedy' },
  { id: 'theatre-dance', title: 'Theatre & Dance', emoji: '🎭', query: 'theatre' },

  // Food & Culture
  { id: 'food-drink', title: 'Food & Drink (Pop-ups, Tastings)', emoji: '🍽️', query: 'festival' },
  { id: 'arts-exhibits', title: 'Arts & Exhibits', emoji: '🎨', query: 'art' },
  { id: 'film-screenings', title: 'Film & Screenings', emoji: '🎬', query: 'film' },
  { id: 'markets-popups', title: 'Markets & Pop-ups', emoji: '🛍️', query: 'festival' },

  // Active & Wellness
  { id: 'sports-fitness', title: 'Sports & Fitness', emoji: '🏃', query: 'sports' },
  { id: 'outdoors-nature', title: 'Outdoors & Nature', emoji: '🌲', query: 'festival' },
  { id: 'wellness-mindfulness', title: 'Wellness & Mindfulness', emoji: '🧘', query: 'expo' },

  // Community & Learning
  { id: 'workshops-classes', title: 'Workshops & Classes', emoji: '📚', query: 'expo' },
  { id: 'tech-startups', title: 'Tech & Startups', emoji: '💻', query: 'tech' },

  // Special Categories
  { id: 'family-kids', title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', query: 'family' },
  { id: 'date-night', title: 'Date Night Ideas', emoji: '💕', query: 'jazz' },
  { id: 'late-night', title: 'Late Night (11pm–4am)', emoji: '🌙', query: 'club' },
  { id: 'neighborhood', title: 'Neighborhood Hotspots', emoji: '📍', query: 'festival' },
  { id: 'halloween', title: 'Halloween Events', emoji: '🎃', query: 'halloween' }
]

// Get categories from user preferences (allows customization from /settings)
function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES

  try {
    const userPrefs = getUserPreferences()
    const enabledCategories = getEnabledSearchCategories()

    // Convert user preference format to homepage format
    return enabledCategories.map(cat => ({
      id: cat.id,
      title: cat.name,
      emoji: cat.name.split(' ')[0] || '🎯', // Extract emoji from name
      query: cat.query
    }))
  } catch (error) {
    console.warn('Failed to load user preferences, using defaults:', error)
    return DEFAULT_CATEGORIES
  }
}

export default function HomePage() {
  const [categoryEvents, setCategoryEvents] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [chipState, setChipState] = useState<ChipState>({})
  const [showDebug, setShowDebug] = useState(false)
  const [affinityScores, setAffinityScores] = useState<Record<string, number>>({})
  const [isMounted, setIsMounted] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [modalEvent, setModalEvent] = useState<any>(null)
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(8) // Start with 8 categories
  const [isLoadingMoreCategories, setIsLoadingMoreCategories] = useState(false)
  const [hiddenEvents, setHiddenEvents] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES) // Use dynamic categories
  const router = useRouter()

  // Create refs for scroll containers - one per category
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const categoryLoadTriggerRef = useRef<HTMLDivElement | null>(null)

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load categories from user preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadedCategories = getCategories()
      setCategories(loadedCategories)
      console.log('📋 Loaded categories from preferences:', loadedCategories.map(c => c.title).join(', '))

      // Listen for preference updates from settings page
      const handlePreferencesUpdate = async () => {
        console.log('🔄 Preferences updated, reloading categories and events...')
        const updatedCategories = getCategories()
        setCategories(updatedCategories)

        // Clear existing events
        setCategoryEvents({})

        // Reload events for all categories (including new ones)
        setLoading(true)
        const promises = updatedCategories.map(category => {
          console.log(`📂 Reloading category: ${category.title}`)
          return loadEvents(category.id, category.query)
        })
        await Promise.all(promises)
        setLoading(false)
        console.log('✅ All categories reloaded!')
      }

      window.addEventListener('preferencesUpdated', handlePreferencesUpdate)
      return () => window.removeEventListener('preferencesUpdated', handlePreferencesUpdate)
    }
  }, [])

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          console.log('✅ Location detected:', position.coords)
        },
        () => {
          console.log('📍 Using default location (SF)')
          setUserLocation({ lat: 37.7749, lng: -122.4194 })
        }
      )
    } else {
      setUserLocation({ lat: 37.7749, lng: -122.4194 })
    }
  }, [])

  // Load events for a category
  const loadEvents = async (categoryId: string, query: string) => {
    console.log(`🔍 Loading ${categoryId} events...`)

    const locationParams = userLocation ?
      `lat=${userLocation.lat}&lng=${userLocation.lng}` :
      'city=San Francisco'

    try {
      const response = await fetch(`/api/search-events?q=${encodeURIComponent(query)}&limit=20&${locationParams}`)
      const data = await response.json()

      if (data.success && data.events?.length > 0) {
        setCategoryEvents(prev => ({
          ...prev,
          [categoryId]: data.events
        }))
        console.log(`✅ ${categoryId}: ${data.events.length} events from ${data.sources?.ticketmaster || 0} TM + ${data.sources?.eventbrite || 0} EB`)
      } else {
        console.log(`ℹ️ No events found for ${categoryId}`)
        setCategoryEvents(prev => ({
          ...prev,
          [categoryId]: []
        }))
      }
    } catch (error) {
      console.error(`❌ Error loading ${categoryId}:`, error)
      setCategoryEvents(prev => ({
        ...prev,
        [categoryId]: []
      }))
    }
  }

  // Load all categories (only when NOT using cached events)
  useEffect(() => {
    // Skip loading if using CategoryRail (it handles its own loading)
    if (process.env.NEXT_PUBLIC_FEATURE_CACHED_EVENTS === 'true') {
      setLoading(false)
      return
    }

    const loadAllCategories = async () => {
      setLoading(true)
      console.log('🚀 Starting to load all categories...')

      // Load categories in parallel (much faster)
      const promises = categories.map(category => {
        console.log(`📂 Loading category: ${category.title}`)
        return loadEvents(category.id, category.query)
      })

      await Promise.all(promises)

      setLoading(false)
      console.log('✅ All categories loaded!')
    }

    // Start loading after location is set or timeout
    const timer = setTimeout(() => {
      loadAllCategories()
    }, userLocation ? 100 : 500)

    return () => clearTimeout(timer)
  }, [userLocation])

  // No longer needed - using react-hot-toast directly

  const handleEventClick = useCallback((event: any) => {
    console.log('🎯 EVENT CLICKED:', {
      id: event?.id,
      title: event?.title,
      hasRouter: !!router
    })

    // Track click interaction for personalization
    if (isTrackingEnabled() && typeof window !== 'undefined') {
      trackEvent('click', {
        eventId: event?.id,
        category: event?.category || 'unknown',
        price: event?.price_min,
        venue: event?.venue_name
      })

      // Show toast feedback with icon
      const categoryName = categories.find(c => c.id === event?.category)?.title || event?.category
      if (categoryName) {
        toast.success(`✨ Learning you like ${categoryName}...`, {
          duration: 2000,
        })
      }
    }

    // Navigate to event detail page
    if (event?.id) {
      // Store full event data in sessionStorage so detail page can use it immediately
      // This avoids 404s from the API endpoint for events it can't find
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event))
      }

      console.log('🚀 NAVIGATING TO:', `/events/${event.id}`)
      router.push(`/events/${event.id}`)
    } else {
      console.warn('⚠️ NO EVENT ID - cannot navigate')
    }
  }, [router])

  const handleSaveEvent = useCallback((event: any) => {
    const wasSaved = isSaved(event.id)

    // If unsaving, just toggle and show toast
    if (wasSaved) {
      toggleSaved(event.id, event)
      toast('Event removed from saved', { duration: 2000 })
      setSavedEvents(new Set([...savedEvents]))

      if (isTrackingEnabled()) {
        trackEvent('unsave', {
          eventId: event?.id,
          category: event?.category || 'unknown',
          price: event?.price_min,
          venue: event?.venue_name
        })
      }
      return
    }

    // SAVING EVENT
    toggleSaved(event.id, event)
    setSavedEvents(new Set([...savedEvents]))

    // Track save interaction
    if (isTrackingEnabled()) {
      trackEvent('save', {
        eventId: event?.id,
        category: event?.category || 'unknown',
        price: event?.price_min,
        venue: event?.venue_name
      })
    }

    // Check if this is user's first save
    if (isMounted && isFirstSave()) {
      // Show beautiful confirmation modal for first save
      setModalEvent(event)
      setShowSaveModal(true)
    } else {
      // For subsequent saves, just show a quick toast
      toast.success('❤️ Event saved!', { duration: 2000 })
    }
  }, [isMounted, savedEvents])

  // Handle chip state changes
  const handleChipChange = useCallback((newState: ChipState) => {
    setChipState(newState)
  }, [])

  // Client-side filter logic for chips - memoized for performance
  const filterEventsByChip = useCallback((events: any[]) => {
    if (!chipState.tonight && !chipState.now && !chipState.free && !chipState.near) {
      return events
    }

    const now = new Date()
    const cityTz = 'America/Toronto' // or get from env
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)

    return applyChipFilters(events, chipState, {
      tz: cityTz,
      todayStartIsoUtc: todayStart.toISOString(),
      todayEndIsoUtc: todayEnd.toISOString(),
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      maxWalkMin: 20
    })
  }, [chipState, userLocation])

  // Scroll function for arrows - memoized
  const scroll = useCallback((categoryId: string, direction: 'left' | 'right') => {
    const container = scrollRefs.current[categoryId]
    if (container) {
      const scrollAmount = 300 // Scroll by one card width plus gap
      const newScrollLeft = direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount
      container.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }
  }, [])

  // Load saved events and hidden events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedEvents')
    if (saved) {
      setSavedEvents(new Set(JSON.parse(saved)))
    }

    // Load hidden events on mount
    if (isMounted) {
      const hidden = getHiddenEventIds()
      setHiddenEvents(hidden)
    }
  }, [isMounted])

  // Filter events by search query (keep for backward compat with existing search input)
  const filterEventsBySearch = (events: any[]) => {
    if (!searchQuery) return events
    return events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Combined filtering (includes hidden events filter)
  const applyFilters = (events: any[]) => {
    let filtered = events

    // Filter out hidden events (thumbs down)
    filtered = filtered.filter(event => !hiddenEvents.has(event.id))

    filtered = filterEventsBySearch(filtered)
    filtered = filterEventsByChip(filtered)
    return filtered
  }

  const totalEvents = Object.values(categoryEvents).reduce((sum, events) => sum + events.length, 0)
  const freeEvents = Object.values(categoryEvents).flat().filter(e => e.price_min === 0).length

  // Track interaction count to trigger recomputation when interactions change
  const [interactionTrigger, setInteractionTrigger] = useState(0)

  // Recompute when interactions change (triggered by save/click/vote actions)
  useEffect(() => {
    if (!isMounted || !isTrackingEnabled()) return

    // Initialize with current interaction count
    const interactions = readInteractions()
    if (interactions.length > 0 && interactionTrigger === 0) {
      setInteractionTrigger(interactions.length)
      console.log('🎯 Initializing with existing interactions:', interactions.length)
    }

    // Listen for custom interaction events (more responsive than polling)
    const handleInteractionChange = () => {
      const interactions = readInteractions()
      setInteractionTrigger(interactions.length)
      console.log('🔄 Interaction detected, recalculating categories...', {
        totalInteractions: interactions.length
      })
    }

    window.addEventListener('savedEventsChanged', handleInteractionChange)
    window.addEventListener('interactionTracked', handleInteractionChange)

    // Listen for thumbs down events to update hidden events in real-time
    const handleThumbsDown = () => {
      const hidden = getHiddenEventIds()
      setHiddenEvents(hidden)
      console.log('👎 Event hidden, updating visible events...', { hiddenCount: hidden.size })
    }

    window.addEventListener('eventHidden', handleThumbsDown)

    // Also poll as fallback for changes from other tabs
    const interval = setInterval(() => {
      const interactions = readInteractions()
      if (interactions.length !== interactionTrigger) {
        setInteractionTrigger(interactions.length)
      }
    }, 2000) // Reduced frequency since we have event listeners

    return () => {
      window.removeEventListener('savedEventsChanged', handleInteractionChange)
      window.removeEventListener('interactionTracked', handleInteractionChange)
      window.removeEventListener('eventHidden', handleThumbsDown)
      clearInterval(interval)
    }
  }, [isMounted, interactionTrigger])

  // Compute personalized row order based on user interactions
  // With DYNAMIC CATEGORY GENERATION for unique personalized experience
  const displayCategories = useMemo(() => {
    if (!isMounted || !isTrackingEnabled()) {
      return categories
    }

    const interactions = readInteractions()
    if (interactions.length === 0) return categories

    const affinity = computeAffinity(interactions)

    // Store affinity scores for debug display
    const categoryAffinity: Record<string, number> = {}
    categories.forEach(cat => {
      categoryAffinity[cat.id] = affinity.categories[cat.id] || 0
    })
    setAffinityScores(categoryAffinity)

    // Log personalization info
    console.log('🎯 Personalization Active:', {
      interactions: interactions.length,
      topCategories: Object.entries(affinity.categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([cat, score]) => `${cat}: ${(score * 100).toFixed(1)}%`)
    })

    // Generate dynamic categories based on user behavior
    const dynamicCategories = generateDynamicCategories(interactions, affinity, categories)

    if (dynamicCategories.length > 0) {
      console.log('✨ Generated Dynamic Categories:', dynamicCategories.map(c => ({
        title: c.title,
        reason: c.reason,
        score: (c.score * 100).toFixed(1) + '%'
      })))
    }

    // Merge dynamic + static categories, sorted by relevance
    const merged = mergeCategoriesWithDynamic(categories, dynamicCategories, affinity)

    console.log('📊 Category Order After Merge:', merged.slice(0, 5).map(c => ({
      title: c.title,
      score: ((c.score || 0) * 100).toFixed(1) + '%',
      isGenerated: c.isGenerated || false
    })))

    // Use dynamic category manager if enabled (for hiding inactive categories)
    if (isDynamicCategoriesEnabled()) {
      const dynamicRails = manageDynamicRails(categories, affinity, categoryEvents, interactions)

      // Convert DynamicRail[] back to Category[] format
      return dynamicRails.map(rail => ({
        id: rail.categoryId,
        title: rail.title,
        emoji: rail.emoji,
        query: categories.find(c => c.id === rail.categoryId)?.query || ''
      }))
    }

    // Return merged categories with dynamic ones on top (already sorted by score)
    // The mergeCategoriesWithDynamic function handles the sorting
    return merged
  }, [categoryEvents, interactionTrigger, isMounted, categories])

  // Vertical infinite scroll: Load more categories when user scrolls to bottom
  useEffect(() => {
    const trigger = categoryLoadTriggerRef.current
    if (!trigger || !displayCategories || displayCategories.length === 0) return

    const handleLoadMoreCategories = () => {
      if (isLoadingMoreCategories || visibleCategoryCount >= displayCategories.length) return

      setIsLoadingMoreCategories(true)
      setTimeout(() => {
        setVisibleCategoryCount(prev => Math.min(prev + 6, displayCategories.length))
        setIsLoadingMoreCategories(false)
      }, 500)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreCategories && visibleCategoryCount < displayCategories.length) {
          handleLoadMoreCategories()
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    )

    observer.observe(trigger)

    return () => {
      if (trigger) observer.unobserve(trigger)
    }
  }, [visibleCategoryCount, isLoadingMoreCategories, displayCategories])

  // Organization Schema for SEO
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SceneScout',
    url: 'https://scenescout.app',
    logo: 'https://scenescout.app/icon-512x512.png',
    description: 'Discover the best events, concerts, comedy shows, and nightlife in Toronto with personalized recommendations',
    sameAs: [
      'https://twitter.com/scenescout',
      'https://facebook.com/scenescout',
      'https://instagram.com/scenescout'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'English'
    }
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SceneScout',
    url: 'https://scenescout.app',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://scenescout.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  }

  return (
    <AppLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="relative min-h-[50vh] sm:h-[45vh] md:h-[40vh] bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center py-8 sm:py-0">
          <div className="text-center z-10 max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">🎯 SceneScout</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-2">
              {userLocation ? 'Events Near You' : 'Discover Events'}
            </p>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
              Real-time events from Ticketmaster & EventBrite - {categories.length} Curated Categories
            </p>
            <div className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed">
              🎵 Entertainment: Music, Nightlife, Comedy, Theatre, Arts & Film<br className="hidden sm:block" />
              <span className="sm:hidden"> • </span>🌟 Lifestyle: Food Pop-ups, Wellness, Outdoors, Date Night & Markets<br className="hidden sm:block" />
              <span className="sm:hidden"> • </span>🚀 Special: Late Night, Family, Tech, Neighborhood & Halloween
            </div>
            
            {totalEvents > 0 && (
              <div className="flex justify-center gap-4 sm:gap-8 mb-3 sm:mb-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-500">{totalEvents}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">Events Found</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-500">{freeEvents}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">Free Events</div>
                </div>
              </div>
            )}

            {/* Search Bar - New Component */}
            <div className="max-w-md mx-auto mb-3 sm:mb-4">
              <SearchBar onResults={(results) => setSearchResults(results)} />

              {/* Fallback to existing search if SEARCH_V1 disabled */}
              {process.env.NEXT_PUBLIC_FEATURE_SEARCH_V1 !== 'true' && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search events, venues, or keywords..."
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value
                      setSearchQuery(value)
                      // Track search for personalization
                      if (value.trim() && isTrackingEnabled() && typeof window !== 'undefined') {
                        trackEvent('search', { query: value })
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-4 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-white/60 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="max-w-md mx-auto mb-3 sm:mb-4">
              <QuickChips onChange={handleChipChange} />
            </div>

            <div className="text-xs sm:text-sm text-gray-500 px-4">
              {userLocation ?
                '📍 Showing events sorted by distance and popularity' :
                '📍 Getting your location for personalized results...'
              }
            </div>

            {/* Debug Toggle - Hidden Button (Click Logo 3x to reveal) */}
            {isMounted && isTrackingEnabled() && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-600 hover:text-purple-400 transition-colors min-h-[44px] px-4"
              >
                {showDebug ? '🔍 Hide Personalization Debug' : '🔍 Show Personalization Debug'}
              </button>
            )}
          </div>
        </div>

        {/* Personalization Status Banner */}
        {isMounted && (
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 py-2 sm:py-3 px-3 sm:px-6 md:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
              <div className="flex items-center gap-2 sm:gap-4 flex-1">
                <div className="text-xs sm:text-sm leading-relaxed">
                  {(() => {
                    const interactions = readInteractions()
                    if (interactions.length === 0) {
                      return (
                        <span className="text-gray-300">
                          ✨ <strong>Start exploring!</strong> Click events, save favorites, or vote to get personalized recommendations
                        </span>
                      )
                    }
                    const affinity = computeAffinity(interactions)
                    const topCat = Object.entries(affinity.categories)
                      .sort(([,a], [,b]) => b - a)[0]
                    const catName = categories.find(c => c.id === topCat?.[0])?.title
                    return (
                      <span className="text-white">
                        🎯 <strong>{interactions.length} interactions tracked</strong> ·
                        Top interest: <span className="text-purple-300">{catName || 'discovering...'}</span>
                      </span>
                    )
                  })()}
                </div>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 transition-colors min-h-[44px] flex items-center flex-shrink-0"
              >
                {showDebug ? 'Hide' : 'Show'} Debug
              </button>
            </div>
          </div>
        )}

        {/* Happening Now Banner - Shows events starting within 3 hours */}
        {!loading && (
          <HappeningNowBanner
            allEvents={Object.values(categoryEvents).flat()}
            onEventClick={handleEventClick}
            categories={categories}
          />
        )}

        {/* For You Hero Section */}
        {!loading && (
          <ForYouHero
            allEvents={Object.values(categoryEvents).flat()}
            onEventClick={handleEventClick}
            categories={categories}
          />
        )}

        {/* Personalized Rails (feature-flagged) */}
        {!loading && (
          <PersonalizedRails
            allEvents={Object.values(categoryEvents).flat()}
            onEventClick={handleEventClick}
            className="mb-6 sm:mb-8"
          />
        )}

        {/* Event Categories */}
        <div className="px-3 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {loading ? (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 border-b-2 border-orange-500 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-base sm:text-lg md:text-xl px-4 font-semibold">⏳ Please wait while events load...</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 px-4">Finding the best events from Ticketmaster & EventBrite</p>
              <p className="text-xs text-gray-500 mt-3 px-4">Loading {categories.length} curated categories - this may take a moment</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayCategories.slice(0, visibleCategoryCount).map((category, index) => {
                // Use cached events when feature is enabled
                if (process.env.NEXT_PUBLIC_FEATURE_CACHED_EVENTS === 'true') {
                  // Check if this category has personalization data
                  const isPersonalized = category.score && category.score > 0
                  const isGenerated = category.isGenerated || false
                  const affinityPercent = category.score ? Math.round(category.score * 100) : 0

                  return (
                    <motion.div
                      key={category.id}
                      layout
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{
                        layout: { duration: 0.5, ease: 'easeInOut' },
                        opacity: { duration: 0.3 },
                        y: { duration: 0.3 }
                      }}
                      className="relative"
                    >
                      {/* Personalization Badge */}
                      {isPersonalized && index < 5 && (
                        <div className="absolute top-0 right-8 z-10 flex items-center gap-2 px-3 py-1 bg-purple-600/90 backdrop-blur-sm rounded-b-lg text-xs font-medium text-white shadow-lg">
                          <span>🎯 {affinityPercent}% match</span>
                          {isGenerated && <span className="text-purple-200">✨</span>}
                          {index === 0 && <span className="ml-1">👑</span>}
                        </div>
                      )}

                      <CategoryRail
                        category={category}
                        userLocation={userLocation}
                        onEventClick={handleEventClick}
                        searchQuery={searchQuery}
                        activeChip={chipState}
                      />
                    </motion.div>
                  )
                }

                // Fallback to old logic when caching disabled
                const allEvents = categoryEvents[category.id] || []
                const filteredEvents = applyFilters(allEvents)

                const isPersonalized = affinityScores[category.id] > 0
                const affinityScore = affinityScores[category.id] || 0

                return (
                  <motion.div
                    key={category.id}
                    layout
                    initial={{ opacity: 0, y: 50 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: affinityScore > 0.3 ? [1, 1.02, 1] : 1
                    }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{
                      layout: { duration: 0.5, ease: 'easeInOut' },
                      opacity: { duration: 0.3 },
                      y: { duration: 0.3 },
                      scale: { duration: 0.6, ease: 'easeOut' }
                    }}
                    whileHover={affinityScore > 0 ? { scale: 1.01 } : {}}
                    className="mb-6 sm:mb-8 relative">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h2
                        className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2 cursor-pointer hover:text-orange-500 transition-colors group"
                        onClick={() => router.push(`/category/${category.id}`)}
                      >
                        <span className="text-xl sm:text-2xl md:text-3xl group-hover:scale-110 transition-transform">{category.emoji}</span>
                        <span className="border-b-2 border-transparent group-hover:border-orange-500 transition-all truncate">
                          {category.title}
                        </span>
                        <svg
                          className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {isPersonalized && (
                          <span className="hidden sm:inline ml-2 text-[10px] sm:text-xs bg-purple-100 text-purple-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                            ✨ Picked For You
                          </span>
                        )}
                        {showDebug && (
                          <span className="hidden md:inline ml-2 text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
                            {(affinityScore * 100).toFixed(1)}%
                          </span>
                        )}
                      </h2>
                      <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0 ml-2">
                        {filteredEvents.length} events
                      </span>
                    </div>

                  {/* Scroll Arrows */}
                  {filteredEvents.length > 3 && (
                    <>
                      <button
                        onClick={() => scroll(category.id, 'left')}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg transition-all"
                        aria-label="Scroll left"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => scroll(category.id, 'right')}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg transition-all"
                        aria-label="Scroll right"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  <div
                    ref={(el) => { scrollRefs.current[category.id] = el }}
                    className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth -mx-2 px-2 sm:mx-0 sm:px-0"
                  >
                    {filteredEvents.length === 0 ? (
                      <div className="flex-shrink-0 w-56 sm:w-64 md:w-72 p-4 sm:p-6 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 text-center">
                        <div className="text-2xl sm:text-3xl mb-2">{category.emoji}</div>
                        <p className="text-gray-400 text-xs sm:text-sm mb-2">No events found</p>
                        <p className="text-gray-500 text-[10px] sm:text-xs">Try a different location or check back later</p>
                      </div>
                    ) : (
                      filteredEvents.map((event, index) => (
                      <div
                        key={`${event.id}-${index}`}
                        className="flex-shrink-0 w-56 sm:w-64 md:w-72 cursor-pointer group snap-start"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 group-hover:scale-105 relative">
                          {/* Save Button - uses new saved store */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveEvent(event)
                            }}
                            className="absolute top-2 left-2 z-10 bg-black/70 hover:bg-black text-white p-1.5 sm:p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={isSaved(event.id) ? "Remove from saved" : "Save event"}
                          >
                            {isSaved(event.id) ? '❤️' : '🤍'}
                          </button>

                          {/* Event Image */}
                          <div className="relative h-32 sm:h-36 md:h-40 overflow-hidden">
                            <img
                              src={event.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80'}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // If image fails to load, use a reliable default
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80'
                              }}
                            />

                            {/* Overlay for better text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            {/* Date badge */}
                            <div className="absolute top-2 right-2">
                              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                                {event.date
                                  ? (() => {
                                      // Parse date properly to avoid timezone issues
                                      let date: Date
                                      if (typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        const [year, month, day] = event.date.split('-').map(Number)
                                        date = new Date(year, month - 1, day)
                                      } else {
                                        date = new Date(event.date)
                                      }
                                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    })()
                                  : 'TBA'}
                              </span>
                            </div>
                          </div>

                          {/* Event Info */}
                          <div className="p-2 sm:p-3">
                            <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2 text-white">
                              {event.title}
                            </h3>

                            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">
                              📍 {event.venue_name}
                            </p>

                            {event.description && (
                              <p className="text-[10px] sm:text-xs text-gray-300 mb-1 sm:mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center gap-2">
                                <PriceBadge event={event} size="sm" showTooltip={false} />

                                {event.time && event.time !== '19:00:00' && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                )}
                              </div>

                              <span className={`text-xs px-2 py-1 rounded ${
                                event.source?.includes('ticketmaster')
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                {event.source?.includes('ticketmaster') ? 'TM' : 'EB'}
                              </span>
                            </div>

                            {/* Thumbs Component */}
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <Thumbs event={event} />
                            </div>
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )
            }).filter(Boolean)}
            </AnimatePresence>
          )}

          {/* Vertical infinite scroll trigger */}
          {!loading && visibleCategoryCount < displayCategories.length && (
            <div ref={categoryLoadTriggerRef} className="py-12 flex justify-center">
              {isLoadingMoreCategories ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                  <p className="text-gray-400">Loading more categories...</p>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">↓ Scroll for more categories ↓</div>
              )}
            </div>
          )}

          {/* All categories loaded message */}
          {!loading && visibleCategoryCount >= displayCategories.length && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-gray-400 text-sm">
                Showing {displayCategories.length} curated categories from Ticketmaster & EventBrite
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Visit /feed for more trending events and discovery options
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Confirmation Modal - shown on first save only */}
      {modalEvent && (
        <SaveConfirmationModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          eventTitle={modalEvent.title}
          eventDate={modalEvent.date || modalEvent.start_date}
        />
      )}
    </AppLayout>
  )
}