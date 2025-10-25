'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowIndicator(true)

      // Hide "back online" message after 3 seconds
      setTimeout(() => {
        setShowIndicator(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't show anything if online and no need to show indicator
  if (isOnline && !showIndicator) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        showIndicator ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
          isOnline
            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
            : "bg-gradient-to-r from-orange-600 to-red-600 text-white"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline - Some features may be limited</span>
          </>
        )}
      </div>
    </div>
  )
}
