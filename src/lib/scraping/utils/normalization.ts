/**
 * Data normalization utilities for SceneScout scraping
 * Converts raw scraped data into standardized database format
 */

import { parseISO, isValid, format, addHours } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { 
  RawEventData, 
  RawVenueData, 
  NormalizedEvent, 
  NormalizedVenue, 
  NormalizedOrganizer,
  NormalizationConfig,
  DataQualityReport,
  ScrapeSource
} from '../types'
import { stringUtils, validationUtils } from '../../utils'

/**
 * Default normalization configuration
 */
export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  categoryMapping: {
    // Music
    'music': 'Music',
    'concert': 'Music',
    'live music': 'Music',
    'band': 'Music',
    'dj': 'Music',
    'festival': 'Music',
    'classical': 'Music',
    'jazz': 'Music',
    'rock': 'Music',
    'pop': 'Music',
    'electronic': 'Music',
    
    // Arts & Culture
    'art': 'Arts',
    'theater': 'Arts',
    'theatre': 'Arts',
    'exhibition': 'Arts',
    'gallery': 'Arts',
    'museum': 'Arts',
    'dance': 'Arts',
    'opera': 'Arts',
    'comedy': 'Arts',
    'standup': 'Arts',
    
    // Food & Drink
    'food': 'Food',
    'dining': 'Food',
    'restaurant': 'Food',
    'bar': 'Food',
    'wine': 'Food',
    'beer': 'Food',
    'cocktail': 'Food',
    'tasting': 'Food',
    'culinary': 'Food',
    
    // Sports & Recreation
    'sports': 'Sports',
    'fitness': 'Sports',
    'recreation': 'Sports',
    'outdoor': 'Sports',
    'hiking': 'Sports',
    'cycling': 'Sports',
    'running': 'Sports',
    'yoga': 'Sports',
    
    // Business & Networking
    'business': 'Business',
    'networking': 'Business',
    'conference': 'Business',
    'seminar': 'Business',
    'workshop': 'Business',
    'meetup': 'Business',
    'professional': 'Business',
    
    // Education
    'education': 'Education',
    'learning': 'Education',
    'class': 'Education',
    'course': 'Education',
    'lecture': 'Education',
    'training': 'Education',
    
    // Technology
    'tech': 'Technology',
    'technology': 'Technology',
    'programming': 'Technology',
    'startup': 'Technology',
    'innovation': 'Technology',
    
    // Family & Kids
    'family': 'Family',
    'kids': 'Family',
    'children': 'Family',
    'parenting': 'Family',
    
    // Health & Wellness
    'health': 'Health',
    'wellness': 'Health',
    'medical': 'Health',
    'mental health': 'Health',
    
    // Social & Community
    'social': 'Social',
    'community': 'Social',
    'volunteer': 'Social',
    'charity': 'Social',
    'fundraiser': 'Social'
  },
  
  venueTypeMapping: {
    'concert hall': 'concert_hall',
    'theater': 'theater',
    'club': 'nightclub',
    'bar': 'bar',
    'restaurant': 'restaurant',
    'outdoor': 'outdoor',
    'park': 'park',
    'stadium': 'stadium',
    'arena': 'arena',
    'convention center': 'convention_center',
    'museum': 'museum',
    'gallery': 'gallery',
    'community center': 'community_center',
    'library': 'library',
    'church': 'religious',
    'hotel': 'hotel',
    'private': 'private_venue',
    'online': 'virtual',
    'other': 'other'
  },
  
  currencyMapping: {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'CAD': 'CAD',
    'AUD': 'AUD',
    'USD': 'USD',
    'EUR': 'EUR',
    'GBP': 'GBP'
  },
  
  timezoneMapping: {
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'GMT': 'UTC',
    'UTC': 'UTC',
    'BST': 'Europe/London',
    'CET': 'Europe/Paris',
    'CEST': 'Europe/Paris'
  },
  
  imageProcessing: {
    downloadImages: false, // Set to true for production
    generateThumbnails: false,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
  },
  
  validation: {
    requireVenue: true,
    requireDate: true,
    requireTitle: true,
    minDescriptionLength: 10,
    maxTitleLength: 200
  },
  
  deduplication: {
    enabled: true,
    strategy: 'fuzzy',
    threshold: 0.85,
    fields: ['title', 'venue', 'start_time']
  }
}

/**
 * Main data normalizer class
 */
export class DataNormalizer {
  private config: NormalizationConfig
  
