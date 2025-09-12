# SceneScout v14 API Documentation

This document provides comprehensive documentation for SceneScout's API endpoints, database schema, and Supabase Edge Functions.

## 📖 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Next.js API Routes](#nextjs-api-routes)
4. [Supabase Edge Functions](#supabase-edge-functions)
5. [Database Schema](#database-schema)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [SDK Usage](#sdk-usage)

## 🌐 API Overview

SceneScout uses a hybrid API architecture:

- **Next.js API Routes**: Handle authentication, webhooks, and proxy requests
- **Supabase Edge Functions**: Process data ingestion, notifications, and background tasks
- **Supabase Database**: Direct client access with Row Level Security (RLS)
- **External APIs**: Third-party integrations for event data

### Base URLs

```
Local Development: http://localhost:3000
Production: https://scenescout.app
Supabase Functions: https://your-project.supabase.co/functions/v1/
```

## 🔐 Authentication

SceneScout uses Supabase Auth for authentication management.

### Authentication Flow

```javascript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

// Sign up with email
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    emailRedirectTo: `${origin}/auth/callback`
  }
})

// Sign in with email
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Sign in with OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${origin}/auth/callback`
  }
})
```

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1699123456,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "user_metadata": {
    "avatar_url": "https://example.com/avatar.jpg",
    "full_name": "John Doe"
  }
}
```

### Protected Routes

All API routes under `/api/protected/` require authentication:

```javascript
// Middleware authentication check
export async function middleware(request) {
  const token = request.cookies.get('supabase-auth-token')
  if (!token) {
    return NextResponse.redirect('/login')
  }
}
```

## 🛣️ Next.js API Routes

### Image Proxy API

**Endpoint:** `POST /api/img`

Proxies and optimizes images through Supabase Edge Function.

```typescript
// Request
interface ImageRequest {
  url: string
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpg' | 'png'
}

// Response
interface ImageResponse {
  url: string
  width: number
  height: number
  format: string
  size: number
}
```

**Example:**

```javascript
const response = await fetch('/api/img', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/image.jpg',
    width: 800,
    height: 600,
    quality: 80,
    format: 'webp'
  })
})

const optimizedImage = await response.json()
```

### Stripe Webhook API

**Endpoint:** `POST /api/stripe/webhook`

Handles Stripe webhooks for subscription management.

```typescript
// Handled Events
type StripeEvent = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'checkout.session.completed'
```

**Webhook Processing:**

```javascript
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      // ... handle other events
    }
    
    return Response.json({ received: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }
}
```

## ⚡ Supabase Edge Functions

### Function List

| Function | Purpose | Schedule | Authentication |
|----------|---------|----------|----------------|
| `daily_digest` | Send daily email digests | Daily at 8 AM | None |
| `reminders` | Send event reminders | Every 15 minutes | None |
| `ingest_ticketmaster` | Import Ticketmaster events | Every 4 hours | None |
| `ingest_eventbrite` | Import Eventbrite events | Every 6 hours | None |
| `ingest_songkick` | Import Songkick events | Daily at 2 AM | None |
| `ingest_meetup` | Import Meetup events | Every 6 hours | None |
| `ingest_places_google` | Import Google Places venues | Weekly | None |
| `ingest_places_yelp` | Import Yelp venues | Weekly | None |
| `enrich_images` | Process and enhance images | Every 30 minutes | None |
| `hotness_ml` | Calculate event hotness scores | Every hour | None |
| `push-send` | Send push notifications | As needed | Required |
| `push-subscribe` | Manage push subscriptions | As needed | Required |
| `og-event` | Generate event social cards | As needed | None |
| `ics` | Generate calendar files | As needed | None |
| `img-proxy` | Proxy and optimize images | As needed | None |

### Daily Digest Function

**Endpoint:** `POST /functions/v1/daily_digest`

Sends personalized daily email digests to users.

```typescript
interface DigestRequest {
  test?: boolean
  user_email?: string
  limit?: number
}

interface DigestResponse {
  success: boolean
  totalUsers: number
  emailsSent: number
  emailsFailed: number
  errors: string[]
}
```

