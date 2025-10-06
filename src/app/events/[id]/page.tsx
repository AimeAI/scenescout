'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Users, DollarSign, ExternalLink, ArrowLeft, Share, Heart } from 'lucide-react'
import { Event } from '@/types'
import { cn } from '@/lib/utils'
import { isSaved, toggleSaved, getSavedIds } from '@/lib/saved/store'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'
import { generateICS } from '@/lib/calendar/export'

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [savedState, setSavedState] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchEvent(params.id as string)
      setShareUrl(window.location.href)
      // Check if event is saved
      setSavedState(isSaved(params.id as string))
    }
  }, [params.id])

  const fetchEvent = async (eventId: string) => {
    try {
      setLoading(true)

      // First, check if we have the event in sessionStorage (from homepage navigation)
      const cachedEvent = sessionStorage.getItem(`event_${eventId}`)
      if (cachedEvent) {
        console.log('✅ Using cached event data from sessionStorage')
        const eventData = JSON.parse(cachedEvent)

        // Normalize flat event structure to include nested venue object for compatibility
        const normalizedEvent = {
          ...eventData,
          event_date: eventData.date || eventData.event_date,
          venue: {
            name: eventData.venue_name,
            address: eventData.address || eventData.venue_address,
            latitude: eventData.latitude,
            longitude: eventData.longitude
          }
        }

        setEvent(normalizedEvent)
        setLoading(false)
        return
      }

      // If not in cache, fetch from our API endpoint
      console.log('📡 Fetching event from API...')
      const response = await fetch(`/api/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Event not found:', response.status)
        // Show error message before redirecting
        if (typeof window !== 'undefined') {
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
          toast.textContent = '❌ Event not found'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
            router.push('/')
          }, 2000)
        } else {
          router.push('/')
        }
        return
      }

      const data = await response.json()

      if (!data.success || !data.event) {
        console.error('Invalid event data:', data)
        if (typeof window !== 'undefined') {
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
          toast.textContent = '❌ Invalid event data'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
            router.push('/')
          }, 2000)
        } else {
          router.push('/')
        }
        return
      }

      setEvent(data.event)
    } catch (error) {
      console.error('Error fetching event:', error)
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        toast.textContent = '❌ Failed to load event'
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
          router.push('/')
        }, 2000)
      } else {
        router.push('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (event?.id) {
      toggleSaved(event.id, event)
      setSavedState(!savedState)

      // Track save/unsave interaction
      if (isTrackingEnabled() && typeof window !== 'undefined') {
        trackEvent(savedState ? 'unsave' : 'save', {
          eventId: event.id,
          category: event.category || 'unknown',
          price: event.price_min,
          venue: event.venue_name
        })
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || `Check out this ${event.category} event!`,
          url: shareUrl,
        })
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl)
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  const handleAddToCalendar = () => {
    if (!event) return

    const result = generateICS(event)

    if (result.success) {
      console.log(`📅 Calendar event downloaded: ${result.filename}`)

      // Track calendar export
      if (isTrackingEnabled() && typeof window !== 'undefined') {
        trackEvent('calendar_export', {
          eventId: event.id,
          category: event.category || 'unknown',
          venue: event.venue_name
        })
      }

      // Show success feedback
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in'
        toast.textContent = `✅ ${result.filename} downloaded!`
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 3000)
      }
    } else {
      console.error('Failed to generate calendar event:', result.error)

      // Show error feedback
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in'
        toast.textContent = `❌ Failed to create calendar event. Please try again.`
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 3000)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return null
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="relative h-96 overflow-hidden">
          {event.image_url && (
            <div className="absolute inset-0">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>
          )}
          
          <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-12">
            {/* Back button */}
            <div className="flex justify-between items-start">
              <Button
                onClick={() => {
                  // If user came from within the app, go back. Otherwise go home.
                  if (typeof window !== 'undefined' && window.history.length > 2) {
                    router.back()
                  } else {
                    router.push('/')
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-black/50 backdrop-blur-sm border-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {typeof window !== 'undefined' && window.history.length > 2 ? 'Back' : 'Back to Home'}
              </Button>
              
              {/* Sticky action buttons - Mobile and Desktop */}
              <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 lg:bottom-8 lg:right-8">
                <Button
                  onClick={handleSave}
                  size="lg"
                  className={cn(
                    "bg-white/10 backdrop-blur-md border-2 border-white/30 hover:border-white/50 shadow-xl transition-all duration-200 hover:scale-105 rounded-full w-14 h-14 p-0",
                    savedState && "bg-red-600/90 border-red-400/50 hover:bg-red-600"
                  )}
                >
                  <Heart className={cn("w-6 h-6 text-white", savedState && "fill-current")} />
                </Button>

                <Button
                  onClick={handleShare}
                  size="lg"
                  className="bg-white/10 backdrop-blur-md border-2 border-white/30 hover:border-white/50 shadow-xl transition-all duration-200 hover:scale-105 rounded-full w-14 h-14 p-0"
                >
                  <Share className="w-6 h-6 text-white" />
                </Button>
              </div>
            </div>

            {/* Event title and category */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {event.category}
                </span>
                {event.is_featured && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-sm font-medium">
                    Featured
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
                {event.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="max-w-4xl mx-auto p-6 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div>
                <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                {event.description && event.description.length > 50 ? (
                  <p className="text-white/80 leading-relaxed text-lg whitespace-pre-line">
                    {event.description}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white/80 leading-relaxed text-lg">
                      {event.title} is a {event.category || 'special'} event
                      {event.venue_name && ` taking place at ${event.venue_name}`}
                      {event.city_name && ` in ${event.city_name}`}.
                    </p>
                    {event.subcategory && (
                      <p className="text-white/70 text-base">
                        Genre: <span className="text-purple-400">{event.subcategory}</span>
                      </p>
                    )}
                    {event.is_free ? (
                      <p className="text-green-400 font-medium">
                        ✨ This is a free event - no tickets required!
                      </p>
                    ) : event.price_min !== undefined && (
                      <p className="text-white/70">
                        💵 Tickets start at ${event.price_min}
                        {event.price_max && event.price_max > event.price_min && ` - $${event.price_max}`}
                      </p>
                    )}
                    {event.capacity && (
                      <p className="text-white/70">
                        👥 Venue capacity: {event.capacity.toLocaleString()} people
                      </p>
                    )}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                      <p className="text-blue-300 text-sm">
                        ℹ️ Detailed description not available. Visit the event page for more information.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* External Links */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Get Tickets & Save Event</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Buy Tickets Button - Primary CTA */}
                  {event.external_url ? (
                    <Button
                      asChild
                      className="justify-start h-auto p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 col-span-1 sm:col-span-2"
                    >
                      <a href={event.external_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-3" />
                        <div className="text-left flex-1">
                          <div className="font-semibold text-base">Buy Tickets</div>
                          <div className="text-sm text-white/80">
                            {event.source ? `On ${event.source}` : 'Get tickets now'}
                          </div>
                        </div>
                      </a>
                    </Button>
                  ) : (
                    <div className="col-span-1 sm:col-span-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-sm text-white/60">
                        🎫 Ticket information not available. Please check the venue's website for details.
                      </p>
                    </div>
                  )}

                  {/* Add to Calendar Button */}
                  <Button
                    onClick={handleAddToCalendar}
                    variant="outline"
                    className="justify-start h-auto p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50 transition-all"
                  >
                    <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                    <div className="text-left">
                      <div className="font-medium">Add to Calendar</div>
                      <div className="text-sm text-white/60">Download .ics file</div>
                    </div>
                  </Button>

                  {event.url && event.url !== event.external_url && (
                    <Button asChild variant="outline" className="justify-start h-auto p-4">
                      <a href={event.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">More Info</div>
                          <div className="text-sm text-white/60">Additional Details</div>
                        </div>
                      </a>
                    </Button>
                  )}

                  {event.video_url && (
                    <Button asChild variant="outline" className="justify-start h-auto p-4">
                      <a href={event.video_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Watch Video</div>
                          <div className="text-sm text-white/60">Event Preview</div>
                        </div>
                      </a>
                    </Button>
                  )}
                </div>

                {/* Source Attribution */}
                {event.source && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="text-sm text-white/60 mb-1">Event sourced from:</div>
                    <div className="font-medium capitalize">{event.source}</div>
                    {event.provider && event.provider !== event.source && (
                      <div className="text-sm text-white/60">via {event.provider}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Event Info Sidebar */}
            <div className="space-y-6">
              {/* Date & Time */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Date & Time
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">
                      {formatDate(event.event_date || event.start_time || event.date || '')}
                    </div>
                    {event.time && (
                      <div className="text-white/60 flex items-center mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTime(event.time)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Location
                </h3>
                
                <div className="space-y-2">
                  <div className="font-medium">{event.venue_name || 'Venue TBA'}</div>
                  {event.venue?.address && (
                    <div className="text-white/60">{event.venue.address}</div>
                  )}
                  {event.city_name && (
                    <div className="text-white/60">{event.city_name}</div>
                  )}
                </div>

                {event.venue?.latitude && event.venue?.longitude && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${event.venue.latitude},${event.venue.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View on Map
                    </a>
                  </Button>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing
                </h3>
                
                <div className="space-y-2">
                  {event.is_free ? (
                    <div className="text-green-400 font-medium text-lg">Free Event</div>
                  ) : (
                    <div>
                      {event.price_min !== undefined && event.price_max !== undefined ? (
                        <div className="font-medium text-lg">
                          ${event.price_min} - ${event.price_max}
                        </div>
                      ) : event.price_min !== undefined ? (
                        <div className="font-medium text-lg">
                          From ${event.price_min}
                        </div>
                      ) : (
                        <div className="text-white/60">Price varies</div>
                      )}
                      
                      {event.currency && event.currency !== 'USD' && (
                        <div className="text-sm text-white/60">{event.currency}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Capacity */}
              {(event.capacity || event.attendance_estimate) && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Capacity
                  </h3>
                  
                  <div>
                    {event.capacity && (
                      <div className="font-medium">{event.capacity.toLocaleString()} people</div>
                    )}
                    {event.attendance_estimate && (
                      <div className="text-white/60">
                        ~{event.attendance_estimate.toLocaleString()} expected
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Event Stats */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Event Stats</h3>
                
                <div className="space-y-3 text-sm">
                  {event.view_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Views</span>
                      <span>{event.view_count.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {event.hotness_score !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Popularity</span>
                      <span>{event.hotness_score}/100</span>
                    </div>
                  )}
                  
                  {event.created_at && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Listed</span>
                      <span>{new Date(event.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}