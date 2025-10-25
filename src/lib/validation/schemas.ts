/**
 * Zod Validation Schemas
 * Type-safe validation for all user inputs and API parameters
 */

import { z } from 'zod'

/**
 * Search Query Validation
 */
export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query too long (max 100 characters)')
    .trim()
    .transform(val => val.replace(/[<>]/g, '')), // Remove potential XSS chars
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(200, 'Limit cannot exceed 200')
    .default(20),
  offset: z.coerce.number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .max(10000, 'Offset too large')
    .default(0),
  city: z.string()
    .max(100, 'City name too long')
    .trim()
    .optional()
    .nullable(),
  lat: z.coerce.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  lng: z.coerce.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
  sort: z.enum(['date', 'relevance', 'distance'])
    .optional()
    .nullable()
    .default('date'),
  classificationName: z.string()
    .max(100)
    .optional()
    .nullable(),
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

/**
 * Coordinates Validation
 */
export const coordinatesSchema = z.object({
  lat: z.number()
    .min(-90)
    .max(90),
  lng: z.number()
    .min(-180)
    .max(180),
})

export type Coordinates = z.infer<typeof coordinatesSchema>

/**
 * URL Validation
 */
export const urlSchema = z.string()
  .url('Invalid URL')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must use HTTP or HTTPS protocol'
  )

/**
 * Event Date Validation
 */
export const eventDateSchema = z.string()
  .refine(
    (date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime())
    },
    'Invalid date format'
  )
  .refine(
    (date) => {
      const parsed = new Date(date)
      const now = new Date()
      // Allow dates up to 2 years in the past (for historical events) and 5 years in the future
      const minDate = new Date(now.getFullYear() - 2, 0, 1)
      const maxDate = new Date(now.getFullYear() + 5, 11, 31)
      return parsed >= minDate && parsed <= maxDate
    },
    'Date must be within reasonable range'
  )

/**
 * Price Validation
 */
export const priceSchema = z.number()
  .min(0, 'Price cannot be negative')
  .max(100000, 'Price exceeds maximum')
  .optional()

/**
 * Event Data Schema (for external API responses)
 */
export const externalEventSchema = z.object({
  id: z.string().max(500),
  title: z.string()
    .min(1, 'Event title required')
    .max(500, 'Event title too long'),
  description: z.string()
    .max(5000, 'Event description too long')
    .optional(),
  date: z.string().optional(),
  event_date: z.string().optional(),
  time: z.string().max(100).optional(),
  start_time: z.string().max(100).optional(),
  venue_name: z.string().max(500).optional(),
  city_name: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  address: z.string().max(500).optional(),
  price_min: priceSchema,
  price_max: priceSchema,
  price_currency: z.string().max(10).optional(),
  is_free: z.boolean().optional(),
  image_url: z.string().max(2000).optional(), // Will validate URL separately
  external_url: z.string().max(2000).optional(), // Will validate URL separately
  external_id: z.string().max(500).optional(),
  source: z.string().max(100),
  provider: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  official: z.boolean().optional(),
  verified: z.boolean().optional(),
}).passthrough() // Allow additional fields

export type ExternalEvent = z.infer<typeof externalEventSchema>

/**
 * Filter Parameters Schema
 */
export const filterParamsSchema = z.object({
  categories: z.array(z.string().max(100)).optional(),
  priceMin: priceSchema,
  priceMax: priceSchema,
  dateFrom: eventDateSchema.optional(),
  dateTo: eventDateSchema.optional(),
  isFree: z.boolean().optional(),
  hasImages: z.boolean().optional(),
})

export type FilterParams = z.infer<typeof filterParamsSchema>

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number too large')
    .default(1),
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(200, 'Limit cannot exceed 200')
    .default(20),
})

export type Pagination = z.infer<typeof paginationSchema>

/**
 * User Preference Schema (for future use)
 */
export const userPreferenceSchema = z.object({
  favoriteCategories: z.array(z.string().max(100)).max(50),
  excludedCategories: z.array(z.string().max(100)).max(50),
  maxPrice: priceSchema,
  preferredRadius: z.number().min(1).max(100).default(25), // miles
  notificationPreferences: z.object({
    email: z.boolean().default(false),
    push: z.boolean().default(false),
    sms: z.boolean().default(false),
  }).optional(),
})

export type UserPreference = z.infer<typeof userPreferenceSchema>

/**
 * Email Validation Schema
 */
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim()

/**
 * Phone Number Validation (E.164 format)
 */
export const phoneSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format: +1234567890)')
  .optional()

/**
 * Reminder Schema
 */
export const reminderSchema = z.object({
  eventId: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long'),
  userId: z.string()
    .min(1, 'User ID required')
    .max(500, 'User ID too long'),
  reminderTime: z.string()
    .refine(
      (time) => {
        const date = new Date(time)
        return !isNaN(date.getTime()) && date > new Date()
      },
      'Reminder time must be in the future'
    ),
  notificationMethod: z.enum(['email', 'push', 'sms'])
    .default('email'),
  message: z.string()
    .max(500, 'Message too long')
    .optional(),
})

export type Reminder = z.infer<typeof reminderSchema>

/**
 * Push Notification Subscription Schema
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string()
    .url('Invalid endpoint URL')
    .max(2000, 'Endpoint URL too long'),
  expirationTime: z.number()
    .nullable()
    .optional(),
  keys: z.object({
    p256dh: z.string()
      .min(1, 'p256dh key required')
      .max(500, 'p256dh key too long'),
    auth: z.string()
      .min(1, 'auth key required')
      .max(500, 'auth key too long'),
  }),
})

export type PushSubscription = z.infer<typeof pushSubscriptionSchema>

/**
 * Notification Preference Schema
 */
export const notificationPreferenceSchema = z.object({
  userId: z.string()
    .min(1, 'User ID required')
    .max(500, 'User ID too long'),
  emailNotifications: z.boolean()
    .default(true),
  pushNotifications: z.boolean()
    .default(false),
  smsNotifications: z.boolean()
    .default(false),
  reminderHoursBefore: z.number()
    .int()
    .min(1, 'Must be at least 1 hour')
    .max(168, 'Cannot exceed 7 days (168 hours)')
    .default(24),
  quietHoursStart: z.number()
    .int()
    .min(0)
    .max(23)
    .optional(),
  quietHoursEnd: z.number()
    .int()
    .min(0)
    .max(23)
    .optional(),
})

export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>

/**
 * Event ID Parameter Schema
 */
export const eventIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Event ID required')
    .max(500, 'Event ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Event ID contains invalid characters'),
})

export type EventIdParam = z.infer<typeof eventIdParamSchema>

/**
 * Generic validation helper
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: messages.join('; ') }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Safe parse helper (doesn't throw)
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}
