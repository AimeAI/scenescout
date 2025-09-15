import { useState } from 'react'
import { Heart, Share2, Calendar, MapPin, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatTime, formatPrice, cn } from '@/lib/utils'
import { useSaveEvent, useUnsaveEvent, useIsEventSaved } from '@/hooks/useEvents'

function getSourceLabel(source: string): string {
  const sourceMap: Record<string, string> = {
    'eventbrite': 'EB',
    'ticketmaster': 'TM', 
    'google_places': 'Google',
    'yelp': 'Yelp',
    'meetup': 'Meetup',
    'songkick': 'SK'
  }
  return sourceMap[source] || source.toUpperCase()
}

interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time?: string | null
  venue_name?: string | null
  image_url?: string | null
  video_url?: string | null
  price_min?: number | null
  price_max?: number | null
  is_free?: boolean
  category: string
  source?: string | null
}

interface EventCardProps {
  event: Event
  className?: string
  size?: 'small' | 'medium' | 'large'
  showActions?: boolean
  onClick?: () => void
}

export function EventCard({ 
  event, 
  className, 
  size = 'medium',
  showActions = true,
  onClick 
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  
  const { data: isSaved = false } = useIsEventSaved(event.id)
  const saveEventMutation = useSaveEvent()
  const unsaveEventMutation = useUnsaveEvent()

  const sizeClasses = {
    small: 'w-64',
    medium: 'w-80',
    large: 'w-96'
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (isSaved) {
        await unsaveEventMutation.mutateAsync(event.id)
      } else {
        await saveEventMutation.mutateAsync(event.id)
      }
    } catch (error) {
      console.error('Error saving/unsaving event:', error)
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description || event.title,
        url: `/event/${event.id}`
      })
    }
  }

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-300 cursor-pointer",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsVideoPlaying(false)
      }}
      onClick={onClick}
    >
      {/* Image/Video Container */}
      <div className="relative aspect-video overflow-hidden">
        {isVideoPlaying && event.video_url ? (
          <video
            className="w-full h-full object-cover"
            src={event.video_url}
            autoPlay
            muted
            loop
            onError={() => setIsVideoPlaying(false)}
          />
        ) : (
          <img
            src={event.image_url || '/placeholder-event.jpg'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Video Play Button */}
        {event.video_url && isHovered && !isVideoPlaying && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsVideoPlaying(true)
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
          >
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
              <Play size={20} className="text-black ml-1" />
            </div>
          </button>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
            {event.category}
          </span>
          {event.source && (
            <span className="px-2 py-1 bg-purple-600/80 text-white text-xs font-medium rounded-full backdrop-blur-sm">
              {getSourceLabel(event.source)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className={cn(
            "absolute top-3 right-3 flex space-x-2 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={saveEventMutation.isPending || unsaveEventMutation.isPending}
              className="w-8 h-8 bg-black/70 hover:bg-black/80 text-white backdrop-blur-sm"
            >
              <Heart 
                size={16} 
                className={cn(
                  "transition-colors",
                  isSaved ? "fill-red-500 text-red-500" : "text-white"
                )} 
              />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              className="w-8 h-8 bg-black/70 hover:bg-black/80 text-white backdrop-blur-sm"
            >
              <Share2 size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {/* Title */}
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
          {event.title}
        </h3>
        
        {/* Event Details */}
        <div className="space-y-2 text-sm text-white/70">
          <div className="flex items-center space-x-2">
            <Calendar size={14} />
            <span>
              {formatDate(event.date)}
              {event.time && ` at ${formatTime(event.time)}`}
            </span>
          </div>
          
          {event.venue_name && (
            <div className="flex items-center space-x-2">
              <MapPin size={14} />
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              {formatPrice(event.price_min ?? undefined, event.price_max ?? undefined, event.is_free)}
            </span>
            
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}