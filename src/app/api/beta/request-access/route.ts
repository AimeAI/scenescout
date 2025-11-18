export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialize Supabase to avoid build errors when env vars are not set
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase configuration is missing');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * POST /api/beta/request-access
 * Adds user to the beta waitlist
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, referralSource } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if already on waitlist
    const { data: existing } = await getSupabaseClient()
      .from('beta_waitlist')
      .select('id, invited_at')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.invited_at) {
        return NextResponse.json(
          {
            error: 'You have already been invited! Check your email.',
            alreadyInvited: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'You are already on the waitlist. We will notify you soon!',
          alreadyOnWaitlist: true,
        },
        { status: 409 }
      );
    }

    // Add to waitlist
    const { data, error } = await getSupabaseClient()
      .from('beta_waitlist')
      .insert([
        {
          email: email.toLowerCase(),
          name: name || null,
          referral_source: referralSource || null,
          priority_score: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding to waitlist:', error);
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
      position: data.priority_score,
    });
  } catch (error) {
    console.error('Error processing waitlist request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
