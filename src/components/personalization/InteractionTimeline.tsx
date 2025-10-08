'use client'

import { MousePointer, Heart, Search, Eye } from 'lucide-react'

interface InteractionTimelineProps {
  interactions: any[]
  categories: Array<{ id: string; title: string; emoji: string }>
}

export function InteractionTimeline({ interactions, categories }: InteractionTimelineProps) {
  // Get last 20 interactions
  const recentInteractions = [...interactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)

  const getIcon = (type: string) => {
    switch (type) {
      case 'click': return MousePointer
      case 'save': return Heart
      case 'search': return Search
      case 'view': return Eye
      default: return MousePointer
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'click': return 'bg-blue-500'
      case 'save': return 'bg-pink-500'
      case 'search': return 'bg-purple-500'
      case 'view': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime()
    const then = new Date(timestamp).getTime()
    const diff = now - then

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
      {recentInteractions.length === 0 ? (
        <div className="text-center text-white/50 py-8">
          No recent activity
        </div>
      ) : (
        recentInteractions.map((interaction, index) => {
          const Icon = getIcon(interaction.type)
          const category = categories.find(c => c.id === interaction.metadata?.category)

          return (
            <div
              key={`${interaction.timestamp}-${index}`}
              className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all group"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 p-2 rounded-lg ${getIconColor(interaction.type)}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-white truncate">
                    {interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)} event
                  </p>
                  <span className="text-xs text-white/50 whitespace-nowrap">
                    {getTimeAgo(interaction.timestamp)}
                  </span>
                </div>

                {category && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <span>{category.emoji}</span>
                    <span>{category.title}</span>
                  </div>
                )}

                {interaction.metadata?.eventId && (
                  <div className="text-xs text-white/50 mt-1 font-mono truncate">
                    {interaction.metadata.eventId}
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
