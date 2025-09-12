import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface ReminderEvent {
  id: string;
  title: string;
  start_time: string;
  timezone: string;
  venue_id: string;
  ticket_url: string;
  image_url: string;
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
}

interface UserReminder {
  id: string;
  user_id: string;
  event_id: string;
  reminder_time: string;
  notification_method: 'push' | 'email' | 'both';
  status: 'pending' | 'sent' | 'failed';
  user: {
    id: string;
    email: string;
    push_token: string;
    timezone: string;
    notification_preferences: any;
  };
  event: ReminderEvent;
}

interface PushNotification {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
}

interface EmailReminder {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send push notification using Expo Push API
 */
async function sendPushNotification(notification: PushNotification): Promise<boolean> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([notification])
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send push notification:', error);
      return false;
    }

    const result = await response.json();
    console.log('Push notification result:', result);
    
    return result.data?.[0]?.status === 'ok';
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send email reminder using Resend API
 */
async function sendEmailReminder(email: EmailReminder): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('Resend API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SceneScout Reminders <reminders@scenescout.app>',
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email reminder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email reminder:', error);
    return false;
  }
}

/**
 * Generate email reminder HTML
 */
function generateReminderEmail(reminder: UserReminder): EmailReminder {
  const event = reminder.event;
  const venue = event.venue;
  const startTime = new Date(event.start_time);
  
  const dateStr = startTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = startTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const subject = `🔔 Reminder: ${event.title} starts soon!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder - SceneScout</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .event-card { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #007bff; }
    .cta-button { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #007bff; margin: 0;">🔔 Event Reminder</h1>
  </div>

  <div class="event-card">
    ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" style="width: 100%; max-width: 400px; height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;">` : ''}
    
    <h2 style="color: #1a1a1a; margin: 0 0 15px 0;">${event.title}</h2>
    
    <p style="font-size: 16px; margin: 10px 0;">
      <strong>📅 ${dateStr}</strong><br>
      <strong>🕐 ${timeStr}</strong>
    </p>
    
    ${venue ? `<p style="font-size: 16px; margin: 10px 0;">
      <strong>📍 ${venue.name}</strong><br>
      ${venue.address}, ${venue.city}, ${venue.state}
    </p>` : ''}

    <div style="text-align: center; margin: 25px 0;">
      <a href="${event.ticket_url}" class="cta-button">View Event Details</a>
      ${venue ? `<a href="https://maps.google.com/?q=${encodeURIComponent(venue.address + ', ' + venue.city + ', ' + venue.state)}" class="cta-button" style="background: #28a745;">Get Directions</a>` : ''}
    </div>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <p style="font-size: 18px; color: #007bff;">
      ✨ Have a great time at the event!
    </p>
  </div>

  <div class="footer">
    <p>This is a reminder for an event you saved on SceneScout.</p>
    <p>
      <a href="https://scenescout.app/reminders">Manage Reminders</a> | 
      <a href="https://scenescout.app/preferences">Update Preferences</a>
    </p>
    <p>&copy; 2024 SceneScout. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const text = `
Event Reminder - SceneScout

${event.title}

Date: ${dateStr}
Time: ${timeStr}
${venue ? `Venue: ${venue.name}\nAddress: ${venue.address}, ${venue.city}, ${venue.state}` : ''}

View event details: ${event.ticket_url}
${venue ? `Get directions: https://maps.google.com/?q=${encodeURIComponent(venue.address + ', ' + venue.city + ', ' + venue.state)}` : ''}

Have a great time at the event!

Manage your reminders at https://scenescout.app/reminders
  `;

  return {
    to: reminder.user.email,
    subject,
    html,
    text
  };
}

/**
 * Calculate time until event starts
 */
function getTimeUntilEvent(eventTime: string): string {
  const now = new Date();
  const event = new Date(eventTime);
  const diff = event.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} minutes`;
  }
}

