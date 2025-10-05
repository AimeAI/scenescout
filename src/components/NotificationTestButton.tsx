'use client'

import { useState, useEffect } from 'react'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  showLocalNotification
} from '@/lib/notifications/push'

/**
 * Test component for push notifications
 * Shows permission status and allows testing
 */
export function NotificationTestButton() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)

  // Only check on client side to avoid hydration errors
  useEffect(() => {
    setMounted(true)
    setSupported(isPushSupported())
    setPermission(getNotificationPermission())
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    setStatus('Requesting permission...')

    const result = await subscribeToPush()

    if (result.success) {
      setStatus(`✅ Subscribed! ID: ${result.subscriptionId}`)
    } else {
      setStatus(`❌ Failed: ${result.error}`)
    }

    setLoading(false)
  }

  const handleTestLocal = async () => {
    const success = await showLocalNotification(
      '🎉 Test Notification',
      'This is a local test notification from SceneScout!',
      { eventId: 'test', url: '/' }
    )

    if (success) {
      setStatus('✅ Local notification sent')
    } else {
      setStatus('❌ Failed to send local notification')
    }
  }

  const handleTestServer = async () => {
    setLoading(true)
    setStatus('Sending server test...')

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Server Test Notification',
          body: 'This is a test from the server!'
        })
      })

      const data = await response.json()

      if (data.success) {
        setStatus(`✅ ${data.message}`)
      } else {
        setStatus(`❌ ${data.error}`)
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleTriggerReminders = async () => {
    setLoading(true)
    setStatus('Triggering reminder check...')

    try {
      const response = await fetch('/api/cron/reminders', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setStatus(`✅ ${data.message} (checked: ${data.checked}, sent: ${data.sent})`)
      } else {
        setStatus(`❌ ${data.error}`)
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  // Don't render until mounted to avoid hydration errors
  if (!mounted) {
    return null
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-full shadow-lg z-50 transition-colors"
      >
        🔔
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-sm z-50 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">🔔 Push Test</h3>
        <button
          onClick={() => setMinimized(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <p>
          <strong>Supported:</strong>{' '}
          <span className={supported ? 'text-green-400' : 'text-red-400'}>
            {supported ? 'Yes' : 'No'}
          </span>
        </p>
        <p>
          <strong>Permission:</strong>{' '}
          <span
            className={
              permission === 'granted'
                ? 'text-green-400'
                : permission === 'denied'
                ? 'text-red-400'
                : 'text-yellow-400'
            }
          >
            {permission}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSubscribe}
          disabled={loading || !supported || permission === 'denied'}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors text-sm"
        >
          {permission === 'granted' ? 'Re-subscribe' : 'Subscribe'}
        </button>

        <button
          onClick={handleTestLocal}
          disabled={!supported || permission !== 'granted'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors text-sm"
        >
          Test Local
        </button>

        <button
          onClick={handleTestServer}
          disabled={loading || !supported || permission !== 'granted'}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors text-sm"
        >
          Test Server
        </button>

        <button
          onClick={handleTriggerReminders}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors text-sm"
        >
          Trigger Reminders
        </button>
      </div>

      {status && (
        <p className="mt-3 text-xs text-gray-400 break-words">{status}</p>
      )}
    </div>
  )
}
