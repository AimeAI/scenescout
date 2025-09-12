# SceneScout Edge Functions

This directory contains Supabase Edge Functions for SceneScout v14. These functions handle data ingestion from various APIs, user notifications, AI-powered features, and ML-based scoring.

## Functions Overview

### Data Ingestion Functions

#### 1. `ingest_ticketmaster`
Ingests events from Ticketmaster Discovery API.

**Features:**
- Fetches events with venue and artist information
- Supports location, date range, and keyword filtering
- Processes pricing, categories, and images
- Handles rate limiting and error recovery

**Environment Variables:**
- `TICKETMASTER_API_KEY` - Ticketmaster API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_ticketmaster \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco", "stateCode": "CA"}'
```

#### 2. `ingest_eventbrite`
Ingests events from Eventbrite API.

**Features:**
- Fetches events with organizer and venue data
- Processes ticket pricing and categories
- Handles pagination and rate limiting
- Supports location-based filtering

**Environment Variables:**
- `EVENTBRITE_TOKEN` - Eventbrite OAuth token

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_eventbrite \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location": "San Francisco, CA"}'
```

#### 3. `ingest_songkick`
Ingests concerts from Songkick API.

**Features:**
- Fetches concert data with artist and venue information
- Creates artist profiles and event-artist relationships
- Handles popularity scoring from Songkick metrics
- Processes multi-artist lineups

**Environment Variables:**
- `SONGKICK_API_KEY` - Songkick API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_songkick \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location": "sk:26330", "min_date": "2024-01-01"}'
```

#### 4. `ingest_meetup`
Ingests meetups from Meetup.com API.

**Features:**
- Fetches meetup events with group information
- Processes RSVP counts and member data
- Handles recurring events
- Geographic filtering with radius support

**Environment Variables:**
- `MEETUP_ACCESS_TOKEN` - Meetup OAuth access token

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_meetup \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lat": 37.7749, "lon": -122.4194, "radius": 25}'
```

#### 5. `ingest_places_google`
Ingests venues from Google Places API.

**Features:**
- Fetches venue data with detailed information
- Processes ratings, reviews, and photos
- Handles multiple venue types
- Extracts amenities and accessibility features

**Environment Variables:**
- `GOOGLE_PLACES_API_KEY` - Google Places API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_places_google \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location": "37.7749,-122.4194", "radius": 5000, "details": true}'
```

#### 6. `ingest_places_yelp`
Ingests venues from Yelp Fusion API.

**Features:**
- Fetches business data with categories and ratings
- Processes reviews, photos, and business attributes
- Handles pricing levels and amenities
- Supports category filtering

**Environment Variables:**
- `YELP_API_KEY` - Yelp Fusion API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest_places_yelp \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location": "San Francisco, CA", "categories": "restaurants,bars", "details": true}'
```

### Notification Functions

#### 7. `daily_digest`
Sends personalized daily digest emails to users.

**Features:**
- Collects events based on user preferences
- Calculates distance and filters by location
- Generates HTML and text email templates
- Tracks open rates and engagement

**Environment Variables:**
- `RESEND_API_KEY` - Resend email service API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/daily_digest \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "user_email": "user@example.com"}'
```

#### 8. `reminders`
Sends event reminders via push notifications and email.

**Features:**
- Processes pending reminders based on timing
- Sends push notifications via Expo
- Sends email reminders with event details
- Updates reminder status and tracks delivery

**Environment Variables:**
- `RESEND_API_KEY` - Resend email service API key

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reminders \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "look_ahead": 5}'
```

### AI-Powered Functions

#### 9. `enrich_images`
AI-powered image analysis and enhancement.

**Features:**
- Analyzes images using OpenAI Vision API
- Extracts tags, mood, colors, and objects
- Generates accessibility-friendly alt text
- Enhances image quality using AI upscaling
- Stores analysis results for search and filtering

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (optional)

**Usage:**
```bash
# Process specific images
curl -X POST https://your-project.supabase.co/functions/v1/enrich_images \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_urls": ["https://example.com/image.jpg"],
    "event_id": "event-123",
    "enhance": true
  }'

# Batch process unprocessed images
curl -X GET https://your-project.supabase.co/functions/v1/enrich_images?batch_size=10
```

#### 10. `hotness_ml`
ML-based event popularity scoring system.