  constructor(config: Partial<NormalizationConfig> = {}) {
    this.config = { ...DEFAULT_NORMALIZATION_CONFIG, ...config }
  }
  
  /**
   * Normalize raw event data to database format
   */
  async normalizeEvent(
    rawEvent: RawEventData, 
    source: ScrapeSource,
    defaultTimezone = 'America/New_York'
  ): Promise<NormalizedEvent | null> {
    try {
      // Validate required fields
      if (!this.validateEventData(rawEvent)) {
        return null
      }
      
      // Normalize title
      const title = this.normalizeTitle(rawEvent.title)
      if (!title) {
        return null
      }
      
      // Normalize description
      const description = this.normalizeDescription(rawEvent.description)
      
      // Normalize dates and times
      const { start_time, end_time, timezone } = this.normalizeDateTimes(
        rawEvent.dateTime,
        defaultTimezone
      )
      
      if (!start_time) {
        return null
      }
      
      // Normalize category
      const category = this.normalizeCategory(rawEvent.categories)
      
      // Normalize pricing
      const { price_min, price_max, price_currency } = this.normalizePricing(rawEvent.pricing)
      
      // Normalize image URL
      const image_url = this.normalizeImageUrl(rawEvent.media.images[0])
      
      // Generate unique ID
      const id = this.generateEventId(rawEvent, source)
      
      const normalizedEvent: NormalizedEvent = {
        id,
        title,
        description,
        start_time,
        end_time,
        timezone,
        venue_id: null, // Will be set after venue normalization
        organizer_id: null, // Will be set after organizer normalization
        category,
        subcategory: this.normalizeSubcategory(rawEvent.categories),
        tags: this.normalizeTags(rawEvent.tags),
        price_min,
        price_max,
        price_currency,
        ticket_url: this.normalizeUrl(rawEvent.urls.tickets || rawEvent.pricing.ticketUrl),
        image_url,
        source,
        external_id: rawEvent.externalId,
        status: this.normalizeEventStatus(rawEvent.status),
        age_restriction: this.normalizeAgeRestriction(rawEvent.ageRestriction),
        capacity: rawEvent.capacity || null,
        hotness_score: 0, // Will be calculated separately
        last_updated: new Date().toISOString()
      }
      
      return normalizedEvent
    } catch (error) {
      console.error('Error normalizing event data:', error)
      return null
    }
  }
  
  /**
   * Normalize raw venue data to database format
   */
  async normalizeVenue(
    rawVenue: RawVenueData,
    source: ScrapeSource
  ): Promise<NormalizedVenue | null> {
    try {
      if (!rawVenue.name || !rawVenue.address.city) {
        return null
      }
      
      const id = this.generateVenueId(rawVenue, source)
      
      const normalizedVenue: NormalizedVenue = {
        id,
        name: stringUtils.truncate(rawVenue.name.trim(), 100),
        address: this.normalizeAddress(rawVenue.address),
        city: rawVenue.address.city,
        state: rawVenue.address.state || '',
        postal_code: rawVenue.address.postalCode || '',
        country: rawVenue.address.country || 'United States',
        latitude: rawVenue.address.coordinates?.lat || 0,
        longitude: rawVenue.address.coordinates?.lng || 0,
        phone: this.normalizePhone(rawVenue.contact.phone),
        website: this.normalizeUrl(rawVenue.contact.website),
        timezone: 'America/New_York', // Default, should be determined by location
        capacity: rawVenue.details.capacity || null,
        venue_type: this.normalizeVenueType(rawVenue.details.venueType),
        amenities: rawVenue.details.amenities || [],
        accessibility_features: rawVenue.details.accessibilityFeatures || [],
        parking_info: rawVenue.details.parkingInfo,
        description: this.normalizeDescription(rawVenue.description),
        opening_hours: [],
        photos: rawVenue.media.images.map(url => ({ url })),
        source,
        external_id: rawVenue.externalId,
        last_updated: new Date().toISOString()
      }
      
      return normalizedVenue
    } catch (error) {
      console.error('Error normalizing venue data:', error)
      return null
    }
  }
  
  /**
   * Normalize organizer data
   */
  async normalizeOrganizer(
    organizerData: any,
    source: ScrapeSource
  ): Promise<NormalizedOrganizer | null> {
    try {
      if (!organizerData?.name) {
        return null
      }
      
      const id = this.generateOrganizerId(organizerData, source)
      
      const normalizedOrganizer: NormalizedOrganizer = {
        id,
        name: stringUtils.truncate(organizerData.name.trim(), 100),
        description: this.normalizeDescription(organizerData.description),
        website: this.normalizeUrl(organizerData.website),
        social_media: organizerData.social || null,
        logo_url: this.normalizeImageUrl(organizerData.logo_url),
        source,
        external_id: organizerData.externalId || organizerData.id,
        last_updated: new Date().toISOString()
      }
      
      return normalizedOrganizer
    } catch (error) {
      console.error('Error normalizing organizer data:', error)
      return null
    }
  }
  
