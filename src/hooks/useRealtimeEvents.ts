import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { Event, EventCategory, MapBounds } from '@/types'
import { queryKeys } from '@/lib/react-query'
import { transformEventRow } from '@/lib/event-normalizer'

const supabase = createSafeSupabaseClient()

interface RealtimeEventUpdate {
  type: 'insert' | 'update' | 'delete'
  event: Event
  timestamp: number
}

interface UseRealtimeEventsOptions {
  bounds?: MapBounds
  categories?: EventCategory[]
  enabled?: boolean
  onEventUpdate?: (update: RealtimeEventUpdate) => void
}

// Custom hook for real-time event updates
export function useRealtimeEvents({
  bounds,
  categories,
  enabled = true,
  onEventUpdate
}: UseRealtimeEventsOptions = {}) {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [updates, setUpdates] = useState<RealtimeEventUpdate[]>([])
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const lastUpdateRef = useRef<number>(Date.now())

  // Handle real-time update
  const handleUpdate = useCallback((payload: any) => {
    if (!payload.new && !payload.old) return

    const timestamp = Date.now()
    lastUpdateRef.current = timestamp

    let updateType: 'insert' | 'update' | 'delete'
    let eventData: any

    if (payload.eventType === 'INSERT') {
      updateType = 'insert'
      eventData = payload.new
    } else if (payload.eventType === 'UPDATE') {
      updateType = 'update'
      eventData = payload.new
    } else if (payload.eventType === 'DELETE') {
      updateType = 'delete'
      eventData = payload.old
    } else {
      return
    }

    // Transform the event data
    const transformedEvent = transformEventRow(eventData)

    // Filter by bounds if specified
    if (bounds && transformedEvent.venue?.latitude && transformedEvent.venue?.longitude) {
      const { latitude, longitude } = transformedEvent.venue
      if (
        latitude < bounds.south ||
        latitude > bounds.north ||
        longitude < bounds.west ||
        longitude > bounds.east
      ) {
        return
      }
    }

    // Filter by categories if specified
    if (categories && categories.length > 0 && !categories.includes(transformedEvent.category as EventCategory)) {
      return
    }

    const update: RealtimeEventUpdate = {
      type: updateType,
      event: transformedEvent,
      timestamp
    }

    // Update local state
    setUpdates(prev => [...prev.slice(-9), update]) // Keep last 10 updates

    // Call external handler
    onEventUpdate?.(update)

    // Update React Query cache
    updateQueryCache(update)

    console.log(`[Real-time] ${updateType} event:`, transformedEvent.title)
  }, [bounds, categories, onEventUpdate, queryClient])

  // Update React Query cache based on the update
  const updateQueryCache = useCallback((update: RealtimeEventUpdate) => {
    const { type, event } = update

    // Update single event cache
    queryClient.setQueryData(queryKeys.event(event.id), type === 'delete' ? undefined : event)

    // Update events lists
    const updateEventsList = (oldData: Event[] | undefined) => {
      if (!oldData) return oldData

      switch (type) {
        case 'insert':
          return [event, ...oldData].slice(0, 150) // Keep reasonable limit
        case 'update':
          return oldData.map(e => e.id === event.id ? event : e)
        case 'delete':
          return oldData.filter(e => e.id !== event.id)
        default:
          return oldData
      }
    }

    // Update various event query caches
    queryClient.setQueriesData({
      queryKey: queryKeys.events
    }, updateEventsList)

    // Update category-specific caches
    if (event.category) {
      queryClient.setQueriesData({
        queryKey: queryKeys.eventsByCategory(event.category as EventCategory)
      }, updateEventsList)
    }

    // Update featured events if applicable
    if (event.is_featured) {
      queryClient.setQueriesData({
        queryKey: queryKeys.featuredEvents()
      }, updateEventsList)
    }

    // Update map bounds cache if within bounds
    if (bounds && event.venue?.latitude && event.venue?.longitude) {
      const { latitude, longitude } = event.venue
      if (
        latitude >= bounds.south &&
        latitude <= bounds.north &&
        longitude >= bounds.west &&
        longitude <= bounds.east
      ) {
        const boundsKey = `${bounds.north},${bounds.south},${bounds.east},${bounds.west}`
        queryClient.setQueriesData({
          queryKey: queryKeys.eventsByBounds(boundsKey)
        }, updateEventsList)
      }
    }
  }, [queryClient, bounds])

  // Setup subscription
  const setupSubscription = useCallback(() => {
    if (!supabase || !enabled) return

    try {
      // Clear existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      // Create new subscription
      subscriptionRef.current = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events'
          },
          handleUpdate
        )
        .subscribe((status: string) => {
          console.log('[Real-time] Subscription status:', status)
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setError(null)
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            setError('Failed to connect to real-time updates')
            
            // Retry connection after 5 seconds
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[Real-time] Attempting to reconnect...')
              setupSubscription()
            }, 5000)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
          }
        })

    } catch (error) {
      console.error('[Real-time] Subscription error:', error)
      setError('Failed to setup real-time connection')
      setIsConnected(false)
    }
  }, [supabase, enabled, handleUpdate])

  // Cleanup subscription
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    setIsConnected(false)
  }, [])

  // Setup and cleanup effects
  useEffect(() => {
    setupSubscription()
    return cleanup
  }, [setupSubscription, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Connection health check
  useEffect(() => {
    if (!enabled || !isConnected) return

    const healthCheck = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
      
      // If no updates for 5 minutes and we think we're connected, check connection
      if (timeSinceLastUpdate > 5 * 60 * 1000 && isConnected) {
        console.log('[Real-time] Health check: No updates received, checking connection...')
        // Trigger a reconnection
        setupSubscription()
      }
    }, 60000) // Check every minute

    return () => clearInterval(healthCheck)
  }, [enabled, isConnected, setupSubscription])

  return {
    isConnected,
    updates,
    error,
    lastUpdate: lastUpdateRef.current,
    reconnect: setupSubscription,
    disconnect: cleanup
  }
}

