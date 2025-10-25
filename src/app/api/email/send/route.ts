import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendBetaInvite,
  sendWelcomeEmail,
  sendEventReminder,
  sendWeeklyDigest,
  isEmailConfigured,
} from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/send
 * Send transactional emails
 */
export async function POST(request: NextRequest) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const { type, ...params } = await request.json();

    if (!type) {
      return NextResponse.json(
        { error: 'Email type is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'beta_invite':
        if (!params.email || !params.code) {
          return NextResponse.json(
            { error: 'Email and code are required' },
            { status: 400 }
          );
        }
        result = await sendBetaInvite(
          params.email,
          params.code,
          params.recipientName
        );
        break;

      case 'welcome':
        if (!params.email || !params.name) {
          return NextResponse.json(
            { error: 'Email and name are required' },
            { status: 400 }
          );
        }
        result = await sendWelcomeEmail(params.email, params.name);
        break;

      case 'reminder':
        if (!params.email || !params.userName || !params.eventData) {
          return NextResponse.json(
            { error: 'Email, userName, and eventData are required' },
            { status: 400 }
          );
        }
        result = await sendEventReminder(
          params.email,
          params.userName,
          params.eventData
        );
        break;

      case 'digest':
        if (!params.email || !params.userName || !params.events) {
          return NextResponse.json(
            { error: 'Email, userName, and events are required' },
            { status: 400 }
          );
        }
        result = await sendWeeklyDigest(
          params.email,
          params.userName,
          params.events,
          params.cityName
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/send
 * Check email service status
 */
export async function GET() {
  try {
    const configured = isEmailConfigured();

    return NextResponse.json({
      configured,
      status: configured ? 'ready' : 'not_configured',
      provider: 'Resend',
    });
  } catch (error) {
    console.error('Error checking email status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
