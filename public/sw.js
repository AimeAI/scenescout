// Service Worker for Push Notifications and Real-time Updates

const CACHE_VERSION = 'v2'
const CACHE_NAME = `scenescout-${CACHE_VERSION}`
const IMAGE_CACHE = `scenescout-images-${CACHE_VERSION}`
const API_CACHE = `scenescout-api-${CACHE_VERSION}`
const PAGES_CACHE = `scenescout-pages-${CACHE_VERSION}`

const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png',
  '/offline'
]

// Cache size limits
const CACHE_LIMITS = {
  images: 100,
  api: 50,
  pages: 30
}

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_CACHE)
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully')
        self.skipWaiting()
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2')

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) =>
              cacheName.startsWith('scenescout-') &&
              !cacheName.includes(CACHE_VERSION)
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      }),
      // Claim clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated')
    })
  )
})

// Fetch event with smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests except images
  if (url.origin !== self.location.origin && !request.destination === 'image') return

  // API requests: Network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE))
    return
  }

  // Image requests: Cache-first strategy
  if (request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE))
    return
  }

  // Page navigation: Stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE))
    return
  }

  // Static assets: Cache-first
  event.respondWith(cacheFirstStrategy(request, CACHE_NAME))
})

// Push event (for push notifications)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received')

  if (!event.data) {
    console.log('[SW] Push event has no data')
    return
  }

  try {
    const data = event.data.json()
    console.log('[SW] Push data:', data)

    const options = {
      body: data.body || 'New event available!',
      icon: data.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      image: data.image,
      data: data.data || {},
      tag: data.tag || 'scenescout-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [
        { action: 'view', title: 'View Event', icon: '/icon-view.png' },
        { action: 'save', title: 'Save for Later', icon: '/icon-save.png' }
      ],
      timestamp: Date.now(),
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200]
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'SceneScout', options)
    )

  } catch (error) {
    console.error('[SW] Error processing push event:', error)
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('SceneScout', {
        body: 'New events are available!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'scenescout-fallback'
      })
    )
  }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  
  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}

  if (action === 'view') {
    // Open the event page
    const eventUrl = data.eventId ? `/events/${data.eventId}` : '/'
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus()
              client.navigate(eventUrl)
              return
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(eventUrl)
          }
        })
    )
  } else if (action === 'save') {
    // Send message to client to save the event
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'SAVE_EVENT',
              eventId: data.eventId
            })
          })
        })
    )
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus()
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow('/')
          }
        })
    )
  }
})

// Background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'event-save') {
    event.waitUntil(syncSavedEvents())
  } else if (event.tag === 'event-view') {
    event.waitUntil(syncEventViews())
  }
})

// Message event (communication with main thread)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data && event.data.type === 'CACHE_EVENT') {
    // Cache event data for offline access
    cacheEventData(event.data.event)
  }
})

// Caching Strategies

// Network-first: Try network, fall back to cache (good for API calls)
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
      await trimCache(cacheName, CACHE_LIMITS.api)
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) {
      console.log('[SW] Serving from cache (offline):', request.url)
      return cached
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    throw error
  }
}

// Cache-first: Try cache, fall back to network (good for images)
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
      await trimCache(cacheName, CACHE_LIMITS.images)
    }
    return response
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    throw error
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      const cache = caches.open(cacheName)
      cache.then(c => c.put(request, response.clone()))
      trimCache(cacheName, CACHE_LIMITS.pages)
    }
    return response
  }).catch(() => cached || caches.match('/offline'))

  return cached || fetchPromise
}

// Trim cache to prevent unlimited growth
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems)
    await Promise.all(toDelete.map(key => cache.delete(key)))
    console.log(`[SW] Trimmed ${toDelete.length} items from ${cacheName}`)
  }
}

// Helper functions
async function syncSavedEvents() {
  try {
    // Get saved events from IndexedDB
    const savedEvents = await getSavedEventsFromIndexedDB()

    // Sync with server
    for (const event of savedEvents) {
      if (!event.synced) {
        await syncEventToServer(event)
      }
    }

    console.log('[SW] Saved events synced successfully')
  } catch (error) {
    console.error('[SW] Error syncing saved events:', error)
  }
}

async function syncEventViews() {
  try {
    // Get unsynced event views from IndexedDB
    const eventViews = await getUnsyncedViewsFromIndexedDB()

    // Sync with server
    for (const view of eventViews) {
      await syncViewToServer(view)
    }

    console.log('[SW] Event views synced successfully')
  } catch (error) {
    console.error('[SW] Error syncing event views:', error)
  }
}

async function cacheEventData(event) {
  try {
    const cache = await caches.open(IMAGE_CACHE)

    // Cache event images
    if (event.image_url) {
      await cache.add(event.image_url)
    }

    // Store event data in IndexedDB for offline access
    await storeEventInIndexedDB(event)

    console.log('[SW] Event data cached:', event.id)
  } catch (error) {
    console.error('[SW] Error caching event data:', error)
  }
}

// IndexedDB helpers (simplified versions)
async function getSavedEventsFromIndexedDB() {
  // Implementation would use IndexedDB to get saved events
  return []
}

async function getUnsyncedViewsFromIndexedDB() {
  // Implementation would use IndexedDB to get unsynced views
  return []
}

async function storeEventInIndexedDB(event) {
  // Implementation would store event in IndexedDB
}

async function syncEventToServer(event) {
  // Implementation would sync event to server
}

async function syncViewToServer(view) {
  // Implementation would sync view to server
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
})