**Features:**
- Extracts 20+ features from event data
- Calculates weighted hotness score (0-100)
- Considers timing, pricing, venue quality, content
- Analyzes competition and market saturation
- Provides explanations for scoring decisions

**Usage:**
```bash
# Score specific events
curl -X POST https://your-project.supabase.co/functions/v1/hotness_ml \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event_ids": ["event-123", "event-456"]}'

# Batch process unscored events
curl -X GET https://your-project.supabase.co/functions/v1/hotness_ml?batch_size=50&force_rescore=false
```

## Deployment

### Prerequisites
- Supabase CLI installed
- Project linked to Supabase
- Environment variables configured

### Deploy All Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ingest_ticketmaster

# Deploy with environment variables
supabase secrets set TICKETMASTER_API_KEY=your_key_here
supabase secrets set OPENAI_API_KEY=your_key_here
# ... set other secrets
```

### Local Development
```bash
# Start local development server
supabase functions serve

# Test function locally
curl -X POST http://localhost:54321/functions/v1/ingest_ticketmaster \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}'
```

## Environment Variables

Set these environment variables in your Supabase project:

### API Keys
```bash
# Data ingestion APIs
TICKETMASTER_API_KEY=your_ticketmaster_key
EVENTBRITE_TOKEN=your_eventbrite_token
SONGKICK_API_KEY=your_songkick_key
MEETUP_ACCESS_TOKEN=your_meetup_token
GOOGLE_PLACES_API_KEY=your_google_places_key
YELP_API_KEY=your_yelp_key

# AI and ML services
OPENAI_API_KEY=your_openai_key

# Email and notifications
RESEND_API_KEY=your_resend_key

# Image processing (optional)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

### Supabase Configuration
These are automatically available in Edge Functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for server-side operations)

## Scheduling

Set up cron jobs or scheduled tasks to run these functions regularly:

### Recommended Schedule
```bash
# Data ingestion - run every 4-6 hours
0 */6 * * * curl -X POST https://your-project.supabase.co/functions/v1/ingest_ticketmaster

# Daily digest - run once per day at 8 AM
0 8 * * * curl -X POST https://your-project.supabase.co/functions/v1/daily_digest

# Reminders - run every 5 minutes
*/5 * * * * curl -X POST https://your-project.supabase.co/functions/v1/reminders

# Image enrichment - run every hour for unprocessed images
0 * * * * curl -X GET https://your-project.supabase.co/functions/v1/enrich_images

# Hotness scoring - run every 2 hours
0 */2 * * * curl -X GET https://your-project.supabase.co/functions/v1/hotness_ml
```

## Error Handling

All functions include:
- Comprehensive error handling and logging
- Rate limiting for external APIs
- Retry logic for transient failures
- Graceful degradation when services are unavailable
- Detailed error responses with debugging information

## Monitoring

Monitor function performance through:
- Supabase dashboard function logs
- Custom logging with structured data
- Error tracking and alerting
- Performance metrics and response times

## Rate Limiting

Each function implements appropriate rate limiting:
- **Ticketmaster**: 5000 requests/day
- **Eventbrite**: 1000 requests/hour
- **Songkick**: 60 requests/minute
- **Meetup**: 200 requests/hour
- **Google Places**: 50 requests/second
- **Yelp**: 5000 requests/day
- **OpenAI**: 60 requests/minute

## Security

- All functions use Supabase RLS (Row Level Security)
- API keys stored securely as Supabase secrets
- Input validation and sanitization
- CORS headers properly configured
- Rate limiting to prevent abuse

## Contributing

When adding new functions:
1. Follow the established TypeScript patterns
2. Include comprehensive JSDoc comments
3. Add proper error handling and logging
4. Update this README with usage instructions
5. Add environment variables to the list
6. Include rate limiting if calling external APIs
7. Add tests for critical functionality

## Troubleshooting

### Common Issues

1. **API Key Errors**: Verify environment variables are set correctly
2. **Rate Limiting**: Implement exponential backoff and respect API limits
3. **Database Errors**: Check Supabase connection and table schemas
4. **Image Processing**: Ensure OpenAI API key has Vision access
5. **Email Delivery**: Verify Resend domain configuration

### Debug Mode

Enable debug mode by adding `?debug=true` to function URLs for verbose logging.

### Logs

Check function logs in the Supabase dashboard under Functions > Logs for detailed error information and performance metrics.