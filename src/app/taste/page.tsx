'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { readInteractions, isTrackingEnabled } from '@/lib/tracking/client'
import { computeAffinity } from '@/lib/tracking/affinity'
import { AffinityChart } from '@/components/personalization/AffinityChart'
import { InteractionTimeline } from '@/components/personalization/InteractionTimeline'
import { TasteStats } from '@/components/personalization/TasteStats'
import { CATEGORIES } from '@/lib/constants/categories'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function TastePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [interactions, setInteractions] = useState<any[]>([])
  const [affinity, setAffinity] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && isTrackingEnabled()) {
      const data = readInteractions()
      setInteractions(data)

      if (data.length > 0) {
        const affinityData = computeAffinity(data)
        setAffinity(affinityData)
      }
    }
  }, [isMounted])

  if (!isMounted) {
    return null // Prevent hydration mismatch
  }

  if (!isTrackingEnabled()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Tracking Disabled</h2>
          <p className="text-white/70">Enable tracking to see your taste profile</p>
        </div>
      </div>
    )
  }

  if (interactions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <Sparkles className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <h2 className="text-3xl font-bold mb-4">Build Your Taste Profile</h2>
          <p className="text-white/80 mb-6">
            Start exploring events to build your personalized taste profile.
            We'll track what you like and recommend events tailored just for you.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Explore Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
            animation: 'pulse 4s ease-in-out infinite'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-4 mb-4">
            <Sparkles className="w-10 h-10 text-purple-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Your Taste Profile
            </h1>
          </div>

          <p className="text-white/70 text-lg">
            Your cultural fingerprint, powered by {interactions.length} interactions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Stats Summary */}
        <TasteStats interactions={interactions} affinity={affinity} />

        {/* Affinity Chart */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Category Preferences
            </span>
          </h2>
          <AffinityChart affinity={affinity} categories={CATEGORIES} />
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Recent Activity
            </span>
          </h2>
          <InteractionTimeline interactions={interactions} categories={CATEGORIES} />
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  )
}
