// Yelp Fusion API Client
import { BaseApiClient } from './base-client'
import { 
  YelpConfig,
  YelpEvent,
  YelpBusiness,
  SearchParams,
  ApiResponse,
  RawEvent,
  RawVenue
} from './types'

export class YelpClient extends BaseApiClient {
  private apiKey: string

  constructor(config: YelpConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.yelp.com/v3',
      rateLimit: config.rateLimit || {
        requests: 5000,
        windowMs: 24 * 60 * 60 * 1000 // 24 hours
      },
      timeout: config.timeout || 10000,
      retryOptions: config.retryOptions || {
        retries: 3,
        retryDelay: 1000
      }
    })
    
    this.apiKey = config.apiKey
  }

  /**
   * Search for events (Note: Yelp deprecated their events API, so we'll search for businesses and extract event info)
   */
  async searchEvents(params: SearchParams): Promise<ApiResponse<YelpEvent[]>> {
    // Since Yelp Events API is deprecated, we'll search for businesses that might host events
    const businesses = await this.searchBusinesses({
      ...params,
      categories: this.mapCategoriesToYelp(params.categories || [])
    })

    // For each business, we would need to scrape or use additional data sources
    // For now, we'll return an empty array but keep the structure for future implementation
    return {
      data: [],
      pagination: {
        page: 1,
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Search for businesses (venues) that could host events
   */
  async searchBusinesses(params: SearchParams): Promise<ApiResponse<YelpBusiness[]>> {
    const searchParams: Record<string, any> = {
      limit: Math.min(params.limit || 50, 50), // Yelp max is 50
      offset: params.offset || 0,
      sort_by: this.mapSortBy(params.sort),
      open_now: false
    }

    if (params.query) {
      searchParams.term = params.query
    }

    if (params.location) {
      if (params.location.latitude && params.location.longitude) {
        searchParams.latitude = params.location.latitude
        searchParams.longitude = params.location.longitude
        searchParams.radius = Math.min((params.location.radius || 25) * 1000, 40000) // Convert km to meters, max 40km
      } else if (params.location.address) {
        searchParams.location = params.location.address
      } else if (params.location.city) {
        searchParams.location = params.location.city
      }
    }

    if (params.categories && params.categories.length > 0) {
      const yelpCategories = this.mapCategoriesToYelp(params.categories)
      if (yelpCategories.length > 0) {
        searchParams.categories = yelpCategories.join(',')
      }
    }

    if (params.priceRange) {
      const priceString = this.mapPriceRange(params.priceRange.min, params.priceRange.max)
      if (priceString) {
        searchParams.price = priceString
      }
    }

    const url = this.buildUrl('/businesses/search', searchParams)
    
    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        businesses: YelpBusiness[]
        total: number
        region: any
      }>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return {
        ...response,
        data: response.data.businesses,
        pagination: {
          page: Math.floor((params.offset || 0) / (params.limit || 50)) + 1,
          total: response.data.total,
          hasMore: (params.offset || 0) + response.data.businesses.length < response.data.total
        }
      }
    })
  }

  /**
   * Get business details by ID
   */
  async getBusiness(businessId: string): Promise<ApiResponse<YelpBusiness>> {
    const url = this.buildUrl(`/businesses/${businessId}`)

    return this.makeRetryableRequest(async () => {
      return this.makeRequest<YelpBusiness>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
    })
  }

  /**
   * Get business reviews (can help identify event information)
   */
  async getBusinessReviews(businessId: string): Promise<ApiResponse<any[]>> {
    const url = this.buildUrl(`/businesses/${businessId}/reviews`)

    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        reviews: any[]
        total: number
        possible_languages: string[]
      }>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return {
        ...response,
        data: response.data.reviews
      }
    })
  }

  /**
   * Search for businesses by category (useful for finding event venues)
   */
  async searchVenues(params: SearchParams): Promise<ApiResponse<YelpBusiness[]>> {
    // Focus on venue-type categories
    const venueCategories = [
      'eventservices',
      'venues',
      'musicvenues',
      'bars',
      'restaurants',
      'hotels',
      'eventplanners',
      'artsandentertainment'
    ]

    return this.searchBusinesses({
      ...params,
      categories: venueCategories
    })
  }

  /**
   * Get popular businesses in a location (could host events)
   */
  async getPopularVenues(
    latitude: number, 
    longitude: number, 
    radius: number = 10
  ): Promise<ApiResponse<YelpBusiness[]>> {
    return this.searchBusinesses({
      location: { latitude, longitude, radius },
      categories: ['eventservices', 'venues', 'musicvenues'],
      sort: 'popularity',
      limit: 50
    })
  }

  /**
   * Normalize Yelp business to SceneScout venue format
   */
  normalizeVenue(business: YelpBusiness): RawVenue {
    return {
      id: `yelp_${business.id}`,
      external_id: business.id,
      source: 'yelp',
      name: business.name,
      description: `${business.categories.map(c => c.title).join(', ')} business`,
      address: this.formatAddress(business.location),
      city: business.location.city,
      state: business.location.state,
      country: business.location.country,
      postal_code: business.location.zip_code,
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude,
      phone: business.phone,
      website: business.url,
      venue_type: this.mapBusinessTypeToVenueType(business.categories),
      images: business.image_url ? [business.image_url] : [],
      rating: business.rating,
      review_count: business.review_count,
      price_level: this.mapYelpPriceToLevel(business.price),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Normalize Yelp event (if available) to SceneScout format
   */
  normalizeEvent(event: YelpEvent): RawEvent {
    return {
      id: `yelp_${event.id}`,
      external_id: event.id,
      source: 'yelp',
      title: event.name,
      description: event.description,
      start_time: event.time_start || new Date().toISOString(),
      end_time: event.time_end,
      venue: {
        name: event.location.display_address.join(', '),
        address: this.formatYelpEventAddress(event.location),
        latitude: event.latitude,
        longitude: event.longitude,
        city: event.location.city,
        state: event.location.state,
        country: event.location.country
      },
      category: this.mapYelpCategoryToSceneScout(event.category),
      price: {
        min: event.cost,
        max: event.cost_max,
        currency: 'USD',
        is_free: event.is_free || false
      },
      images: event.image_url ? [event.image_url] : [],
      url: event.event_site_url,
      ticket_url: event.tickets_url,
      status: event.is_canceled ? 'cancelled' : 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Private helper methods

  private mapSortBy(sort?: string): string {
    switch (sort) {
      case 'popularity': return 'rating'
      case 'distance': return 'distance'
      case 'price': return 'rating' // Yelp doesn't have price sort
      default: return 'best_match'
    }
  }

  private mapCategoriesToYelp(categories: string[]): string[] {
    const categoryMap: Record<string, string[]> = {
      'music': ['musicvenues', 'bars', 'nightlife'],
      'sports': ['active', 'recreation', 'gyms'],
      'arts': ['arts', 'museums', 'galleries'],
      'food': ['restaurants', 'food', 'cafes'],
      'tech': ['education', 'eventservices'],
      'business': ['professional', 'eventservices'],
      'education': ['education', 'libraries'],
      'health': ['health', 'fitness'],
      'family': ['active', 'recreation', 'familyfun']
    }

    return categories
      .flatMap(cat => categoryMap[cat.toLowerCase()] || [])
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
  }

  private mapPriceRange(min?: number, max?: number): string {
    // Yelp uses 1-4 price levels: $ = under $10, $$ = $10-30, $$$ = $30-60, $$$$ = above $60
    if (min === 0 || (min === undefined && max === 0)) {
      return '1' // Cheapest option for free events
    }
    
    if (max === undefined && min === undefined) {
      return ''
    }

    const avgPrice = ((min || 0) + (max || min || 0)) / 2
    
    if (avgPrice <= 10) return '1'
    if (avgPrice <= 30) return '1,2'
    if (avgPrice <= 60) return '1,2,3'
    return '1,2,3,4'
  }

  private mapYelpCategoryToSceneScout(category?: string): string {
    if (!category) return 'other'
    
    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('music')) return 'music'
    if (lowerCategory.includes('food') || lowerCategory.includes('restaurant')) return 'food'
    if (lowerCategory.includes('art') || lowerCategory.includes('culture')) return 'arts'
    if (lowerCategory.includes('sport') || lowerCategory.includes('fitness')) return 'sports'
    if (lowerCategory.includes('tech') || lowerCategory.includes('technology')) return 'tech'
    if (lowerCategory.includes('business') || lowerCategory.includes('professional')) return 'business'
    if (lowerCategory.includes('education') || lowerCategory.includes('learning')) return 'education'
    if (lowerCategory.includes('health') || lowerCategory.includes('wellness')) return 'health'
    if (lowerCategory.includes('family') || lowerCategory.includes('kids')) return 'family'
    if (lowerCategory.includes('social') || lowerCategory.includes('community')) return 'social'
    
    return 'other'
  }

  private mapBusinessTypeToVenueType(categories: Array<{ alias: string; title: string }>): string {
    const primaryCategory = categories[0]?.alias || 'other'
    
    const venueTypeMap: Record<string, string> = {
      'musicvenues': 'music_venue',
      'bars': 'bar',
      'restaurants': 'restaurant',
      'hotels': 'hotel',
      'eventservices': 'event_space',
      'venues': 'event_space',
      'gyms': 'fitness_center',
      'museums': 'museum',
      'galleries': 'gallery',
      'theaters': 'theater',
      'libraries': 'library'
    }

    return venueTypeMap[primaryCategory] || 'other'
  }

  private mapYelpPriceToLevel(price?: string): number {
    if (!price) return 0
    return price.length // $, $$, $$$, $$$$ maps to 1, 2, 3, 4
  }

  private formatAddress(location: YelpBusiness['location']): string {
    return location.display_address.join(', ')
  }

  private formatYelpEventAddress(location: YelpEvent['location']): string {
    return location.display_address.join(', ')
  }

  /**
   * Get autocomplete suggestions for location
   */
  async getLocationSuggestions(text: string): Promise<ApiResponse<any[]>> {
    const url = this.buildUrl('/autocomplete', {
      text: text,
      latitude: 40.7128, // Default to NYC
      longitude: -74.0060
    })

    return this.makeRetryableRequest(async () => {
      const response = await this.makeRequest<{
        terms: Array<{ text: string }>
        businesses: YelpBusiness[]
        categories: Array<{ alias: string; title: string }>
      }>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return {
        ...response,
        data: [
          ...response.data.terms.map(term => ({ type: 'term', ...term })),
          ...response.data.businesses.map(business => ({ type: 'business', ...business })),
          ...response.data.categories.map(category => ({ type: 'category', ...category }))
        ]
      }
    })
  }
}