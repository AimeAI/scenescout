'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (navigator.onLine) {
      router.back()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/20 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full" />
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-full border border-gray-700">
              <WifiOff className="w-16 h-16 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            {isOnline ? 'Back Online!' : 'You\'re Offline'}
          </h1>
          <p className="text-gray-400 text-lg">
            {isOnline
              ? 'Your connection has been restored. You can continue browsing.'
              : 'It looks like you\'re not connected to the internet. Some features may be limited.'}
          </p>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-500">
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {isOnline ? 'Continue' : 'Try Again'}
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-gray-700 hover:bg-gray-800"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Offline features info */}
        {!isOnline && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-left">
            <h3 className="text-white font-semibold mb-3">While Offline:</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>View previously loaded events</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Access your saved events</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✗</span>
                <span>Search for new events</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✗</span>
                <span>Get real-time updates</span>
              </li>
            </ul>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-gray-500">
          <p>Tips: Check your WiFi or mobile data connection</p>
        </div>
      </div>
    </div>
  )
}
