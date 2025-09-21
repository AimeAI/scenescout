// API Integration Types for SceneScout
// Unified types for external API integrations

export class ApiError extends Error {
  public status?: number
  public isRetryable: boolean
  public details?: any
  
  constructor(
    message: string,
    status?: number,
    isRetryable: boolean = false,
    details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isRetryable = isRetryable
    this.details = details
  }
}

export interface ApiConfig {
  apiKey: string
  baseUrl: string
  rateLimit: {
    requests: number
    windowMs: number
  }
  timeout: number
  retryOptions: {
    retries: number
    retryDelay: number
  }
}

export interface ApiResponse<T = any> {
  data: T
  pagination?: {
    page: number
    total: number
    hasMore: boolean
    nextCursor?: string | number
  }
  rateLimit?: {
    remaining: number
    reset: number
  }
}

// ApiError is defined as a class above, removing duplicate interface

// Common event interface that all APIs normalize to
export interface RawEvent {
  id: string
  external_id: string
  source: 'eventbrite' | 'yelp' | 'google' | 'facebook'
  title: string
  description?: string
  start_time: string
  end_time?: string
  timezone?: string
  venue?: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
    city?: string
    state?: string
    country?: string
  }
  organizer?: {
    name: string
    description?: string
  }
  category: string
  subcategory?: string
  tags?: string[]
  price?: {
    min?: number
    max?: number
    currency: string
    is_free: boolean
  }
  images?: string[]
  url?: string
  ticket_url?: string
  capacity?: number
  age_restriction?: number
  status: 'active' | 'cancelled' | 'postponed'
  created_at: string
  updated_at: string
}

// Eventbrite specific types
export interface EventbriteEvent {
  id: string
  name: {
    text: string
    html: string
  }
  description: {
    text?: string
    html?: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  venue_id?: string
  venue?: EventbriteVenue
  organizer_id: string
  organizer?: EventbriteOrganizer
  category_id?: string
  subcategory_id?: string
  format_id?: string
  ticket_classes?: EventbriteTicketClass[]
  is_free: boolean
  status: string
  capacity?: number
  age_restriction?: string
  logo?: {
    url: string
    crop_mask?: any
    original?: {
      url: string
      width: number
      height: number
    }
  }
  url: string
  created: string
  changed: string
}

export interface EventbriteVenue {
  id: string
  name: string
  address: {
    address_1?: string
    address_2?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
    latitude?: string
    longitude?: string
    localized_address_display?: string
  }
}

export interface EventbriteOrganizer {
  id: string
  name: string
  description?: {
    text?: string
    html?: string
  }
  url?: string
  logo?: {
    url: string
  }
}

export interface EventbriteTicketClass {
  id: string
  name: string
  description?: string
  cost: {
    currency: string
    value: number
    major_value: string
  }
  minimum_quantity: number
  maximum_quantity?: number
  capacity?: number
  quantity_total: number
  quantity_sold: number
  sales_start?: string
  sales_end?: string
  free: boolean
}

export interface EventbriteCategory {
  id: string
  resource_uri: string
  name: string
  name_localized: string
  short_name: string
  short_name_localized: string
}

// Yelp specific types
export interface YelpEvent {
  id: string
  name: string
  description?: string
  event_site_url?: string
  image_url?: string
  tickets_url?: string
  is_free?: boolean
  cost?: number
  cost_max?: number
  time_start?: string
  time_end?: string
  is_canceled?: boolean
  location: {
    display_address: string[]
    address1?: string
    address2?: string
    address3?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    cross_streets?: string
  }
  latitude?: number
  longitude?: number
  category?: string
  attending_count?: number
  interested_count?: number
  business_id?: string
}

export interface YelpBusiness {
  id: string
  alias: string
  name: string
  image_url?: string
  is_closed: boolean
  url: string
  review_count: number
  categories: Array<{
    alias: string
    title: string
  }>
  rating: number
  coordinates: {
    latitude: number
    longitude: number
  }
  transactions: string[]
  price?: string
  location: {
    address1?: string
    address2?: string
    address3?: string
    city?: string
    zip_code?: string
    country?: string
    state?: string
    display_address: string[]
    cross_streets?: string
  }
  phone: string
  display_phone: string
  distance?: number
}

// Google Places specific types
export interface GooglePlacesEvent {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    viewport?: {
      northeast: { lat: number; lng: number }
      southwest: { lat: number; lng: number }
    }
  }
  opening_hours?: {
    open_now: boolean
    periods?: Array<{
      close: { day: number; time: string }
      open: { day: number; time: string }
    }>
    weekday_text?: string[]
  }
  price_level?: number
  rating?: number
  types: string[]
  user_ratings_total?: number
  photos?: Array<{
    height: number
    html_attributions: string[]
    photo_reference: string
    width: number
  }>
  website?: string
  international_phone_number?: string
  url?: string
  events?: Array<{
    event_id: string
    summary: string
    description?: string
    start_time: string
    end_time?: string
    event_site_url?: string
  }>
}