  /**
   * Generate data quality report
   */
  generateQualityReport(
    rawEvents: RawEventData[],
    normalizedEvents: (NormalizedEvent | null)[]
  ): DataQualityReport {
    const totalRecords = rawEvents.length
    const validRecords = normalizedEvents.filter(e => e !== null).length
    const invalidRecords = totalRecords - validRecords
    
    const missingFields: Record<string, number> = {}
    const issues: DataQualityReport['issues'] = []
    
    // Analyze missing fields
    rawEvents.forEach(event => {
      if (!event.title) missingFields.title = (missingFields.title || 0) + 1
      if (!event.dateTime.start) missingFields.start_time = (missingFields.start_time || 0) + 1
      if (!event.venue?.name) missingFields.venue = (missingFields.venue || 0) + 1
      if (!event.description) missingFields.description = (missingFields.description || 0) + 1
    })
    
    // Calculate quality score
    const qualityScore = Math.round((validRecords / totalRecords) * 100)
    
    // Generate issues
    Object.entries(missingFields).forEach(([field, count]) => {
      if (count > 0) {
        issues.push({
          type: 'missing_field',
          field,
          count,
          samples: rawEvents
            .filter(e => !this.getFieldValue(e, field))
            .slice(0, 3)
            .map(e => ({ id: e.externalId, title: e.title }))
        })
      }
    })
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (qualityScore < 80) {
      recommendations.push('Consider improving data validation and cleaning processes')
    }
    
    if (missingFields.venue > totalRecords * 0.1) {
      recommendations.push('Improve venue extraction logic - many events missing venue information')
    }
    
    if (missingFields.description > totalRecords * 0.2) {
      recommendations.push('Enhance description extraction from event pages')
    }
    
    return {
      sessionId: '',
      totalRecords,
      validRecords,
      invalidRecords,
      missingFields,
      duplicates: 0, // TODO: Implement duplicate detection
      qualityScore,
      issues,
      recommendations
    }
  }
  
  // Private helper methods
  
  private validateEventData(event: RawEventData): boolean {
    if (this.config.validation.requireTitle && !event.title?.trim()) {
      return false
    }
    
    if (this.config.validation.requireDate && !event.dateTime.start) {
      return false
    }
    
    if (this.config.validation.requireVenue && !event.venue?.name) {
      return false
    }
    
    return true
  }
  
  private normalizeTitle(title: string): string | null {
    if (!title) return null
    
    let normalized = title.trim()
    
    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ')
    
    // Truncate if too long
    if (normalized.length > this.config.validation.maxTitleLength) {
      normalized = stringUtils.truncate(normalized, this.config.validation.maxTitleLength)
    }
    
    return normalized
  }
  
  private normalizeDescription(description?: string): string | null {
    if (!description) return null
    
    let normalized = description.trim()
    
    // Remove HTML tags
    normalized = normalized.replace(/<[^>]*>/g, '')
    
    // Decode HTML entities
    normalized = normalized
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    
    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ')
    
    // Check minimum length
    if (normalized.length < this.config.validation.minDescriptionLength) {
      return null
    }
    
    return normalized
  }
  
  private normalizeDateTimes(
    dateTime: RawEventData['dateTime'],
    defaultTimezone: string
  ): { start_time: string | null; end_time: string | null; timezone: string } {
    const timezone = this.normalizeTimezone(dateTime.timezone) || defaultTimezone
    
    let start_time: string | null = null
    let end_time: string | null = null
    
    // Parse start time
    if (dateTime.start) {
      const parsed = this.parseDateTime(dateTime.start, timezone)
      if (parsed) {
        start_time = parsed.toISOString()
      }
    }
    
    // Parse end time
    if (dateTime.end) {
      const parsed = this.parseDateTime(dateTime.end, timezone)
      if (parsed) {
        end_time = parsed.toISOString()
      }
    }
    
    return { start_time, end_time, timezone }
  }
  
