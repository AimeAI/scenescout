// Database types
export interface Event {
  id: string
  title: string
  description: string
  venue_id: string
  venue_name?: string
  city_id: string
  city_name?: string
  category: string
  date: string
  event_date?: string // Alternative date field for compatibility
  time?: string
  end_time?: string
  price?: number
  price_min?: number
  price_max?: number
  currency?: string
  image_url?: string
  video_url?: string
  website_url?: string
  ticket_url?: string
  tags?: string[]
  is_featured: boolean
  is_free?: boolean
  is_approved: boolean
  status?: 'active' | 'cancelled' | 'postponed'
  view_count?: number
  created_at: string
  updated_at: string
  submitted_by: string
  venue?: {
    name: string
    latitude?: number
    longitude?: number
    address?: string
  }
  city?: {
    name: string
    slug: string
  }
}

export interface Venue {
  id: string
  name: string
  description?: string
  type: string
  address: string
  city_id: string
  city_name?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website_url?: string
  capacity?: string
  amenities?: string[]
  operating_hours?: Record<string, { open: string; close: string; closed: boolean }>
  social_links?: Record<string, string>
  images?: string[]
  is_verified: boolean
  rating?: number
  created_at: string
  updated_at: string
  submitted_by: string
}

export interface City {
  id: string
  name: string
  slug: string
  country: string
  description?: string
  image_url?: string
  timezone: string
  is_active: boolean
  stats?: {
    events: number
    venues: number
    followers: number
  }
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  username?: string
  avatar_url?: string
  bio?: string
  location?: string
  subscription_tier: 'free' | 'pro' | 'premium'
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  preferences: {
    email_notifications: boolean
    push_notifications: boolean
    public_profile: boolean
    show_activity: boolean
  }
  stats?: {
    plans_created: number
    events_attended: number
    cities_explored: number
  }
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  title: string
  description: string
  city_id: string
  city_name?: string
  city_slug?: string
  cover_image_url?: string
  is_public: boolean
  is_template: boolean
  status: 'draft' | 'active' | 'completed'
  events: Event[]
  collaborators: UserProfile[]
  tags?: string[]
  notes?: string
  created_by: string
  author?: UserProfile
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan_id: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start: string
  current_period_end: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Form types
export interface EventFormData {
  title: string
  description: string
  category: string
  venue: string
  address: string
  city: string
  date: string
  time?: string
  endTime?: string
  price?: number
  ticketUrl?: string
  website?: string
  contact?: string
  tags?: string
  images?: File[]
}

export interface VenueFormData {
  name: string
  description: string
  type: string
  address: string
  city: string
  neighborhood?: string
  phone?: string
  email?: string
  website?: string
  capacity?: string
  latitude?: number
  longitude?: number
  amenities?: string[]
  operatingHours?: Record<string, { open: string; close: string; closed: boolean }>
  socialLinks?: Record<string, string>
  notes?: string
  images?: File[]
}

export interface PlanFormData {
  title: string
  description: string
  city: string
  isPublic: boolean
  tags?: string[]
  notes?: string
}

// Filter and search types
export interface EventFilters {
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  priceMin?: number
  priceMax?: number
  isFree?: boolean
  query?: string
  sort?: 'date' | 'price' | 'popularity' | 'relevance'
}

export interface SearchFilters {
  query: string
  type: 'events' | 'venues' | 'cities' | 'all'
  filters?: EventFilters
}

// Component prop types
export interface EventCardProps {
  event: Event
  showActions?: boolean
  variant?: 'default' | 'compact'
  onClick?: () => void
}

export interface VenueCardProps {
  venue: Venue
  showEvents?: boolean
  onClick?: () => void
}

export interface CityCardProps {
  city: City
  showStats?: boolean
  onClick?: () => void
}

export interface PlanCardProps {
  plan: Plan
  showActions?: boolean
  onClick?: () => void
}

// Navigation types
export interface NavItem {
  title: string
  href: string
  disabled?: boolean
  external?: boolean
  icon?: React.ComponentType<{ className?: string }>
  label?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// Admin types
export interface AdminStats {
  totalUsers: number
  totalEvents: number
  totalVenues: number
  pendingSubmissions: number
  activeSubscriptions: number
  monthlyRevenue: number
}

export interface Submission {
  id: string
  type: 'event' | 'venue'
  title: string
  status: 'pending' | 'approved' | 'rejected'
  priority: 'low' | 'normal' | 'high'
  submitted_by: UserProfile
  submitted_at: string
  reviewed_by?: string
  reviewed_at?: string
  moderator_notes?: string
  data: EventFormData | VenueFormData
}

export interface Promotion {
  id: string
  title: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  budget: number
  spent: number
  target_cities: string[]
  event_types: string[]
  start_date: string
  end_date: string
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cvr: number
  }
  created_at: string
  updated_at: string
}

// Notification types
export interface Notification {
  id: string
  user_id: string
  type: 'event' | 'plan' | 'system' | 'promotion'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
}

// Error types
export interface AppError {
  message: string
  status?: number
  code?: string
  details?: any
}

// Utility types
export type SortDirection = 'asc' | 'desc'
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
export type Theme = 'light' | 'dark' | 'system'

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sort_by?: string
  sort_direction?: SortDirection
}

