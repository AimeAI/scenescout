import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Star, Clock, Phone, ExternalLink, Calendar, ArrowLeft, Share } from 'lucide-react'
import { useVenue } from '@/hooks/useVenues'
import { useEvents } from '@/hooks/useEvents'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EventCard } from '@/components/events/EventCard'
import { cn } from '@/lib/utils'

export function VenueDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: venue, isLoading, error } = useVenue(id!)
  const { data: venueEvents = [] } = useEvents({ 
    search: venue?.name,
    limit: 20 
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Venue not found</h2>
          <p className="text-white/60 mb-6">The venue you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
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
    if (externalId.startsWith('ChIJ')) return { label: 'Google Places', color: 'bg-blue-500' }
    return { label: 'Yelp', color: 'bg-red-500' }
  }

  const source = getSourceBadge(venue.external_id)
  const hasImages = venue.images && venue.images.length > 0
  const eventsAtVenue = venueEvents.filter(event => 
    event.venue_name?.toLowerCase().includes(venue.name.toLowerCase()) ||
    event.venue_id === venue.id
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="text-white hover:text-white/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: venue.name,
                      text: `Check out ${venue.name}`,
                      url: window.location.href
                    })
                  }
                }}
                className="text-white hover:text-white/80"
              >
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-96">
        {hasImages ? (
          <div className="absolute inset-0">
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-20">
              {getVenueTypeIcon(venue.venue_type || 'other')}
            </div>
          </div>
        )}

        <div className="relative h-full flex items-end">
          <div className="max-w-7xl mx-auto px-4 pb-8 w-full">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Badge className={`${source.color} text-white`}>
                    {source.label}
                  </Badge>
                  {venue.venue_type && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {venue.venue_type.charAt(0).toUpperCase() + venue.venue_type.slice(1)}
                    </Badge>
                  )}
                  {venue.rating && (
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      {venue.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {venue.name}
                </h1>
                
                <div className="flex items-center text-white/80">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{venue.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {venue.description && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">About</h2>
                <p className="text-white/80 leading-relaxed">{venue.description}</p>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {hasImages && venue.images.length > 1 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.images.slice(1, 7).map((image: string, index: number) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`${venue.name} ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events at Venue */}
            {eventsAtVenue.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Upcoming Events ({eventsAtVenue.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {eventsAtVenue.slice(0, 6).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      size="small"
                    />
                  ))}
                </div>
                {eventsAtVenue.length > 6 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" className="border-white/30 text-white">
                      View All Events
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
              <div className="space-y-4">
                {venue.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 text-white/60" />
                    <a 
                      href={`tel:${venue.phone}`}
                      className="text-white hover:text-purple-400 transition-colors"
                    >
                      {venue.phone}
                    </a>
                  </div>
                )}

                {venue.website && (
                  <div className="flex items-center">
                    <ExternalLink className="w-4 h-4 mr-3 text-white/60" />
                    <a 
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-purple-400 transition-colors"
                    >
                      Visit Website
                    </a>
                  </div>
                )}

                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-3 text-white/60 mt-1 flex-shrink-0" />
                  <span className="text-white">{venue.address}</span>
                </div>
              </div>
            </div>

            {/* Hours */}
            {venue.operating_hours && (
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Hours
                </h3>
                <div className="text-sm text-white/80">
                  {Array.isArray(venue.operating_hours) ? (
                    <div className="space-y-1">
                      {venue.operating_hours.map((hours: string, index: number) => (
                        <div key={index}>{hours}</div>
                      ))}
                    </div>
                  ) : typeof venue.operating_hours === 'string' ? (
                    <div>{venue.operating_hours}</div>
                  ) : (
                    <div>{JSON.stringify(venue.operating_hours)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {venue.website && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => window.open(venue.website!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Website
                </Button>
              )}
              
              {venue.phone && (
                <Button 
                  variant="outline" 
                  className="w-full border-white/30 text-white hover:bg-white/10"
                  onClick={() => window.open(`tel:${venue.phone}`, '_self')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Venue
                </Button>
              )}

              <Button 
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate(`/map?venue=${venue.id}`)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                View on Map
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}