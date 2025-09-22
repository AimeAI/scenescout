# SceneScout Event Ingestion Setup Guide

This guide walks you through setting up real data ingestion for SceneScout, replacing mock data with live events from upstream APIs.

## Prerequisites

- Supabase project with database access
- API keys for event sources (Eventbrite, Ticketmaster, etc.)
- Docker (for local Supabase development) or deployed Supabase project

## Step 1: Source Smoke Tests ✅

Run the smoke tests to verify your API keys work:

```bash
# Make sure environment variables are set
source .env

# Run smoke tests
./scripts/smoke-sources.sh
```

Expected output:
```
Eventbrite: ✅
Ticketmaster: ⚠️ skipping (no key) 
Songkick: ⚠️ skipping (no key)
✅ smoke complete
```

## Step 2: Database Schema Alignment ✅

Apply the ingestion alignment migration:

```bash
# If using local Supabase
supabase db reset

# If using remote Supabase, apply migration manually
# Copy content from supabase/migrations/20250916_ingest_alignment.sql
# and run in your Supabase SQL editor
```

This migration adds the required columns expected by ingestion functions:
- `start_time` as TIMESTAMP WITH TIME ZONE
- `price_min`, `price_max` as DECIMAL
- `status`, `source`, `external_id` as VARCHAR
- And more...

## Step 3: Set Up Supabase Secrets ✅

Configure API keys as Supabase secrets (either through dashboard or CLI):

```bash
# Using Supabase CLI
supabase secrets set EVENTBRITE_TOKEN="your_eventbrite_token"
supabase secrets set TICKETMASTER_API_KEY="your_ticketmaster_key"
supabase secrets set GOOGLE_PLACES_API_KEY="your_google_key"
supabase secrets set YELP_API_KEY="your_yelp_key"

# Deploy edge functions
supabase functions deploy ingest_eventbrite
supabase functions deploy ingest_ticketmaster
supabase functions deploy ingest_songkick
```

## Step 4: Environment Consolidation ✅

Update your `.env` file with the proper values:

```bash
# Copy the example
cp .env.example .env

# Edit with your actual values
# Key values to update:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Step 5: Verify Application Pipeline

Before triggering ingestion, confirm the application can reach Supabase using the service-role credentials:

```bash
npm run check
curl "http://localhost:3000/api/events?limit=1"
```

The `check` script runs linting and type checks with the new ESLint baseline. The curl request should return live data (or an empty array) without errors.

## Step 6: Test Ingestion

### Option A: Using the Admin UI
1. Navigate to http://localhost:3000/admin/ingestion
2. Check the system status
3. Run ingestion for individual sources
4. Monitor results

### Option B: Using API Directly
```bash
# Test ingestion status
curl http://localhost:3000/api/ingest

# Trigger Eventbrite ingestion
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"source":"eventbrite"}'
```

### Option C: Using Supabase Edge Functions Directly
```bash
# If using local Supabase
curl -X POST 'http://localhost:54321/functions/v1/ingest_eventbrite' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"location":"Toronto","limit":50}'
```

## Step 7: Remove Mock Data (Optional) ✅

Once real data is flowing:

1. Set `DEBUG_MOCK_DATA=false` in your `.env`
2. Remove or comment out mock data generators in your code
3. Update fallbacks to show "No events found" instead of mock data

## Troubleshooting

### Common Issues

1. **"Database schema not ready"**
   - Apply the ingestion alignment migration
   - Ensure events table has required columns

2. **"API key not found"**
   - Check Supabase secrets are properly set
   - Verify secret names match what functions expect

3. **"Network timeout"**
   - Check API rate limits
   - Verify external API endpoints are accessible

4. **"Mock data still showing"**
   - Verify Supabase configuration is correct
   - Check `DEBUG_MOCK_DATA` flag
   - Confirm real data exists in database

### Debugging Commands

```bash
# Check API connectivity
./scripts/smoke-sources.sh

# Test database connection
psql "postgresql://user:pass@host:port/db" -c "SELECT COUNT(*) FROM events;"

# Check Supabase function logs
supabase functions logs ingest_eventbrite

# Verify secrets
supabase secrets list
```

## Monitoring & Maintenance

- Set up cron jobs or scheduled functions to run ingestion regularly
- Monitor ingestion success rates and error logs
- Keep API keys updated and rotated as needed
- Clean up duplicate or stale events periodically

## Next Steps

1. **Automated Scheduling**: Set up cron jobs or Supabase scheduled functions
2. **Data Quality**: Implement deduplication and data validation
3. **Performance**: Add caching and optimize queries
4. **Monitoring**: Set up alerts for ingestion failures
5. **Scaling**: Add more data sources and handle rate limiting

---

**Files Created/Modified:**
- ✅ `scripts/smoke-sources.sh` - API connectivity tests
- ✅ `supabase/migrations/20250916_ingest_alignment.sql` - Schema updates
- ✅ `src/app/api/ingest/route.ts` - Ingestion API endpoint
- ✅ `src/app/admin/ingestion/page.tsx` - Admin UI for ingestion
- ✅ `.env.example` - Environment configuration template
- ✅ Mock data gated behind `DEBUG_MOCK_DATA` flag
