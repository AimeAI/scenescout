'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Bell, Mail, Calendar, AlertCircle } from 'lucide-react'
import {
  requestPushPermission,
  subscribeToPush,
  saveNotificationPreferences,
  markSaveModalSeen,
  type NotificationPreferences
} from '@/lib/notifications/requestPermission'

interface SaveConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  eventDate?: string
}

export function SaveConfirmationModal({
  isOpen,
  onClose,
  eventTitle,
  eventDate
}: SaveConfirmationModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: false,
    emailEnabled: false,
    calendarExport: false
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const handleTogglePush = async (enabled: boolean) => {
    if (!enabled) {
      setPreferences({ ...preferences, pushEnabled: false })
      return
    }

    setIsProcessing(true)
    setPermissionDenied(false)

    try {
      const permission = await requestPushPermission()

      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscription = await subscribeToPush('anonymous') // TODO: Use real user ID

        if (subscription) {
          setPreferences({ ...preferences, pushEnabled: true })
        } else {
          setPermissionDenied(true)
          setPreferences({ ...preferences, pushEnabled: false })
        }
      } else if (permission === 'denied') {
        setPermissionDenied(true)
        setPreferences({ ...preferences, pushEnabled: false })
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error)
      setPermissionDenied(true)
      setPreferences({ ...preferences, pushEnabled: false })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = () => {
    // Save preferences to localStorage
    saveNotificationPreferences(preferences)

    // Mark that user has seen this modal
    markSaveModalSeen()

    // Close modal
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Event Saved!</h2>
                    <p className="text-white/90 text-sm">{eventTitle}</p>
                    {eventDate && (
                      <p className="text-white/70 text-xs mt-1">
                        {new Date(eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-gray-300 text-sm">
                  How would you like to be reminded about this event?
                </p>

                {/* Saved Events (Always checked) */}
                <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg border border-purple-500/30">
                  <div className="mt-0.5">
                    <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm flex items-center gap-2">
                      <span>Added to Saved Events</span>
                      <span className="text-xs text-gray-400">(Always enabled)</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Find this event in your saved collection anytime
                    </p>
                  </div>
                </div>

                {/* Push Reminders */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                    preferences.pushEnabled
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
                  }`}
                  onClick={() => !isProcessing && handleTogglePush(!preferences.pushEnabled)}
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        preferences.pushEnabled
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {preferences.pushEnabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <span>Push Reminders</span>
                      {isProcessing && (
                        <span className="text-xs text-gray-400">(Requesting permission...)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Get notified 24 hours before and 3 hours before the event
                    </p>
                  </div>
                </div>

                {/* Permission Denied Message */}
                {permissionDenied && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 bg-orange-600/20 border border-orange-500/50 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-orange-200">
                        You've blocked notifications. You can enable them later in your browser settings or account settings.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Email Reminders */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                    preferences.emailEnabled
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
                  }`}
                  onClick={() =>
                    setPreferences({ ...preferences, emailEnabled: !preferences.emailEnabled })
                  }
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        preferences.emailEnabled
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {preferences.emailEnabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>Email Reminders</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Backup reminders sent to your email (requires account)
                    </p>
                  </div>
                </div>

                {/* Calendar Export */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                    preferences.calendarExport
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
                  }`}
                  onClick={() =>
                    setPreferences({ ...preferences, calendarExport: !preferences.calendarExport })
                  }
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        preferences.calendarExport
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {preferences.calendarExport && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Add to Calendar</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Download .ics file to add to Google Calendar, Apple Calendar, etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all text-sm shadow-lg shadow-purple-500/25"
                >
                  Save Preferences
                </button>
              </div>

              {/* Help Text */}
              <div className="px-6 pb-6">
                <p className="text-xs text-gray-500 text-center">
                  You can change these preferences anytime in Settings
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
