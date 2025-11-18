import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { render } from '@react-email/components';
import BetaInviteEmail from '@/emails/BetaInvite';
import WelcomeToBetaEmail from '@/emails/WelcomeToBeta';
import EventReminderEmail from '@/emails/EventReminder';
import WeeklyDigestEmail from '@/emails/WeeklyDigest';

// Lazy initialize Resend to avoid build errors when API key is not set
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Initialize Supabase (for logging)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@scenescout.app';
const FROM_NAME = 'SceneScout';

interface EmailLogData {
  recipient_email: string;
  email_type: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  resend_id?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Log email delivery to database
 */
async function logEmail(data: EmailLogData) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert([data]);

    if (error) {
      console.error('Failed to log email:', error);
    }
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Send beta invite email with invite code
 */
export async function sendBetaInvite(
  email: string,
  code: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = render(
      BetaInviteEmail({ inviteCode: code, recipientName })
    );

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: "You're invited to SceneScout Beta!",
      html: emailHtml,
    });

    if (error) {
      await logEmail({
        recipient_email: email,
        email_type: 'beta_invite',
        subject: "You're invited to SceneScout Beta!",
        status: 'failed',
        error_message: error.message,
        metadata: { code },
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      recipient_email: email,
      email_type: 'beta_invite',
      subject: "You're invited to SceneScout Beta!",
      status: 'sent',
      resend_id: data?.id,
      metadata: { code },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending beta invite:', error);

    await logEmail({
      recipient_email: email,
      email_type: 'beta_invite',
      subject: "You're invited to SceneScout Beta!",
      status: 'failed',
      error_message: errorMessage,
      metadata: { code },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Send welcome email after user signs up
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = render(
      WelcomeToBetaEmail({ userName: name, userEmail: email })
    );

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to SceneScout!',
      html: emailHtml,
    });

    if (error) {
      await logEmail({
        recipient_email: email,
        email_type: 'welcome',
        subject: 'Welcome to SceneScout!',
        status: 'failed',
        error_message: error.message,
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      recipient_email: email,
      email_type: 'welcome',
      subject: 'Welcome to SceneScout!',
      status: 'sent',
      resend_id: data?.id,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending welcome email:', error);

    await logEmail({
      recipient_email: email,
      email_type: 'welcome',
      subject: 'Welcome to SceneScout!',
      status: 'failed',
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

interface EventReminderData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
  eventImageUrl?: string;
  hoursUntil: number;
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(
  email: string,
  userName: string,
  eventData: EventReminderData
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = render(
      EventReminderEmail({
        userName,
        ...eventData,
      })
    );

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Reminder: ${eventData.eventName}`,
      html: emailHtml,
    });

    if (error) {
      await logEmail({
        recipient_email: email,
        email_type: 'reminder',
        subject: `Reminder: ${eventData.eventName}`,
        status: 'failed',
        error_message: error.message,
        metadata: { eventName: eventData.eventName },
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      recipient_email: email,
      email_type: 'reminder',
      subject: `Reminder: ${eventData.eventName}`,
      status: 'sent',
      resend_id: data?.id,
      metadata: { eventName: eventData.eventName },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending event reminder:', error);

    await logEmail({
      recipient_email: email,
      email_type: 'reminder',
      subject: `Reminder: ${eventData.eventName}`,
      status: 'failed',
      error_message: errorMessage,
      metadata: { eventName: eventData.eventName },
    });

    return { success: false, error: errorMessage };
  }
}

interface SavedEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  url: string;
}

/**
 * Send weekly digest email with saved events
 */
export async function sendWeeklyDigest(
  email: string,
  userName: string,
  events: SavedEvent[],
  cityName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = render(
      WeeklyDigestEmail({
        userName,
        events,
        cityName,
      })
    );

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Your Weekly Digest - ${events.length} Events`,
      html: emailHtml,
    });

    if (error) {
      await logEmail({
        recipient_email: email,
        email_type: 'digest',
        subject: `Your Weekly Digest - ${events.length} Events`,
        status: 'failed',
        error_message: error.message,
        metadata: { eventCount: events.length },
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      recipient_email: email,
      email_type: 'digest',
      subject: `Your Weekly Digest - ${events.length} Events`,
      status: 'sent',
      resend_id: data?.id,
      metadata: { eventCount: events.length },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending weekly digest:', error);

    await logEmail({
      recipient_email: email,
      email_type: 'digest',
      subject: `Your Weekly Digest - ${events.length} Events`,
      status: 'failed',
      error_message: errorMessage,
      metadata: { eventCount: events.length },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Verify email configuration
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM_EMAIL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!isEmailConfigured()) {
      return {
        success: false,
        error: 'Email service not configured. Please check environment variables.',
      };
    }

    // Test with a simple API call
    const { error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: 'test@resend.dev', // Resend's test email
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
