#!/bin/bash

echo "🔍 SceneScout Deployment Readiness Check"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function files
echo "📁 Checking Function Files:"
echo "-------------------------"

CRITICAL_FUNCTIONS=("rpc-functions" "health-check" "ingest_eventbrite" "ingest_places_yelp" "ingest_ticketmaster")
OPTIONAL_FUNCTIONS=("webhook-handler" "reminders" "daily_digest" "enrich_images" "hotness_ml")

echo "Critical Functions (must deploy):"
for fn in "${CRITICAL_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "  ✅ $fn - Ready to deploy"
    else
        echo "  ❌ $fn - Missing directory"
    fi
done

echo ""
echo "Optional Functions:"
for fn in "${OPTIONAL_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "  ✅ $fn - Available"
    else
        echo "  ⚠️  $fn - Not found"
    fi
done

echo ""
echo "🔑 Environment Variables Status:"
echo "------------------------------"

# Check .env file
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check critical API keys
    if grep -q "EVENTBRITE_TOKEN=X2O44MNDA2V5OAZILC7C" .env; then
        echo "  ✅ EVENTBRITE_TOKEN configured"
    else
        echo "  ❌ EVENTBRITE_TOKEN missing or placeholder"
    fi
    
    if grep -q "YELP_API_KEY=tpNEPYv1OdDlphvD" .env; then
        echo "  ✅ YELP_API_KEY configured"
    else
        echo "  ❌ YELP_API_KEY missing or placeholder"
    fi
    
    if grep -q "TICKETMASTER_API_KEY=TODO" .env; then
        echo "  ⚠️  TICKETMASTER_API_KEY needs configuration"
    else
        echo "  ✅ TICKETMASTER_API_KEY may be configured"
    fi
    
    if grep -q "OPENAI_API_KEY=TODO" .env; then
        echo "  ⚠️  OPENAI_API_KEY needs configuration (for hotness_ml)"
    else
        echo "  ✅ OPENAI_API_KEY may be configured"
    fi
else
    echo "❌ .env file not found"
fi

echo ""
echo "🏗️  Supabase Configuration:"
echo "-------------------------"

# Check supabase config
if [ -f "supabase/config.toml" ]; then
    PROJECT_ID=$(grep 'project_id = ' supabase/config.toml | cut -d '"' -f 2)
    echo "✅ Project ID: $PROJECT_ID"
    
    if [ "$PROJECT_ID" = "ldgbjmotttuomxzwujrt" ]; then
        echo "  ✅ Project ID matches current deployment"
    else
        echo "  ⚠️  Project ID differs from expected (ldgbjmotttuomxzwujrt)"
    fi
else
    echo "❌ supabase/config.toml not found"
fi

echo ""
echo "🔧 CLI Status:"
echo "-------------"

if command -v supabase &> /dev/null; then
    VERSION=$(supabase --version 2>/dev/null || echo "unknown")
    echo "✅ Supabase CLI installed (version: $VERSION)"
    
    # Try to check login status
    if supabase projects list >/dev/null 2>&1; then
        echo "  ✅ CLI authenticated"
    else
        echo "  ❌ CLI not authenticated"
        echo "     Run: supabase login"
    fi
else
    echo "❌ Supabase CLI not installed"
fi

echo ""
echo "🌐 Current Function Status:"
echo "-------------------------"

SUPABASE_URL="https://ldgbjmotttuomxzwujrt.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0"

for fn in "${CRITICAL_FUNCTIONS[@]}"; do
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$fn" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{}' \
        -w "%{http_code}" \
        -o /dev/null 2>/dev/null)
    
    case $response in
        200)
            echo "  ✅ $fn - Deployed and working"
            ;;
        404)
            echo "  ❌ $fn - Not deployed"
            ;;
        500|502|503)
            echo "  ⚠️  $fn - Deployed but has errors"
            ;;
        401|403)
            echo "  🔒 $fn - Deployed but authentication issue"
            ;;
        *)
            echo "  ❓ $fn - Unknown status ($response)"
            ;;
    esac
done

echo ""
echo "📋 Deployment Recommendations:"
echo "=============================="

echo ""
echo "1. 🔐 AUTHENTICATE CLI:"
echo "   supabase login"
echo ""

echo "2. 🔗 LINK PROJECT:"
echo "   supabase link --project-ref ldgbjmotttuomxzwujrt"
echo ""

echo "3. 🚀 DEPLOY CRITICAL FUNCTIONS:"
for fn in "${CRITICAL_FUNCTIONS[@]}"; do
    echo "   supabase functions deploy $fn --no-verify-jwt"
done

echo ""
echo "4. 🧪 TEST DEPLOYMENT:"
echo "   ./scripts/test-functions-status.sh"
echo ""

echo "5. 🔑 CONFIGURE MISSING API KEYS:"
echo "   - Add TICKETMASTER_API_KEY in Supabase Dashboard"
echo "   - Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/settings/vault"
echo ""

echo "6. 📅 SET UP SCHEDULES:"
echo "   - Configure cron jobs in Supabase Dashboard"
echo "   - Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/functions"
echo ""

echo "✨ Once critical functions are deployed, your SceneScout app will be fully operational!"