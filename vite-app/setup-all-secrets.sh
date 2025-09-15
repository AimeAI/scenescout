#!/bin/bash

# SceneScout - Complete API Keys Setup Script
# This script sets all Supabase secrets for edge functions

set -e

echo "🔐 Setting up all SceneScout API keys in Supabase secrets..."
echo "============================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "Not in the vite-app directory. Please run from /vite-app/"
    exit 1
fi

echo "Setting Supabase secrets for edge functions..."
echo ""

# Core Supabase keys
print_info "Setting core Supabase keys..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MDE0MSwiZXhwIjoyMDczMjI2MTQxfQ.4W5qDG_2ljDj01Bqjw35EYlSfVIYy3GrCMGe1pLgMFc"

# Google Places API
print_info "Setting Google Places API key..."
supabase secrets set GOOGLE_PLACES_API_KEY="AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE"

# Yelp API
print_info "Setting Yelp API keys..."
supabase secrets set YELP_API_KEY="tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx"
supabase secrets set YELP_CLIENT_ID="2jEgYfpuKDJgJzY4htN6oQ"

# Eventbrite API
print_info "Setting Eventbrite API keys..."
supabase secrets set EVENTBRITE_API_KEY="HJADY7ISSGOPPI6IBQ"
supabase secrets set EVENTBRITE_TOKEN="X2O44MNDA2V5OAZILC7C"

# Resend (Email service)
print_info "Setting Resend API key..."
supabase secrets set RESEND_API_KEY="re_DwNny5z9_KUFTckvdEEhTYDvnSwsjqowf"

echo ""
print_status "All secrets have been set!"

echo ""
echo "📋 Current secrets:"
supabase secrets list

echo ""
print_info "Now deploying edge functions..."

# Deploy all ingestion functions
echo ""
echo "Deploying ingestion functions..."

supabase functions deploy ingest_places_google || print_warning "Failed to deploy ingest_places_google"
supabase functions deploy ingest_places_yelp || print_warning "Failed to deploy ingest_places_yelp"
supabase functions deploy ingest_eventbrite || print_warning "Failed to deploy ingest_eventbrite"

echo ""
print_status "Setup complete! 🎉"

echo ""
echo "📖 Next steps:"
echo "1. Run the API tests: ./test-all-apis.sh"
echo "2. Start development server: npm run dev"
echo "3. Test integrations in the admin panel: http://localhost:5173/admin/ingest"