**Usage:**

```bash
# Test for specific user
curl -X POST 'https://your-project.supabase.co/functions/v1/daily_digest' \
  -H 'Authorization: Bearer your_anon_key' \
  -H 'Content-Type: application/json' \
  -d '{"test": true, "user_email": "test@example.com"}'
```

### Event Ingestion Functions

**Endpoints:**
- `POST /functions/v1/ingest_ticketmaster`
- `POST /functions/v1/ingest_eventbrite`
- `POST /functions/v1/ingest_songkick`
- `POST /functions/v1/ingest_meetup`

```typescript
interface IngestionRequest {
  city_id?: string
  keyword?: string
  start_date?: string
  end_date?: string
  limit?: number
}

interface IngestionResponse {
  success: boolean
  eventsProcessed: number
  eventsCreated: number
  eventsUpdated: number
  errors: string[]
}
```

### Push Notification Functions

**Subscribe Endpoint:** `POST /functions/v1/push-subscribe`

```typescript
interface PushSubscribeRequest {
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  categories?: string[]
}
```

**Send Endpoint:** `POST /functions/v1/push-send`

```typescript
interface PushSendRequest {
  user_ids?: string[]
  title: string
  body: string
  data?: Record<string, any>
  categories?: string[]
}
```

### Image Processing Functions

**Image Proxy:** `GET /functions/v1/img-proxy?url=...&w=800&h=600`

```typescript
interface ImageProxyParams {
  url: string
  w?: number    // width
  h?: number    // height
  q?: number    // quality (1-100)
  f?: 'webp' | 'jpg' | 'png' // format
}
```

**Image Enhancement:** `POST /functions/v1/enrich_images`

Automatically processes unenhanced images in the database.

```typescript
interface EnrichmentResponse {
  success: boolean
  imagesProcessed: number
  enhancementsApplied: number
  errors: string[]
}
```

### Calendar & Social Functions

**ICS Calendar:** `GET /functions/v1/ics/:event_id`

Returns an iCalendar file for event import.

**OpenGraph Cards:** `GET /functions/v1/og-event?event_id=...`

Generates social media preview cards for events.

## 🗄️ Database Schema

### Core Tables

#### Users & Profiles

```sql
-- User authentication (managed by Supabase Auth)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended user profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  location VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Cities & Venues

```sql
-- Supported cities
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state_code VARCHAR(2),
  country_code VARCHAR(2) NOT NULL DEFAULT 'US',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timezone VARCHAR(50),
  slug VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  address VARCHAR(255),
  city_id UUID REFERENCES cities(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(Point, 4326), -- PostGIS
  capacity INTEGER,
  venue_type VARCHAR(50),
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  contact_info JSONB DEFAULT '{}',
  hours JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Events

```sql
-- Event listings
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue_id UUID REFERENCES venues(id),
  city_id UUID REFERENCES cities(id),
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  featured_image_url TEXT,
  ticket_url TEXT,
  ticket_price_min DECIMAL(10, 2),
  ticket_price_max DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  organizer_info JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  attendee_count INTEGER DEFAULT 0,
  source VARCHAR(50),
  external_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### User Interactions

```sql
-- User saved events
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  is_attending BOOLEAN DEFAULT false,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- User-created plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  city_id UUID REFERENCES cities(id),
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  share_token VARCHAR(50) UNIQUE,
  view_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events within plans
CREATE TABLE plan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, event_id)
);
```

### Analytics & Metrics

```sql
-- Event view tracking
CREATE TABLE event_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration INTEGER
);

-- General metrics
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC,
  dimensions JSONB DEFAULT '{}',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Users can only see their own profile data
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Events are publicly viewable but only admins can modify
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can modify events" ON events
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- User events are private to the user
CREATE POLICY "Users can manage own event interactions" ON user_events
  FOR ALL USING (auth.uid() = user_id);

