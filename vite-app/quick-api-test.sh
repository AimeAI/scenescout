#!/bin/bash

# Quick API Verification Script
# Tests the core APIs individually to verify they're working

echo "🔍 Quick API Verification Test"
echo "============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Test location
LAT="43.6532"
LNG="-79.3832"

echo "Testing APIs for Toronto location: $LAT,$LNG"
echo ""

# Test 1: Google Places API
echo "1. Testing Google Places API..."
google_test=$(curl -s "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=$LAT,$LNG&radius=1000&key=AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE")

if echo "$google_test" | grep -q '"status":"OK"'; then
    places_count=$(echo "$google_test" | grep -o '"place_id"' | wc -l | tr -d ' ')
    print_success "Google Places API working - Found $places_count places"
else
    error_msg=$(echo "$google_test" | grep -o '"error_message":"[^"]*"' | cut -d'"' -f4)
    print_error "Google Places API failed: $error_msg"
fi

echo ""

# Test 2: Yelp API
echo "2. Testing Yelp API..."
yelp_test=$(curl -s -H "Authorization: Bearer tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx" \
    "https://api.yelp.com/v3/businesses/search?latitude=$LAT&longitude=$LNG&radius=1000")

if echo "$yelp_test" | grep -q '"businesses"'; then
    businesses_count=$(echo "$yelp_test" | grep -o '"id":"[^"]*"' | wc -l | tr -d ' ')
    print_success "Yelp API working - Found $businesses_count businesses"
else
    error_msg=$(echo "$yelp_test" | grep -o '"description":"[^"]*"' | cut -d'"' -f4)
    print_error "Yelp API failed: $error_msg"
fi

echo ""

# Test 3: Eventbrite API (auth test only since search has issues)
echo "3. Testing Eventbrite API..."
eventbrite_auth=$(curl -s -H "Authorization: Bearer X2O44MNDA2V5OAZILC7C" \
    "https://www.eventbriteapi.com/v3/users/me/")

if echo "$eventbrite_auth" | grep -q '"id"'; then
    user_email=$(echo "$eventbrite_auth" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    print_success "Eventbrite API authentication working - User: $user_email"
    print_warning "Note: Search endpoint may need adjustment in edge function"
else
    print_error "Eventbrite API authentication failed"
fi

echo ""

# Test 4: Resend API (basic test)
echo "4. Testing Resend API..."
resend_test=$(curl -s -H "Authorization: Bearer re_DwNny5z9_KUFTckvdEEhTYDvnSwsjqowf" \
    "https://api.resend.com/domains")

if echo "$resend_test" | grep -q '"data"' || echo "$resend_test" | grep -q '\[\]'; then
    print_success "Resend API working"
else
    print_error "Resend API failed"
fi

echo ""
echo "=========================="
echo "✨ API Verification Complete"
echo ""
echo "🚀 Next steps:"
echo "1. Run: ./setup-all-secrets.sh (to set Supabase secrets)"
echo "2. Run: ./test-all-apis.sh (to test edge functions)"
echo "3. Test in admin panel: http://localhost:5173/admin/ingest"