'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { readVotes, removeVote, clearVotes, getVoteStats } from '@/lib/thumbs'
import { readInteractions } from '@/lib/tracking/client'
import { computeAffinity } from '@/lib/tracking/affinity'
import toast from 'react-hot-toast'
import { ArrowLeft, Trash2, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'music-concerts', title: 'Music & Concerts', emoji: '🎵' },
  { id: 'nightlife-dj', title: 'Nightlife & DJ Sets', emoji: '🌃' },
  { id: 'comedy-improv', title: 'Comedy & Improv', emoji: '😂' },
  { id: 'theatre-dance', title: 'Theatre & Dance', emoji: '🎭' },
  { id: 'food-drink', title: 'Food & Drink', emoji: '🍽️' },
  { id: 'arts-exhibits', title: 'Arts & Exhibits', emoji: '🎨' },
  { id: 'film-screenings', title: 'Film & Screenings', emoji: '🎬' },
  { id: 'markets-popups', title: 'Markets & Pop-ups', emoji: '🛍️' },
  { id: 'sports-fitness', title: 'Sports & Fitness', emoji: '🏃' },
  { id: 'outdoors-nature', title: 'Outdoors & Nature', emoji: '🌲' },
  { id: 'wellness-mindfulness', title: 'Wellness & Mindfulness', emoji: '🧘' },
  { id: 'workshops-classes', title: 'Workshops & Classes', emoji: '📚' },
  { id: 'tech-startups', title: 'Tech & Startups', emoji: '💻' },
  { id: 'family-kids', title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦' },
  { id: 'date-night', title: 'Date Night Ideas', emoji: '💕' },
  { id: 'late-night', title: 'Late Night', emoji: '🌙' },
  { id: 'neighborhood', title: 'Neighborhood Hotspots', emoji: '📍' },
  { id: 'halloween', title: 'Halloween Events', emoji: '🎃' },
]

export default function PreferencesPage() {
  const router = useRouter()
  const [votes, setVotes] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, thumbsUp: 0, thumbsDown: 0 })
  const [affinity, setAffinity] = useState<any>(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const loadData = () => {
    const allVotes = readVotes()
    setVotes(allVotes)
    setStats(getVoteStats())

    // Compute affinity from interactions
    const interactions = readInteractions()
    if (interactions.length > 0) {
      const computed = computeAffinity(interactions)
      setAffinity(computed)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRemoveVote = (eventId: string) => {
    removeVote(eventId)
    toast.success('Vote removed')
    loadData()

    // Emit event so other components update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventHidden'))
    }
  }

  const handleClearAll = () => {
    clearVotes()
    toast.success('All preferences cleared')
    setShowConfirmClear(false)
    loadData()

    // Emit event so other components update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventHidden'))
    }
  }

  // Get top categories by affinity
  const topCategories = affinity
    ? Object.entries(affinity.categories)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([catId, score]: any) => ({
          category: CATEGORIES.find(c => c.id === catId),
          score: (score * 100).toFixed(1)
        }))
    : []

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-black py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            <h1 className="text-3xl sm:text-4xl font-bold mb-2">⚙️ Your Preferences</h1>
            <p className="text-gray-300">
              Manage your event preferences and personalization settings
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="text-purple-400" size={24} />
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="text-sm text-gray-400">Total Votes</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <ThumbsUp className="text-green-400" size={24} />
                <div className="text-2xl font-bold">{stats.thumbsUp}</div>
              </div>
              <div className="text-sm text-gray-400">Thumbs Up</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <ThumbsDown className="text-red-400" size={24} />
                <div className="text-2xl font-bold">{stats.thumbsDown}</div>
              </div>
              <div className="text-sm text-gray-400">Hidden Events</div>
            </div>
          </div>

          {/* Top Interests */}
          {topCategories.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">🎯 Your Top Interests</h2>
              <div className="space-y-3">
                {topCategories.map(({ category, score }: any, index) => (
                  <div key={category?.id || index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category?.emoji}</span>
                      <span className="font-medium">{category?.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-12 text-right">{score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Votes List */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📋 Your Votes</h2>
              {votes.length > 0 && (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              )}
            </div>

            {votes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-gray-400">No votes yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Start voting on events to personalize your experience!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {votes.map((vote) => (
                  <div
                    key={vote.eventId}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded ${vote.vote === 'up' ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
                        {vote.vote === 'up' ? (
                          <ThumbsUp size={16} className="text-green-400" />
                        ) : (
                          <ThumbsDown size={16} className="text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-gray-300 truncate">
                          {vote.eventId}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(vote.votedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveVote(vote.eventId)}
                      className="p-2 hover:bg-gray-800 rounded transition-colors"
                      aria-label="Remove vote"
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2">💡 How Preferences Work</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong>Thumbs Up:</strong> We'll show you more events like this</li>
              <li>• <strong>Thumbs Down:</strong> Event is hidden and we'll show fewer similar events</li>
              <li>• Your preferences are stored locally and used to personalize your feed</li>
              <li>• Remove any vote to reset that preference</li>
            </ul>
          </div>
        </div>

        {/* Confirm Clear Modal */}
        {showConfirmClear && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold mb-3">⚠️ Clear All Preferences?</h3>
              <p className="text-gray-300 mb-6">
                This will remove all your votes and reset personalization. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
