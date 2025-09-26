#!/bin/bash

echo "🚀 Deploying Edge Functions for SceneScout (Project: ldgbjmotttuomxzwujrt)"
echo ""

# Check if we're logged in to Supabase
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    exit 1
fi

# Set the correct project reference for your SceneScout instance  
export SUPABASE_PROJECT_REF=ldgbjmotttuomxzwujrt

echo "📋 Project Reference: $SUPABASE_PROJECT_REF"
echo ""

# Check if user needs to authenticate
echo "🔐 Checking authentication..."
if ! supabase projects list >/dev/null 2>&1; then
    echo "❌ Not authenticated. Please run 'supabase login' first."
    echo ""
    echo "To authenticate:"
    echo "1. Run: supabase login"
    echo "2. Follow the browser authentication flow"
    echo "3. Then re-run this script"
    exit 1
fi

echo "✅ Authentication verified"
echo ""

# Priority 1: Core Functions (needed by the app)
echo "📦 Deploying Core Functions..."
echo ""

CORE_FUNCTIONS=("rpc-functions" "health-check" "event-orchestrator")

for fn in "${CORE_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "🔧 Deploying $fn..."
        if supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
            echo "   This function is critical - please check the error and try again"
        fi
        echo ""
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

# Priority 2: Ingestion Functions (called by /api/ingest)
echo "📦 Deploying Ingestion Functions..."
echo ""

INGESTION_FUNCTIONS=("ingest_eventbrite" "ingest_ticketmaster" "ingest_songkick" "ingest_meetup" "ingest_places_yelp")

for fn in "${INGESTION_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "📥 Deploying $fn..."
        if supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
        echo ""
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

# Priority 3: Utility Functions  
echo "📦 Deploying Utility Functions..."
echo ""

UTILITY_FUNCTIONS=("webhook-handler" "reminders" "push-subscribe" "push-send" "daily_digest" "ics" "img-proxy" "og-event")

for fn in "${UTILITY_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "🛠️  Deploying $fn..."
        if supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
        echo ""
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

# Priority 4: Scraping Functions
echo "📦 Deploying Scraping Functions..." 
echo ""

SCRAPING_FUNCTIONS=("city-scraper" "venue-scraper" "toronto-scraper" "scheduled-scraper")

for fn in "${SCRAPING_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "🔍 Deploying $fn..."
        if supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
        echo ""
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

# Priority 5: Enhancement Functions
echo "📦 Deploying Enhancement Functions..."
echo ""

ENHANCEMENT_FUNCTIONS=("enrich_images" "hotness_ml")

for fn in "${ENHANCEMENT_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "✨ Deploying $fn..."
        if supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
        echo ""
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

echo ""
echo "🧪 Testing Core Function Deployment..."
echo ""

# Test the health-check function
echo "🏥 Testing health-check function..."
curl -X POST "https://ldgbjmotttuomxzwujrt.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  --max-time 30 \
  | jq '.' 2>/dev/null || echo "Health check test completed"

echo ""

# Test the rpc-functions
echo "⚙️  Testing rpc-functions..."
curl -X POST "https://ldgbjmotttuomxzwujrt.supabase.co/functions/v1/rpc-functions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0" \
  -H "Content-Type: application/json" \
  -d '{"function": "get_trending_events", "params": {"limit": 5}}' \
  --max-time 30 \
  | jq '.' 2>/dev/null || echo "RPC functions test completed"

echo ""
echo "⏰ Next Steps: Scheduling Information"
echo "===================================="
echo ""
echo "Set the following schedules in your Supabase Dashboard:"
echo "Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/functions"
echo ""
echo "Recommended schedules:"
echo "  📅 ingest_eventbrite: 0 */6 * * * (every 6 hours)"
echo "  📅 ingest_ticketmaster: 30 */6 * * * (every 6 hours, offset by 30 min)"  
echo "  📊 hotness_ml: */15 * * * * (every 15 minutes)"
echo "  📧 daily_digest: 0 9 * * * (daily at 9 AM)"
echo "  ⏰ reminders: 0 13,17 * * * (daily at 1 PM and 5 PM)"
echo ""

echo "🔑 Environment Variables Check"
echo "=============================="
echo ""
echo "The following API keys are configured in .env:"

if grep -q "EVENTBRITE_TOKEN=X2O44MNDA2V5OAZILC7C" .env 2>/dev/null; then
    echo "✅ EVENTBRITE_TOKEN configured"
else
    echo "⚠️  EVENTBRITE_TOKEN needs configuration"
fi

if grep -q "YELP_API_KEY=tpNEPYv1OdDlphvD" .env 2>/dev/null; then
    echo "✅ YELP_API_KEY configured"  
else
    echo "⚠️  YELP_API_KEY needs configuration"
fi

if grep -q "TICKETMASTER_API_KEY=TODO" .env 2>/dev/null; then
    echo "⚠️  TICKETMASTER_API_KEY needs configuration"
else
    echo "✅ TICKETMASTER_API_KEY may be configured"
fi

echo ""
echo "📝 Add missing secrets in your Supabase Dashboard:"
echo "Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/settings/vault"
echo ""

echo "✅ Edge Functions deployment script completed!"
echo ""
echo "💡 Functions will return appropriate errors when API keys are not configured."
echo "💡 This is expected behavior for secure API key management."