import { ApiClient, ApiResponse, BaseEvent, BaseVenue } from './base-client';
import { apiConfig } from './types';

/**
 * Ticketmaster API Client
 * Handles authentication and API calls to Ticketmaster Discovery API
 */

interface TicketmasterConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
}

interface TicketmasterImage {
  ratio: string;
  url: string;
  width: number;
  height: number;
  fallback: boolean;
}

interface TicketmasterVenue {
  id: string;
  name: string;
  type: string;
  url?: string;
  locale: string;
  timezone: string;
  city: {
    name: string;
  };
  state: {
    name: string;
    stateCode: string;
  };
  country: {
    name: string;
    countryCode: string;
  };
  address: {
    line1: string;
  };
  location: {
    longitude: string;
    latitude: string;
  };
  postalCode?: string;
  images?: TicketmasterImage[];
  boxOfficeInfo?: {
    phoneNumberDetail: string;
    openHoursDetail: string;
    acceptedPaymentDetail: string;
    willCallDetail: string;
  };
  parkingDetail?: string;
  accessibleSeatingDetail?: string;
  generalInfo?: {
    generalRule: string;
    childRule: string;
  };
  upcomingEvents?: {
    ticketmaster?: number;
    _total: number;
    _filtered: number;
  };
}

interface TicketmasterAttraction {
  id: string;
  name: string;
  type: string;
  url?: string;
  locale: string;
  images?: TicketmasterImage[];
  externalLinks?: {
    youtube?: Array<{ url: string }>;
    twitter?: Array<{ url: string }>;
    facebook?: Array<{ url: string }>;
    spotify?: Array<{ url: string }>;
    homepage?: Array<{ url: string }>;
  };
  classifications?: Array<{
    primary: boolean;
    segment: { id: string; name: string };
    genre: { id: string; name: string };
    subGenre: { id: string; name: string };
    type: { id: string; name: string };
    subType: { id: string; name: string };
    family: boolean;
  }>;
}

interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: TicketmasterImage[];
  sales: {
    public: {
      startDateTime: string;
      startTBD: boolean;
      startTBA: boolean;
      endDateTime: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    timezone: string;
    status: {
      code: string;
    };
    spanMultipleDays: boolean;
  };
  classifications: Array<{
    primary: boolean;
    segment: { id: string; name: string };
    genre: { id: string; name: string };
    subGenre: { id: string; name: string };
  }>;
  promoter?: {
    id: string;
    name: string;
    description: string;
  };
  info?: string;
  pleaseNote?: string;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  ageRestrictions?: {
    legalAgeEnforced: boolean;
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
}

interface TicketmasterEventsResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  _links: {
    first?: { href: string };
    self: { href: string };
    next?: { href: string };
    last?: { href: string };
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

interface EventSearchParams {
  keyword?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  unit?: 'miles' | 'km';
  source?: string;
  locale?: string;
  marketId?: string;
  startDateTime?: string;
  endDateTime?: string;
  includeTBA?: boolean;
  includeTBD?: boolean;
  includeTest?: boolean;
  size?: number;
  page?: number;
  sort?: string;
  classificationName?: string;
  classificationId?: string;
  dmaId?: string;
  onsaleStartDateTime?: string;
  onsaleEndDateTime?: string;
  segmentId?: string;
  segmentName?: string;
  genreId?: string;
  genreName?: string;
  subGenreId?: string;
  subGenreName?: string;
  typeId?: string;
  typeName?: string;
  subTypeId?: string;
  subTypeName?: string;
  geoPoint?: string;
  preferredCountry?: string;
  includeSpellcheck?: boolean;
}

interface VenueSearchParams {
  keyword?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  unit?: 'miles' | 'km';
  source?: string;
  locale?: string;
  size?: number;
  page?: number;
  sort?: string;
  geoPoint?: string;
  preferredCountry?: string;
  includeSpellcheck?: boolean;
}

interface AttractionSearchParams {
  keyword?: string;
  locale?: string;
  size?: number;
  page?: number;
  sort?: string;
  classificationName?: string;
  classificationId?: string;
  includeSpellcheck?: boolean;
}

class TicketmasterApiClient extends ApiClient {
  private config: TicketmasterConfig;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(apiKey: string) {
    const config: TicketmasterConfig = {
      apiKey,
      baseURL: 'https://app.ticketmaster.com/discovery/v2',
      timeout: 30000,
      rateLimit: {
        requestsPerSecond: 5, // Conservative rate limit
        requestsPerDay: 5000  // Daily limit
      }
    };

    super(config.baseURL, {
      timeout: config.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    this.config = config;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset daily counter if it's a new day
    if (now - this.lastResetTime > 24 * 60 * 60 * 1000) {
      this.dailyRequestCount = 0;
      this.lastResetTime = now;
    }

    // Check daily limit
    if (this.dailyRequestCount >= this.config.rateLimit.requestsPerDay) {
      throw new Error('Daily API request limit exceeded');
    }

    // Enforce rate limit (requests per second)
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
    this.dailyRequestCount++;
  }

  private buildParams(params: Record<string, any>): URLSearchParams {
    const searchParams = new URLSearchParams();
    searchParams.set('apikey', this.config.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });

    return searchParams;
  }

  /**
   * Search for events
   */
  async searchEvents(params: EventSearchParams = {}): Promise<ApiResponse<TicketmasterEventsResponse>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({
      ...params,
      size: params.size || 20,
      sort: params.sort || 'date,asc'
    });

    return this.get<TicketmasterEventsResponse>(`/events.json?${searchParams.toString()}`);
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string, locale: string = 'en'): Promise<ApiResponse<TicketmasterEvent>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({ locale });
    return this.get<TicketmasterEvent>(`/events/${eventId}.json?${searchParams.toString()}`);
  }

  /**
   * Search for venues
   */
  async searchVenues(params: VenueSearchParams = {}): Promise<ApiResponse<any>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({
      ...params,
      size: params.size || 20
    });

    return this.get<any>(`/venues.json?${searchParams.toString()}`);
  }

  /**
   * Get venue by ID
   */
  async getVenue(venueId: string, locale: string = 'en'): Promise<ApiResponse<TicketmasterVenue>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({ locale });
    return this.get<TicketmasterVenue>(`/venues/${venueId}.json?${searchParams.toString()}`);
  }

  /**
   * Search for attractions (artists, teams, etc.)
   */
  async searchAttractions(params: AttractionSearchParams = {}): Promise<ApiResponse<any>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({
      ...params,
      size: params.size || 20
    });

    return this.get<any>(`/attractions.json?${searchParams.toString()}`);
  }

  /**
   * Get attraction by ID
   */
  async getAttraction(attractionId: string, locale: string = 'en'): Promise<ApiResponse<TicketmasterAttraction>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({ locale });
    return this.get<TicketmasterAttraction>(`/attractions/${attractionId}.json?${searchParams.toString()}`);
  }

  /**
   * Get classifications (segments, genres, etc.)
   */
  async getClassifications(locale: string = 'en'): Promise<ApiResponse<any>> {
    await this.enforceRateLimit();

    const searchParams = this.buildParams({ locale });
    return this.get<any>(`/classifications.json?${searchParams.toString()}`);
  }

  /**
   * Convert Ticketmaster event to SceneScout format
   */
  convertEventToSceneScout(tmEvent: TicketmasterEvent): BaseEvent {
    const venue = tmEvent._embedded?.venues?.[0];
    const attraction = tmEvent._embedded?.attractions?.[0];

    return {
      id: tmEvent.id,
      title: tmEvent.name,
      description: tmEvent.info || tmEvent.pleaseNote || '',
      startTime: tmEvent.dates.start.dateTime || 
        `${tmEvent.dates.start.localDate}T${tmEvent.dates.start.localTime || '19:00:00'}`,
      endTime: null, // Ticketmaster doesn't provide end times
      timezone: tmEvent.dates.timezone,
      venueId: venue?.id || null,
      category: tmEvent.classifications?.[0]?.segment?.name || 'Entertainment',
      subcategory: tmEvent.classifications?.[0]?.genre?.name || null,
      tags: [
        ...(tmEvent.classifications?.map(c => c.genre?.name).filter(Boolean) || []),
        ...(tmEvent.classifications?.map(c => c.subGenre?.name).filter(Boolean) || [])
      ],
      priceMin: tmEvent.priceRanges?.[0]?.min || null,
      priceMax: tmEvent.priceRanges?.[0]?.max || null,
      priceCurrency: tmEvent.priceRanges?.[0]?.currency || 'USD',
      ticketUrl: tmEvent.url,
      imageUrl: tmEvent.images?.find(img => img.ratio === '16_9')?.url || 
                tmEvent.images?.[0]?.url || null,
      source: 'ticketmaster',
      externalId: tmEvent.id,
      status: tmEvent.dates?.status?.code === 'onsale' ? 'active' : 'inactive',
      ageRestriction: tmEvent.ageRestrictions?.legalAgeEnforced ? '21+' : null,
      lastUpdated: new Date().toISOString(),
      hotnessScore: 0,
      // Additional Ticketmaster-specific data
      sourceData: {
        promoter: tmEvent.promoter,
        attractions: tmEvent._embedded?.attractions,
        sales: tmEvent.sales,
        seatmap: (tmEvent as any).seatmap
      }
    };
  }

  /**
   * Convert Ticketmaster venue to SceneScout format
   */
  convertVenueToSceneScout(tmVenue: TicketmasterVenue): BaseVenue {
    return {
      id: tmVenue.id,
      name: tmVenue.name,
      address: tmVenue.address?.line1 || '',
      city: tmVenue.city?.name || '',
      state: tmVenue.state?.name || '',
      postalCode: tmVenue.postalCode || '',
      country: tmVenue.country?.name || 'United States',
      latitude: parseFloat(tmVenue.location?.latitude || '0'),
      longitude: parseFloat(tmVenue.location?.longitude || '0'),
      phone: tmVenue.boxOfficeInfo?.phoneNumberDetail || null,
      website: tmVenue.url || null,
      timezone: tmVenue.timezone || 'America/Los_Angeles',
      capacity: null,
      venueType: tmVenue.type || 'unknown',
      amenities: [],
      accessibilityFeatures: tmVenue.accessibleSeatingDetail ? [tmVenue.accessibleSeatingDetail] : [],
      parkingInfo: tmVenue.parkingDetail || null,
      source: 'ticketmaster',
      externalId: tmVenue.id,
      lastUpdated: new Date().toISOString(),
      // Additional Ticketmaster-specific data
      sourceData: {
        boxOfficeInfo: tmVenue.boxOfficeInfo,
        generalInfo: tmVenue.generalInfo,
        upcomingEvents: tmVenue.upcomingEvents
      }
    };
  }

  /**
   * Batch search events for multiple cities
   */
  async batchSearchEvents(cities: string[], params: Omit<EventSearchParams, 'city'> = {}): Promise<TicketmasterEvent[]> {
    const allEvents: TicketmasterEvent[] = [];

    for (const city of cities) {
      try {
        const response = await this.searchEvents({ ...params, city });
        if (response.success && response.data._embedded?.events) {
          allEvents.push(...response.data._embedded.events);
        }
        
        // Add delay between city searches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching events for ${city}:`, error);
        continue;
      }
    }

    return allEvents;
  }

  /**
   * Get request statistics
   */
  getRequestStats() {
    return {
      totalRequests: this.requestCount,
      dailyRequests: this.dailyRequestCount,
      lastRequestTime: this.lastRequestTime,
      dailyLimitRemaining: this.config.rateLimit.requestsPerDay - this.dailyRequestCount
    };
  }
}

// Factory function to create Ticketmaster client
export function createTicketmasterClient(): TicketmasterApiClient {
  const apiKey = process.env.TICKETMASTER_API_KEY || process.env.TICKETMASTER_CONSUMER_KEY;
  
  if (!apiKey) {
    throw new Error('Ticketmaster API key not found in environment variables');
  }

  return new TicketmasterApiClient(apiKey);
}

export { TicketmasterApiClient };
export type {
  TicketmasterEvent,
  TicketmasterVenue,
  TicketmasterAttraction,
  TicketmasterEventsResponse,
  EventSearchParams,
  VenueSearchParams,
  AttractionSearchParams,
  TicketmasterConfig
};