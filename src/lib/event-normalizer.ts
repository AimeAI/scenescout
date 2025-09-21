import { Event, EventCategory, EventFilters } from '@/types'
import { z } from 'zod'

type SupabaseEventRow = Record<string, any>

// Validation schemas
const EventValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().optional().nullable(),
  category: z.enum(['music', 'sports', 'arts', 'food', 'tech', 'social', 'business', 'education', 'health', 'family', 'other']).default('other'),
  subcategory: z.string().max(100).optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  venue_name: z.string().max(255).optional().nullable(),
  city_name: z.string().max(100).optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  price_min: z.number().min(0).optional().nullable(),
  price_max: z.number().min(0).optional().nullable(),
  price_currency: z.string().length(3).default('USD'),
  is_free: z.boolean().default(false),
  website_url: z.string().url().optional().nullable(),
  ticket_url: z.string().url().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  external_id: z.string().max(255).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  provider: z.string().max(50).optional().nullable(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'cancelled', 'postponed', 'draft']).default('active')
})

interface NormalizationResult {
  event: Event
  warnings: string[]
  errors: string[]
  isValid: boolean
}

interface DataQualityMetrics {
  completeness: number
  accuracy: number
  consistency: number
  timeliness: number
  overall: number
}

const CATEGORY_ALIASES: Record<string, EventCategory> = {
  music: 'music',
  'arts & theatre': 'arts',
  arts: 'arts',
  theatre: 'arts',
  theater: 'arts',
  food: 'food',
  drink: 'food',
  culinary: 'food',
  sports: 'sports',
  sport: 'sports',
  nightlife: 'social',
  community: 'social',
  networking: 'business',
  business: 'business',
  tech: 'tech',
  technology: 'tech',
  education: 'education',
  learning: 'education',
  family: 'family',
  kids: 'family',
  health: 'health',
  wellness: 'health',
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

function toIsoString(value?: string | null): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function normalizeCategory(raw?: string | null): EventCategory {
  if (!raw) return 'other'
  const key = raw.trim().toLowerCase()
  return CATEGORY_ALIASES[key] || (CATEGORY_ALIASES[key.replace(/ & /g, ' & ')] ?? (isEventCategory(key) ? (key as EventCategory) : 'other'))
}

function isEventCategory(value: string): value is EventCategory {
  return [
    'music',
    'sports',
    'arts',
    'food',
    'tech',
    'social',
    'business',
    'education',
    'health',
    'family',
    'other',
  ].includes(value as EventCategory)
}

function computeIsFree(priceMin?: number | null, priceMax?: number | null): boolean {
  if (priceMin == null && priceMax == null) return false
  const min = priceMin ?? priceMax ?? 0
  const max = priceMax ?? priceMin ?? 0
  return min === 0 && max === 0
}

/**
 * Enhanced event normalization with validation and data quality assessment
 */
export function normalizeAndValidateEvent(row: SupabaseEventRow): NormalizationResult {
  const warnings: string[] = []
  const errors: string[] = []
  
  try {
    // Step 1: Basic normalization
    const normalized = transformEventRow(row)
    
    // Step 2: Validation
    const validationResult = EventValidationSchema.safeParse(normalized)
    
    if (!validationResult.success) {
      validationResult.error.errors.forEach(err => {
        errors.push(`${err.path.join('.')}: ${err.message}`)
      })
    }
    
    // Step 3: Data quality checks
    const qualityChecks = assessDataQuality(normalized, warnings)
    
    // Step 4: Enhanced normalization based on quality
    const enhanced = enhanceEventData(normalized, warnings)
    
    return {
      event: enhanced,
      warnings,
      errors,
      isValid: errors.length === 0
    }
  } catch (error) {
    errors.push(`Normalization failed: ${error.message}`)
    return {
      event: row as Event,
      warnings,
      errors,
      isValid: false
    }
  }
}

/**
 * Assess data quality and generate metrics
 */
export function assessDataQuality(event: Event, warnings: string[]): DataQualityMetrics {
  let completeness = 0
  let accuracy = 0
  let consistency = 0
  let timeliness = 0
  
  // Completeness: Check for required and recommended fields
  const requiredFields = ['title', 'category', 'start_time']
  const recommendedFields = ['description', 'venue_name', 'city_name', 'price_min', 'image_url']
  
  const hasRequiredFields = requiredFields.filter(field => event[field]).length
  const hasRecommendedFields = recommendedFields.filter(field => event[field]).length
  
  completeness = (hasRequiredFields / requiredFields.length) * 0.7 + 
                (hasRecommendedFields / recommendedFields.length) * 0.3
  
  // Accuracy: Validate data formats and ranges
  let accuracyScore = 1.0
  
  if (event.start_time) {
    const eventDate = new Date(event.start_time)
    if (isNaN(eventDate.getTime())) {
      accuracyScore -= 0.2
      warnings.push('Invalid start_time format')
    }
  }
  
  if (event.latitude && (event.latitude < -90 || event.latitude > 90)) {
    accuracyScore -= 0.1
    warnings.push('Invalid latitude value')
  }
  
  if (event.longitude && (event.longitude < -180 || event.longitude > 180)) {
    accuracyScore -= 0.1
    warnings.push('Invalid longitude value')
  }
  
  if (event.price_min && event.price_max && event.price_min > event.price_max) {
    accuracyScore -= 0.1
    warnings.push('price_min is greater than price_max')
  }
  
  accuracy = Math.max(0, accuracyScore)
  
  // Consistency: Check for logical consistency
  let consistencyScore = 1.0
  
  if (event.is_free && (event.price_min > 0 || event.price_max > 0)) {
    consistencyScore -= 0.2
    warnings.push('Event marked as free but has non-zero price')
  }
  
  if (event.end_time && event.start_time) {
    const start = new Date(event.start_time)
    const end = new Date(event.end_time)
    if (end <= start) {
      consistencyScore -= 0.2
      warnings.push('End time is not after start time')
    }
  }
  
  consistency = Math.max(0, consistencyScore)
  
  // Timeliness: Check if event data is current
  let timelinessScore = 1.0
  
  if (event.start_time) {
    const eventDate = new Date(event.start_time)
    const now = new Date()
    const daysFromNow = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysFromNow < 0) {
      timelinessScore = 0.5 // Past events have lower timeliness
      warnings.push('Event is in the past')
    } else if (daysFromNow > 365) {
      timelinessScore = 0.8 // Far future events might be less reliable
      warnings.push('Event is more than a year in the future')
    }
  }
  
  timeliness = timelinessScore
  
  const overall = (completeness * 0.3 + accuracy * 0.3 + consistency * 0.2 + timeliness * 0.2)
  
  return {
    completeness,
    accuracy,
    consistency,
    timeliness,
    overall
  }
}

