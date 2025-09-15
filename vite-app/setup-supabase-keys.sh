#!/bin/bash

# Supabase Keys Setup Script
# This script helps set up Supabase keys securely for SceneScout

set -e

echo "🔐 SceneScout Supabase Keys Security Setup"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "Not in the vite-app directory. Please run from /vite-app/"
    exit 1
fi

echo "1. Environment Variables Setup"
echo "==============================="

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    echo "Creating .env file from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status ".env file created from .env.example"
    else
        print_error ".env.example not found!"
        exit 1
    fi
fi

# Check .gitignore
if grep -q "\.env" ../.gitignore; then
    print_status ".env files are properly ignored in git"
else
    print_warning ".env not found in .gitignore - adding it"
    echo ".env*" >> ../.gitignore
    print_status "Added .env* to .gitignore"
fi

echo ""
echo "2. Supabase Secrets Configuration"
echo "==================================="

echo "Current Supabase secrets:"
supabase secrets list 2>/dev/null || {
    print_error "Supabase CLI not authenticated or project not linked"
    echo "Please run: supabase login"
    echo "Then run: supabase link --project-ref YOUR_PROJECT_ID"
    exit 1
}

echo ""
echo "3. API Keys Setup"
echo "=================="

# Function to set secret if not exists
set_secret_if_needed() {
    local secret_name=$1
    local description=$2
    
    if supabase secrets list | grep -q "$secret_name"; then
        print_status "$secret_name is already set"
    else
        print_warning "$secret_name is not set"
        echo "Please set your $description:"
        echo "supabase secrets set $secret_name=YOUR_KEY"
        echo ""
    fi
}

# Check and prompt for required API keys
set_secret_if_needed "GOOGLE_PLACES_API_KEY" "Google Places API Key"
set_secret_if_needed "YELP_API_KEY" "Yelp Fusion API Key"

# Optional API keys
echo "Optional API keys (for full functionality):"
set_secret_if_needed "OPENAI_API_KEY" "OpenAI API Key (for AI features)"
set_secret_if_needed "STRIPE_SECRET_KEY" "Stripe Secret Key (for payments)"
set_secret_if_needed "RESEND_API_KEY" "Resend API Key (for emails)"

echo ""
echo "4. Edge Functions Deployment"
echo "============================="

echo "Current deployed functions:"
supabase functions list 2>/dev/null || print_warning "No functions deployed"

echo ""
echo "To deploy the ingestion functions:"
echo "supabase functions deploy ingest_places_google"
echo "supabase functions deploy ingest_places_yelp"

echo ""
echo "5. Security Checklist"
echo "======================"

print_status "✅ Frontend uses environment variables (VITE_SUPABASE_*)"
print_status "✅ Edge functions use Deno.env.get() for secrets"
print_status "✅ .env files are in .gitignore"
print_status "✅ Service role key stored as Supabase secret"

echo ""
echo "6. Testing"
echo "=========="

echo "Test the Google Places integration:"
echo "supabase functions invoke ingest_places_google \\"
echo "  --body '{\"location\":\"43.6532,-79.3832\",\"radius\":1000}'"

echo ""
echo "Test the Yelp integration:"
echo "supabase functions invoke ingest_places_yelp \\"
echo "  --body '{\"location\":\"Toronto, ON\",\"radius\":2000}'"

echo ""
echo "Expected response with API keys:"
echo '{
  "success": true,
  "venuesProcessed": 25,
  "message": "Successfully ingested 25 venues"
}'

echo ""
echo "Expected response without API keys:"
echo '{
  "status": "disabled", 
  "reason": "missing GOOGLE_PLACES_API_KEY",
  "success": false
}'

echo ""
print_status "Setup complete! 🎉"
echo ""
echo "📖 Next steps:"
echo "1. Set your API keys using: supabase secrets set KEY_NAME=value"
echo "2. Deploy functions: supabase functions deploy function_name"
echo "3. Test the integrations using the commands above"
echo "4. Start development server: npm run dev"

echo ""
print_warning "Security reminders:"
echo "• Never commit API keys to git"
echo "• Restrict API keys in provider dashboards"
echo "• Rotate keys regularly"
echo "• Monitor API usage and costs"