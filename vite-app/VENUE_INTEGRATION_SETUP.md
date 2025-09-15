# Venue Integration Setup & Testing Guide

## Current Status

The SceneScout application has Google Places and Yelp integration built, but venues are **not directly displayed on the map**. Instead:

- ✅ Venues are collected and stored in the database
- ✅ Background ingestion works when panning the map
- ❌ Venues are not shown as map markers
- ✅ Events can reference venues via `venue_id`
- ℹ️ Only events appear on the map, not standalone venues

## Setup Instructions

### 1. Start Supabase Locally

```bash
cd vite-app
supabase start
```

### 2. Deploy Edge Functions

```bash
# Deploy Google Places function
supabase functions deploy ingest_places_google

# Deploy Yelp function  
supabase functions deploy ingest_places_yelp
```

### 3. Set API Keys as Secrets

```bash
# Set Google Places API key
supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_PLACES_API_KEY

# Set Yelp API key
supabase secrets set YELP_API_KEY=YOUR_YELP_API_KEY

# Verify secrets are set
supabase secrets list
```

### 4. Start Development Server

```bash
npm run dev
```

## Testing the Integration

### Test 1: Direct Function Testing

Test Google Places ingestion:
```bash
supabase functions invoke ingest_places_google \
  --body '{"location":"43.6532,-79.3832","radius":1000}'
```

Test Yelp ingestion:
```bash
supabase functions invoke ingest_places_yelp \
  --body '{"location":"Toronto, ON","radius":2000}'
```

**Expected Response (with API keys):**
```json
{
  "success": true,
  "venuesProcessed": 20,
  "message": "Successfully ingested 20 venues"
}
```

**Expected Response (without API keys):**
```json
{
  "status": "disabled",
  "reason": "missing GOOGLE_PLACES_API_KEY",
  "message": "Google Places integration is disabled"
}
```

### Test 2: Admin Ingestion UI

1. Navigate to: http://localhost:5173/admin/ingest
2. Login with a Pro/Admin account
3. Enter coordinates:
   - Latitude: `43.6532`
   - Longitude: `-79.3832`
   - Radius: `1000`
4. Click "Ingest from Google Places"
5. Click "Ingest from Yelp"
6. Check the JSON results

### Test 3: Background Ingestion on Map

1. Navigate to: http://localhost:5173/map
2. Open Developer Tools → Network tab
3. Pan or zoom the map
4. Look for network calls to:
   - `ingest_places_google`
   - `ingest_places_yelp`
5. Check responses for venue counts

### Test 4: Verify Venues in Database

Check if venues were created:
```sql
-- Count venues by source
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN external_id LIKE 'ChIJ%' THEN 1 END) as google_places,
  COUNT(CASE WHEN LENGTH(external_id) > 20 AND external_id NOT LIKE 'ChIJ%' THEN 1 END) as yelp
FROM venues
WHERE created_at > NOW() - INTERVAL '1 hour';

-- View recent venues
SELECT 
  name,
  venue_type,
  address,
  external_id,
  created_at
FROM venues
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

## Making Venues Visible on Map

Since venues don't appear directly on the map, you have two options:

### Option 1: Create Test Events at Venues

Run this SQL to create test events that will appear on the map:

```sql
-- Create test events from recent venues
INSERT INTO events (
  title, description, venue_id, venue_name, address, city_id,
  latitude, longitude, start_date, end_date, source, 
  external_id, category, price_min, price_max, status
)
SELECT 
  v.name || ' - Demo Event',
  'Demo event at ' || v.name,
  v.id, v.name, v.address, v.city_id,
  v.latitude, v.longitude,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '2 hours',
  'manual',
  'demo_' || v.id,
  'Entertainment',
  0, 0, 'published'
FROM venues v
WHERE v.created_at > NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM events WHERE external_id = 'demo_' || v.id
  )
LIMIT 20;
```

### Option 2: Modify Map to Show Venues (Future Enhancement)

The map would need to be modified to show venue markers in addition to event markers. This would require:

1. Adding venue fetching to the map page
2. Creating venue marker components
3. Adding venue filtering options
4. Implementing venue detail popups

## Troubleshooting

### Venues Not Being Created

1. **Check API Keys:**
   ```bash
   supabase secrets list
   ```

2. **Check Function Logs:**
   ```bash
   supabase functions logs ingest_places_google
   supabase functions logs ingest_places_yelp
   ```

3. **Test API Keys Directly:**
   ```bash
   # Test Google Places API
   curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=43.6532,-79.3832&radius=1000&key=YOUR_KEY"
   
   # Test Yelp API
   curl -H "Authorization: Bearer YOUR_KEY" "https://api.yelp.com/v3/businesses/search?latitude=43.6532&longitude=-79.3832&radius=1000"
   ```

### Background Ingestion Not Working

1. Ensure you're logged in (required for background ingestion)
2. Check browser console for errors
3. Verify the map bounds are being sent correctly
4. Check rate limiting (may be hitting API limits)

### Events Not Showing on Map

1. Ensure events have valid coordinates
2. Check event status is 'published'
3. Verify event dates are in the future
4. Check filters aren't hiding the events

## API Key Security Reminders

- Never commit API keys to git
- Restrict keys in provider dashboards:
  - Google: Restrict to Places API and your domains/IPs
  - Yelp: Add app to allowed origins
- Monitor usage regularly
- Rotate keys if exposed