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
 * POST /api/beta/use-invite
 * Redeems an invite code and grants beta access
 */
export async function POST(request: NextRequest) {
  try {
    const { code, userId, email } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Normalize code
    const normalizedCode = code.toUpperCase().trim();

    // Use the database function to redeem the invite
    const { data, error } = await getSupabaseClient().rpc('use_invite_code', {
      invite_code: normalizedCode,
      p_user_id: userId,
      p_email: email,
    });

    if (error) {
      console.error('Error using invite code:', error);
      return NextResponse.json(
        { error: 'Failed to redeem invite code' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Beta access granted!',
    });
  } catch (error) {
    console.error('Error redeeming invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
