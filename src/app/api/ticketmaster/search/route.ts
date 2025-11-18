import { NextRequest, NextResponse } from 'next/server'
import { getSceneScoutCategory } from '@/lib/api/category-mappings'

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic'

// Cache for 5 minutes to reduce API calls
export const revalidate = 300

const TICKETMASTER_API_BASE = 'https://app.ticketmaster.com/discovery/v2'
const API_KEY = process.env.TICKETMASTER_API_KEY || process.env.TICKETMASTER_CONSUMER_KEY

// In-memory cache to prevent duplicate requests within same deployment
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface TicketmasterEvent {
  id: string
  name: string
  description?: string
  dates: {
    start: {
      localDate?: string
      localTime?: string
      dateTime?: string
    }
  }
  _embedded?: {
    venues?: Array<{
      id: string
      name: string
      city?: {
        name: string
      }
      location?: {
        latitude: string
        longitude: string
      }
      address?: {
        line1?: string
      }
    }>
  }
  priceRanges?: Array<{
    min: number
    max: number
    currency: string
  }>
  images?: Array<{
    url: string
    width: number
    height: number
  }>
  url?: string
  classifications?: Array<{
    segment?: {
      name: string
    }
    genre?: {
      name: string
    }
    subGenre?: {
      name: string
    }
  }>
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[]
  }
  page?: {
    size: number
    totalElements: number
    number: number
  }
}

function convertTicketmasterEvent(tmEvent: TicketmasterEvent): any {
  const venue = tmEvent._embedded?.venues?.[0]
  const priceRange = tmEvent.priceRanges?.[0]
  const image = tmEvent.images?.find(img => img.width >= 640) || tmEvent.images?.[0]
  const classification = tmEvent.classifications?.[0]
  
  // Get SceneScout category from Ticketmaster classification
  const segment = classification?.segment?.name || 'Miscellaneous'
  const genre = classification?.genre?.name || ''
  const sceneScoutCategory = getSceneScoutCategory('ticketmaster', segment, genre)

  return {
    id: `tm_${tmEvent.id}`,
    title: tmEvent.name,
    description: tmEvent.info || tmEvent.pleaseNote || tmEvent.description || `${tmEvent.name} at ${venue?.name || 'TBA'}`,
    category: sceneScoutCategory,
    subcategory: classification?.genre?.name || classification?.subGenre?.name,
    // Map to Event type expected fields
    date: tmEvent.dates.start.localDate,
    event_date: tmEvent.dates.start.localDate, // Event type expects event_date
    time: tmEvent.dates.start.localTime,
    start_time: tmEvent.dates.start.localTime, // Event type expects start_time
    venue_name: venue?.name || 'TBA',
    city_name: venue?.city?.name,
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    address: venue?.address?.line1,
    // STRICT: Only set price fields if Ticketmaster provides them
    price_min: priceRange?.min !== undefined ? priceRange.min : undefined,
    price_max: priceRange?.max !== undefined ? priceRange.max : undefined,
    price_currency: priceRange?.currency,
    is_free: priceRange?.min === 0,
    image_url: image?.url,
    external_url: tmEvent.url,
    external_id: tmEvent.id,
    source: 'ticketmaster',
    provider: 'Ticketmaster',
    official: true,
    verified: true
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '25')
    const city = searchParams.get('city')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const classificationName = searchParams.get('classificationName')
    const startDate = searchParams.get('startDate') // YYYY-MM-DD
    const endDate = searchParams.get('endDate') // YYYY-MM-DD
    const sortBy = searchParams.get('sort') || 'date' // 'date' or 'relevance'

    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Ticketmaster API key not configured' },
        { status: 500 }
      )
    }

    // Create cache key from request parameters (including sort)
    const cacheKey = `${query}|${limit}|${city}|${lat}|${lng}|${classificationName}|${startDate}|${endDate}|${sortBy}`

    // Check cache first
    const cached = requestCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Ticketmaster cache hit for: "${query}"`)
      return NextResponse.json(cached.data)
    }

    // Determine Ticketmaster sort parameter
    // relevance: sorts by relevance (best match)
    // date,asc: sorts by date ascending (soonest first)
    const ticketmasterSort = sortBy === 'relevance' ? 'relevance,desc' : 'date,asc'

    // Build Ticketmaster API URL
    const params = new URLSearchParams({
      apikey: API_KEY,
      keyword: query,
      size: Math.min(limit, 199).toString(), // Ticketmaster max is 199
      sort: ticketmasterSort,
      countryCode: 'US,CA'
    })

    // Add date range if provided (Ticketmaster format: YYYY-MM-DDTHH:mm:ssZ)
    if (startDate) {
      params.append('startDateTime', `${startDate}T00:00:00Z`)
    }
    // Note: Don't add startDateTime by default - let Ticketmaster return all future events
    // We'll filter on the backend instead to avoid 400 errors from invalid formats
    if (endDate) {
      params.append('endDateTime', `${endDate}T23:59:59Z`)
    }

    // Add location parameters
    if (lat && lng) {
      params.append('latlong', `${lat},${lng}`)
      params.append('radius', '50') // 50 mile radius
      params.append('unit', 'miles')
    } else if (city) {
      params.append('city', city)
    } else {
      // Default to major cities if no location provided
      params.append('city', 'Toronto,New York,Los Angeles,Chicago')
    }

    if (classificationName) {
      params.append('classificationName', classificationName)
    }

    // Add broader category filters for better results
    if (query.toLowerCase().includes('music') || query.toLowerCase().includes('concert')) {
      params.append('classificationName', 'Music')
    } else if (query.toLowerCase().includes('sports')) {
      params.append('classificationName', 'Sports')
    } else if (query.toLowerCase().includes('theater') || query.toLowerCase().includes('broadway')) {
      params.append('classificationName', 'Arts & Theatre')
    }

    const url = `${TICKETMASTER_API_BASE}/events.json?${params}`
    
    console.log('🎫 Ticketmaster API Request:', url.replace(API_KEY, 'API_KEY'))

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    })

    if (!response.ok) {
      console.error('Ticketmaster API error:', response.status, response.statusText)
      return NextResponse.json(
        { success: false, error: `Ticketmaster API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data: TicketmasterResponse = await response.json()
    
    const events = data._embedded?.events?.map(convertTicketmasterEvent) || []

    console.log(`✅ Ticketmaster: Found ${events.length} events for query: "${query}"`)

    const result = {
      success: true,
      events,
      pagination: {
        total: data.page?.totalElements || 0,
        page: (data.page?.number || 0) + 1,
        limit: data.page?.size || limit
      },
      source: 'ticketmaster'
    }

    // Cache the result
    requestCache.set(cacheKey, { data: result, timestamp: Date.now() })

    // Clean old cache entries (keep last 100)
    if (requestCache.size > 100) {
      const entries = Array.from(requestCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      requestCache.clear()
      entries.slice(0, 100).forEach(([key, value]) => requestCache.set(key, value))
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Ticketmaster API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events from Ticketmaster',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}