  private parseDateTime(dateTimeStr: string, timezone: string): Date | null {
    try {
      // Try parsing ISO format first
      let date = parseISO(dateTimeStr)
      
      if (!isValid(date)) {
        // Try other common formats
        const formats = [
          'yyyy-MM-dd HH:mm:ss',
          'MM/dd/yyyy HH:mm',
          'dd/MM/yyyy HH:mm',
          'yyyy-MM-dd'
        ]
        
        for (const formatStr of formats) {
          try {
            date = parseISO(dateTimeStr)
            if (isValid(date)) break
          } catch (e) {
            continue
          }
        }
      }
      
      if (!isValid(date)) {
        return null
      }
      
      // Convert to UTC if timezone provided
      if (timezone !== 'UTC') {
        return zonedTimeToUtc(date, timezone)
      }
      
      return date
    } catch (error) {
      return null
    }
  }
  
  private normalizeTimezone(timezone?: string): string | null {
    if (!timezone) return null
    
    const normalized = timezone.toUpperCase()
    return this.config.timezoneMapping[normalized] || timezone
  }
  
  private normalizeCategory(categories: string[]): string {
    if (!categories || categories.length === 0) {
      return 'Other'
    }
    
    // Try to match first category
    const firstCategory = categories[0].toLowerCase()
    
    for (const [key, value] of Object.entries(this.config.categoryMapping)) {
      if (firstCategory.includes(key)) {
        return value
      }
    }
    
    return 'Other'
  }
  
  private normalizeSubcategory(categories: string[]): string | null {
    if (!categories || categories.length < 2) {
      return null
    }
    
    return stringUtils.capitalize(categories[1])
  }
  
  private normalizeTags(tags: string[]): string[] {
    if (!tags) return []
    
    return tags
      .filter(tag => tag && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase())
      .slice(0, 10) // Limit to 10 tags
  }
  
  private normalizePricing(pricing: RawEventData['pricing']): {
    price_min: number | null
    price_max: number | null
    price_currency: string
  } {
    if (pricing.isFree) {
      return {
        price_min: 0,
        price_max: 0,
        price_currency: 'USD'
      }
    }
    
    const currency = this.config.currencyMapping[pricing.currency] || 'USD'
    
    return {
      price_min: pricing.minPrice || null,
      price_max: pricing.maxPrice || pricing.minPrice || null,
      price_currency: currency
    }
  }
  
  private normalizeImageUrl(imageUrl?: string): string | null {
    if (!imageUrl) return null
    
    // Validate URL
    if (!validationUtils.isValidUrl(imageUrl)) {
      return null
    }
    
    // Check file extension
    const ext = imageUrl.split('.').pop()?.toLowerCase()
    if (ext && !this.config.imageProcessing.allowedFormats.includes(ext)) {
      return null
    }
    
    return imageUrl
  }
  
  private normalizeUrl(url?: string): string | null {
    if (!url) return null
    
    // Add protocol if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    
    return validationUtils.isValidUrl(url) ? url : null
  }
  
  private normalizeAddress(address: RawVenueData['address']): string {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode
    ].filter(Boolean)
    
    return parts.join(', ')
  }
  
  private normalizePhone(phone?: string): string | null {
    if (!phone) return null
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Basic validation
    if (digits.length < 10) return null
    
    return phone
  }
  
  private normalizeVenueType(venueType: string): string {
    const normalized = venueType.toLowerCase()
    return this.config.venueTypeMapping[normalized] || 'other'
  }
  
  private normalizeEventStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'active',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'postponed': 'postponed',
      'sold_out': 'active',
      'live': 'active',
      'published': 'active'
    }
    
    return statusMap[status.toLowerCase()] || 'active'
  }
  
  private normalizeAgeRestriction(ageRestriction?: string): string | null {
    if (!ageRestriction) return null
    
    // Extract number from strings like "21+", "18 and over", etc.
    const match = ageRestriction.match(/(\d+)/)
    return match ? match[1] : null
  }
  
  private generateEventId(event: RawEventData, source: ScrapeSource): string {
    return `${source}_${event.externalId}_${Date.now()}`
  }
  
  private generateVenueId(venue: RawVenueData, source: ScrapeSource): string {
    return `${source}_venue_${venue.externalId}_${Date.now()}`
  }
  
  private generateOrganizerId(organizer: any, source: ScrapeSource): string {
    return `${source}_org_${organizer.externalId || organizer.id}_${Date.now()}`
  }
  
  private getFieldValue(obj: any, field: string): any {
    const path = field.split('.')
    let value = obj
    
    for (const key of path) {
      value = value?.[key]
    }
    
    return value
  }
}