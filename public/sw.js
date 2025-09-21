// Service Worker for Push Notifications and Real-time Updates

const CACHE_NAME = 'scenescout-v1'
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png'
]

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  
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
  console.log('[SW] Activating service worker')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        self.clients.claim()
      })
  )
})

// Fetch event (for offline functionality)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response
            const responseToCache = response.clone()

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
          })
      })
  )
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
    const cache = await caches.open(CACHE_NAME)
    
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
