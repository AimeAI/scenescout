#!/bin/bash

echo "⚡ Quick Deploy SceneScout Critical Functions"
echo "============================================"
echo ""

# Check authentication first
if ! supabase projects list >/dev/null 2>&1; then
    echo "❌ Not authenticated with Supabase CLI"
    echo "Please run: supabase login"
    echo "Then try this script again."
    exit 1
fi

echo "✅ CLI authenticated"
echo ""

# Set project reference
PROJECT_REF="ldgbjmotttuomxzwujrt"

echo "🔗 Linking to project: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

echo ""
echo "🚀 Deploying Critical Functions..."
echo ""

# Deploy functions in priority order
FUNCTIONS=(
    "rpc-functions"      # Core API functionality
    "health-check"       # System monitoring
    "ingest_eventbrite"  # Primary event source (has API key)
    "ingest_places_yelp" # Venue data (has API key)  
    "ingest_ticketmaster" # Secondary event source
)

SUCCESS_COUNT=0
TOTAL_COUNT=${#FUNCTIONS[@]}

for fn in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying $fn..."
    if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt; then
        echo "✅ $fn deployed successfully"
        ((SUCCESS_COUNT++))
    else
        echo "❌ Failed to deploy $fn"
    fi
    echo ""
done

echo "📊 Deployment Summary:"
echo "====================="
echo "Successfully deployed: $SUCCESS_COUNT/$TOTAL_COUNT functions"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo "🎉 All critical functions deployed successfully!"
    echo ""
    echo "🧪 Testing deployment..."
    echo ""
    
    # Run the test script if it exists
    if [ -f "scripts/test-functions-status.sh" ]; then
        ./scripts/test-functions-status.sh
    fi
    
    echo ""
    echo "✅ Next Steps:"
    echo "1. Configure missing API keys in Supabase Dashboard"
    echo "2. Set up cron schedules for ingestion functions"  
    echo "3. Your SceneScout app should now be fully operational!"
    echo ""
    echo "🔗 Supabase Dashboard:"
    echo "https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt"
    
elif [ $SUCCESS_COUNT -gt 0 ]; then
    echo "⚠️  Partial deployment completed"
    echo "Some functions failed to deploy. Please check the errors above."
    echo "Your app may have limited functionality."
    
else
    echo "❌ Deployment failed"
    echo "No functions were successfully deployed."
    echo "Please check your authentication and try again."
fi

echo ""