/**
 * Enhance event data with intelligent defaults and corrections
 */
export function enhanceEventData(event: Event, warnings: string[]): Event {
  const enhanced = { ...event }
  
  // Auto-correct common issues
  
  // Fix is_free based on pricing
  if (!enhanced.is_free && enhanced.price_min === 0 && enhanced.price_max === 0) {
    enhanced.is_free = true
    warnings.push('Auto-corrected is_free to true based on zero pricing')
  }
  
  // Set price from price_min/price_max if missing
  if (!enhanced.price && enhanced.price_min) {
    enhanced.price = enhanced.price_min
  }
  
  // Normalize category
  enhanced.category = normalizeCategory(enhanced.category)
  
  // Generate date field for compatibility
  if (enhanced.start_time && !enhanced.date) {
    enhanced.date = enhanced.start_time.split('T')[0]
  }
  
  // Ensure timezone is set
  if (!enhanced.timezone && enhanced.city_name) {
    enhanced.timezone = inferTimezone(enhanced.city_name)
  }
  
  // Clean and validate URLs
  if (enhanced.website_url) {
    enhanced.website_url = cleanUrl(enhanced.website_url)
  }
  
  if (enhanced.ticket_url) {
    enhanced.ticket_url = cleanUrl(enhanced.ticket_url)
  }
  
  if (enhanced.image_url) {
    enhanced.image_url = cleanUrl(enhanced.image_url)
  }
  
  // Standardize tags
  if (enhanced.tags && Array.isArray(enhanced.tags)) {
    enhanced.tags = enhanced.tags
      .map(tag => typeof tag === 'string' ? tag.toLowerCase().trim() : String(tag))
      .filter(tag => tag.length > 0)
  }
  
  return enhanced
}

