# Event Cache Setup Instructions

## Problem
Ticketmaster API is rate-limited (429 errors). We're hitting limits with just one user testing because the homepage loads 18 categories live on every page load.

## Solution
Event caching system that stores events in Supabase and refreshes every 6 hours.

## Setup Steps

### 1. Apply Database Migration

Go to Supabase Dashboard > SQL Editor and run this migration:

```sql
-- Copy contents from: supabase/migrations/20251002_add_event_cache_fields.sql
```

This adds the following to the events table:
- `cached_at` - When event was last cached
- `provider` - API provider (Ticketmaster/EventBrite)
- `external_id` - Original event ID from provider
- `city_name`, `is_free`, `official`, `verified` - Additional fields

Also creates:
- `cache_status` table to track refresh status
- Indexes for fast queries
- `clean_old_events()` function to remove stale data

### 2. Initial Cache Refresh

Trigger the cache refresh endpoint to populate events:

```bash
curl -X POST http://localhost:3000/api/admin/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}'
```

This will:
- Fetch events from all 18 categories
- Store ~360 events in Supabase
- Takes ~2-3 minutes to complete
- Returns JSON with event counts per category

### 3. Verify Cache

Check that events are cached:

```bash
curl http://localhost:3000/api/events/cached?category=music-concerts&limit=5
```

Should return cached events instantly (no Ticketmaster API calls).

### 4. Schedule Regular Refreshes

#### Option A: Manual (for now)
Run cache refresh every 6 hours:

```bash
curl -X POST https://your-production-url.vercel.app/api/admin/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}'
```

#### Option B: Automated (future)
- Add Vercel Cron Job in `vercel.json`
- Or use Supabase Edge Functions with scheduled triggers
- Or external cron service (cron-job.org)

## How It Works

### Before (Rate Limited):
```
User visits homepage
→ Loads 18 categories
→ Each category hits Ticketmaster/EventBrite APIs live
→ 18+ API calls per page load
→ 429 Rate Limit Errors ❌
```

### After (Cached):
```
User visits homepage
→ Loads 18 categories from Supabase
→ Zero external API calls
→ Fast page loads ✅
→ No rate limiting ✅

Background Process (every 6 hours):
→ /api/admin/refresh-cache endpoint
→ Fetches fresh events from APIs
→ Updates Supabase cache
→ Old events auto-expire after 24h
```

## API Endpoints

### `/api/admin/refresh-cache` (POST)
Refreshes cached events from live APIs.

**Request:**
```json
{
  "city": "San Francisco" // optional, defaults to SF
}
```

**Response:**
```json
{
  "success": true,
  "totalEvents": 360,
  "categories": [
    { "category": "music-concerts", "count": 20 },
    { "category": "nightlife-dj", "count": 20 },
    // ... 16 more categories
  ],
  "timestamp": "2025-10-02T12:00:00Z"
}
```

### `/api/events/cached` (GET)
Retrieves cached events (used by homepage).

**Query Params:**
- `category` - Category ID (optional)
- `limit` - Max events to return (default: 20)
- `city` - City name (default: San Francisco)

**Response:**
```json
{
  "success": true,
  "events": [ /* array of events */ ],
  "count": 20,
  "source": "cache"
}
```

## Monitoring

Check cache status:
```sql
SELECT * FROM cache_status ORDER BY last_refreshed_at DESC LIMIT 10;
```

Check event counts:
```sql
SELECT category, COUNT(*) as count
FROM events
WHERE cached_at > NOW() - INTERVAL '24 hours'
GROUP BY category
ORDER BY count DESC;
```

Clean old events manually:
```sql
SELECT clean_old_events(); -- Returns number of deleted events
```

## Notes

- Events older than 24 hours are automatically cleaned
- Cache refresh takes 2-3 minutes (18 categories × ~10 seconds each)
- Respects Ticketmaster rate limits with 100ms delays between requests
- Homepage loads instantly from cache (no API calls)
- Users see same events until next refresh (acceptable tradeoff)
