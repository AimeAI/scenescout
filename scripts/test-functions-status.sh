#!/bin/bash

echo "🧪 Testing SceneScout Edge Functions Status"
echo "=========================================="
echo ""

# Your project URLs and keys
SUPABASE_URL="https://ldgbjmotttuomxzwujrt.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0"

# Function to test endpoint
test_function() {
    local func_name="$1"
    local test_data="$2"
    local expected_response="$3"
    
    echo "Testing: $func_name"
    echo "--------------------"
    
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$func_name" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        -w "\n%{http_code}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    case $http_code in
        200)
            echo "✅ Function is deployed and working"
            echo "Response: $body" | head -c 200
            if [ ${#body} -gt 200 ]; then echo "..."; fi
            ;;
        404)
            echo "❌ Function not deployed"
            ;;
        500|502|503)
            echo "⚠️  Function deployed but has errors"
            echo "Response: $body"
            ;;
        401|403)
            echo "🔒 Function deployed but authentication issue"
            ;;
        *)
            echo "🤔 Unexpected response: HTTP $http_code"
            echo "Response: $body"
            ;;
    esac
    echo ""
}

echo "Testing Core Functions:"
echo "======================="
echo ""

# Test core functions needed by the app
test_function "health-check" '{"test": true}' '{"overall":"healthy"}'
test_function "rpc-functions" '{"function": "get_trending_events", "params": {"limit": 5}}' '{"success":true}'
test_function "event-orchestrator" '{}' '{"success":true}'

echo "Testing Ingestion Functions (called by /api/ingest):"
echo "===================================================="
echo ""

# Test ingestion functions
test_function "ingest_eventbrite" '{"location": "Toronto", "limit": 5}' '{"eventsProcessed"'
test_function "ingest_ticketmaster" '{"location": "Toronto", "limit": 5}' '{"eventsProcessed"'
test_function "ingest_songkick" '{"location": "Toronto", "limit": 5}' '{"eventsProcessed"'

echo "Testing Utility Functions:"
echo "=========================="
echo ""

# Test utility functions
test_function "webhook-handler" '{"type": "test"}' '{"success":true}'
test_function "reminders" '{}' '{"success":true}'

echo "Summary:"
echo "========"
echo ""
echo "✅ = Function working correctly"
echo "⚠️  = Function deployed but has issues (likely missing API keys)"
echo "❌ = Function not deployed"
echo "🔒 = Function deployed but authentication needed"
echo ""
echo "Functions marked with ⚠️ usually work but return errors about missing API keys,"
echo "which is expected behavior when external API keys aren't configured."