/**
 * Infer timezone from city name
 */
function inferTimezone(cityName: string): string {
  const timezoneMap: Record<string, string> = {
    'toronto': 'America/Toronto',
    'new york': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo',
    'sydney': 'Australia/Sydney',
    'vancouver': 'America/Vancouver',
    'montreal': 'America/Montreal'
  }
  
  const normalized = cityName.toLowerCase().trim()
  return timezoneMap[normalized] || 'UTC'
}

/**
 * Clean and validate URLs
 */
function cleanUrl(url: string): string {
  if (!url) return url
  
  let cleaned = url.trim()
  
  // Add protocol if missing
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned
  }
  
  try {
    const urlObj = new URL(cleaned)
    return urlObj.toString()
  } catch {
    return url // Return original if can't parse
  }
}

export function transformEventRow(row: SupabaseEventRow): Event {
  const rawCategory = row.category ?? row.segment ?? row.genre
  const category = normalizeCategory(rawCategory)
  const priceMin = coerceNumber(row.price_min)
  const priceMax = coerceNumber(row.price_max)
  const startTimeIso = toIsoString(row.start_time) || toIsoString(row.date) || toIsoString(row.event_date) || row.start_time || row.date || row.event_date
  const endTimeIso = toIsoString(row.end_time) || row.end_time
  const computedFree = row.is_free ?? computeIsFree(priceMin, priceMax)

  const venue = row.venue ?? (row.latitude && row.longitude
    ? {
        name: row.location_name ?? row.venue_name ?? row.title,
        latitude: coerceNumber(row.latitude),
        longitude: coerceNumber(row.longitude),
        address: row.address ?? row.venue?.address ?? undefined,
      }
    : undefined)

  return {
    ...row,
    category,
    price_min: priceMin,
    price_max: priceMax,
    is_free: computedFree,
    provider: row.provider ?? row.source,
    source: row.source ?? row.provider,
    date: startTimeIso,
    event_date: startTimeIso,
    start_time: startTimeIso || row.start_time,
    end_time: endTimeIso,
    venue_name: venue?.name ?? row.venue_name,
    venue,
    city_name: row.city?.name ?? row.city_name ?? undefined,
  } as Event
}

export function filterEventsClientSide(events: Event[], filters?: EventFilters): Event[] {
  if (!filters) return events

  const normalizedCategoryFilter = filters.category ? normalizeCategory(filters.category) : undefined
  const normalizedCategoryList = filters.categories?.map(normalizeCategory)
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined

  return events.filter(event => {
    const eventDateValue = event.event_date || event.date || event.start_time
    const eventDate = eventDateValue ? new Date(eventDateValue) : undefined

    if (normalizedCategoryFilter && normalizeCategory(event.category) !== normalizedCategoryFilter) {
      return false
    }

    if (normalizedCategoryList && normalizedCategoryList.length > 0) {
      const eventCategory = normalizeCategory(event.category)
      if (!normalizedCategoryList.includes(eventCategory)) {
        return false
      }
    }

    if (filters.city) {
      const cityMatches = [event.city_id, event.city?.slug, event.city?.name, event.city_name]
        .filter(Boolean)
        .map(value => String(value).toLowerCase())
      if (!cityMatches.includes(filters.city.toLowerCase())) {
        return false
      }
    }

    if (dateFrom && eventDate && eventDate < dateFrom) {
      return false
    }

    if (dateTo && eventDate && eventDate > dateTo) {
      return false
    }

    if (filters.isFree && !(event.is_free || computeIsFree(event.price_min, event.price_max))) {
      return false
    }

    if (typeof filters.priceMin === 'number') {
      const maxPrice = (event.price_max ?? event.price_min)
      if (typeof maxPrice === 'number' && maxPrice < filters.priceMin) {
        return false
      }
    }

    if (typeof filters.priceMax === 'number') {
      const minPrice = (event.price_min ?? event.price_max)
      if (typeof minPrice === 'number' && minPrice > filters.priceMax) {
        return false
      }
    }

    if (filters.query) {
      const haystack = [event.title, event.description, event.venue_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(filters.query.toLowerCase())) {
        return false
      }
    }

    return true
  })
}

