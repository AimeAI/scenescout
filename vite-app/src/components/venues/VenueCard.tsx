import React from 'react'
import { MapPin, Star, Clock, Phone, ExternalLink, Calendar } from 'lucide-react'
import { type VenueWithDistance } from '@/services/venues.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface VenueCardProps {
  venue: VenueWithDistance
  size?: 'small' | 'medium' | 'large'
  showDistance?: boolean
  showEvents?: boolean
  onClick?: () => void
}

export function VenueCard({ 
  venue, 
  size = 'medium', 
  showDistance = false,
  showEvents = false,
  onClick 
}: VenueCardProps) {
  const sizeClasses = {
    small: 'w-64 h-40',
    medium: 'w-80 h-48', 
    large: 'w-96 h-56'
  }

  const getVenueTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      restaurant: '🍽️',
      bar: '🍻',
      nightclub: '🎵',
      museum: '🏛️',
      theater: '🎭',
      park: '🌳',
      fitness: '💪',
      shopping: '🛍️',
      hotel: '🏨',
      other: '📍'
    }
    return icons[type] || icons.other
  }

  const getSourceBadge = (externalId?: string) => {
    if (!externalId) return { label: 'Manual', color: 'bg-gray-500' }
    if (externalId.startsWith('ChIJ')) return { label: 'Google', color: 'bg-blue-500' }
    return { label: 'Yelp', color: 'bg-red-500' }
  }

  const source = getSourceBadge(venue.external_id)
  const hasImage = venue.images && venue.images.length > 0
  const primaryImage = hasImage ? venue.images[0] : null

  return (
    <Card 
      className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 relative overflow-hidden group`}
      onClick={onClick}
    >
      {/* Background Image */}
      {primaryImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${primaryImage})` }}
        >
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="absolute inset-0 flex items-center justify-center text-6xl text-gray-400">
            {getVenueTypeIcon(venue.venue_type || 'other')}
          </div>
        </div>
      )}

      {/* Content Overlay */}
      <CardContent className="relative h-full p-4 flex flex-col justify-between text-white">
        {/* Top Row - Badges */}
        <div className="flex justify-between items-start">
          <Badge className={`${source.color} text-white text-xs`}>
            {source.label}
          </Badge>
          {venue.rating && (
            <Badge className="bg-yellow-500 text-white text-xs">
              <Star className="w-3 h-3 mr-1" />
              {venue.rating.toFixed(1)}
            </Badge>
          )}
        </div>

        {/* Bottom Content */}
        <div className="space-y-2">
          {/* Venue Name */}
          <h3 className="font-bold text-lg leading-tight line-clamp-2">
            {venue.name}
          </h3>

          {/* Venue Type */}
          {venue.venue_type && (
            <Badge variant="secondary" className="text-xs">
              {venue.venue_type.charAt(0).toUpperCase() + venue.venue_type.slice(1)}
            </Badge>
          )}

          {/* Location */}
          <div className="flex items-center text-sm opacity-90">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{venue.address}</span>
          </div>

          {/* Distance */}
          {showDistance && venue.distance && (
            <div className="text-sm opacity-80">
              {venue.distance < 1 
                ? `${Math.round(venue.distance * 1000)}m away`
                : `${venue.distance.toFixed(1)}km away`
              }
            </div>
          )}

          {/* Additional Info Row */}
          <div className="flex items-center justify-between text-sm opacity-80">
            {venue.phone && (
              <div className="flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                <span className="text-xs">Call</span>
              </div>
            )}

            {venue.website && (
              <div className="flex items-center">
                <ExternalLink className="w-3 h-3 mr-1" />
                <span className="text-xs">Visit</span>
              </div>
            )}

            {venue.opening_hours && (
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span className="text-xs">Hours</span>
              </div>
            )}
          </div>

          {/* Events Preview (if enabled) */}
          {showEvents && venue.events && venue.events.length > 0 && (
            <div className="flex items-center text-xs opacity-80">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{venue.events.length} upcoming event{venue.events.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Hover Actions */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-black/60 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <div className="flex space-x-2">
          <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); /* View details */ }}>
            View Details
          </Button>
          {venue.website && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); window.open(venue.website!, '_blank') }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default VenueCard