import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendBetaInvite } from '@/lib/email';

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
 * POST /api/beta/generate-invites
 * Generates invite codes (admin only)
 * Can bulk generate or generate for specific emails
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify user is admin
    const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const {
      count = 1,
      emails = [],
      maxUses = 1,
      expiresInDays = null,
      sendEmail = false,
    } = await request.json();

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      );
    }

    const invites = [];
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Generate codes
    const codes: string[] = [];
    for (let i = 0; i < (emails.length || count); i++) {
      const { data: codeData } = await getSupabaseClient().rpc('generate_invite_code');
      if (codeData) {
        codes.push(codeData);
      }
    }

    // Insert invites
    for (let i = 0; i < codes.length; i++) {
      const email = emails[i] || null;
      invites.push({
        code: codes[i],
        email: email?.toLowerCase() || null,
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: user.id,
      });
    }

    const { data: insertedInvites, error: insertError } = await supabase
      .from('beta_invites')
      .insert(invites)
      .select();

    if (insertError) {
      console.error('Error inserting invites:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate invites' },
        { status: 500 }
      );
    }

    // Send emails if requested
    const emailResults = [];
    if (sendEmail && insertedInvites) {
      for (const invite of insertedInvites) {
        if (invite.email) {
          const result = await sendBetaInvite(
            invite.email,
            invite.code,
            invite.email.split('@')[0]
          );
          emailResults.push({
            email: invite.email,
            code: invite.code,
            sent: result.success,
            error: result.error,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      invites: insertedInvites,
      emailsSent: emailResults.length,
      emailResults: emailResults.length > 0 ? emailResults : undefined,
    });
  } catch (error) {
    console.error('Error generating invites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/beta/generate-invites
 * Get all invites (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: invites, error } = await supabase
      .from('beta_invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
