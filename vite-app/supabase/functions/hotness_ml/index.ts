import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface EventFeatures {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  price_min: number;
  price_max: number;
  start_time: string;
  venue_rating?: number;
  venue_review_count?: number;
  source: string;
  age_restriction?: string;
  capacity?: number;
  attendee_count?: number;
  image_url?: string;
  ticket_url?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
    venue_type: string;
    amenities: string[];
  };
  historical_data?: {
    avg_attendance?: number;
    avg_rating?: number;
    repeat_attendees?: number;
    social_mentions?: number;
  };
}

interface MLFeatures {
  // Time-based features
  days_until_event: number;
  hour_of_day: number;
  day_of_week: number;
  is_weekend: boolean;
  is_holiday: boolean;

  // Price features
  is_free: boolean;
  price_range_category: 'free' | 'low' | 'medium' | 'high' | 'premium';
  price_per_hour_estimate: number;

  // Category features
  category_encoded: number;
  is_music_event: boolean;
  is_food_event: boolean;
  is_nightlife: boolean;
  is_cultural: boolean;
  is_outdoor: boolean;

  // Venue features
  venue_quality_score: number;
  venue_popularity_score: number;
  venue_capacity_score: number;

  // Content features
  title_word_count: number;
  description_length: number;
  has_image: boolean;
  tag_count: number;
  title_sentiment_score: number;
  description_sentiment_score: number;

  // Social proof
  source_credibility: number;
  expected_attendance_score: number;

  // Seasonality
  season_score: number;
  weather_impact_score: number;

  // Competition
  competing_events_count: number;
  market_saturation_score: number;
}

interface HotnessScore {
  event_id: string;
  score: number;
  confidence: number;
  factors: {
    time_factor: number;
    price_factor: number;
    venue_factor: number;
    content_factor: number;
    social_factor: number;
    market_factor: number;
  };
  explanation: string;
}

/**
 * Holiday checker - simplified list of major US holidays
 */
function isHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Major holidays that affect event attendance
  const holidays = [
    { month: 1, day: 1 }, // New Year's Day
    { month: 2, day: 14 }, // Valentine's Day
    { month: 3, day: 17 }, // St. Patrick's Day
    { month: 7, day: 4 }, // Independence Day
    { month: 10, day: 31 }, // Halloween
    { month: 12, day: 24 }, // Christmas Eve
    { month: 12, day: 25 }, // Christmas
    { month: 12, day: 31 }, // New Year's Eve
  ];

  return holidays.some(holiday => holiday.month === month && holiday.day === day);
}

/**
 * Get season score based on date
 */
function getSeasonScore(date: Date): number {
  const month = date.getMonth() + 1;
  
  // Spring and Fall generally have higher event attendance
  if (month >= 3 && month <= 5) return 0.8; // Spring
  if (month >= 6 && month <= 8) return 0.9; // Summer
  if (month >= 9 && month <= 11) return 0.8; // Fall
  return 0.6; // Winter
}

/**
 * Simple sentiment analysis using keyword scoring
 */
