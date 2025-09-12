#!/bin/bash

# SceneScout v14 - One-Shot Production Deployment Script
# Deploys to Vercel + Supabase with comprehensive checks

set -e  # Exit on any error

echo "🚀 SceneScout v14 - Production Deployment"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"  
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Install with: npm install -g supabase"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Install with: npm install -g vercel"
        print_status "You can deploy manually through Vercel dashboard"
    fi
    
    print_success "Dependencies checked"
}

# Validate environment variables
check_environment() {
    print_status "Validating environment variables..."
    
    # Required for deployment
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY" 
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        print_error "Please set these variables and try again"
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Build and test the application
build_application() {
    print_status "Building application..."
    
    # Install dependencies
    npm install
    
    # Run type checking
    print_status "Running type check..."
    npm run typecheck
    
    # Run linting
    print_status "Running linter..."
    npm run lint
    
    # Build the application
    print_status "Building Next.js application..."
    npm run build
    
    print_success "Application built successfully"
}

# Deploy database schema
deploy_database() {
    print_status "Deploying database schema..."
    
    # Apply schema (production mode - no seed data)
    NODE_ENV=production npm run db:apply
    
    print_success "Database schema deployed"
}

# Deploy edge functions
deploy_edge_functions() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if functions directory exists
    if [ ! -d "supabase/functions" ]; then
        print_error "Edge functions directory not found"
        exit 1
    fi
    
    # Deploy all functions
    supabase functions deploy --no-verify-jwt
    
    print_success "Edge functions deployed"
}

# Deploy to Vercel (if CLI is available)
deploy_vercel() {
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        
        # Deploy to production
        vercel --prod
        
        print_success "Deployed to Vercel"
    else
        print_warning "Vercel CLI not available - deploy manually:"
        echo "   1. Connect your GitHub repo to Vercel"
        echo "   2. Set environment variables in Vercel dashboard"
        echo "   3. Deploy from Vercel dashboard"
    fi
}

# Set up cron schedules
setup_schedules() {
    print_status "Setting up cron schedules..."
    print_warning "Manual step required:"
    echo "   1. Go to Supabase Dashboard → Edge Functions"
    echo "   2. Set up the following cron schedules:"
    echo ""
    echo "   Daily Ingestion (6 AM UTC):"
    echo "   0 6 * * * → ingest_ticketmaster"
    echo "   5 6 * * * → ingest_eventbrite" 
    echo "   10 6 * * * → ingest_songkick"
    echo "   15 6 * * * → ingest_meetup"
    echo "   20 6 * * * → ingest_places_google"
    echo "   25 6 * * * → ingest_places_yelp"
    echo ""
    echo "   ML Processing (7 AM UTC):"
    echo "   0 7 * * * → hotness_ml"
    echo "   30 7 * * * → enrich_images"
    echo ""
    echo "   User Notifications:"
    echo "   0 9 * * * → daily_digest"
    echo "   0 18 * * * → reminders"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting SceneScout v14 production deployment..."
    echo ""
    
    # Pre-flight checks
    check_dependencies
    check_environment
    
    # Build and deploy
    build_application
    deploy_database
    deploy_edge_functions
    
    # Platform deployment
    deploy_vercel
    
    # Post-deployment setup
    setup_schedules
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "   1. Set up Stripe webhook endpoint: /api/stripe/webhook"
    echo "   2. Configure cron schedules (see above)"
    echo "   3. Test all pages and functionality"
    echo "   4. Monitor logs in Supabase dashboard"
    echo ""
    print_status "🔗 Important URLs:"
    echo "   • Supabase Dashboard: https://app.supabase.com"
    echo "   • Vercel Dashboard: https://vercel.com/dashboard"
    echo "   • Application: Check Vercel deployment URL"
    echo ""
}

# Handle Ctrl+C gracefully
trap 'print_warning "Deployment interrupted"; exit 130' INT

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

# Check if this looks like SceneScout
if ! grep -q "scenescout" package.json; then
    print_warning "This doesn't appear to be a SceneScout project"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run main deployment
main