// Facebook Graph API specific types
export interface FacebookEvent {
  id: string
  name: string
  description?: string
  start_time: string
  end_time?: string
  timezone?: string
  place?: {
    id: string
    name: string
    location?: {
      city?: string
      country?: string
      latitude?: number
      longitude?: number
      state?: string
      street?: string
      zip?: string
    }
  }
  cover?: {
    source: string
    id: string
  }
  category: string
  subcategory?: string
  ticket_uri?: string
  is_canceled?: boolean
  is_online?: boolean
  online_event_format?: string
  online_event_third_party_url?: string
  updated_time: string
  event_times?: Array<{
    id: string
    start_time: string
    end_time?: string
  }>
  owner?: {
    id: string
    name: string
  }
  attending_count?: number
  interested_count?: number
  maybe_count?: number
  noreply_count?: number
}

// Rate limiting and retry types
export interface RateLimitState {
  requests: number
  resetTime: number
  isLimited: boolean
}

export interface RetryableRequest<T> {
  attempt: number
  maxAttempts: number
  lastError?: Error
  execute: () => Promise<T>
}

// API client configuration
export interface EventbriteConfig extends ApiConfig {
  organizationId?: string
  webhookSigningKey?: string
}

export interface YelpConfig extends ApiConfig {
  // Yelp specific config options
}

export interface GoogleConfig extends ApiConfig {
  // Google specific config options  
}

export interface FacebookConfig extends ApiConfig {
  appId: string
  appSecret: string
  accessToken: string
}

// Location and search types
export interface LocationBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface SearchParams {
  query?: string
  location?: {
    latitude: number
    longitude: number
    radius?: number // in km
    address?: string
    city?: string
  }
  dateRange?: {
    start: string
    end: string
  }
  categories?: string[]
  priceRange?: {
    min?: number
    max?: number
  }
  limit?: number
  offset?: number
  sort?: 'date' | 'popularity' | 'distance' | 'price'
}

// Venue types for all APIs
export interface RawVenue {
  id: string
  external_id: string
  source: 'eventbrite' | 'yelp' | 'google' | 'facebook'
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  email?: string
  capacity?: number
  venue_type?: string
  images?: string[]
  rating?: number
  review_count?: number
  price_level?: number
  amenities?: string[]
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
  }
  created_at: string
  updated_at: string
}

// Organizer types
export interface RawOrganizer {
  id: string
  external_id: string
  source: 'eventbrite' | 'yelp' | 'google' | 'facebook'
  name: string
  description?: string
  website?: string
  email?: string
  phone?: string
  logo_url?: string
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
  }
  created_at: string
  updated_at: string
}

// Ingestion job types
export interface IngestionJob {
  id: string
  source: 'eventbrite' | 'yelp' | 'google' | 'facebook'
  status: 'pending' | 'running' | 'completed' | 'failed'
  searchParams: SearchParams
  startedAt?: string
  completedAt?: string
  results?: {
    eventsFound: number
    eventsIngested: number
    venuesFound: number
    venuesIngested: number
    organizersFound: number
    organizersIngested: number
    errors: string[]
  }
  error?: string
  nextRunAt?: string
}

// Batch processing types
export interface BatchIngestionParams {
  sources: Array<'eventbrite' | 'yelp' | 'google' | 'facebook'>
  cities: string[]
  categories?: string[]
  maxEventsPerSource?: number
  parallelJobs?: number
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly'
    time?: string // for daily/weekly
  }
}