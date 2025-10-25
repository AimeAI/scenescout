import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEventReminder } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/send-reminders
 * Cron job to send event reminders
 * Should be called via Vercel Cron or similar scheduler
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.API_SECRET_KEY;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const nowPlus24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find reminders that need to be sent
    // - reminder_time is in the next 24 hours
    // - sent is false
    const { data: reminders, error: reminderError } = await supabase
      .from('reminders')
      .select(`
        id,
        reminder_time,
        notification_sent,
        user_saved_events!inner (
          user_id,
          event_id,
          events!inner (
            id,
            name,
            slug,
            event_date,
            start_time,
            location_name,
            featured_image_url
          )
        ),
        users!inner (
          id,
          email,
          profiles (
            display_name,
            username
          )
        )
      `)
      .eq('notification_sent', false)
      .gte('reminder_time', now.toISOString())
      .lte('reminder_time', nowPlus24Hours.toISOString());

    if (reminderError) {
      console.error('Error fetching reminders:', reminderError);
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      );
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        sent: 0,
      });
    }

    const results = [];

    // Process each reminder
    for (const reminder of reminders) {
      try {
        const savedEvent = reminder.user_saved_events as any;
        const event = savedEvent?.events;
        const user = reminder.users as any;

        if (!event || !user) continue;

        const userName =
          user.profiles?.[0]?.display_name ||
          user.profiles?.[0]?.username ||
          user.email?.split('@')[0] || 'User';

        // Calculate hours until event
        const eventTime = new Date(`${event.event_date}T${event.start_time || '00:00:00'}`);
        const hoursUntil = Math.max(
          0,
          Math.floor((eventTime.getTime() - now.getTime()) / (1000 * 60 * 60))
        );

        // Format date and time
        const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const eventTime_formatted = event.start_time
          ? new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'Time TBA';

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scenescout.app';
        const eventUrl = `${appUrl}/events/${event.slug}`;

        // Send reminder email
        const result = await sendEventReminder(user.email || '', userName, {
          eventName: event.name,
          eventDate: eventDate,
          eventTime: eventTime_formatted,
          eventLocation: event.location_name || 'Location TBA',
          eventUrl: eventUrl,
          eventImageUrl: event.featured_image_url || undefined,
          hoursUntil: hoursUntil,
        });

        // Update reminder status
        if (result.success) {
          await supabase
            .from('reminders')
            .update({
              notification_sent: true,
              sent_at: now.toISOString(),
            })
            .eq('id', reminder.id);

          results.push({
            reminderId: reminder.id,
            eventName: event.name,
            userEmail: user.email || '',
            success: true,
          });
        } else {
          results.push({
            reminderId: reminder.id,
            eventName: event.name,
            userEmail: user.email || '',
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        console.error('Error processing reminder:', reminder.id, error);
        results.push({
          reminderId: reminder.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${reminders.length} reminders`,
      sent: successCount,
      failed: failureCount,
      results: results,
    });
  } catch (error) {
    console.error('Error in send-reminders cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
