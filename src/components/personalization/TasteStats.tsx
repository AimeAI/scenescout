'use client'

import { MousePointer, Heart, TrendingUp, Clock } from 'lucide-react'

interface TasteStatsProps {
  interactions: any[]
  affinity: any
}

export function TasteStats({ interactions, affinity }: TasteStatsProps) {
  // Calculate stats
  const clickCount = interactions.filter(i => i.type === 'click').length
  const saveCount = interactions.filter(i => i.type === 'save').length
  const searchCount = interactions.filter(i => i.type === 'search').length

  // Get top category
  const topCategory = affinity ? Object.entries(affinity.categories)
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))[0] : null

  // Calculate days active
  const oldestInteraction = interactions.length > 0
    ? new Date(Math.min(...interactions.map(i => new Date(i.timestamp).getTime())))
    : new Date()
  const daysActive = Math.max(1, Math.floor((Date.now() - oldestInteraction.getTime()) / (1000 * 60 * 60 * 24)))

  const stats = [
    {
      icon: MousePointer,
      label: 'Total Interactions',
      value: interactions.length,
      gradient: 'from-blue-400 to-cyan-400'
    },
    {
      icon: Heart,
      label: 'Events Saved',
      value: saveCount,
      gradient: 'from-pink-400 to-rose-400'
    },
    {
      icon: TrendingUp,
      label: 'Top Category',
      value: topCategory ? topCategory[0].split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'None',
      gradient: 'from-purple-400 to-indigo-400',
      isText: true
    },
    {
      icon: Clock,
      label: 'Days Active',
      value: daysActive,
      gradient: 'from-orange-400 to-amber-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105"
        >
          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4`}>
            <stat.icon className="w-6 h-6 text-white" />
          </div>

          <div className="text-3xl font-bold mb-1">
            {stat.isText ? (
              <span className="text-xl">{stat.value}</span>
            ) : (
              stat.value.toLocaleString()
            )}
          </div>

          <div className="text-white/60 text-sm">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
