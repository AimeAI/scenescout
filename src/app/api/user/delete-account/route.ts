export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase client with user's token for auth
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Create service role client for deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { confirmation, feedback } = body

    // Require explicit confirmation
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Please type "DELETE MY ACCOUNT" to confirm deletion' },
        { status: 400 }
      )
    }

    // Log deletion request (for audit trail)
    console.log(`Account deletion requested for user ${user.id} (${user.email})`)
    if (feedback) {
      console.log(`Deletion feedback: ${feedback}`)
    }

    // Delete user data (cascading deletes will handle related records)
    const deletionResults: Record<string, any> = {}

    // Delete saved events
    const { error: savedEventsError } = await supabaseAdmin
      .from('saved_events')
      .delete()
      .eq('user_id', user.id)
    deletionResults.saved_events = savedEventsError ? 'failed' : 'success'

    // Delete event reminders
    const { error: remindersError } = await supabaseAdmin
      .from('event_reminders')
      .delete()
      .eq('user_id', user.id)
    deletionResults.event_reminders = remindersError ? 'failed' : 'success'

    // Delete user preferences
    const { error: preferencesError } = await supabaseAdmin
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)
    deletionResults.user_preferences = preferencesError ? 'failed' : 'success'

    // Delete push subscriptions
    const { error: pushSubsError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
    deletionResults.push_subscriptions = pushSubsError ? 'failed' : 'success'

    // Anonymize beta feedback (don't delete, keep for analytics)
    const { error: feedbackError } = await supabaseAdmin
      .from('beta_feedback')
      .update({ email: null, user_agent: 'DELETED' })
      .eq('email', user.email)
    deletionResults.beta_feedback = feedbackError ? 'failed' : 'anonymized'

    // Delete email logs
    const { error: emailLogsError } = await supabaseAdmin
      .from('email_logs')
      .delete()
      .eq('user_id', user.id)
    deletionResults.email_logs = emailLogsError ? 'failed' : 'success'

    // Finally, delete the auth user account
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('Failed to delete user account:', deleteUserError)
      return NextResponse.json(
        {
          error: 'Failed to delete account. Some data may have been removed. Please contact support.',
          deletionResults,
        },
        { status: 500 }
      )
    }

    deletionResults.user_account = 'deleted'

    // Log successful deletion
    console.log(`Successfully deleted account for user ${user.id}`, deletionResults)

    // TODO: Send confirmation email (if email service is set up)
    // await sendAccountDeletionEmail(user.email)

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
      deletionResults,
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to delete your account.' },
    { status: 405 }
  )
}
