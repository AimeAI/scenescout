import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Rate limiting storage
const rateLimitStore = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getRateLimitKey(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') ||
             'unknown'
  return `export:${ip}`
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const lastRequest = rateLimitStore.get(key)

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    return false
  }

  rateLimitStore.set(key, now)
  return true
}

// Cleanup old rate limit records
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of rateLimitStore.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key)
    }
  }
}, 15 * 60 * 1000) // Every 15 minutes

export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(req)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'You can only export your data once per hour. Please try again later.' },
        { status: 429 }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Get current user
    const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Collect all user data
    const exportData: Record<string, any> = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      account_created: user.created_at,
      data: {},
    }

    // Fetch saved events
    const { data: savedEvents } = await supabase
      .from('saved_events')
      .select('*')
      .eq('user_id', user.id)
    exportData.data.saved_events = savedEvents || []

    // Fetch event reminders
    const { data: reminders } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('user_id', user.id)
    exportData.data.event_reminders = reminders || []

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    exportData.data.user_preferences = preferences || null

    // Fetch push subscriptions
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
    exportData.data.push_subscriptions = pushSubs || []

    // Fetch beta feedback (if exists)
    const { data: feedback } = await supabase
      .from('beta_feedback')
      .select('*')
      .eq('email', user.email)
    exportData.data.beta_feedback = feedback || []

    // Fetch email logs (if table exists)
    const { data: emailLogs } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    exportData.data.email_logs = emailLogs || []

    // Calculate statistics
    exportData.statistics = {
      total_saved_events: exportData.data.saved_events.length,
      total_reminders: exportData.data.event_reminders.length,
      total_feedback_submissions: exportData.data.beta_feedback.length,
      total_emails_sent: exportData.data.email_logs.length,
    }

    // Return JSON export
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="scenescout-data-export-${user.id}.json"`,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data. Please try again later.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to export your data.' },
    { status: 405 }
  )
}
