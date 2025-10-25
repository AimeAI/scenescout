import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/beta/validate-invite
 * Validates if an invite code is valid and can be used
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required', valid: false },
        { status: 400 }
      );
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim();

    // Check if code exists
    const { data: invite, error } = await supabase
      .from('beta_invites')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (error || !invite) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid invite code',
        },
        { status: 404 }
      );
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This invite code has expired',
        },
        { status: 410 }
      );
    }

    // Check if max uses reached
    if (invite.current_uses >= invite.max_uses) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This invite code has already been used',
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: normalizedCode,
      email: invite.email || null,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}
