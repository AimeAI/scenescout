/**
 * API Validation Middleware
 * Helper utilities for validating and sanitizing API inputs
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeSearchQuery, sanitizeText, sanitizeCoordinates } from './sanitize'
import { rateLimiterManager, API_RATE_LIMITS } from '@/lib/rate-limiter'

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

/**
 * Extract and validate URL search parameters
 */
export function validateSearchParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}

    // Convert URLSearchParams to plain object
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    // Validate with Zod schema
    const result = schema.safeParse(params)

    if (!result.success) {
      const errorMessages = result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ')

      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
        status: 400,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid request parameters',
      status: 400,
    }
  }
}

/**
 * Validate JSON request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()

    const result = schema.safeParse(body)

    if (!result.success) {
      const errorMessages = result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ')

      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
        status: 400,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON body',
      status: 400,
    }
  }
}

/**
 * Create a validated error response
 */
export function validationErrorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation error',
      message: error,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Rate limiting middleware for API routes
 */
export async function checkRateLimit(
  request: NextRequest,
  apiName: string,
  customConfig?: { maxRequests: number; windowMs: number }
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    // Get client identifier (IP address or user ID)
    const identifier = getClientIdentifier(request)
    const limiterKey = `${apiName}:${identifier}`

    // Get rate limit config
    const config = customConfig || API_RATE_LIMITS[apiName as keyof typeof API_RATE_LIMITS] || {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    }

    // Check rate limit
    const limiter = rateLimiterManager.getLimiter(limiterKey, config as any)
    const status = limiter.getStatus()

    if (status.remaining <= 0 && status.retryAfter) {
      const retryAfterSeconds = Math.ceil(status.retryAfter / 1000)

      return {
        allowed: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
            retryAfter: retryAfterSeconds,
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfterSeconds.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(status.resetAt).toISOString(),
            },
          }
        ),
      }
    }

    // Consume token
    await limiter.waitForToken()

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open - allow request on error
    return { allowed: true }
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header/cookie
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from JWT or session
    // This is a simplified version - implement based on your auth system
    return `user:${authHeader.slice(0, 20)}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}

/**
 * Sanitize common search parameters
 */
export function sanitizeCommonParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  // Sanitize query/search text
  if (params.q) {
    sanitized.q = sanitizeSearchQuery(params.q)
  }

  // Sanitize city name
  if (params.city) {
    sanitized.city = sanitizeText(params.city).slice(0, 100)
  }

  // Validate and sanitize coordinates
  if (params.lat !== undefined && params.lng !== undefined) {
    const coords = sanitizeCoordinates(params.lat, params.lng)
    if (coords) {
      sanitized.lat = coords.lat
      sanitized.lng = coords.lng
    }
  }

  // Sanitize numeric parameters
  if (params.limit !== undefined) {
    const limit = parseInt(params.limit, 10)
    sanitized.limit = isNaN(limit) ? 20 : Math.min(Math.max(1, limit), 200)
  }

  if (params.offset !== undefined) {
    const offset = parseInt(params.offset, 10)
    sanitized.offset = isNaN(offset) ? 0 : Math.max(0, offset)
  }

  if (params.radius !== undefined) {
    const radius = parseInt(params.radius, 10)
    sanitized.radius = isNaN(radius) ? 50 : Math.min(Math.max(1, radius), 500)
  }

  // Sanitize price parameters
  if (params.priceMin !== undefined) {
    const priceMin = parseFloat(params.priceMin)
    sanitized.priceMin = isNaN(priceMin) ? undefined : Math.max(0, priceMin)
  }

  if (params.priceMax !== undefined) {
    const priceMax = parseFloat(params.priceMax)
    sanitized.priceMax = isNaN(priceMax) ? undefined : Math.max(0, priceMax)
  }

  // Sanitize boolean parameters
  const boolParams = ['featured', 'oneOff', 'hasTickets', 'isFree']
  boolParams.forEach(param => {
    if (params[param] !== undefined) {
      sanitized[param] = params[param] === 'true' || params[param] === true
    }
  })

  // Sanitize enum parameters
  if (params.sort && ['date', 'relevance', 'distance'].includes(params.sort)) {
    sanitized.sort = params.sort
  }

  if (params.category) {
    sanitized.category = sanitizeText(params.category).slice(0, 100)
  }

  return sanitized
}

/**
 * Combined validation and rate limiting middleware
 */
export async function validateAndRateLimit<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  apiName: string,
  rateLimitConfig?: { maxRequests: number; windowMs: number }
): Promise<{ data: T; response?: NextResponse } | { response: NextResponse }> {
  // Check rate limit first (skip in Vercel serverless environment)
  const isVercel = process.env.VERCEL === '1'
  if (!isVercel) {
    try {
      const rateLimitResult = await checkRateLimit(request, apiName, rateLimitConfig)
      if (!rateLimitResult.allowed) {
        return { response: rateLimitResult.response! }
      }
    } catch (error) {
      // Rate limiter failed, but don't block the request
      console.warn('Rate limiter error (skipping):', error)
    }
  }

  // Validate request
  const validation = validateSearchParams(request, schema)
  if (!validation.success) {
    return {
      response: validationErrorResponse(validation.error!, validation.status),
    }
  }

  return { data: validation.data! }
}

/**
 * Log validation failures for monitoring
 */
export function logValidationFailure(
  request: NextRequest,
  error: string,
  context?: Record<string, any>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    method: request.method,
    error,
    userAgent: request.headers.get('user-agent'),
    ...context,
  }

  console.warn('⚠️ Validation failure:', logData)

  // In production, send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service
  }
}

/**
 * Create safe error response without exposing internals
 */
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string = 'An error occurred'
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const errorMessage = error instanceof Error ? error.message : fallbackMessage
  const errorDetails = isDevelopment && error instanceof Error ? error.stack : undefined

  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
      message: isDevelopment ? errorMessage : fallbackMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}
