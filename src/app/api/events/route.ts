import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'
import { transformEventRow } from '@/lib/event-normalizer'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const bounds = searchParams.get('bounds')
    
    // Location-based filtering
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseInt(searchParams.get('radius') || '50') // Default 50km radius
    
    // Event type filtering
    const isOneOff = searchParams.get('oneOff') === 'true'
    const hasTickets = searchParams.get('hasTickets') === 'true'
    const isFree = searchParams.get('isFree') === 'true'
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')

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

    return NextResponse.json({
      events,
      count: events.length,
      success: true,
      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng), radius } : null
    })

  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
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
