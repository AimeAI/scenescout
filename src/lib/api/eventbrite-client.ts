// Eventbrite API Client
import { BaseApiClient } from './base-client'
import { 
  EventbriteConfig, 
  EventbriteEvent, 
  EventbriteVenue, 
  EventbriteOrganizer,
  EventbriteCategory,
  EventbriteTicketClass,
  SearchParams, 
  ApiResponse,
  RawEvent,
  RawVenue,
  RawOrganizer
} from './types'

export class EventbriteClient extends BaseApiClient {
  private token: string

  constructor(config: EventbriteConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://www.eventbriteapi.com/v3',
      rateLimit: config.rateLimit || {
        requests: 1000,
        windowMs: 60 * 60 * 1000 // 1 hour
      },
      timeout: config.timeout || 30000,
      retryOptions: config.retryOptions || {
        retries: 3,
        retryDelay: 1000
      }
    })
    
    this.token = config.apiKey
  }

  /**
   * Search for events
   */
  async searchEvents(params: SearchParams): Promise<ApiResponse<EventbriteEvent[]>> {
    const searchParams: Record<string, any> = {
      token: this.token,
      expand: 'venue,organizer,ticket_classes,category,subcategory,format',
      'start_date.range_start': params.dateRange?.start || new Date().toISOString(),
      'start_date.range_end': params.dateRange?.end,
      sort_by: this.mapSortBy(params.sort),
      page_size: Math.min(params.limit || 50, 200), // Eventbrite max is 200
    }

    if (params.query) {
      searchParams.q = params.query
    }

    if (params.location) {
      if (params.location.latitude && params.location.longitude) {
        searchParams['location.latitude'] = params.location.latitude
        searchParams['location.longitude'] = params.location.longitude
        searchParams['location.within'] = `${params.location.radius || 25}km`
      } else if (params.location.address) {
        searchParams['location.address'] = params.location.address
      } else if (params.location.city) {
        searchParams['location.address'] = params.location.city
      }
    }

    if (params.categories && params.categories.length > 0) {
      // Map SceneScout categories to Eventbrite category IDs
      const eventbriteCategories = this.mapCategories(params.categories)
      if (eventbriteCategories.length > 0) {
        searchParams.categories = eventbriteCategories.join(',')
      }
    }

    if (params.priceRange) {
      searchParams['price'] = params.priceRange.min === 0 ? 'free' : 'paid'
    }

    const url = this.buildUrl('/events/search/', searchParams)
    
    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        events: EventbriteEvent[]
        pagination: {
          page_number: number
          page_count: number
          page_size: number
          object_count: number
          has_more_items: boolean
        }
      }>(url)

      return {
        ...response,
        data: response.data.events,
        pagination: {
          page: response.data.pagination.page_number,
          total: response.data.pagination.object_count,
          hasMore: response.data.pagination.has_more_items
        }
      }
    })
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<ApiResponse<EventbriteEvent>> {
    const url = this.buildUrl(`/events/${eventId}/`, {
      token: this.token,
      expand: 'venue,organizer,ticket_classes,category,subcategory,format'
    })

    return this.makeRetryableRequest(async () => {
      return this.makeRequest<EventbriteEvent>(url)
    })
  }

  /**
   * Get venue details
   */
  async getVenue(venueId: string): Promise<ApiResponse<EventbriteVenue>> {
    const url = this.buildUrl(`/venues/${venueId}/`, {
      token: this.token
    })

    return this.makeRetryableRequest(async () => {
      return this.makeRequest<EventbriteVenue>(url)
    })
  }

  /**
   * Get organizer details
   */
  async getOrganizer(organizerId: string): Promise<ApiResponse<EventbriteOrganizer>> {
    const url = this.buildUrl(`/organizers/${organizerId}/`, {
      token: this.token
    })

    return this.makeRetryableRequest(async () => {
      return this.makeRequest<EventbriteOrganizer>(url)
    })
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<ApiResponse<EventbriteCategory[]>> {
    const url = this.buildUrl('/categories/', {
      token: this.token
    })

    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        categories: EventbriteCategory[]
      }>(url)

      return {
        ...response,
        data: response.data.categories
      }
    })
  }

  /**
   * Get events by organization
   */
  async getOrganizationEvents(organizationId: string): Promise<ApiResponse<EventbriteEvent[]>> {
    const url = this.buildUrl(`/organizations/${organizationId}/events/`, {
      token: this.token,
      expand: 'venue,organizer,ticket_classes',
      order_by: 'start_asc',
      status: 'live'
    })

    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        events: EventbriteEvent[]
        pagination: any
      }>(url)

      return {
        ...response,
        data: response.data.events
      }
    })
  }

  /**
   * Normalize Eventbrite event to SceneScout format
   */
  normalizeEvent(event: EventbriteEvent): RawEvent {
    const pricing = this.extractPricing(event)
    
    return {
      id: `eventbrite_${event.id}`,
      external_id: event.id,
      source: 'eventbrite',
      title: event.name.text,
      description: event.description?.text || event.description?.html,
      start_time: event.start.utc,
      end_time: event.end.utc,
      timezone: event.start.timezone,
      venue: event.venue ? {
        name: event.venue.name,
        address: this.formatAddress(event.venue.address),
        latitude: event.venue.address.latitude ? parseFloat(event.venue.address.latitude) : undefined,
        longitude: event.venue.address.longitude ? parseFloat(event.venue.address.longitude) : undefined,
        city: event.venue.address.city,
        state: event.venue.address.region,
        country: event.venue.address.country
      } : undefined,
      organizer: event.organizer ? {
        name: event.organizer.name,
        description: event.organizer.description?.text
      } : undefined,
      category: this.mapEventbriteCategory(event.category_id),
      subcategory: event.subcategory_id,
      tags: [], // Eventbrite doesn't provide tags directly
      price: pricing,
      images: event.logo?.original?.url ? [event.logo.original.url] : [],
      url: event.url,
      ticket_url: event.url,
      capacity: event.capacity,
      age_restriction: event.age_restriction ? parseInt(event.age_restriction) : undefined,
      status: this.mapEventStatus(event.status),
      created_at: event.created,
      updated_at: event.changed
    }
  }

  /**
   * Normalize Eventbrite venue to SceneScout format
   */
  normalizeVenue(venue: EventbriteVenue): RawVenue {
    return {
      id: `eventbrite_${venue.id}`,
      external_id: venue.id,
      source: 'eventbrite',
      name: venue.name,
      address: this.formatAddress(venue.address),
      city: venue.address.city,
      state: venue.address.region,
      country: venue.address.country,
      postal_code: venue.address.postal_code,
      latitude: venue.address.latitude ? parseFloat(venue.address.latitude) : undefined,
      longitude: venue.address.longitude ? parseFloat(venue.address.longitude) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Normalize Eventbrite organizer to SceneScout format
   */
  normalizeOrganizer(organizer: EventbriteOrganizer): RawOrganizer {
    return {
      id: `eventbrite_${organizer.id}`,
      external_id: organizer.id,
      source: 'eventbrite',
      name: organizer.name,
      description: organizer.description?.text,
      website: organizer.url,
      logo_url: organizer.logo?.url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Private helper methods

  private mapSortBy(sort?: string): string {
    switch (sort) {
      case 'date': return 'date'
      case 'popularity': return 'best'
      case 'distance': return 'distance'
      default: return 'date'
    }
  }

  private mapCategories(categories: string[]): string[] {
    const categoryMap: Record<string, string> = {
      'music': '103',
      'sports': '108',
      'arts': '105',
      'food': '110',
      'tech': '102',
      'business': '101',
      'education': '107',
      'health': '107',
      'family': '115'
    }

    return categories
      .map(cat => categoryMap[cat.toLowerCase()])
      .filter(Boolean)
  }

  private mapEventbriteCategory(categoryId?: string): string {
    const categoryMap: Record<string, string> = {
      '103': 'music',
      '108': 'sports', 
      '105': 'arts',
      '110': 'food',
      '102': 'tech',
      '101': 'business',
      '107': 'education',
      '115': 'family'
    }

    return categoryMap[categoryId || ''] || 'other'
  }

  private mapEventStatus(status: string): 'active' | 'cancelled' | 'postponed' {
    switch (status.toLowerCase()) {
      case 'live':
      case 'started':
        return 'active'
      case 'canceled':
      case 'cancelled':
        return 'cancelled'
      case 'postponed':
        return 'postponed'
      default:
        return 'active'
    }
  }

  private extractPricing(event: EventbriteEvent): {
    min?: number
    max?: number
    currency: string
    is_free: boolean
  } {
    if (event.is_free || !event.ticket_classes || event.ticket_classes.length === 0) {
      return {
        currency: 'USD',
        is_free: true
      }
    }

    const prices = event.ticket_classes
      .filter(ticket => !ticket.free)
      .map(ticket => ticket.cost.value / 100) // Eventbrite uses cents

    if (prices.length === 0) {
      return {
        currency: event.ticket_classes[0]?.cost.currency || 'USD',
        is_free: true
      }
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: event.ticket_classes[0].cost.currency,
      is_free: false
    }
  }

  private formatAddress(address: EventbriteVenue['address']): string {
    const parts = [
      address.address_1,
      address.address_2,
      address.city,
      address.region,
      address.postal_code
    ].filter(Boolean)

    return parts.join(', ')
  }
}