/**
 * Supabase Edge Function to send event reminders via push notifications and email
 * Processes pending reminders and sends them at the appropriate time
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get query parameters
    const url = new URL(req.url);
    const testMode = url.searchParams.get('test') === 'true';
    const userEmail = url.searchParams.get('user_email');
    const lookAheadMinutes = parseInt(url.searchParams.get('look_ahead') || '5');

    console.log(`Processing event reminders ${testMode ? '(test mode)' : ''}`);

    // Calculate time window for reminders to send
    const now = new Date();
    const windowEnd = new Date(now.getTime() + lookAheadMinutes * 60 * 1000);

    // Get pending reminders that should be sent now
    let remindersQuery = supabase
      .from('user_reminders')
      .select(`
        id,
        user_id,
        event_id,
        reminder_time,
        notification_method,
        status,
        users!inner (
          id,
          email,
          push_token,
          timezone,
          notification_preferences
        ),
        events!inner (
          id,
          title,
          start_time,
          timezone,
          venue_id,
          ticket_url,
          image_url,
          venues (
            id,
            name,
            address,
            city,
            state
          )
        )
      `)
      .eq('status', 'pending')
      .lte('reminder_time', windowEnd.toISOString())
      .gte('reminder_time', new Date(now.getTime() - 60 * 60 * 1000).toISOString()); // Don't send reminders more than 1 hour late

    // Filter for test mode
    if (testMode && userEmail) {
      remindersQuery = remindersQuery.eq('users.email', userEmail);
    }

    const { data: reminders, error: remindersError } = await remindersQuery;

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders', details: remindersError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${reminders?.length || 0} reminders to process`);

    const results = {
      totalReminders: reminders?.length || 0,
      pushSent: 0,
      emailsSent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each reminder
    for (const reminder of reminders || []) {
      try {
        console.log(`Processing reminder ${reminder.id} for event ${reminder.event_id}`);

        const user = reminder.users;
        const event = reminder.events;
        const venue = event.venues;

        // Validate reminder data
        if (!user || !event) {
          console.error(`Invalid reminder data for ${reminder.id}`);
          results.errors.push(`Invalid reminder data for ${reminder.id}`);
          continue;
        }

        // Check if event hasn't been cancelled
        const { data: currentEvent } = await supabase
          .from('events')
          .select('status')
          .eq('id', event.id)
          .single();

        if (currentEvent?.status !== 'active') {
          console.log(`Skipping reminder for cancelled/inactive event ${event.id}`);
          
          // Mark reminder as completed since event is cancelled
          await supabase
            .from('user_reminders')
            .update({ 
              status: 'sent',
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);
          
          continue;
        }

        const timeUntilEvent = getTimeUntilEvent(event.start_time);
        let pushSent = false;
        let emailSent = false;

        // Send push notification if requested and user has push token
        if (
          (reminder.notification_method === 'push' || reminder.notification_method === 'both') &&
          user.push_token &&
          user.notification_preferences?.push_enabled
        ) {
          const pushNotification: PushNotification = {
            to: user.push_token,
            title: `🎭 ${event.title} starts in ${timeUntilEvent}`,
            body: venue ? `at ${venue.name}` : 'Don\'t forget!',
            data: {
              eventId: event.id,
              type: 'event_reminder',
              url: event.ticket_url
            },
            sound: 'default',
            badge: 1
          };

          pushSent = await sendPushNotification(pushNotification);
          if (pushSent) {
            results.pushSent++;
          }
        }

        // Send email reminder if requested
        if (
          (reminder.notification_method === 'email' || reminder.notification_method === 'both') &&
          user.email &&
          user.notification_preferences?.email_reminders
        ) {
          const emailReminder = generateReminderEmail({
            ...reminder,
            user,
            event: {
              ...event,
              venue
            }
          } as UserReminder);

          emailSent = await sendEmailReminder(emailReminder);
          if (emailSent) {
            results.emailsSent++;
          }
        }

        // Update reminder status
        const success = (reminder.notification_method === 'push' && pushSent) ||
                       (reminder.notification_method === 'email' && emailSent) ||
                       (reminder.notification_method === 'both' && (pushSent || emailSent));

        const newStatus = success ? 'sent' : 'failed';
        
        await supabase
          .from('user_reminders')
          .update({ 
            status: newStatus,
            sent_at: success ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        if (success) {
          console.log(`✅ Sent reminder for ${event.title} to ${user.email}`);
          
          // Create notification record
          await supabase
            .from('user_notifications')
            .insert({
              user_id: user.id,
              type: 'event_reminder',
              title: 'Event Reminder Sent',
              message: `Reminder sent for ${event.title}`,
              data: { 
                event_id: event.id,
                reminder_id: reminder.id,
                methods_used: {
                  push: pushSent,
                  email: emailSent
                }
              },
              read: false,
              sent_at: new Date().toISOString()
            });
        } else {
          results.failed++;
          results.errors.push(`Failed to send reminder for event ${event.title} to ${user.email}`);
        }

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        results.failed++;
        results.errors.push(`Error processing reminder ${reminder.id}: ${error.message}`);

        // Mark as failed
        try {
          await supabase
            .from('user_reminders')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);
        } catch (updateError) {
          console.error(`Failed to update reminder status for ${reminder.id}:`, updateError);
        }
      }
    }

    console.log(`Reminders processed: ${results.pushSent} push, ${results.emailsSent} emails, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reminders function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});