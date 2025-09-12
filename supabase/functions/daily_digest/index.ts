import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface UserPreferences {
  id: string;
  user_id: string;
  categories: string[];
  max_distance: number;
  price_range: { min: number; max: number } | null;
  notification_frequency: 'daily' | 'weekly' | 'none';
  preferred_times: string[];
  blacklisted_venues: string[];
  favorite_venues: string[];
  tags: string[];
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  timezone: string;
  venue_id: string;
  category: string;
  subcategory: string;
  tags: string[];
  price_min: number;
  price_max: number;
  price_currency: string;
  ticket_url: string;
  image_url: string;
  source: string;
  hotness_score: number;
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
}

interface DigestEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format event for email display
 */
function formatEventForEmail(event: Event): string {
  const venue = event.venue;
  const startDate = new Date(event.start_time);
  const dateStr = startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = startDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const priceStr = event.price_min && event.price_max
    ? `$${event.price_min}${event.price_min !== event.price_max ? ` - $${event.price_max}` : ''}`
    : event.price_min === 0 ? 'Free' : 'Price varies';

  return `
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" style="width: 100%; max-width: 400px; height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;">` : ''}
      <h3 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 20px;">
        <a href="${event.ticket_url}" style="color: #1a1a1a; text-decoration: none;">${event.title}</a>
      </h3>
      <p style="color: #666; margin: 5px 0; font-size: 14px;">
        <strong>📅 ${dateStr} at ${timeStr}</strong>
      </p>
      ${venue ? `<p style="color: #666; margin: 5px 0; font-size: 14px;">
        <strong>📍 ${venue.name}</strong><br>
        ${venue.address}, ${venue.city}, ${venue.state}
      </p>` : ''}
      <p style="color: #666; margin: 5px 0; font-size: 14px;">
        <strong>💰 ${priceStr}</strong>
      </p>
      ${event.description ? `<p style="color: #444; margin: 10px 0; font-size: 14px; line-height: 1.4;">
        ${event.description.length > 200 ? event.description.substring(0, 200) + '...' : event.description}
      </p>` : ''}
      <p style="margin: 15px 0 0 0;">
        <a href="${event.ticket_url}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 14px;">
          Get Tickets
        </a>
      </p>
    </div>
  `;
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(events: Event[], userEmail: string): string {
  const eventsHTML = events.map(formatEventForEmail).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SceneScout Daily Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #007bff; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
    a { color: #007bff; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #007bff; margin: 0;">🎭 SceneScout</h1>
    <p style="margin: 10px 0 0 0; color: #666;">Your Daily Event Digest</p>
  </div>

  <h2 style="color: #1a1a1a; margin-bottom: 20px;">
    🔥 ${events.length} Events Happening Near You
  </h2>

  ${eventsHTML}

  <div style="text-align: center; margin: 40px 0;">
    <a href="https://scenescout.app" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
      Discover More Events
    </a>
  </div>

  <div class="footer">
    <p>You're receiving this because you signed up for SceneScout daily digests.</p>
    <p>
      <a href="https://scenescout.app/preferences">Update Preferences</a> | 
      <a href="https://scenescout.app/unsubscribe?email=${encodeURIComponent(userEmail)}">Unsubscribe</a>
    </p>
    <p>&copy; 2024 SceneScout. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of email
 */
function generateEmailText(events: Event[]): string {
  let text = `SceneScout Daily Digest\n\n${events.length} Events Happening Near You\n\n`;
  
  events.forEach((event, index) => {
    const venue = event.venue;
    const startDate = new Date(event.start_time);
    const dateStr = startDate.toLocaleDateString('en-US');
    const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const priceStr = event.price_min && event.price_max
      ? `$${event.price_min}${event.price_min !== event.price_max ? ` - $${event.price_max}` : ''}`
      : event.price_min === 0 ? 'Free' : 'Price varies';

    text += `${index + 1}. ${event.title}\n`;
    text += `   Date: ${dateStr} at ${timeStr}\n`;
    if (venue) {
      text += `   Venue: ${venue.name}\n`;
      text += `   Address: ${venue.address}, ${venue.city}, ${venue.state}\n`;
    }
    text += `   Price: ${priceStr}\n`;
    if (event.description) {
      const desc = event.description.length > 150 ? event.description.substring(0, 150) + '...' : event.description;
      text += `   Description: ${desc}\n`;
    }
    text += `   Tickets: ${event.ticket_url}\n\n`;
  });

  text += `Discover more events at https://scenescout.app\n\n`;
  text += `Update your preferences or unsubscribe at https://scenescout.app/preferences`;

  return text;
}

/**
 * Send email using Resend API
 */
