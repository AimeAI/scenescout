'use client'

interface Event {
  id: string
  title: string
  venue_name: string
  category: string
  price_min: number
  date: string
  time: string
  external_url: string
  description: string
}

interface EventGridProps {
  events: Event[]
  onEventClick: (event: Event) => void
}

export function EventGrid({ events, onEventClick }: EventGridProps) {
  const categoryEmojis = {
    music: '🎵',
    food: '🍽️',
    tech: '💻',
    arts: '🎨',
    sports: '⚽',
    social: '👥',
    default: '🎪'
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow'
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch (e) {
      return dateStr
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-4">🔍</div>
        <p>No events found</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => onEventClick(event)}
          className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-all duration-200 hover:scale-105"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {categoryEmojis[event.category] || categoryEmojis.default}
              </span>
              <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs capitalize">
                {event.category}
              </span>
            </div>
            {event.price_min === 0 ? (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                FREE
              </span>
            ) : (
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                ${event.price_min}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-white">
            {event.title}
          </h3>

          {/* Details */}
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span className="line-clamp-1">{event.venue_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formatDate(event.date)} at {event.time}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 mt-3 line-clamp-3">
            {event.description}
          </p>

          {/* Action */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Click to view event</span>
              <span className="text-blue-400 text-xs">→</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
