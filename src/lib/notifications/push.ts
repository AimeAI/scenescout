/**
 * Push Notification Library
 * Cross-browser support for Chrome, Firefox, and Safari
 */

export type NotificationPermission = 'granted' | 'denied' | 'default'

export interface PushSubscriptionInfo {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied'
  return Notification.permission as NotificationPermission
}

/**
 * Check if notifications are blocked
 */
export function isNotificationBlocked(): boolean {
  return getNotificationPermission() === 'denied'
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.warn('❌ Push notifications not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    })

    console.log('✅ Service Worker registered:', registration)

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready

    return registration
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error)
    return null
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn('❌ Push notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('🔔 Notification permission:', permission)
    return permission as NotificationPermission
  } catch (error) {
    console.error('❌ Failed to request permission:', error)
    return 'denied'
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  userId?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' }
  }

  try {
    // 1. Register service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      return { success: false, error: 'Service worker registration failed' }
    }

    // 2. Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied' }
    }

    // 3. Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    // 4. Subscribe if not already subscribed
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        return { success: false, error: 'VAPID public key not configured' }
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      console.log('✅ Push subscription created:', subscription)
    } else {
      console.log('✅ Using existing subscription:', subscription)
    }

    // 5. Send subscription to server
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }

    const response = await fetch('/api/reminders/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscriptionData,
        userId
      })
    })

    const data = await response.json()

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to save subscription' }
    }

    console.log('✅ Subscription saved:', data.subscriptionId)

    // Store endpoint in localStorage for reminder creation
    if (typeof window !== 'undefined') {
      localStorage.setItem('push_subscription_endpoint', subscription.endpoint)
    }

    return {
      success: true,
      subscriptionId: data.subscriptionId
    }

  } catch (error: any) {
    console.error('❌ Push subscription failed:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Remove from server
      await fetch('/api/reminders/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      })

      // Unsubscribe locally
      await subscription.unsubscribe()
      console.log('✅ Unsubscribed from push')
    }

    return true
  } catch (error) {
    console.error('❌ Unsubscribe failed:', error)
    return false
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscriptionInfo | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return null

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }
  } catch (error) {
    console.error('❌ Failed to get subscription:', error)
    return null
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready

    await registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data,
      vibrate: [200, 100, 200],
      tag: data?.eventId || 'test'
    })

    return true
  } catch (error) {
    console.error('❌ Failed to show notification:', error)
    return false
  }
}

// Helper functions

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
