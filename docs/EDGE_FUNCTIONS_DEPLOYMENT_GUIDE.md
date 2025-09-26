# SceneScout Edge Functions Deployment Guide

## Overview

Your SceneScout application currently has **0 Edge Functions deployed** on your Supabase project (`ldgbjmotttuomxzwujrt`). This guide will help you deploy the necessary functions to make your app fully operational.

## 🔥 Critical Functions (Deploy These First)

These functions are essential for core app functionality:

### 1. **rpc-functions** (Priority: CRITICAL)
- **Purpose**: Provides core API functionality for the app
- **Used by**: Frontend components for event search, personalization, analytics
- **Functions**: 
  - `search_events_nearby` - Geo-spatial event search
  - `get_personalized_events` - User recommendations  
  - `get_trending_events` - Popular events
  - `get_venue_recommendations` - Venue suggestions
  - `get_event_analytics` - Event metrics

### 2. **health-check** (Priority: HIGH)
- **Purpose**: System health monitoring
- **Features**: Database connectivity, API status, system metrics

### 3. **ingest_eventbrite** (Priority: CRITICAL) 
- **Purpose**: Event data ingestion from Eventbrite
- **Used by**: `/api/ingest` endpoint
- **Status**: Your Eventbrite API key is configured ✅

### 4. **ingest_ticketmaster** (Priority: HIGH)
- **Purpose**: Event data ingestion from Ticketmaster  
- **Used by**: `/api/ingest` endpoint
- **Status**: API key needs configuration ⚠️

### 5. **ingest_places_yelp** (Priority: HIGH)
- **Purpose**: Venue data from Yelp
- **Status**: Your Yelp API key is configured ✅

## 📋 Deployment Instructions

### Method 1: Manual CLI Deployment (Recommended)

1. **Authenticate with Supabase**:
   ```bash
   # Clear any old environment variables
   unset SUPABASE_ACCESS_TOKEN
   unset SUPABASE_PROJECT_ID
   
   # Login to Supabase (this will open your browser)
   supabase login
   ```

2. **Link to your project**:
   ```bash
   supabase link --project-ref ldgbjmotttuomxzwujrt
   ```

3. **Deploy critical functions**:
   ```bash
   # Deploy core RPC functions
   supabase functions deploy rpc-functions --no-verify-jwt
   
   # Deploy health monitoring
   supabase functions deploy health-check --no-verify-jwt
   
   # Deploy ingestion functions
   supabase functions deploy ingest_eventbrite --no-verify-jwt
   supabase functions deploy ingest_places_yelp --no-verify-jwt
   supabase functions deploy ingest_ticketmaster --no-verify-jwt
   ```

4. **Test deployments**:
   ```bash
   ./scripts/test-functions-status.sh
   ```

### Method 2: Use Deployment Script

We've created a comprehensive deployment script:

```bash
# Make executable and run
chmod +x scripts/deploy-edge-functions.sh
./scripts/deploy-edge-functions.sh
```

### Method 3: Manual Dashboard Deployment

If CLI issues persist, you can deploy via the Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/functions
2. Click "New Function"
3. Copy the function code from `supabase/functions/[function-name]/index.ts`
4. Set function name and paste code
5. Click "Deploy"

## 🔑 Environment Variables Setup

### Already Configured ✅
- `EVENTBRITE_TOKEN`: X2O44MNDA2V5OAZILC7C
- `YELP_API_KEY`: tpNEPYv1OdDlphvD...

### Need Configuration ⚠️
- `TICKETMASTER_API_KEY`: Currently set to placeholder
- `OPENAI_API_KEY`: Needed for hotness_ml function

### Add these in Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/settings/vault
2. Add each secret with the exact name
3. Functions will automatically use these secrets

## 🧪 Testing Deployed Functions

After deployment, test the functions:

```bash
# Test health check
curl -X POST "https://ldgbjmotttuomxzwujrt.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test RPC functions
curl -X POST "https://ldgbjmotttuomxzwujrt.supabase.co/functions/v1/rpc-functions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0" \
  -H "Content-Type: application/json" \
  -d '{"function": "get_trending_events", "params": {"limit": 5}}'

# Test ingestion
curl -X POST "https://ldgbjmotttuomxzwujrt.supabase.co/functions/v1/ingest_eventbrite" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0" \
  -H "Content-Type: application/json" \
  -d '{"location": "Toronto", "limit": 10}'
```

## 📅 Function Scheduling

After deployment, set up cron schedules in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/functions
2. Click on each function → "Settings" → "Cron Schedule"

**Recommended Schedules**:
- `ingest_eventbrite`: `0 */6 * * *` (every 6 hours)
- `ingest_ticketmaster`: `30 */6 * * *` (every 6 hours, offset)
- `hotness_ml`: `*/15 * * * *` (every 15 minutes)
- `daily_digest`: `0 9 * * *` (daily at 9 AM)

## 🔍 Troubleshooting

### Common Issues:

1. **"Function not deployed" (404)**
   - Function hasn't been deployed yet
   - Deploy using methods above

2. **"Missing API key" errors**
   - Functions are deployed but external API keys not configured
   - Add secrets in Supabase Dashboard vault

3. **Authentication errors**
   - Check that Supabase keys are correct in `.env`
   - Verify project reference

4. **Database connection errors** 
   - Ensure database schema is migrated
   - Check database permissions

## 📊 Current Status Summary

- **Functions Deployed**: 0/20 ❌
- **Critical Functions Missing**: 5/5 ❌  
- **API Keys Configured**: 2/4 ⚠️
- **Database**: Connected ✅
- **App Status**: Non-functional until functions deployed

## Next Steps

1. ✅ **Deploy Critical Functions** - Start with rpc-functions, health-check, ingest_eventbrite
2. ⚠️ **Configure Missing API Keys** - Add Ticketmaster API key
3. 🧪 **Test Functions** - Verify all deployed functions work
4. 📅 **Set up Scheduling** - Configure cron jobs for data ingestion
5. 📈 **Monitor Performance** - Use health-check for ongoing monitoring

Once the critical functions are deployed, your SceneScout app will be fully operational!