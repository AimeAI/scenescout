import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { transformEventRow } from '@/lib/event-normalizer'
import { z } from 'zod'
import { validateSearchParams, safeErrorResponse, checkRateLimit } from '@/lib/validation/api-validator'
import { sanitizeEvents } from '@/lib/validation/sanitize'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Events API query schema
const eventsQuerySchema = z.object({
  category: z.string().max(100).optional(),
  featured: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  bounds: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
  oneOff: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  hasTickets: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  isFree: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
})

// Rate limit: 100 requests per minute
const EVENTS_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000,
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'events', EVENTS_RATE_LIMIT)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    // Validate query parameters
    const validation = validateSearchParams(request, eventsQuerySchema)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString(),
        },
        { status: validation.status || 400 }
      )
    }

    const params = validation.data!
    const {
      category,
      featured,
      limit,
      bounds,
      lat,
      lng,
      radius,
      isOneOff,
      hasTickets,
      isFree,
      priceMin,
      priceMax,
    } = params

    const supabase = getServiceSupabaseClient()

    let query = supabase
      .from('events')
      .select(`
        *,
        venue:venues(name, latitude, longitude, address),
        city:cities(name, slug)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (featured) {
      query = query.eq('is_featured', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Free events filter
    if (isFree) {
      query = query.eq('is_free', true)
    }

    // Price range filtering
    if (priceMin) {
      query = query.gte('price_min', parseInt(priceMin))
    }
    if (priceMax) {
      query = query.lte('price_max', parseInt(priceMax))
    }

    // Ticketed events filter (events with price info)
    if (hasTickets) {
      query = query.or('price_min.gt.0,price_max.gt.0,external_url.not.is.null')
    }

    // Apply bounds filtering if provided
    if (bounds) {
      const [north, south, east, west] = bounds.split(',').map(Number)
      query = query
        .gte('venue.latitude', south)
        .lte('venue.latitude', north)
        .gte('venue.longitude', west)
        .lte('venue.longitude', east)
    }

    let { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      )
    }

    // Transform events to match frontend expectations
    let events = (data || []).map(transformEventRow)

    // Apply location-based radius filtering (post-query for accuracy)
    if (lat && lng) {
      events = events.filter(event => {
        // Check both direct coordinates and venue coordinates
        const eventLat = event.latitude || event.venue?.latitude
        const eventLng = event.longitude || event.venue?.longitude
        
        if (!eventLat || !eventLng) return false
        
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          eventLat,
          eventLng
        )
        
        return distance <= radius
      })
      
      // Sort by distance from user
      events.sort((a, b) => {
        const aLat = a.latitude || a.venue?.latitude
        const aLng = a.longitude || a.venue?.longitude
        const bLat = b.latitude || b.venue?.latitude
        const bLng = b.longitude || b.venue?.longitude
        
        if (!aLat || !aLng || !bLat || !bLng) return 0
        
        const distA = calculateDistance(parseFloat(lat), parseFloat(lng), aLat, aLng)
        const distB = calculateDistance(parseFloat(lat), parseFloat(lng), bLat, bLng)
        return distA - distB
      })
    }

    // Filter for one-off events (no recurring pattern)
    if (isOneOff) {
      events = events.filter(event => {
        // Events that don't have recurring indicators in title/description
        const text = `${event.title} ${event.description || ''}`.toLowerCase()
        const recurringTerms = ['weekly', 'monthly', 'daily', 'recurring', 'every week', 'every month']
        return !recurringTerms.some(term => text.includes(term))
      })
    }

    // Only return events with valid location data (no mock data)
    events = events.filter(event => {
      const hasLocation = (event.latitude && event.longitude) ||
                         (event.venue?.latitude && event.venue?.longitude)
      return hasLocation &&
             event.source !== 'mock' &&
             !event.id.startsWith('mock-')
    })

    // Sanitize events to prevent XSS
    const sanitizedEvents = sanitizeEvents(events)

    return NextResponse.json({
      events: sanitizedEvents,
      count: sanitizedEvents.length,
      success: true,
      location: lat && lng ? { lat, lng, radius } : null
    })

  } catch (error) {
    console.error('Events API error:', error)
    return safeErrorResponse(error, 'Failed to fetch events')
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}