-- Plans visibility based on public flag
CREATE POLICY "Anyone can view public plans" ON plans
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid() = user_id);
```

### Indexes for Performance

```sql
-- Event search indexes
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_city ON events(city_id);
CREATE INDEX idx_events_categories ON events USING gin(categories);
CREATE INDEX idx_events_tags ON events USING gin(tags);
CREATE INDEX idx_events_text_search ON events USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Geospatial indexes
CREATE INDEX idx_venues_location ON venues USING gist(location);
CREATE INDEX idx_events_location ON events USING gist(location) WHERE location IS NOT NULL;

-- User interaction indexes
CREATE INDEX idx_user_events_user ON user_events(user_id);
CREATE INDEX idx_user_events_event ON user_events(event_id);
CREATE INDEX idx_user_events_favorite ON user_events(user_id) WHERE is_favorite = true;
```

## 🚦 Rate Limiting

Rate limiting is implemented at multiple levels:

### Supabase Rate Limits

```javascript
// Default Supabase limits
const rateLimits = {
  anonymous: '100 requests per hour',
  authenticated: '1000 requests per hour',
  functions: '500 requests per minute'
}
```

### Custom Rate Limiting

```javascript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
})

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }
}
```

## ❌ Error Handling

### Standard Error Response Format

```typescript
interface ApiError {
  error: {
    message: string
    code?: string
    status?: number
    details?: any
  }
  timestamp: string
  path: string
}
```

### HTTP Status Codes

```typescript
const statusCodes = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error'
}
```

### Error Examples

```javascript
// Validation Error
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "status": 422,
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/auth/signup"
}

// Not Found Error
{
  "error": {
    "message": "Event not found",
    "code": "NOT_FOUND",
    "status": 404
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/events/12345"
}
```

## 🔧 SDK Usage

### Supabase Client Setup

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Client-side usage
const supabase = createClientComponentClient<Database>()

// Server-side usage
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabase = createServerComponentClient<Database>({ cookies })
```

### Common Queries

```typescript
// Get events with venue information
const { data: events, error } = await supabase
  .from('events')
  .select(`
    *,
    venues (
      name,
      address,
      city_id,
      cities (name)
    )
  `)
  .eq('is_active', true)
  .gte('event_date', new Date().toISOString())
  .order('event_date', { ascending: true })

// Get user's saved events
const { data: savedEvents, error } = await supabase
  .from('user_events')
  .select(`
    *,
    events (
      *,
      venues (name, address)
    )
  `)
  .eq('user_id', user.id)
  .eq('is_favorite', true)

// Search events by text
const { data: searchResults, error } = await supabase
  .rpc('search_events', {
    search_query: 'concert music',
    city_filter: 'new-york',
    limit_count: 20
  })
```

### Real-time Subscriptions

```typescript
// Subscribe to new events
const eventSubscription = supabase
  .channel('events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'events'
  }, (payload) => {
    console.log('New event:', payload.new)
  })
  .subscribe()

// Subscribe to plan updates
const planSubscription = supabase
  .channel(`plan:${planId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'plans',
    filter: `id=eq.${planId}`
  }, (payload) => {
    console.log('Plan updated:', payload.new)
  })
  .subscribe()
```

### Custom Database Functions

```sql
-- Full-text search function
CREATE OR REPLACE FUNCTION search_events(
  search_query TEXT,
  city_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  event_date DATE,
  venue_name TEXT,
  city_name TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.description,
    e.event_date,
    v.name as venue_name,
    c.name as city_name,
    ts_rank(to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')), 
            plainto_tsquery('english', search_query)) as relevance
  FROM events e
  LEFT JOIN venues v ON e.venue_id = v.id
  LEFT JOIN cities c ON e.city_id = c.id
  WHERE to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')) 
        @@ plainto_tsquery('english', search_query)
    AND (city_filter IS NULL OR c.slug = city_filter)
    AND e.is_active = true
    AND e.event_date >= CURRENT_DATE
  ORDER BY relevance DESC, e.event_date ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

---

**For more detailed API examples and integration guides, see our [GitHub repository](https://github.com/yourusername/scenescout) and [Postman collection](https://documenter.getpostman.com/view/scenescout-api).**