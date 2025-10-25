/**
 * Environment Variable Helpers
 * Provides type-safe access to environment variables with runtime validation
 */

import { getEnvVar, requireEnvVar, isFeatureEnabled } from './env-validation'

/**
 * Supabase Configuration
 */
export const supabase = {
  url: requireEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: requireEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: requireEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
} as const

/**
 * External API Keys
 */
export const apis = {
  ticketmaster: getEnvVar('TICKETMASTER_API_KEY'),
  eventbrite: getEnvVar('EVENTBRITE_OAUTH_TOKEN'),
  openai: getEnvVar('OPENAI_API_KEY'),
} as const

/**
 * Push Notifications
 */
export const vapid = {
  publicKey: getEnvVar('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
  privateKey: getEnvVar('VAPID_PRIVATE_KEY'),
  subject: getEnvVar('VAPID_SUBJECT', { defaultValue: 'mailto:noreply@scenescout.com' })!,
} as const

/**
 * Payments
 */
export const stripe = {
  secretKey: getEnvVar('STRIPE_SECRET_KEY'),
  webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
} as const

/**
 * Security
 */
export const security = {
  cronSecret: getEnvVar('CRON_SECRET'),
} as const

/**
 * Feature Flags
 */
export const features = {
  cachedEvents: isFeatureEnabled('CACHED_EVENTS'),
  dailyShuffle: isFeatureEnabled('DAILY_SHUFFLE'),
  savedEvents: isFeatureEnabled('SAVED_EVENTS'),
  thumbs: isFeatureEnabled('THUMBS'),
  tracking: isFeatureEnabled('TRACKING_V1'),
  priceV2: isFeatureEnabled('PRICE_V2'),
} as const

/**
 * Cache Configuration
 */
export const cache = {
  ttlMinutes: parseInt(getEnvVar('CACHE_TTL_MINUTES', { defaultValue: '30' })!, 10),
  maxItems: parseInt(getEnvVar('CACHE_MAX_ITEMS', { defaultValue: '500' })!, 10),
} as const

/**
 * Monitoring
 */
export const monitoring = {
  slackWebhook: getEnvVar('SLACK_WEBHOOK_URL'),
  logEndpoint: getEnvVar('LOG_ENDPOINT'),
} as const

/**
 * Environment Info
 */
export const env = {
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isServer: typeof window === 'undefined',
} as const

/**
 * Helper to check if required APIs are configured
 */
export function hasApiKey(api: keyof typeof apis): boolean {
  return !!apis[api]
}

/**
 * Helper to check if push notifications are configured
 */
export function hasPushNotifications(): boolean {
  return !!(vapid.publicKey && vapid.privateKey)
}

/**
 * Helper to check if payments are configured
 */
export function hasPayments(): boolean {
  return !!(stripe.secretKey && stripe.webhookSecret)
}
