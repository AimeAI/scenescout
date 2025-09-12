import { z } from 'zod'

// Event schemas
export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  category: z.string().min(1, 'Category is required'),
  venue: z.string().min(1, 'Venue is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().optional(),
  endTime: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or greater').optional(),
  ticketUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  contact: z.string().email('Invalid email').optional().or(z.literal('')),
  tags: z.string().optional()
})

export const eventSubmissionSchema = eventSchema.extend({
  images: z.array(z.instanceof(File)).max(5, 'Maximum 5 images allowed').optional(),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms')
})

// Venue schemas
export const venueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  type: z.string().min(1, 'Type is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  neighborhood: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  capacity: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  amenities: z.array(z.string()).optional(),
  socialLinks: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional()
  }).optional(),
  operatingHours: z.record(z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false)
  })).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional()
})

export const venueSubmissionSchema = venueSchema.extend({
  images: z.array(z.instanceof(File)).max(10, 'Maximum 10 images allowed').optional(),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  accuracy: z.boolean().refine(val => val === true, 'You must confirm accuracy')
})

// User schemas
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

// Plan schemas
export const planSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  city: z.string().min(1, 'City is required'),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
})

export const planUpdateSchema = planSchema.partial()

// Contact/Support schemas
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be less than 100 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
  category: z.enum(['general', 'technical', 'billing', 'content', 'other']).default('general')
})

// Admin schemas
export const moderateEventSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
})

export const promotionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  budget: z.number().min(0, 'Budget must be 0 or greater'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  targetCities: z.array(z.string()).min(1, 'At least one city is required'),
  eventTypes: z.array(z.string()).min(1, 'At least one event type is required')
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate']
})

// Search and filter schemas
export const eventFilterSchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  isFree: z.boolean().optional(),
  query: z.string().optional(),
  sort: z.enum(['date', 'price', 'popularity', 'relevance']).default('date'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
})

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query must be less than 100 characters'),
  type: z.enum(['events', 'venues', 'cities', 'all']).default('all'),
  filters: eventFilterSchema.optional()
})

// Newsletter subscription schema
export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  preferences: z.object({
    weekly_digest: z.boolean().default(true),
    event_alerts: z.boolean().default(true),
    city_updates: z.boolean().default(false),
    partner_offers: z.boolean().default(false)
  }).optional()
})

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  types: z.object({
    newEvents: z.boolean(),
    planCollaborations: z.boolean(),
    weeklyDigest: z.boolean(),
    promotions: z.boolean()
  })
})

// Type exports for use in components
export type EventSubmissionData = z.infer<typeof eventSubmissionSchema>
export type VenueSubmissionData = z.infer<typeof venueSubmissionSchema>
export type UserProfileData = z.infer<typeof userProfileSchema>
export type LoginData = z.infer<typeof loginSchema>
export type RegisterData = z.infer<typeof registerSchema>
export type PlanData = z.infer<typeof planSchema>
export type ContactData = z.infer<typeof contactSchema>
export type EventFilterData = z.infer<typeof eventFilterSchema>
export type SearchData = z.infer<typeof searchSchema>
export type NotificationPreferencesData = z.infer<typeof notificationPreferencesSchema>