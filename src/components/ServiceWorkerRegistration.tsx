'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/notifications/push'

/**
 * Service Worker Registration Component
 * Registers the service worker on app load
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Register service worker
    registerServiceWorker()
      .then((registration) => {
        if (registration) {
          console.log('✅ Service Worker ready')
        }
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  }, [])

  return null // This component doesn't render anything
}
