/**
 * Core scraping types and interfaces for SceneScout
 * Provides a unified interface for all scrapers and data sources
 */

import { Database } from '../../../supabase/functions/_shared/types'

// Base scraper configuration
export interface ScraperConfig {
  name: string
  enabled: boolean
  rateLimit: {
    requestsPerMinute: number
    burstLimit: number
    delayBetweenRequests: number
  }
  timeout: {
    navigationTimeout: number
    actionTimeout: number
    waitTimeout: number
  }
  retry: {
    maxRetries: number
    baseDelay: number
    maxDelay: number
    backoffMultiplier: number
  }
  browser: {
    headless: boolean
    viewport: { width: number; height: number }
    userAgent: string | null // null for rotation
    locale: string
    timezone: string
  }
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  respectRobotsTxt: boolean
  useStealthMode: boolean
}

// Scraping target configuration
export interface ScrapeTarget {
  id: string
  name: string
  baseUrl: string
  source: ScrapeSource
  selectors: SelectorMap
  pagination?: PaginationConfig
  authentication?: AuthConfig
  customHeaders?: Record<string, string>
  cookieConsent?: CookieConsentConfig
  antiBot?: AntiBotConfig
}

// Supported scraping sources
export type ScrapeSource = 
  | 'eventbrite'
  | 'facebook_events'
  | 'meetup'
  | 'venue_direct'
  | 'ticketmaster'
  | 'songkick'
  | 'bandsintown'
  | 'dice'
  | 'resident_advisor'

// CSS/XPath selectors for different elements
export interface SelectorMap {
  events: {
    container: string
    eventCard: string
    title: string
    description?: string
    date: string
    time?: string
    venue: string
    price?: string
    image?: string
    link: string
    category?: string
    tags?: string
  }
  pagination?: {
    nextButton: string
    loadMoreButton?: string
    pageNumbers?: string
    hasMore?: string
  }
  navigation?: {
    searchForm?: string
    searchInput?: string
    categoryFilter?: string
    dateFilter?: string
    locationFilter?: string
  }
  venue?: {
    name: string
    address: string
    phone?: string
    website?: string
    description?: string
    amenities?: string
    capacity?: string
    images?: string
  }
}

// Pagination configuration
export interface PaginationConfig {
  type: 'button' | 'infinite_scroll' | 'url_params' | 'api_cursor'
  selector?: string
  maxPages: number
  scrollDelay?: number
  paramName?: string
  initialPage?: number
}

// Authentication configuration
export interface AuthConfig {
  type: 'none' | 'basic' | 'form' | 'oauth' | 'api_key'
  credentials?: {
    username?: string
    password?: string
    apiKey?: string
    token?: string
  }
  loginUrl?: string
  loginSelectors?: {
    usernameField: string
    passwordField: string
    submitButton: string
  }
}

// Cookie consent handling
export interface CookieConsentConfig {
  selector: string
  action: 'click' | 'dismiss' | 'accept_all'
  waitTime: number
}

// Anti-bot detection and evasion
export interface AntiBotConfig {
  detectCaptcha: boolean
  captchaSelectors: string[]
  cloudflareDetection: boolean
  rateLimitDetection: boolean
  jsDetection: boolean
  behaviorSimulation: {
    mouseMovement: boolean
    scrolling: boolean
    typing: boolean
    randomDelays: boolean
  }
}

// Raw scraped data before normalization
export interface RawScrapedData {
  source: ScrapeSource
  sourceUrl: string
  scrapeId: string
  scrapedAt: Date
  events: RawEventData[]
  venues: RawVenueData[]
  errors: ScrapingError[]
  metadata: {
    totalFound: number
    totalProcessed: number
    pagesScrapped: number
    timeTaken: number
    userAgent: string
  }
}

// Raw event data structure
export interface RawEventData {
  externalId: string
  title: string
  description?: string
  dateTime: {
    start: string
    end?: string
    timezone?: string
    allDay?: boolean
  }
  venue: RawVenueData | {
    name: string
    address?: string
    city?: string
    coordinates?: { lat: number; lng: number }
  }
  organizer?: {
    name: string
    description?: string
    website?: string
    social?: Record<string, string>
  }
  pricing: {
    isFree: boolean
    minPrice?: number
    maxPrice?: number
    currency: string
    ticketUrl?: string
  }
  media: {
    images: string[]
    videos?: string[]
  }
  categories: string[]
  tags: string[]
  status: 'active' | 'cancelled' | 'postponed' | 'sold_out'
  capacity?: number
  ageRestriction?: string
  urls: {
    event: string
    tickets?: string
    organizer?: string
    venue?: string
  }
  socialMetrics?: {
    attending?: number
    interested?: number
    views?: number
    shares?: number
  }
  rawHtml?: string
  customFields?: Record<string, any>
}

// Raw venue data structure
export interface RawVenueData {
  externalId: string
  name: string
  description?: string
  address: {
    street?: string
    city: string
    state?: string
    country: string
    postalCode?: string
    coordinates?: { lat: number; lng: number }
  }
  contact: {
    phone?: string
    email?: string
    website?: string
  }
  details: {
    capacity?: number
    venueType: string
    amenities: string[]
    accessibilityFeatures: string[]
    parkingInfo?: string
  }
  media: {
    images: string[]
    logo?: string
  }
  social?: Record<string, string>
  operatingHours?: Record<string, { open: string; close: string; closed: boolean }>
  rating?: {
    score: number
    reviewCount: number
    source: string
  }
}