// Component state types
export interface FormState<T> {
  data: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isDirty: boolean
}

export interface ListState<T> {
  items: T[]
  loading: boolean
  error: string | null
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Auth types
export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
  confirmPassword: string
}

// Map types (for future map integration)
export interface MapLocation {
  lat: number
  lng: number
  title: string
  type: 'event' | 'venue'
  id: string
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

// Analytics types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: string
}

export interface PageView {
  path: string
  title: string
  user_id?: string
  session_id: string
  timestamp: string
}

// Image types
export interface ImageUpload {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  url?: string
  error?: string
}

// Feature flags
export interface FeatureFlags {
  newDashboard: boolean
  mapIntegration: boolean
  socialFeatures: boolean
  premiumFeatures: boolean
}

// WebSocket types
export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
}

export interface RealTimeUpdate {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, any>
  old?: Record<string, any>
}

// Export commonly used type unions
export type EventStatus = Event['is_approved']
export type SubscriptionTier = UserProfile['subscription_tier']
export type SubscriptionStatus = UserProfile['subscription_status']
export type PlanStatus = Plan['status']
export type VenueType = string
export type EventCategory = 'music' | 'sports' | 'arts' | 'food' | 'tech' | 'social' | 'business' | 'education' | 'health' | 'family' | 'other'

// Netflix-style streaming interface types
export interface CategoryRow {
  id: string
  title: string
  category: EventCategory
  events: Event[]
  loading?: boolean
  hasMore?: boolean
}

export interface FeaturedEvent extends Event {
  featured_video_url?: string
  featured_description?: string
  banner_image_url?: string
  hotness_score: number
}

export interface VideoEvent extends Event {
  video_url: string
  video_thumbnail_url: string
  video_duration?: number
  auto_play?: boolean
}

export interface EventHoverInfo {
  event: Event
  isVisible: boolean
  position: { x: number; y: number }
  delay?: number
}

// Sidebar types
export interface SidebarState {
  isOpen: boolean
  isMinimized: boolean
  activeItem?: string
}

export interface SidebarItem {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
  isActive?: boolean
  children?: SidebarItem[]
}

// Map marker types
export interface MapMarker {
  id: string
  eventId: string
  latitude: number
  longitude: number
  category: EventCategory
  title: string
  date: string
  venue: string
  price?: string
  priceRange?: { min?: number; max?: number }
  imageUrl?: string
  videoUrl?: string
  size: 'small' | 'medium' | 'large'
  clusterId?: string
}

export interface MapCluster {
  id: string
  latitude: number
  longitude: number
  count: number
  categories: EventCategory[]
  bounds: MapBounds
}

export interface MapFilter {
  categories: EventCategory[]
  dateRange: { start: Date; end: Date }
  priceRange: { min: number; max: number }
  isFree: boolean
  showVideoOnly: boolean
}

// Enhanced event filters for Netflix-style browsing
export interface NetflixFilters extends EventFilters {
  featured?: boolean
  hasVideo?: boolean
  trending?: boolean
  nearbyOnly?: boolean
  savedEvents?: boolean
  categories?: EventCategory[]
  minHotnessScore?: number
  virtualEvents?: boolean
}

// Infinite scroll types
export interface InfiniteScrollState<T> {
  items: T[]
  loading: boolean
  error: string | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  totalItems?: number
  currentPage: number
}

export interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan: number
  threshold: number
}

// Video player types
export interface VideoPlayerState {
  isPlaying: boolean
  isMuted: boolean
  currentTime: number
  duration: number
  volume: number
  isFullscreen: boolean
  quality: 'auto' | '480p' | '720p' | '1080p'
  playbackRate: number
}

// Event interaction types
export interface EventInteraction {
  eventId: string
  type: 'view' | 'hover' | 'click' | 'share' | 'bookmark' | 'play_video'
  timestamp: Date
  duration?: number
  metadata?: Record<string, any>
}

// Layout types for responsive design
export interface LayoutConfig {
  sidebar: {
    width: number
    collapsedWidth: number
    breakpoint: number
  }
  carousel: {
    itemWidth: number
    itemHeight: number
    itemsPerRow: { mobile: number; tablet: number; desktop: number }
    gap: number
  }
  map: {
    defaultZoom: number
    maxZoom: number
    minZoom: number
    clusterRadius: number
  }
}

// Search and discovery types
export interface SearchSuggestion {
  id: string
  text: string
  type: 'event' | 'venue' | 'city' | 'category'
  count?: number
  imageUrl?: string
}

export interface TrendingData {
  events: Event[]
  categories: { category: EventCategory; count: number }[]
  cities: { city: City; eventCount: number }[]
  searches: string[]
  refreshedAt: Date
}

// Performance monitoring types
export interface PerformanceMetrics {
  pageLoadTime: number
  apiResponseTime: number
  imageLoadTime: number
  videoLoadTime?: number
  interactionDelay: number
  scrollPerformance: number
}

// Accessibility types
export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  focusVisible: boolean
  screenReaderOptimized: boolean
}

// Error boundary types
export interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
  eventId?: string
}

export interface ErrorState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retry?: () => void
}