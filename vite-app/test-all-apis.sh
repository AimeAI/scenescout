#!/bin/bash

# SceneScout - Comprehensive API Testing Script
# Tests all external API integrations and edge functions

set -e

echo "🧪 SceneScout API Integration Tests"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_test() { echo -e "${CYAN}🧪 $1${NC}"; }

# Test variables
TORONTO_LAT="43.6532"
TORONTO_LNG="-79.3832"
RADIUS="1000"
TEST_LOCATION="$TORONTO_LAT,$TORONTO_LNG"

# Function to test API response
test_api_response() {
    local test_name="$1"
    local response="$2"
    local expected_success="$3"
    
    echo ""
    print_test "Testing: $test_name"
    echo "Response: $response"
    
    if echo "$response" | grep -q '"success":true' || echo "$response" | grep -q '"venuesProcessed"' || echo "$response" | grep -q '"eventsProcessed"'; then
        print_success "$test_name - API integration working!"
        if echo "$response" | grep -q '"venuesProcessed"'; then
            local count=$(echo "$response" | grep -o '"venuesProcessed":[0-9]*' | cut -d':' -f2)
            print_info "Processed $count venues"
        fi
        if echo "$response" | grep -q '"eventsProcessed"'; then
            local count=$(echo "$response" | grep -o '"eventsProcessed":[0-9]*' | cut -d':' -f2)
            print_info "Processed $count events"
        fi
        return 0
    elif echo "$response" | grep -q '"status":"disabled"'; then
        print_warning "$test_name - API disabled (check API keys)"
        echo "$response" | grep -o '"reason":"[^"]*"' || true
        return 1
    else
        print_error "$test_name - Unexpected response"
        return 1
    fi
}

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📋 Pre-flight checks..."
echo ""

# Check secrets
print_info "Checking Supabase secrets..."
supabase secrets list || {
    print_error "Failed to list secrets. Make sure you're logged in and linked to the project."
    exit 1
}

echo ""
print_info "Checking deployed functions..."
supabase functions list || {
    print_error "Failed to list functions."
    exit 1
}

echo ""
echo "🚀 Starting API tests..."
echo ""

# Test 1: Google Places API
print_test "1. Testing Google Places API Integration"
echo "Location: Toronto ($TEST_LOCATION)"
echo "Radius: ${RADIUS}m"

google_response=$(supabase functions invoke ingest_places_google \
  --body "{\"location\":\"$TEST_LOCATION\",\"radius\":$RADIUS}" 2>/dev/null || echo '{"error":"function_failed"}')

test_api_response "Google Places" "$google_response" true
GOOGLE_SUCCESS=$?

echo ""
echo "----------------------------------------"

# Test 2: Yelp API
print_test "2. Testing Yelp API Integration"
echo "Location: Toronto, ON"
echo "Radius: ${RADIUS}m"

yelp_response=$(supabase functions invoke ingest_places_yelp \
  --body "{\"location\":\"Toronto, ON\",\"radius\":$RADIUS}" 2>/dev/null || echo '{"error":"function_failed"}')

test_api_response "Yelp" "$yelp_response" true
YELP_SUCCESS=$?

echo ""
echo "----------------------------------------"

# Test 3: Eventbrite API
print_test "3. Testing Eventbrite API Integration"
echo "Location: Toronto ($TEST_LOCATION)"

eventbrite_response=$(supabase functions invoke ingest_eventbrite \
  --body "{\"latitude\":$TORONTO_LAT,\"longitude\":$TORONTO_LNG,\"radius\":$RADIUS}" 2>/dev/null || echo '{"error":"function_failed"}')

test_api_response "Eventbrite" "$eventbrite_response" true
EVENTBRITE_SUCCESS=$?

echo ""
echo "----------------------------------------"

# Test 4: Direct API calls (bypass Supabase functions)
echo ""
print_test "4. Testing Direct API Calls"

# Test Google Places API directly
echo ""
print_info "Testing Google Places API directly..."
google_direct=$(curl -s "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=$TEST_LOCATION&radius=$RADIUS&key=AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE" || echo '{"error":"direct_api_failed"}')

if echo "$google_direct" | grep -q '"results"'; then
    print_success "Google Places API - Direct call working"
    local count=$(echo "$google_direct" | grep -o '"place_id"' | wc -l)
    print_info "Found $count places"
else
    print_error "Google Places API - Direct call failed"
    echo "Response: $google_direct"
fi

# Test Yelp API directly
echo ""
print_info "Testing Yelp API directly..."
yelp_direct=$(curl -s -H "Authorization: Bearer tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx" \
  "https://api.yelp.com/v3/businesses/search?latitude=$TORONTO_LAT&longitude=$TORONTO_LNG&radius=$RADIUS" || echo '{"error":"direct_api_failed"}')

if echo "$yelp_direct" | grep -q '"businesses"'; then
    print_success "Yelp API - Direct call working"
    local count=$(echo "$yelp_direct" | grep -o '"id"' | wc -l)
    print_info "Found businesses"
else
    print_error "Yelp API - Direct call failed"
    echo "Response: $yelp_direct"
fi

# Test Eventbrite API directly
echo ""
print_info "Testing Eventbrite API directly..."
eventbrite_direct=$(curl -s -H "Authorization: Bearer X2O44MNDA2V5OAZILC7C" \
  "https://www.eventbriteapi.com/v3/events/search/?location.latitude=$TORONTO_LAT&location.longitude=$TORONTO_LNG&location.within=1km" || echo '{"error":"direct_api_failed"}')

if echo "$eventbrite_direct" | grep -q '"events"'; then
    print_success "Eventbrite API - Direct call working"
else
    print_error "Eventbrite API - Direct call failed"
    echo "Response: $eventbrite_direct"
fi

echo ""
echo "========================================="
echo "📊 Test Results Summary"
echo "========================================="

total_tests=3
successful_tests=0

if [ $GOOGLE_SUCCESS -eq 0 ]; then
    print_success "Google Places Integration: WORKING"
    ((successful_tests++))
else
    print_error "Google Places Integration: FAILED"
fi

if [ $YELP_SUCCESS -eq 0 ]; then
    print_success "Yelp Integration: WORKING"
    ((successful_tests++))
else
    print_error "Yelp Integration: FAILED"
fi

if [ $EVENTBRITE_SUCCESS -eq 0 ]; then
    print_success "Eventbrite Integration: WORKING"
    ((successful_tests++))
else
    print_error "Eventbrite Integration: FAILED"
fi

echo ""
echo "Success Rate: $successful_tests/$total_tests integrations working"

if [ $successful_tests -eq $total_tests ]; then
    print_success "🎉 All API integrations are working perfectly!"
    echo ""
    echo "✨ Next steps:"
    echo "1. Test the admin interface: http://localhost:5173/admin/ingest"
    echo "2. Check venue data in Supabase dashboard"
    echo "3. Verify map background ingestion by panning around"
    exit 0
elif [ $successful_tests -gt 0 ]; then
    print_warning "⚠️  Some integrations are working, others need attention"
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "1. Check API key validity in provider dashboards"
    echo "2. Verify Supabase secrets: supabase secrets list"
    echo "3. Check function logs: supabase functions logs FUNCTION_NAME"
    exit 1
else
    print_error "❌ No integrations are working"
    echo ""
    echo "🔧 Debug steps:"
    echo "1. Verify API keys are correct"
    echo "2. Re-run setup: ./setup-all-secrets.sh"
    echo "3. Check Supabase project status"
    echo "4. Review function deployment"
    exit 1
fi