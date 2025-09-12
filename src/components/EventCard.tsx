'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, DollarSign, Heart, Share } from 'lucide-react'
import BlurImage from './BlurImage'
import Link from 'next/link'
import { useState } from 'react'

interface Event {
  id: string
  title: string
  venue: string
  city: string
  date: string
  time?: string
  image: string
  price?: number
  category?: string
  description?: string
}

interface EventCardProps {
  event: Event
  showActions?: boolean
  variant?: 'default' | 'compact'
}

export default function EventCard({ 
  event, 
  showActions = true, 
  variant = 'default' 
}: EventCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50) + 10)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    // TODO: Implement like functionality with API
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title} at ${event.venue}`,
          url: window.location.origin + `/events/${event.id}`,
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.origin + `/events/${event.id}`)
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.origin + `/events/${event.id}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex">
          <div className="relative w-24 h-24 flex-shrink-0">
            <BlurImage
              src={event.image}
              alt={event.title}
              fill
              className="object-cover rounded-l-lg"
            />
          </div>
          <CardContent className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm line-clamp-1">{event.title}</h3>
                <p className="text-xs text-muted-foreground">{event.venue}</p>
              </div>
              {event.price !== undefined && (
                <Badge variant={event.price === 0 ? 'secondary' : 'outline'} className="text-xs">
                  {event.price === 0 ? 'Free' : `$${event.price}`}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(event.date)}
              </div>
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {event.city}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative h-48">
        <BlurImage
          src={event.image}
          alt={event.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Category Badge */}
        {event.category && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 text-black">
              {event.category}
            </Badge>
          </div>
        )}
        
        {/* Price Badge */}
        {event.price !== undefined && (
          <div className="absolute top-3 right-3">
            <Badge variant={event.price === 0 ? 'secondary' : 'default'}>
              {event.price === 0 ? 'Free' : `$${event.price}`}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and Venue */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-muted-foreground text-sm">{event.venue}</p>
          </div>

          {/* Event Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(event.date)}</span>
              {event.time && (
                <>
                  <Clock className="w-4 h-4 ml-4 mr-2" />
                  <span>{formatTime(event.time)}</span>
                </>
              )}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{event.city}</span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}
                >
                  <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-muted-foreground"
                >
                  <Share className="w-4 h-4" />
                </Button>
              </div>
              
              <Link href={`/events/${event.id}`}>
                <Button size="sm">
                  View Details
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}