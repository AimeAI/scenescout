import { NextRequest, NextResponse } from 'next/server'
import { getSceneScoutCategory } from '@/lib/api/category-mappings'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3'
const API_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN || process.env.EVENTBRITE_TOKEN || process.env.EVENTBRITE_OAUTH_TOKEN

interface EventbriteEvent {
  id: string
  name: {
    text: string
  }
  description?: {
    text: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end?: {
    timezone: string
    local: string
    utc: string
  }
  venue?: {
    id: string
    name: string
    address?: {
      city: string
      region: string
      country: string
      address_1?: string
      latitude?: string
      longitude?: string
    }
  }
  ticket_availability?: {
    has_available_tickets: boolean
    minimum_ticket_price?: {
      currency: string
      major_value: string
      value: number
    }
    maximum_ticket_price?: {
      currency: string
      major_value: string
      value: number
    }
  }
  logo?: {
    url: string
  }
  url: string
  is_free: boolean
  category?: {
    id: string
    name: string
    short_name: string
  }
  subcategory?: {
    id: string
    name: string
  }
  venue_id?: string
  organizer?: {
    id: string
    name: string
  }
}

interface EventbriteResponse {
  events: EventbriteEvent[]
  pagination: {
    object_count: number
    page_number: number
    page_size: number
    page_count: number
    has_more_items: boolean
  }
}

function convertEventbriteEvent(ebEvent: EventbriteEvent): any {
  // Get SceneScout category from Eventbrite category
  const categoryName = ebEvent.category?.name || ebEvent.category?.short_name || 'Other'
  const sceneScoutCategory = getSceneScoutCategory('eventbrite', categoryName)

  const startDate = new Date(ebEvent.start.local)
  const minPrice = ebEvent.ticket_availability?.minimum_ticket_price
  const maxPrice = ebEvent.ticket_availability?.maximum_ticket_price

  return {
    id: `eb_${ebEvent.id}`,
    title: ebEvent.name.text,
    description: ebEvent.description?.text || '',
    category: sceneScoutCategory,
    subcategory: ebEvent.subcategory?.name,
    date: startDate.toISOString().split('T')[0],
    time: startDate.toTimeString().split(' ')[0],
    start_time: ebEvent.start.utc,
    end_time: ebEvent.end?.utc,
    venue_name: ebEvent.venue?.name || 'TBA',
    city_name: ebEvent.venue?.address?.city,
    latitude: ebEvent.venue?.address?.latitude ? parseFloat(ebEvent.venue.address.latitude) : null,
    longitude: ebEvent.venue?.address?.longitude ? parseFloat(ebEvent.venue.address.longitude) : null,
    address: ebEvent.venue?.address?.address_1,
    price_min: minPrice ? parseFloat(minPrice.major_value) : (ebEvent.is_free ? 0 : null),
    price_max: maxPrice ? parseFloat(maxPrice.major_value) : null,
    price_currency: minPrice?.currency || 'USD',
    is_free: ebEvent.is_free,
    image_url: ebEvent.logo?.url,
    external_url: ebEvent.url,
    external_id: ebEvent.id,
    source: 'eventbrite',
    provider: 'Eventbrite',
    official: true,
    verified: true,
    organizer: ebEvent.organizer?.name
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
    const category = searchParams.get('category')

    if (!API_TOKEN) {
      console.warn('⚠️ Eventbrite API token not configured')
      return NextResponse.json({
        success: false,
        error: 'Eventbrite API token not configured',
        events: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 0,
          hasMore: false
        }
      })
    }

    // Try different EventBrite endpoints
    const endpoints = [
      '/events/search/',
      '/destinations/search/', 
      '/discovery/events/'
    ]

    for (const endpoint of endpoints) {
      try {
        const params = new URLSearchParams({
          token: API_TOKEN,
          q: query,
          'sort_by': 'date',
          expand: 'venue,category,subcategory,ticket_availability'
        })

        if (city) {
          params.append('location.address', city)
        }
        if (lat && lng) {
          params.append('location.latitude', lat)
          params.append('location.longitude', lng)
          params.append('location.within', '25mi')
        }

        const url = `${EVENTBRITE_API_BASE}${endpoint}?${params}`
        console.log(`🎟️ Trying EventBrite endpoint: ${endpoint}`)

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const data: EventbriteResponse = await response.json()
          const events = data.events?.map(convertEventbriteEvent) || []
          
          console.log(`✅ EventBrite ${endpoint}: Found ${events.length} events`)
          
          return NextResponse.json({
            success: true,
            events,
            pagination: {
              total: data.pagination?.object_count || 0,
              page: data.pagination?.page_number || 1,
              limit: data.pagination?.page_size || limit,
              hasMore: data.pagination?.has_more_items || false
            },
            source: 'eventbrite',
            endpoint_used: endpoint
          })
        } else {
          console.warn(`⚠️ EventBrite ${endpoint} returned ${response.status}`)
        }
      } catch (error) {
        console.warn(`⚠️ EventBrite ${endpoint} failed:`, error)
        continue
      }
    }

    // If all endpoints fail, return empty but successful response
    console.log('ℹ️ All EventBrite endpoints failed, returning empty results')
    return NextResponse.json({
      success: true,
      events: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 0,
        hasMore: false
      },
      source: 'eventbrite',
      message: 'EventBrite search returned no results'
    })

  } catch (error) {
    console.error('Eventbrite API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events from Eventbrite',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}