// Hook for real-time event popularity/view tracking
export function useRealtimeEventStats(eventId: string) {
  const queryClient = useQueryClient()
  const [stats, setStats] = useState({
    viewCount: 0,
    activeViewers: 0,
    savedCount: 0
  })
  const [isConnected, setIsConnected] = useState(false)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (!supabase || !eventId) return

    // Subscribe to event statistics updates
    subscriptionRef.current = supabase
      .channel(`event-stats-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload: any) => {
          if (payload.new) {
            setStats({
              viewCount: payload.new.view_count || 0,
              activeViewers: payload.new.active_viewers || 0,
              savedCount: payload.new.saved_count || 0
            })

            // Update React Query cache
            queryClient.setQueryData(
              queryKeys.event(eventId),
              (oldEvent: Event | undefined) => oldEvent ? {
                ...oldEvent,
                view_count: payload.new.view_count,
                active_viewers: payload.new.active_viewers,
                saved_count: payload.new.saved_count
              } : oldEvent
            )
          }
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [eventId, queryClient])

  return { stats, isConnected }
}

// Hook for real-time user presence on events
export function useRealtimeEventPresence(eventId: string) {
  const [presence, setPresence] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (!supabase || !eventId) return

    subscriptionRef.current = supabase
      .channel(`event-presence-${eventId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = subscriptionRef.current.presenceState()
        setPresence(Object.values(newState).flat())
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('User joined event:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log('User left event:', key, leftPresences)
      })
      .subscribe(async (status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
        
        if (status === 'SUBSCRIBED') {
          // Track current user presence
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await subscriptionRef.current.track({
              user_id: user.id,
              event_id: eventId,
              timestamp: new Date().toISOString()
            })
          }
        }
      })

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.untrack()
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [eventId])

  return { presence, isConnected, count: presence.length }
}