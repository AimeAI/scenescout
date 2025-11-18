import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Rate limiting storage (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Validation schema
const feedbackRequestSchema = z.object({
  feedbackType: z.enum(['Bug Report', 'Feature Request', 'General Feedback']),
  message: z.string().min(10).max(500),
  email: z.string().email().optional().or(z.literal('')),
  screenshot_url: z.string().nullable().optional(),
  page_url: z.string(),
  user_agent: z.string(),
})

// Rate limiting: 5 submissions per 10 minutes
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function getRateLimitKey(req: NextRequest): string {
  // Use IP address or a combination of IP and user agent for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') ||
             'unknown'
  return `feedback:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  // Clean up old records
  if (record && now > record.resetAt) {
    rateLimitStore.delete(key)
  }

  const currentRecord = rateLimitStore.get(key)

  if (!currentRecord) {
    // First request
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (currentRecord.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((currentRecord.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count
  currentRecord.count += 1
  rateLimitStore.set(key, currentRecord)
  return { allowed: true }
}

// Cleanup old rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(req)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many feedback submissions. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitStore.get(rateLimitKey)?.resetAt),
          }
        }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = feedbackRequestSchema.parse(body)

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert feedback into database
    const { data, error } = await supabase
      .from('beta_feedback')
      .insert([
        {
          feedback_type: validatedData.feedbackType,
          message: validatedData.message,
          email: validatedData.email || null,
          screenshot_url: validatedData.screenshot_url || null,
          page_url: validatedData.page_url,
          user_agent: validatedData.user_agent,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    // Return success
    const remainingRecords = rateLimitStore.get(rateLimitKey)
    return NextResponse.json(
      {
        success: true,
        message: 'Feedback submitted successfully',
        id: data.id,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': String(RATE_LIMIT_MAX - (remainingRecords?.count || 0)),
          'X-RateLimit-Reset': String(remainingRecords?.resetAt),
        }
      }
    )
  } catch (error) {
    console.error('Feedback API error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