function analyzeSentiment(text: string): number {
  if (!text) return 0.5;

  const positive = [
    'amazing', 'awesome', 'fantastic', 'incredible', 'spectacular', 'outstanding',
    'excellent', 'great', 'wonderful', 'perfect', 'best', 'top', 'premier',
    'exclusive', 'special', 'unique', 'exciting', 'thrilling', 'fun', 'epic',
    'legendary', 'unforgettable', 'must-see', 'incredible', 'stunning'
  ];

  const negative = [
    'boring', 'awful', 'terrible', 'horrible', 'worst', 'bad', 'disappointing',
    'mediocre', 'poor', 'cheap', 'low-quality', 'cancelled', 'postponed'
  ];

  const words = text.toLowerCase().split(/\W+/);
  let score = 0.5; // neutral baseline

  words.forEach(word => {
    if (positive.includes(word)) score += 0.1;
    if (negative.includes(word)) score -= 0.1;
  });

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract ML features from event data
 */
function extractFeatures(event: EventFeatures): MLFeatures {
  const now = new Date();
  const eventDate = new Date(event.start_time);
  const venue = event.venue;

  // Time features
  const days_until_event = Math.max(0, (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const hour_of_day = eventDate.getHours();
  const day_of_week = eventDate.getDay();
  const is_weekend = day_of_week === 0 || day_of_week === 6;
  const is_holiday = isHoliday(eventDate);

  // Price features
  const is_free = (event.price_min === 0 && event.price_max === 0) || event.price_min === null;
  let price_range_category: 'free' | 'low' | 'medium' | 'high' | 'premium' = 'free';
  
  if (!is_free && event.price_min !== null) {
    if (event.price_min < 20) price_range_category = 'low';
    else if (event.price_min < 50) price_range_category = 'medium';
    else if (event.price_min < 100) price_range_category = 'high';
    else price_range_category = 'premium';
  }

  const price_per_hour_estimate = is_free ? 0 : (event.price_min || 0) / 3; // Assume 3-hour events

  // Category features
  const categories = {
    'Music': 1, 'Entertainment': 2, 'Food & Drink': 3, 'Arts & Culture': 4,
    'Sports': 5, 'Community': 6, 'Business': 7, 'Education': 8, 'Other': 9
  };
  const category_encoded = categories[event.category as keyof typeof categories] || 9;
  
  const is_music_event = event.category === 'Music' || event.tags.some(tag => 
    ['music', 'concert', 'band', 'DJ', 'live'].some(keyword => tag.toLowerCase().includes(keyword))
  );
  const is_food_event = event.category === 'Food & Drink' || event.tags.some(tag =>
    ['food', 'drink', 'restaurant', 'bar', 'dining'].some(keyword => tag.toLowerCase().includes(keyword))
  );
  const is_nightlife = event.tags.some(tag =>
    ['nightlife', 'club', 'bar', 'party', 'dance'].some(keyword => tag.toLowerCase().includes(keyword))
  ) || hour_of_day >= 20;
  const is_cultural = event.category === 'Arts & Culture' || event.tags.some(tag =>
    ['art', 'culture', 'museum', 'gallery', 'theater'].some(keyword => tag.toLowerCase().includes(keyword))
  );
  const is_outdoor = event.tags.some(tag =>
    ['outdoor', 'park', 'festival', 'garden', 'beach'].some(keyword => tag.toLowerCase().includes(keyword))
  );

  // Venue features
  const venue_quality_score = venue ? Math.min(1, (venue_rating || 3.5) / 5) : 0.5;
  const venue_popularity_score = venue ? Math.min(1, Math.log(venue_review_count || 10) / 10) : 0.5;
  const venue_capacity_score = event.capacity ? Math.min(1, Math.log(event.capacity) / 15) : 0.5;

  // Content features
  const title_word_count = event.title.split(' ').length;
  const description_length = event.description?.length || 0;
  const has_image = !!event.image_url;
  const tag_count = event.tags.length;
  const title_sentiment_score = analyzeSentiment(event.title);
  const description_sentiment_score = analyzeSentiment(event.description || '');

  // Source credibility
  const source_credibility_map = {
    'ticketmaster': 0.9,
    'eventbrite': 0.8,
    'songkick': 0.85,
    'meetup': 0.7,
    'google_places': 0.6,
    'yelp': 0.75
  };
  const source_credibility = source_credibility_map[event.source as keyof typeof source_credibility_map] || 0.5;

  // Expected attendance (simplified)
  const expected_attendance_score = event.attendee_count 
    ? Math.min(1, event.attendee_count / 100) 
    : (event.capacity ? Math.min(1, event.capacity / 500) : 0.3);

  // Seasonality
  const season_score = getSeasonScore(eventDate);
  const weather_impact_score = is_outdoor ? season_score : 0.8; // Outdoor events more weather dependent

  return {
    days_until_event,
    hour_of_day,
    day_of_week,
    is_weekend,
    is_holiday,
    is_free,
    price_range_category,
    price_per_hour_estimate,
    category_encoded,
    is_music_event,
    is_food_event,
    is_nightlife,
    is_cultural,
    is_outdoor,
    venue_quality_score,
    venue_popularity_score,
    venue_capacity_score,
    title_word_count,
    description_length,
    has_image,
    tag_count,
    title_sentiment_score,
    description_sentiment_score,
    source_credibility,
    expected_attendance_score,
    season_score,
    weather_impact_score,
    competing_events_count: 0, // Will be calculated separately
    market_saturation_score: 0.5 // Will be calculated separately
  };
}

/**
 * Calculate hotness score using weighted factors
 */
function calculateHotnessScore(features: MLFeatures, competing_events: number = 0): HotnessScore {
  // Time factor (how soon is the event, optimal timing)
  let time_factor = 1.0;
  
  if (features.days_until_event > 30) {
    time_factor = 0.3; // Too far in future
  } else if (features.days_until_event > 14) {
    time_factor = 0.6;
  } else if (features.days_until_event > 7) {
    time_factor = 0.8;
  } else if (features.days_until_event > 1) {
    time_factor = 1.0; // Optimal range
  } else {
    time_factor = 0.7; // Last minute might be less popular
  }

  // Weekend and holiday bonuses
  if (features.is_weekend) time_factor *= 1.2;
  if (features.is_holiday) time_factor *= 1.3;
  
  // Optimal event times
  if (features.is_nightlife && features.hour_of_day >= 20) time_factor *= 1.1;
  if (features.is_food_event && (features.hour_of_day >= 11 && features.hour_of_day <= 14 || features.hour_of_day >= 17)) time_factor *= 1.1;

  // Price factor
  let price_factor = 1.0;
  if (features.is_free) {
    price_factor = 1.2; // Free events are attractive
  } else {
    switch (features.price_range_category) {
      case 'low': price_factor = 1.1; break;
      case 'medium': price_factor = 1.0; break;
      case 'high': price_factor = 0.8; break;
      case 'premium': price_factor = 0.6; break;
    }
  }

  // Venue factor
  const venue_factor = (features.venue_quality_score * 0.4 + 
                       features.venue_popularity_score * 0.4 + 
                       features.venue_capacity_score * 0.2);

  // Content factor (how well is the event presented)
  let content_factor = features.title_sentiment_score * 0.3 +
                      features.description_sentiment_score * 0.2 +
                      (features.has_image ? 0.2 : 0) +
                      Math.min(0.2, features.tag_count * 0.05) +
                      Math.min(0.1, features.title_word_count * 0.02);

  // Social factor (credibility and expected attendance)
  const social_factor = features.source_credibility * 0.6 + 
                       features.expected_attendance_score * 0.4;

  // Market factor (seasonality, competition, weather)
  const market_factor = features.season_score * 0.4 +
                        features.weather_impact_score * 0.3 +
                        Math.max(0.1, 1 - (competing_events * 0.05)) * 0.3;

  // Category bonuses
  let category_bonus = 1.0;
  if (features.is_music_event) category_bonus = 1.15; // Music events tend to be popular
  if (features.is_food_event) category_bonus = 1.1;
  if (features.is_cultural) category_bonus = 1.05;

  // Calculate weighted score (0-100)
  const raw_score = (
    time_factor * 0.25 +
    price_factor * 0.20 +
    venue_factor * 0.20 +
    content_factor * 0.15 +
    social_factor * 0.15 +
    market_factor * 0.05
  ) * category_bonus;

  const score = Math.round(Math.max(0, Math.min(100, raw_score * 100)));

  // Calculate confidence based on data completeness
  let confidence = 0.5;
  if (features.has_image) confidence += 0.1;
  if (features.description_length > 100) confidence += 0.1;
  if (features.tag_count > 2) confidence += 0.1;
  if (features.venue_quality_score > 0.5) confidence += 0.1;
  if (features.source_credibility > 0.7) confidence += 0.1;
  
  confidence = Math.min(1, confidence);

  // Generate explanation
  const factors = { time_factor, price_factor, venue_factor, content_factor, social_factor, market_factor };
  const topFactor = Object.keys(factors).reduce((a, b) => factors[a as keyof typeof factors] > factors[b as keyof typeof factors] ? a : b);
  
  let explanation = `Score: ${score}/100. `;
  explanation += `Primary driver: ${topFactor.replace('_', ' ')} (${Math.round(factors[topFactor as keyof typeof factors] * 100)}/100). `;
  
  if (features.is_free) explanation += 'Free admission boosts popularity. ';
  if (features.is_weekend) explanation += 'Weekend timing increases appeal. ';
  if (features.days_until_event <= 7) explanation += 'Happening soon increases urgency. ';
  if (competing_events > 5) explanation += 'High competition may reduce attendance. ';

  return {
    event_id: '',
    score,
    confidence: Math.round(confidence * 100),
    factors: {
      time_factor: Math.round(time_factor * 100),
      price_factor: Math.round(price_factor * 100),
      venue_factor: Math.round(venue_factor * 100),
      content_factor: Math.round(content_factor * 100),
      social_factor: Math.round(social_factor * 100),
      market_factor: Math.round(market_factor * 100)
    },
    explanation
  };
}

/**
 * Supabase Edge Function for ML-based event popularity scoring
 * Uses machine learning features to predict how "hot" or popular an event will be
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const method = req.method;
    const url = new URL(req.url);

    if (method === 'POST') {
      // Score specific events
      const { event_ids } = await req.json();

      if (!event_ids || !Array.isArray(event_ids)) {
        return new Response(
          JSON.stringify({ error: 'event_ids array is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const results = [];

      for (const eventId of event_ids) {
        try {
          // Fetch event with venue data
          const { data: event, error } = await supabase
            .from('events')
            .select(`
              id, title, description, category, subcategory, tags,
              price_min, price_max, start_time, source, age_restriction,
              capacity, attendee_count, image_url, ticket_url,
              venues (
                name, city, state, venue_type, amenities,
                rating, review_count
              )
            `)
            .eq('id', eventId)
            .single();

          if (error || !event) {
            console.error(`Event ${eventId} not found:`, error);
            continue;
          }

          // Get competing events in same area and timeframe
          const eventDate = new Date(event.start_time);
          const startRange = new Date(eventDate.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
          const endRange = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after

          const { data: competingEvents } = await supabase
            .from('events')
            .select('id')
            .neq('id', eventId)
            .gte('start_time', startRange.toISOString())
            .lte('start_time', endRange.toISOString());

          const competing_events_count = competingEvents?.length || 0;

          // Extract features
          const features = extractFeatures({
            ...event,
            venue: event.venues,
            venue_rating: event.venues?.rating,
            venue_review_count: event.venues?.review_count
          });

          features.competing_events_count = competing_events_count;

          // Calculate hotness score
          const hotnessResult = calculateHotnessScore(features, competing_events_count);
          hotnessResult.event_id = eventId;

          results.push(hotnessResult);

          // Update event with new hotness score
          await supabase
            .from('events')
            .update({
              hotness_score: hotnessResult.score,
              hotness_confidence: hotnessResult.confidence,
              hotness_factors: hotnessResult.factors,
              hotness_explanation: hotnessResult.explanation,
              last_updated: new Date().toISOString()
            })
            .eq('id', eventId);

          console.log(`✅ Scored event ${eventId}: ${hotnessResult.score}/100`);

        } catch (error) {
          console.error(`Error scoring event ${eventId}:`, error);
          results.push({
            event_id: eventId,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          results
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else if (method === 'GET') {
      // Batch process events that need scoring
      const batchSize = parseInt(url.searchParams.get('batch_size') || '50');
      const forceRescore = url.searchParams.get('force_rescore') === 'true';

      // Get events that need scoring
      let query = supabase
        .from('events')
        .select(`
          id, title, description, category, subcategory, tags,
          price_min, price_max, start_time, source, age_restriction,
          capacity, attendee_count, image_url, ticket_url,
          venues (
            name, city, state, venue_type, amenities,
            rating, review_count
          )
        `)
        .eq('status', 'active')
        .gte('start_time', new Date().toISOString()) // Only future events
        .limit(batchSize);

      if (!forceRescore) {
        query = query.is('hotness_score', null);
      }

      const { data: events, error: eventsError } = await query;

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch events', details: eventsError }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const results = {
        total_processed: 0,
        scores: [] as HotnessScore[],
        errors: [] as string[]
      };

      for (const event of events || []) {
        try {
          // Get competing events
          const eventDate = new Date(event.start_time);
          const startRange = new Date(eventDate.getTime() - 3 * 60 * 60 * 1000);
          const endRange = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

          const { data: competingEvents } = await supabase
            .from('events')
            .select('id')
            .neq('id', event.id)
            .gte('start_time', startRange.toISOString())
            .lte('start_time', endRange.toISOString());

          const competing_events_count = competingEvents?.length || 0;

          // Extract features and calculate score
          const features = extractFeatures({
            ...event,
            venue: event.venues,
            venue_rating: event.venues?.rating,
            venue_review_count: event.venues?.review_count
          });

          features.competing_events_count = competing_events_count;

          const hotnessResult = calculateHotnessScore(features, competing_events_count);
          hotnessResult.event_id = event.id;

          results.scores.push(hotnessResult);

          // Update database
          await supabase
            .from('events')
            .update({
              hotness_score: hotnessResult.score,
              hotness_confidence: hotnessResult.confidence,
              hotness_factors: hotnessResult.factors,
              hotness_explanation: hotnessResult.explanation,
              last_updated: new Date().toISOString()
            })
            .eq('id', event.id);

          results.total_processed++;

        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
          results.errors.push(`Event ${event.id}: ${error.message}`);
        }
      }

      console.log(`Processed ${results.total_processed} events for hotness scoring`);

      return new Response(
        JSON.stringify({
          success: true,
          ...results
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in hotness_ml function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});