/**
 * Input Sanitization Utilities
 * Removes potentially harmful content from user inputs
 */

import { urlSchema, eventDateSchema } from './schemas'

// Conditional import for isomorphic-dompurify - fallback for serverless environments
let DOMPurify: any = null
try {
  DOMPurify = require('isomorphic-dompurify')
} catch (error) {
  console.warn('DOMPurify not available in serverless environment, using fallback sanitization')
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string, allowedTags?: string[]): string {
  if (!dirty || typeof dirty !== 'string') return ''

  // Fallback sanitization when DOMPurify is not available (serverless environments)
  if (!DOMPurify) {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .trim()
  }

  const config = allowedTags ? {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: []
  } : {
    ALLOWED_TAGS: [], // Strip all HTML by default
    ALLOWED_ATTR: []
  }

  return DOMPurify.sanitize(dirty, config).trim()
}

/**
 * Sanitize plain text (remove HTML, scripts, trim, normalize whitespace)
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return ''

  // Remove all HTML tags
  const withoutHtml = sanitizeHtml(text)

  // Normalize whitespace
  const normalized = withoutHtml.replace(/\s+/g, ' ').trim()

  // Remove zero-width characters and other invisible characters
  const cleaned = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '')

  return cleaned
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return ''

  // Remove HTML
  let sanitized = sanitizeText(query)

  // Remove special characters that could be used for injection
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, '')

  // Limit length
  sanitized = sanitized.slice(0, 100)

  return sanitized.trim()
}

/**
 * Sanitize and validate URL
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null

  try {
    // Basic sanitization
    const cleaned = url.trim()

    // Validate with Zod schema
    const result = urlSchema.safeParse(cleaned)
    if (!result.success) return null

    // Additional security: ensure it's not a javascript: or data: URL
    const lowerUrl = cleaned.toLowerCase()
    if (lowerUrl.startsWith('javascript:') ||
        lowerUrl.startsWith('data:') ||
        lowerUrl.startsWith('vbscript:')) {
      return null
    }

    return cleaned
  } catch {
    return null
  }
}

/**
 * Sanitize event title
 */
export function sanitizeEventTitle(title: string): string {
  if (!title || typeof title !== 'string') return 'Untitled Event'

  const sanitized = sanitizeText(title)

  // Ensure it's not empty after sanitization
  if (!sanitized) return 'Untitled Event'

  // Limit length
  return sanitized.slice(0, 500)
}

/**
 * Sanitize event description
 */
export function sanitizeEventDescription(description: string | null | undefined): string {
  if (!description || typeof description !== 'string') return ''

  const sanitized = sanitizeText(description)

  // Limit length
  return sanitized.slice(0, 5000)
}

/**
 * Sanitize venue name
 */
export function sanitizeVenueName(venue: string | null | undefined): string {
  if (!venue || typeof venue !== 'string') return ''

  const sanitized = sanitizeText(venue)

  return sanitized.slice(0, 500)
}

/**
 * Sanitize city name
 */
export function sanitizeCityName(city: string | null | undefined): string {
  if (!city || typeof city !== 'string') return ''

  const sanitized = sanitizeText(city)

  // Remove numbers and special chars (cities shouldn't have these)
  const cleaned = sanitized.replace(/[0-9!@#$%^&*()_+={}[\]|\\:;"'<>,.?/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.slice(0, 100)
}

/**
 * Sanitize address
 */
export function sanitizeAddress(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return ''

  const sanitized = sanitizeText(address)

  return sanitized.slice(0, 500)
}

/**
 * Sanitize and validate date string
 */
export function sanitizeDate(date: string | null | undefined): string | null {
  if (!date || typeof date !== 'string') return null

  try {
    const trimmed = date.trim()

    // Try to parse as valid date
    const parsed = new Date(trimmed)
    if (isNaN(parsed.getTime())) return null

    // Validate with schema
    const result = eventDateSchema.safeParse(trimmed)
    if (!result.success) return null

    return trimmed
  } catch {
    return null
  }
}

/**
 * Sanitize price value
 */
export function sanitizePrice(price: number | string | null | undefined): number | null {
  if (price === null || price === undefined) return null

  try {
    const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price

    if (isNaN(num) || num < 0 || num > 100000) return null

    // Round to 2 decimal places
    return Math.round(num * 100) / 100
  } catch {
    return null
  }
}

/**
 * Sanitize coordinates
 */
export function sanitizeCoordinates(lat: number | string | null | undefined, lng: number | string | null | undefined): { lat: number; lng: number } | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null

  try {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng

    if (isNaN(latNum) || isNaN(lngNum)) return null
    if (latNum < -90 || latNum > 90) return null
    if (lngNum < -180 || lngNum > 180) return null

    return {
      lat: Math.round(latNum * 1000000) / 1000000, // 6 decimal places
      lng: Math.round(lngNum * 1000000) / 1000000
    }
  } catch {
    return null
  }
}

/**
 * Sanitize complete event object
 */
export function sanitizeEvent(event: any): any {
  if (!event || typeof event !== 'object') return null

  return {
    ...event,
    title: sanitizeEventTitle(event.title || event.name),
    description: sanitizeEventDescription(event.description),
    venue_name: sanitizeVenueName(event.venue_name || event.venue?.name),
    city_name: sanitizeCityName(event.city_name || event.city?.name),
    address: sanitizeAddress(event.address),
    image_url: sanitizeUrl(event.image_url),
    external_url: sanitizeUrl(event.external_url || event.url),
    date: sanitizeDate(event.date),
    event_date: sanitizeDate(event.event_date || event.date),
    time: event.time ? sanitizeText(event.time) : null,
    start_time: event.start_time ? sanitizeText(event.start_time) : null,
    price_min: sanitizePrice(event.price_min),
    price_max: sanitizePrice(event.price_max),
    latitude: event.latitude !== undefined ? sanitizeCoordinates(event.latitude, event.longitude)?.lat ?? null : null,
    longitude: event.longitude !== undefined ? sanitizeCoordinates(event.latitude, event.longitude)?.lng ?? null : null,
  }
}

/**
 * Sanitize array of events
 */
export function sanitizeEvents(events: any[]): any[] {
  if (!Array.isArray(events)) return []

  return events
    .map(event => sanitizeEvent(event))
    .filter(event => event !== null)
}

/**
 * Remove null/undefined values from object
 */
export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key as keyof T] = value
    }
  }

  return cleaned
}

/**
 * Validate and sanitize combined helper
 */
export function validateAndSanitize<T>(
  validator: (data: unknown) => T | null,
  sanitizer: (data: T) => T,
  data: unknown
): T | null {
  try {
    const validated = validator(data)
    if (!validated) return null

    return sanitizer(validated)
  } catch {
    return null
  }
}