// Normalized data structures (matching database schema)
export type NormalizedEvent = Database['public']['Tables']['events']['Insert']
export type NormalizedVenue = Database['public']['Tables']['venues']['Insert']
export type NormalizedOrganizer = Database['public']['Tables']['organizers']['Insert']

// Data normalization configuration
export interface NormalizationConfig {
  categoryMapping: Record<string, string>
  venueTypeMapping: Record<string, string>
  currencyMapping: Record<string, string>
  timezoneMapping: Record<string, string>
  imageProcessing: {
    downloadImages: boolean
    generateThumbnails: boolean
    maxImageSize: number
    allowedFormats: string[]
  }
  validation: {
    requireVenue: boolean
    requireDate: boolean
    requireTitle: boolean
    minDescriptionLength: number
    maxTitleLength: number
  }
  deduplication: {
    enabled: boolean
    strategy: 'exact' | 'fuzzy' | 'semantic'
    threshold: number
    fields: string[]
  }
}

// Scraping job configuration
export interface ScrapeJobConfig {
  id: string
  name: string
  targets: ScrapeTarget[]
  schedule?: {
    frequency: 'once' | 'hourly' | 'daily' | 'weekly'
    cron?: string
    timezone: string
  }
  filters: {
    location?: {
      city?: string
      state?: string
      country?: string
      radius?: number
      coordinates?: { lat: number; lng: number }
    }
    dateRange?: {
      start: Date
      end: Date
    }
    categories?: string[]
    keywords?: string[]
    excludeKeywords?: string[]
  }
  output: {
    format: 'database' | 'json' | 'csv'
    destination?: string
    webhook?: string
  }
  notifications: {
    onSuccess: boolean
    onError: boolean
    onCompletion: boolean
    channels: ('email' | 'slack' | 'webhook')[]
    recipients: string[]
  }
}

// Error types and handling
export interface ScrapingError {
  type: 'network' | 'parsing' | 'validation' | 'rate_limit' | 'blocked' | 'timeout' | 'captcha' | 'auth'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: any
  url?: string
  selector?: string
  timestamp: Date
  retryable: boolean
  retryCount: number
}

// Scraping session state
export interface ScrapingSession {
  id: string
  jobId: string
  target: ScrapeTarget
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: {
    currentPage: number
    totalPages?: number
    eventsFound: number
    eventsProcessed: number
    errorsCount: number
  }
  startTime: Date
  endTime?: Date
  result?: RawScrapedData
  errors: ScrapingError[]
  metrics: {
    requestCount: number
    successRate: number
    avgResponseTime: number
    dataTransferred: number
  }
}

// Rate limiting state
export interface RateLimitState {
  requestCount: number
  windowStart: Date
  isLimited: boolean
  resetTime?: Date
  remainingRequests: number
}

// Browser session management
export interface BrowserSession {
  id: string
  browserId: string
  contextId: string
  pageId: string
  isActive: boolean
  createdAt: Date
  lastUsed: Date
  userAgent: string
  viewport: { width: number; height: number }
  cookies: any[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

// Monitoring and analytics
export interface ScrapingMetrics {
  sessionId: string
  target: string
  startTime: Date
  endTime?: Date
  status: ScrapingSession['status']
  eventsScraped: number
  venuesScraped: number
  errorsCount: number
  avgResponseTime: number
  successRate: number
  dataQualityScore: number
  blockedAttempts: number
  rateLimitHits: number
  captchaEncounters: number
}

// Data quality assessment
export interface DataQualityReport {
  sessionId: string
  totalRecords: number
  validRecords: number
  invalidRecords: number
  missingFields: Record<string, number>
  duplicates: number
  qualityScore: number
  issues: Array<{
    type: 'missing_field' | 'invalid_format' | 'duplicate' | 'suspicious'
    field?: string
    count: number
    samples: any[]
  }>
  recommendations: string[]
}

// Export configuration for external systems
export interface ExportConfig {
  format: 'json' | 'csv' | 'xml' | 'sql'
  fields: string[]
  transforms: Record<string, string>
  destination: {
    type: 'file' | 'database' | 's3' | 'webhook'
    config: Record<string, any>
  }
  scheduling: {
    immediate: boolean
    batchSize?: number
    interval?: number
  }
}

// Webhook configuration for real-time updates
export interface WebhookConfig {
  url: string
  secret?: string
  events: ('scrape_started' | 'scrape_completed' | 'data_found' | 'error_occurred')[]
  retries: number
  timeout: number
  headers?: Record<string, string>
}

// Health check and monitoring
export interface HealthCheck {
  timestamp: Date
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    browser: boolean
    network: boolean
    database: boolean
    storage: boolean
  }
  metrics: {
    activeSessions: number
    queueLength: number
    errorRate: number
    avgResponseTime: number
  }
  issues: string[]
}