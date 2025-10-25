'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, Trash2, Mail, Shield, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function PrivacySettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteFeedback, setDeleteFeedback] = useState('')

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to export your data')
        return
      }

      const response = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Download the JSON file
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scenescout-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Your data has been exported!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleRequestDataEmail = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to request your data')
        return
      }

      const response = await fetch('/api/user/data-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Request failed')
      }

      toast.success('Data summary email sent! Check your inbox.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send data request')
      console.error('Data request error:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" exactly as shown')
      return
    }

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to delete your account')
        return
      }

      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          feedback: deleteFeedback,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Deletion failed')
      }

      toast.success('Your account has been deleted. Redirecting...')

      // Sign out and redirect
      await supabase.auth.signOut()
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account')
      console.error('Delete account error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block"
          >
            ← Back to SceneScout
          </Link>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Privacy Settings
          </h1>
          <p className="text-gray-400">
            Manage your personal data and privacy preferences
          </p>
        </div>

        {/* Data Access */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Your Data Rights
          </h2>

          <div className="grid gap-6">
            {/* Export Data */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Download className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Download Your Data</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Export all your personal data (saved events, reminders, preferences) as a JSON file.
                    Limited to once per hour.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                  >
                    {isExporting ? 'Exporting...' : 'Download Data (JSON)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email Report */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Request Data Summary Email</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Receive a summary of your data via email. Limited to once per 24 hours.
                  </p>
                  <button
                    onClick={handleRequestDataEmail}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all"
                  >
                    Send Email Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Controls */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Privacy Controls</h2>

          <div className="grid gap-6">
            {/* Cookie Settings */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cookie Preferences</h3>
                  <p className="text-sm text-gray-400">
                    Manage which cookies and tracking technologies we use
                  </p>
                </div>
                <Link
                  href="/settings/cookies"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                >
                  Manage Cookies
                </Link>
              </div>
            </div>

            {/* Analytics Opt-out */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Analytics Tracking</h3>
                  <p className="text-sm text-gray-400">
                    Control whether we collect anonymized usage analytics
                  </p>
                </div>
                <Link
                  href="/settings/cookies"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                >
                  Configure
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-6 h-6" />
            Danger Zone
          </h2>

          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-red-400">Delete Account</h3>
                <p className="text-sm text-gray-300 mb-2">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  We'll delete: saved events, reminders, preferences, push subscriptions, and email logs.
                  Anonymous feedback will be retained for analytics but will be anonymized.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all"
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Type <code className="bg-black/50 px-2 py-1 rounded">DELETE MY ACCOUNT</code> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full px-4 py-2 bg-black/50 border border-red-500/30 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        placeholder="DELETE MY ACCOUNT"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Why are you leaving? (optional)
                      </label>
                      <textarea
                        value={deleteFeedback}
                        onChange={(e) => setDeleteFeedback(e.target.value)}
                        className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                        placeholder="Your feedback helps us improve..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmation('')
                          setDeleteFeedback('')
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                      >
                        {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <section className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Legal & Privacy</h3>
          <div className="grid gap-3 text-sm">
            <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
              Privacy Policy →
            </Link>
            <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
              Terms of Service →
            </Link>
            <Link href="/settings/cookies" className="text-purple-400 hover:text-purple-300 transition-colors">
              Cookie Settings →
            </Link>
          </div>
        </section>

        {/* Contact */}
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>
            Questions about your privacy?{' '}
            <a href="mailto:privacy@scenescout.app" className="text-purple-400 hover:underline">
              privacy@scenescout.app
            </a>
          </p>
          <p className="mt-2">We typically respond within 72 hours.</p>
        </div>
      </div>
    </div>
  )
}