export function sortEvents(events: Event[], sort?: EventFilters['sort']): Event[] {
  if (!sort) return events

  const copy = [...events]

  switch (sort) {
    case 'date':
      copy.sort((a, b) => {
        const aTime = new Date(a.event_date || a.date || a.start_time || 0).getTime()
        const bTime = new Date(b.event_date || b.date || b.start_time || 0).getTime()
        return aTime - bTime
      })
      break
    case 'price':
      copy.sort((a, b) => {
        const aPrice = a.price_min ?? a.price_max ?? Number.MAX_SAFE_INTEGER
        const bPrice = b.price_min ?? b.price_max ?? Number.MAX_SAFE_INTEGER
        return aPrice - bPrice
      })
      break
    case 'popularity':
      copy.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      break
    default:
      break
  }

  return copy
}

/**
 * Batch normalize multiple events
 */
export function batchNormalizeEvents(rows: SupabaseEventRow[]): {
  events: Event[]
  summary: {
    total: number
    valid: number
    warnings: number
    errors: number
    qualityScore: number
  }
} {
  const results = rows.map(row => normalizeAndValidateEvent(row))
  
  const events = results.map(r => r.event)
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
  const validEvents = results.filter(r => r.isValid).length
  
  // Calculate overall quality score
  const qualityScores = results.map(r => assessDataQuality(r.event, []).overall)
  const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
  
  return {
    events,
    summary: {
      total: rows.length,
      valid: validEvents,
      warnings: totalWarnings,
      errors: totalErrors,
      qualityScore: averageQuality
    }
  }
}

/**
 * Get normalization report for monitoring
 */
export function getNormalizationReport(rows: SupabaseEventRow[]): {
  summary: any
  issues: Array<{
    type: 'error' | 'warning'
    message: string
    count: number
  }>
  recommendations: string[]
} {
  const results = rows.map(row => normalizeAndValidateEvent(row))
  
  // Aggregate issues
  const issueMap = new Map<string, { type: 'error' | 'warning', count: number }>()
  
  results.forEach(result => {
    result.errors.forEach(error => {
      const key = error
      if (issueMap.has(key)) {
        issueMap.get(key)!.count++
      } else {
        issueMap.set(key, { type: 'error', count: 1 })
      }
    })
    
    result.warnings.forEach(warning => {
      const key = warning
      if (issueMap.has(key)) {
        issueMap.get(key)!.count++
      } else {
        issueMap.set(key, { type: 'warning', count: 1 })
      }
    })
  })
  
  const issues = Array.from(issueMap.entries()).map(([message, data]) => ({
    type: data.type,
    message,
    count: data.count
  }))
  
  // Generate recommendations
  const recommendations: string[] = []
  
  const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0)
  const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0)
  
  if (errorCount > rows.length * 0.1) {
    recommendations.push('High error rate detected. Review data source quality.')
  }
  
  if (warningCount > rows.length * 0.3) {
    recommendations.push('Many warnings detected. Consider improving data validation at source.')
  }
  
  const incompleteEvents = results.filter(r => {
    const quality = assessDataQuality(r.event, [])
    return quality.completeness < 0.7
  }).length
  
  if (incompleteEvents > rows.length * 0.2) {
    recommendations.push('Many events have incomplete data. Focus on gathering required fields.')
  }
  
  return {
    summary: {
      total: rows.length,
      valid: results.filter(r => r.isValid).length,
      errors: errorCount,
      warnings: warningCount
    },
    issues: issues.sort((a, b) => b.count - a.count),
    recommendations
  }
}

/**
 * Export enhanced normalization functions
 */
export const eventNormalizer = {
  normalize: normalizeAndValidateEvent,
  batchNormalize: batchNormalizeEvents,
  assessQuality: assessDataQuality,
  enhance: enhanceEventData,
  getReport: getNormalizationReport,
  validate: (event: Event) => EventValidationSchema.safeParse(event)
}