async function sendEmail(email: DigestEmail): Promise<boolean> {
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
        from: 'SceneScout <digest@scenescout.app>',
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Supabase Edge Function to send daily digest emails to users
 * Collects personalized event recommendations and sends them via email
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
    const limit = parseInt(url.searchParams.get('limit') || '20');

    console.log(`Starting daily digest generation ${testMode ? '(test mode)' : ''}`);

    // Get users who want daily digest emails
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        notification_preferences,
        location_lat,
        location_lng,
        timezone,
        user_preferences (
          categories,
          max_distance,
          price_range,
          preferred_times,
          blacklisted_venues,
          favorite_venues,
          tags
        )
      `)
      .eq('notification_preferences->>email_digest', true)
      .eq('notification_preferences->>frequency', 'daily')
      .not('email', 'is', null);

    if (userError) {
      console.error('Error fetching users:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: userError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter users for test mode
    const targetUsers = testMode && userEmail 
      ? users?.filter(user => user.email === userEmail) || []
      : users || [];

    console.log(`Found ${targetUsers.length} users for daily digest`);

    const results = {
      totalUsers: targetUsers.length,
      emailsSent: 0,
      emailsFailed: 0,
      errors: [] as string[]
    };

    // Process each user
    for (const user of targetUsers) {
      try {
        console.log(`Processing digest for user: ${user.email}`);

        const userLat = user.location_lat || 37.7749; // SF default
        const userLng = user.location_lng || -122.4194;
        const preferences = user.user_preferences?.[0] || {};
        const maxDistance = preferences.max_distance || 25; // miles

        // Build query for personalized events
        let eventsQuery = supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            timezone,
            venue_id,
            category,
            subcategory,
            tags,
            price_min,
            price_max,
            price_currency,
            ticket_url,
            image_url,
            source,
            hotness_score,
            venues!inner (
              id,
              name,
              address,
              city,
              state,
              latitude,
              longitude
            )
          `)
          .eq('status', 'active')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Next 7 days
          .order('hotness_score', { ascending: false })
          .limit(50); // Get more to filter by distance

        // Filter by categories if specified
        if (preferences.categories && preferences.categories.length > 0) {
          eventsQuery = eventsQuery.in('category', preferences.categories);
        }

        // Filter by price range if specified
        if (preferences.price_range) {
          if (preferences.price_range.min !== null) {
            eventsQuery = eventsQuery.gte('price_min', preferences.price_range.min);
          }
          if (preferences.price_range.max !== null) {
            eventsQuery = eventsQuery.lte('price_max', preferences.price_range.max);
          }
        }

        const { data: events, error: eventsError } = await eventsQuery;

        if (eventsError) {
          console.error(`Error fetching events for user ${user.email}:`, eventsError);
          results.errors.push(`Failed to fetch events for ${user.email}: ${eventsError.message}`);
          continue;
        }

        if (!events || events.length === 0) {
          console.log(`No events found for user ${user.email}`);
          continue;
        }

        // Filter events by distance and user preferences
        const filteredEvents: Event[] = [];
        
        for (const event of events) {
          try {
            const venue = event.venues;
            if (!venue || !venue.latitude || !venue.longitude) continue;

            // Calculate distance
            const distance = calculateDistance(userLat, userLng, venue.latitude, venue.longitude);
            if (distance > maxDistance) continue;

            // Skip blacklisted venues
            if (preferences.blacklisted_venues && preferences.blacklisted_venues.includes(venue.id)) {
              continue;
            }

            // Boost favorite venues
            let score = event.hotness_score || 0;
            if (preferences.favorite_venues && preferences.favorite_venues.includes(venue.id)) {
              score += 20;
            }

            // Match tags
            if (preferences.tags && preferences.tags.length > 0) {
              const eventTags = event.tags || [];
              const hasMatchingTags = preferences.tags.some(tag => 
                eventTags.some(eventTag => eventTag.toLowerCase().includes(tag.toLowerCase()))
              );
              if (hasMatchingTags) score += 10;
            }

            filteredEvents.push({
              ...event,
              hotness_score: score,
              venue: venue
            } as Event);

          } catch (error) {
            console.error(`Error processing event ${event.id} for user ${user.email}:`, error);
            continue;
          }
        }

        // Sort by adjusted hotness score and limit
        const topEvents = filteredEvents
          .sort((a, b) => (b.hotness_score || 0) - (a.hotness_score || 0))
          .slice(0, limit);

        if (topEvents.length === 0) {
          console.log(`No matching events found for user ${user.email} after filtering`);
          continue;
        }

        // Generate and send email
        const subject = `🎭 ${topEvents.length} Events This Week - SceneScout Daily Digest`;
        const html = generateEmailHTML(topEvents, user.email);
        const text = generateEmailText(topEvents);

        const emailSent = await sendEmail({
          to: user.email,
          subject,
          html,
          text
        });

        if (emailSent) {
          results.emailsSent++;
          console.log(`✅ Sent digest to ${user.email} with ${topEvents.length} events`);

          // Log the digest send in the database
          await supabase
            .from('user_notifications')
            .insert({
              user_id: user.id,
              type: 'email_digest',
              title: 'Daily Digest Sent',
              message: `Sent daily digest with ${topEvents.length} events`,
              read: true,
              sent_at: new Date().toISOString()
            });

        } else {
          results.emailsFailed++;
          results.errors.push(`Failed to send email to ${user.email}`);
        }

      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        results.emailsFailed++;
        results.errors.push(`Error processing ${user.email}: ${error.message}`);
      }
    }

    console.log(`Daily digest completed: ${results.emailsSent} sent, ${results.emailsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily_digest function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});