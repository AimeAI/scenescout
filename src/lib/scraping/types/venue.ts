export interface VenueEvent {
  id: string;
  title: string;
  description?: string;
  venue: VenueInfo;
  date: Date;
  endDate?: Date;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  ticketInfo?: TicketInfo;
  priceRange?: PriceRange;
  categories: string[];
  performers?: Performer[];
  image?: string;
  url?: string;
  metadata: Record<string, any>;
}

export interface VenueInfo {
  id: string;
  name: string;
  type: VenueType;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  capacity?: number;
  amenities?: string[];
  parentChain?: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Date;
  exceptions?: Date[];
}

export interface TicketInfo {
  saleStartDate?: Date;
  saleEndDate?: Date;
  url?: string;
  platform?: string;
  soldOut?: boolean;
  presaleInfo?: PresaleInfo;
}

export interface PresaleInfo {
  startDate?: Date;
  endDate?: Date;
  code?: string;
  description?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
  fees?: number;
  description?: string;
}

export interface Performer {
  name: string;
  type: 'band' | 'artist' | 'speaker' | 'comedian' | 'dancer' | 'other';
  genre?: string;
  website?: string;
  image?: string;
}

export type VenueType = 
  | 'concert_hall'
  | 'theater'
  | 'performing_arts_center'
  | 'sports_arena'
  | 'stadium'
  | 'club'
  | 'bar'
  | 'university'
  | 'cultural_center'
  | 'outdoor_venue'
  | 'festival_ground'
  | 'conference_center';

export interface VenueConfiguration {
  id: string;
  name: string;
  type: VenueType;
  baseUrl: string;
  locations: VenueLocation[];
  scrapeConfig: ScrapeConfiguration;
  fallbacks: FallbackConfiguration[];
  enabled: boolean;
  priority: number;
}

export interface VenueLocation {
  id: string;
  city: string;
  state: string;
  country: string;
  url: string;
  customConfig?: Partial<ScrapeConfiguration>;
}

export interface ScrapeConfiguration {
  listingSelectors: ListingSelectors;
  eventSelectors: EventSelectors;
  pagination?: PaginationConfig;
  filters?: FilterConfig;
  rateLimit: RateLimitConfig;
  headers?: Record<string, string>;
  authentication?: AuthConfig;
  javascript?: boolean;
  proxy?: ProxyConfig;
}

export interface ListingSelectors {
  container: string;
  eventItem: string;
  nextPage?: string;
  totalPages?: string;
  hasMoreEvents?: string;
}

export interface EventSelectors {
  title: string | string[];
  date: string | string[];
  time?: string | string[];
  description?: string | string[];
  price?: string | string[];
  ticketUrl?: string | string[];
  image?: string | string[];
  venue?: string | string[];
  performers?: string | string[];
  category?: string | string[];
  status?: string | string[];
}

export interface PaginationConfig {
  type: 'button' | 'url' | 'infinite_scroll';
  selector?: string;
  urlPattern?: string;
  maxPages?: number;
  scrollDelay?: number;
}

export interface FilterConfig {
  dateRange?: {
    startParam: string;
    endParam: string;
    format: string;
  };
  category?: {
    param: string;
    values: Record<string, string>;
  };
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'session';
  credentials?: Record<string, string>;
  loginUrl?: string;
  loginFlow?: LoginStep[];
}

export interface LoginStep {
  action: 'navigate' | 'fill' | 'click' | 'wait';
  selector?: string;
  value?: string;
  timeout?: number;
}

export interface ProxyConfig {
  enabled: boolean;
  rotation: boolean;
  pool?: string[];
}

export interface FallbackConfiguration {
  id: string;
  description: string;
  triggers: FallbackTrigger[];
  action: FallbackAction;
}

export interface FallbackTrigger {
  type: 'selector_missing' | 'rate_limited' | 'blocked' | 'empty_results' | 'error';
  condition: string;
}

export interface FallbackAction {
  type: 'alternative_selectors' | 'different_url' | 'wait_and_retry' | 'skip' | 'notify';
  config: Record<string, any>;
}

export interface ScrapingResult {
  success: boolean;
  events: VenueEvent[];
  errors: ScrapingError[];
  metadata: ScrapingMetadata;
}

export interface ScrapingError {
  type: 'network' | 'parsing' | 'rate_limit' | 'authentication' | 'unknown';
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface ScrapingMetadata {
  venueId: string;
  scrapedAt: Date;
  totalFound: number;
  totalProcessed: number;
  processingTime: number;
  fallbacksUsed: string[];
  dataQuality: number;
}

export interface ChainConfiguration {
  id: string;
  name: string;
  venueIds: string[];
  sharedConfig: Partial<ScrapeConfiguration>;
  urlPattern?: string;
  locationDiscovery?: LocationDiscoveryConfig;
}

export interface LocationDiscoveryConfig {
  enabled: boolean;
  seedUrls: string[];
  locationSelector: string;
  urlExtractor: string;
  filters?: string[];
}