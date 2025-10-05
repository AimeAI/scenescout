// Service Worker for Push Notifications
// Supports Chrome, Firefox, and Safari

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// Handle push events
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received:', event)

  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    console.error('Failed to parse push data:', e)
    data = {
      title: 'SceneScout',
      body: 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    }
  }

  const {
    title = 'SceneScout',
    body = 'You have a new notification',
    icon = '/icon-192x192.png',
    badge = '/badge-72x72.png',
    data: notificationData = {},
    actions = []
  } = data

  const options = {
    body,
    icon,
    badge,
    data: notificationData,
    actions,
    vibrate: [200, 100, 200],
    tag: notificationData.eventId || 'general',
    requireInteraction: false,
    // Safari-specific options
    silent: false,
    timestamp: Date.now()
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event)

  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}

  let url = '/'

  // Handle action buttons
  if (action === 'view' && data.url) {
    url = data.url
  } else if (action === 'dismiss') {
    // Just close, don't open anything
    return
  } else if (data.url) {
    // Default click opens the event page
    url = data.url
  } else if (data.eventId) {
    url = `/events/${data.eventId}`
  }

  // Open or focus existing window
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }

      // If no matching window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// Handle push subscription changes (Safari)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('🔄 Push subscription changed')

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(self.VAPID_PUBLIC_KEY)
    }).then((subscription) => {
      console.log('✅ Re-subscribed:', subscription)

      // Send new subscription to server
      return fetch('/api/reminders/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      })
    })
  )
})

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
