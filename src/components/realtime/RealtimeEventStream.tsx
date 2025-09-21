'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { NetflixEventCard } from '../events/NetflixEventCard'
import { Event, EventCategory, MapBounds } from '@/types'
import { cn } from '@/lib/utils'

interface RealtimeEventStreamProps {
  bounds?: MapBounds
  categories?: EventCategory[]
  maxUpdates?: number
  showNotifications?: boolean
  className?: string
}

export function RealtimeEventStream({
  bounds,
  categories,
  maxUpdates = 5,
  showNotifications = true,
  className
}: RealtimeEventStreamProps) {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'insert' | 'update' | 'delete'
    event: Event
    timestamp: number
  }>>([])

  const { isConnected, updates, error } = useRealtimeEvents({
    bounds,
    categories,
    enabled: true,
    onEventUpdate: (update) => {
      if (showNotifications) {
        setNotifications(prev => [
          {
            id: `${update.event.id}-${update.timestamp}`,
            ...update
          },
          ...prev.slice(0, maxUpdates - 1)
        ])

        // Auto-remove notification after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== `${update.event.id}-${update.timestamp}`))
        }, 10000)
      }
    }
  })

  const getUpdateIcon = (type: 'insert' | 'update' | 'delete') => {
    switch (type) {
      case 'insert':
        return '✨'
      case 'update':
        return '🔄'
      case 'delete':
        return '❌'
      default:
        return '📡'
    }
  }

  const getUpdateMessage = (type: 'insert' | 'update' | 'delete', eventTitle: string) => {
    switch (type) {
      case 'insert':
        return `New event: ${eventTitle}`
      case 'update':
        return `Updated: ${eventTitle}`
      case 'delete':
        return `Removed: ${eventTitle}`
      default:
        return `Event change: ${eventTitle}`
    }
  }

  const getUpdateColor = (type: 'insert' | 'update' | 'delete') => {
    switch (type) {
      case 'insert':
        return 'bg-green-500/20 border-green-500/30 text-green-400'
      case 'update':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'delete':
        return 'bg-red-500/20 border-red-500/30 text-red-400'
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-400'
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <div 
          className={cn(
            "w-3 h-3 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
        <span className="text-sm text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-16 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg backdrop-blur-sm">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Real-time Notifications */}
      <div className="fixed top-4 left-4 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -300, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "border rounded-lg backdrop-blur-sm p-3 cursor-pointer transition-all duration-200 hover:scale-105",
                getUpdateColor(notification.type)
              )}
              onClick={() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id))
              }}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {getUpdateIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getUpdateMessage(notification.type, notification.event.title)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setNotifications(prev => prev.filter(n => n.id !== notification.id))
                  }}
                  className="text-xs opacity-50 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Recent Updates Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Updates</h3>
        
        <AnimatePresence>
          {updates.slice(0, maxUpdates).map((update) => (
            <motion.div
              key={`${update.event.id}-${update.timestamp}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative"
            >
              {/* Update Badge */}
              <div className="absolute -top-2 -left-2 z-10">
                <div 
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-gray-900 flex items-center justify-center text-xs",
                    getUpdateColor(update.type)
                  )}
                >
                  {getUpdateIcon(update.type)}
                </div>
              </div>

              {/* Event Card */}
              <div className={cn(
                "transition-all duration-300",
                update.type === 'delete' && "opacity-50 grayscale"
              )}>
                <NetflixEventCard
                  event={update.event}
                  size="small"
                  showHoverPreview={false}
                  className="border border-white/10"
                />
              </div>

              {/* Timestamp */}
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                {new Date(update.timestamp).toLocaleTimeString()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {updates.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📡</div>
            <p>Waiting for real-time updates...</p>
            <p className="text-sm mt-1">
              Status: {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Compact notification component for minimal UI impact
export function RealtimeNotificationBadge({
  bounds,
  categories,
  className
}: {
  bounds?: MapBounds
  categories?: EventCategory[]
  className?: string
}) {
  const [count, setCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const { isConnected, updates } = useRealtimeEvents({
    bounds,
    categories,
    enabled: true,
    onEventUpdate: (update) => {
      if (update.type === 'insert') {
        setCount(prev => prev + 1)
        setLastUpdate(new Date(update.timestamp))
      }
    }
  })

  const resetCount = () => {
    setCount(0)
    setLastUpdate(null)
  }

  if (!isConnected || count === 0) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-gray-500"
          )}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    )
  }

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={resetCount}
      className={cn(
        "flex items-center space-x-2 bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-sm transition-all duration-200",
        className
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        className="w-2 h-2 bg-green-500 rounded-full"
      />
      <span>
        {count} new event{count !== 1 ? 's' : ''}
      </span>
      {lastUpdate && (
        <span className="text-xs opacity-75">
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </motion.button>
  )
}