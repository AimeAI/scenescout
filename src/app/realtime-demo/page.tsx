'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEvents } from '@/hooks/useEvents'
import { useRealtimeFilters } from '@/hooks/useRealtimeFilters'

// Dynamically import components that use window
const RealtimeEventStream = dynamic(() => import('@/components/realtime/RealtimeEventStream').then(mod => ({ default: mod.RealtimeEventStream })), {
  ssr: false,
  loading: () => <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
})

const RealtimeFilters = dynamic(() => import('@/components/realtime/RealtimeFilters').then(mod => ({ default: mod.RealtimeFilters })), {
  ssr: false,
  loading: () => <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
})

const PushNotifications = dynamic(() => import('@/components/realtime/PushNotifications').then(mod => ({ default: mod.PushNotifications })), {
  ssr: false
})

const RealtimeMapUpdates = dynamic(() => import('@/components/realtime/RealtimeMapUpdates').then(mod => ({ default: mod.RealtimeMapUpdates })), {
  ssr: false,
  loading: () => <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
})

export default function RealtimeDemoPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white mb-8 text-center"
        >
          🔴 Real-time Event Discovery Demo
        </motion.h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Event Stream */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              📡 Live Event Stream
            </h2>
            <RealtimeEventStream />
          </motion.div>

          {/* Real-time Filters */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              🎛️ Smart Filters
            </h2>
            <RealtimeFilters />
          </motion.div>

          {/* Push Notifications */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              🔔 Push Notifications
            </h2>
            <PushNotifications />
          </motion.div>
        </div>

        {/* Real-time Map */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            🗺️ Live Event Map
          </h2>
          <RealtimeMapUpdates />
        </motion.div>
      </div>
    </div>
  )
}