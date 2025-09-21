'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSafeSupabaseClient } from '@/lib/supabase'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { Event, EventCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface PushNotificationSettings {
  enabled: boolean
  categories: EventCategory[]
  keywords: string[]
  radius: number // in miles
  location?: { lat: number; lng: number }
  priceMax?: number
  timeToEvent: 'immediately' | '1hour' | '1day' | '1week'
}

interface NotificationPermission {
  granted: boolean
  denied: boolean
  prompt: boolean
}

const supabase = createSafeSupabaseClient()

export function PushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    prompt: true
  })
  const [settings, setSettings] = useState<PushNotificationSettings>({
    enabled: false,
    categories: [],
    keywords: [],
    radius: 10,
    timeToEvent: 'immediately'
  })
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    title: string
    body: string
    event: Event
    timestamp: number
    read: boolean
  }>>([])

  // Check initial permission state
  useEffect(() => {
    if ('Notification' in window) {
      const permission = Notification.permission
      setPermission({
        granted: permission === 'granted',
        denied: permission === 'denied',
        prompt: permission === 'default'
      })

      // Load existing subscription
      loadSubscription()
    }
  }, [])

  // Load user settings and subscription
  const loadSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        setSubscription(subscription)
        setSettings(prev => ({ ...prev, enabled: true }))
        
        // Sync with backend
        await syncSubscriptionWithBackend(subscription)
      }
    } catch (error) {
      console.error('Failed to load push subscription:', error)
    }
  }

  // Request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications')
      return
    }

    setIsLoading(true)
    
    try {
      const permission = await Notification.requestPermission()
      
      setPermission({
        granted: permission === 'granted',
        denied: permission === 'denied',
        prompt: permission === 'default'
      })

      if (permission === 'granted') {
        await setupPushSubscription()
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Setup push subscription
  const setupPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      })

      setSubscription(subscription)
      await syncSubscriptionWithBackend(subscription)
      
      setSettings(prev => ({ ...prev, enabled: true }))
    } catch (error) {
      console.error('Failed to setup push subscription:', error)
    }
  }

  // Sync subscription with backend
  const syncSubscriptionWithBackend = async (subscription: PushSubscription) => {
    if (!supabase) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          settings: settings
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to sync subscription with backend:', error)
    }
  }

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription) return

    setIsLoading(true)

    try {
      await subscription.unsubscribe()
      
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
        }
      }

      setSubscription(null)
      setSettings(prev => ({ ...prev, enabled: false }))
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update settings
  const updateSettings = async (newSettings: Partial<PushNotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    if (subscription && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('push_subscriptions')
            .update({ settings: updatedSettings })
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
      }
    }
  }

  // Listen for real-time events and trigger notifications
  const { isConnected } = useRealtimeEvents({
    categories: settings.categories.length > 0 ? settings.categories : undefined,
    enabled: settings.enabled,
    onEventUpdate: (update) => {
      if (update.type === 'insert' && shouldNotify(update.event)) {
        triggerNotification(update.event)
      }
    }
  })

  // Check if event should trigger notification
  const shouldNotify = (event: Event): boolean => {
    if (!settings.enabled || !permission.granted) return false

    // Category filter
    if (settings.categories.length > 0 && !settings.categories.includes(event.category as EventCategory)) {
      return false
    }

    // Keyword filter
    if (settings.keywords.length > 0) {
      const eventText = `${event.title} ${event.description || ''} ${event.venue_name || ''}`.toLowerCase()
      const hasKeyword = settings.keywords.some(keyword => 
        eventText.includes(keyword.toLowerCase())
      )
      if (!hasKeyword) return false
    }

    // Price filter
    if (settings.priceMax && event.price_min && event.price_min > settings.priceMax) {
      return false
    }

    // Location filter (if enabled)
    if (settings.location && settings.radius && event.venue?.latitude && event.venue?.longitude) {
      const distance = calculateDistance(
        settings.location.lat,
        settings.location.lng,
        event.venue.latitude,
        event.venue.longitude
      )
      if (distance > settings.radius) return false
    }

    return true
  }

  // Trigger notification
  const triggerNotification = (event: Event) => {
    if (!permission.granted) return

    const notification = new Notification(`New Event: ${event.title}`, {
      body: `${event.venue_name || 'Unknown venue'} • ${event.is_free ? 'Free' : `$${event.price_min || 'Price varies'}`}`,
      icon: event.image_url || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `event-${event.id}`,
      requireInteraction: false,
      // actions: [
      //   { action: 'view', title: 'View Event' },
      //   { action: 'save', title: 'Save for Later' }
      // ]
    })

    notification.onclick = () => {
      window.focus()
      window.open(`/events/${event.id}`, '_blank')
      notification.close()
    }

    // Add to local notifications list
    setNotifications(prev => [{
      id: `${event.id}-${Date.now()}`,
      title: `New Event: ${event.title}`,
      body: `${event.venue_name || 'Unknown venue'} • ${event.is_free ? 'Free' : `$${event.price_min || 'Price varies'}`}`,
      event,
      timestamp: Date.now(),
      read: false
    }, ...prev.slice(0, 9)])
  }

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([])
  }

  const categories: EventCategory[] = [
    'music', 'sports', 'arts', 'food', 'tech', 
    'social', 'business', 'education', 'health', 'family'
  ]

  const categoryEmojis: Record<EventCategory, string> = {
    music: '🎵',
    sports: '⚽',
    arts: '🎨',
    food: '🍽️',
    tech: '💻',
    social: '👥',
    business: '💼',
    education: '📚',
    health: '🏥',
    family: '👨‍👩‍👧‍👦',
    other: '📍'
  }

  if (!('Notification' in window)) {
    return (
      <div className="bg-gray-900 border border-white/20 rounded-lg p-4">
        <p className="text-gray-400">Push notifications are not supported in this browser.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-white/20 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearNotifications}
            className="h-8"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Permission Status */}
      {permission.denied && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-lg">
          <p className="text-sm">
            Notifications are blocked. Please enable them in your browser settings to receive event alerts.
          </p>
        </div>
      )}

      {permission.prompt && (
        <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Enable notifications to get alerts about new events that match your interests.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={requestPermission}
              disabled={isLoading}
              className="ml-3"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </Button>
          </div>
        </div>
      )}

      {/* Settings */}
      {permission.granted && (
        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    setupPushSubscription()
                  } else {
                    unsubscribe()
                  }
                }}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-white">Enable push notifications</span>
            </label>
            
            {subscription && (
              <Badge variant="secondary">Active</Badge>
            )}
          </div>

          {settings.enabled && (
            <>
              {/* Categories */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Notify me about</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.categories.includes(category)}
                        onChange={(e) => {
                          const categories = e.target.checked
                            ? [...settings.categories, category]
                            : settings.categories.filter(c => c !== category)
                          updateSettings({ categories })
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{categoryEmojis[category]}</span>
                      <span className="text-sm text-gray-300 capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Keywords (optional)</h4>
                <input
                  type="text"
                  placeholder="e.g., concert, festival, workshop (comma-separated)"
                  value={settings.keywords.join(', ')}
                  onChange={(e) => {
                    const keywords = e.target.value
                      .split(',')
                      .map(k => k.trim())
                      .filter(k => k.length > 0)
                    updateSettings({ keywords })
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Price Limit */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Maximum price</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.priceMax !== undefined}
                    onChange={(e) => {
                      updateSettings({ 
                        priceMax: e.target.checked ? 50 : undefined 
                      })
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Only events under</span>
                  <input
                    type="number"
                    value={settings.priceMax || 50}
                    onChange={(e) => updateSettings({ priceMax: parseInt(e.target.value) })}
                    disabled={settings.priceMax === undefined}
                    className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-300">dollars</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-gray-300">Recent Notifications</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    notification.read 
                      ? "bg-gray-800 border-gray-700 text-gray-400"
                      : "bg-blue-500/20 border-blue-500/30 text-blue-400"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs mt-1">{notification.body}</p>
                    </div>
                    <span className="text-xs opacity-75 ml-2">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}