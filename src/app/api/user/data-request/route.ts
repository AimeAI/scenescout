import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Rate limiting storage
const rateLimitStore = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

function getRateLimitKey(email: string): string {
  return `data-request:${email}`
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

export async function POST(req: NextRequest) {
  try {
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

    // Check rate limit
    const rateLimitKey = getRateLimitKey(user.email || user.id)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'You can only request your data once per 24 hours.' },
        { status: 429 }
      )
    }

    // Collect user data summary
    const { data: savedEvents } = await supabase
      .from('saved_events')
      .select('*')
      .eq('user_id', user.id)

    const { data: reminders } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('user_id', user.id)

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Generate data summary email
    const dataSummary = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0;">Your SceneScout Data</h1>
    <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Personal Data Export Summary</p>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Account Information</h2>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>User ID:</strong> ${user.id}</p>
    <p><strong>Account Created:</strong> ${new Date(user.created_at!).toLocaleDateString()}</p>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Data Summary</h2>
    <ul style="list-style: none; padding: 0;">
      <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        📌 <strong>Saved Events:</strong> ${savedEvents?.length || 0}
      </li>
      <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        ⏰ <strong>Event Reminders:</strong> ${reminders?.length || 0}
      </li>
      <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        ⚙️ <strong>Preferences:</strong> ${preferences ? 'Set' : 'Not set'}
      </li>
    </ul>
  </div>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
    <p style="margin: 0;"><strong>📥 Complete Data Export</strong></p>
    <p style="margin-top: 10px;">To download your complete data as a JSON file, visit your Privacy Settings and click "Download My Data".</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/privacy"
       style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
      Go to Privacy Settings
    </a>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin-top: 0;">Your Rights</h3>
    <p style="font-size: 14px; color: #666;">Under GDPR and PIPEDA, you have the right to:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>Access your personal data (this report)</li>
      <li>Rectify inaccurate data (via account settings)</li>
      <li>Erase your data (delete account)</li>
      <li>Export your data in a portable format</li>
      <li>Object to data processing</li>
    </ul>
  </div>

  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
    <p>This email was sent in response to your data request.</p>
    <p>Questions? Email us at <a href="mailto:privacy@scenescout.app" style="color: #7c3aed;">privacy@scenescout.app</a></p>
  </div>
</body>
</html>
    `

    // Send email using Resend
    if (process.env.RESEND_API_KEY && user.email) {
      const resend = new Resend(process.env.RESEND_API_KEY)

      try {
        await resend.emails.send({
          from: 'SceneScout <privacy@scenescout.app>',
          to: user.email,
          subject: 'Your SceneScout Data Report',
          html: dataSummary,
        })
      } catch (emailError) {
        console.error('Failed to send data request email:', emailError)
        // Continue even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data request email has been sent to your email address.',
      summary: {
        saved_events: savedEvents?.length || 0,
        reminders: reminders?.length || 0,
        has_preferences: !!preferences,
      },
    })
  } catch (error) {
    console.error('Data request error:', error)
    return NextResponse.json(
      { error: 'Failed to process data request. Please try again later.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to request your data.' },
    { status: 405 }
  )
}
