'use client'

export interface NotificationPreferences {
  pushEnabled: boolean
  emailEnabled: boolean
  calendarExport: boolean
}

/**
 * Request browser push notification permission
 * Returns the permission state: 'granted', 'denied', or 'default'
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  // Request permission
  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Check if push notifications are supported and permission granted
 */
export function isPushEnabled(): boolean {
  if (!('Notification' in window)) {
    return false
  }

  return Notification.permission === 'granted'
}

/**
 * Subscribe to push notifications after permission granted
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready

    // Get VAPID public key from env
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured')
      return null
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    // Store subscription in database
    await storePushSubscription(userId, subscription)

    return subscription

  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

/**
 * Store push subscription in Supabase
 */
async function storePushSubscription(userId: string, subscription: PushSubscription) {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription,
        userId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to store push subscription')
    }

    const data = await response.json()
    console.log('✅ Push subscription stored successfully:', data.subscriptionId)
  } catch (error) {
    console.error('Failed to store push subscription:', error)
    throw error
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

/**
 * Get user's notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return {
      pushEnabled: false,
      emailEnabled: false,
      calendarExport: false
    }
  }

  const stored = localStorage.getItem('notificationPreferences')
  if (!stored) {
    return {
      pushEnabled: false,
      emailEnabled: false,
      calendarExport: false
    }
  }

  return JSON.parse(stored)
}

/**
 * Save user's notification preferences to localStorage
 */
export function saveNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === 'undefined') return

  localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
}

/**
 * Check if this is the user's first save (to show modal)
 */
export function isFirstSave(): boolean {
  if (typeof window === 'undefined') return false

  const hasSeenModal = localStorage.getItem('hasSeenSaveModal')
  return !hasSeenModal
}

/**
 * Mark that user has seen the save confirmation modal
 */
export function markSaveModalSeen() {
  if (typeof window === 'undefined') return

  localStorage.setItem('hasSeenSaveModal', 'true')
}
