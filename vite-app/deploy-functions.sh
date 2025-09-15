#!/bin/bash

echo "🚀 Deploying Edge Functions for SceneScout"
echo ""

# Check if we're logged in
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    exit 1
fi

# Deploy functions without JWT verification
echo "📦 Deploying Edge Functions..."
echo ""

# Set environment variables
export SUPABASE_ACCESS_TOKEN=sbp_082481b0bb66ef265ce66cf074b0ba929b4fedb8
export SUPABASE_PROJECT_REF=fzsixhfhfndlpzfksdxm

# Core ingestion functions
for fn in ingest_eventbrite ingest_ticketmaster ingest_meetup ingest_songkick ingest_places_google ingest_places_yelp; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "Deploying $fn..."
        supabase functions deploy "$fn" --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
        if [ $? -eq 0 ]; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

# Utility functions
for fn in daily_digest reminders enrich_images hotness_ml push-subscribe push-send; do
    if [ -d "supabase/functions/$fn" ]; then
        echo "Deploying $fn..."
        supabase functions deploy "$fn" --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
        if [ $? -eq 0 ]; then
            echo "✅ $fn deployed successfully"
        else
            echo "❌ Failed to deploy $fn"
        fi
    else
        echo "⚠️  Directory supabase/functions/$fn not found"
    fi
done

echo ""
echo "🧪 Testing function deployment..."
echo ""

# Test the ingest_eventbrite function
echo "Testing ingest_eventbrite function..."
curl -X POST "https://fzsixhfhfndlpzfksdxm.supabase.co/functions/v1/ingest_eventbrite" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cities": ["San Francisco"]}' \
  --max-time 30 \
  | jq '.' 2>/dev/null || echo "Function test completed"

echo ""
echo "⏰ Scheduling Information"
echo "========================"
echo ""
echo "Set the following schedules in your Supabase Dashboard:"
echo "Go to: https://app.supabase.com/project/$SUPABASE_PROJECT_REF/functions"
echo ""
echo "Recommended schedules:"
echo "  📅 ingest_eventbrite: 0 */6 * * * (every 6 hours)"
echo "  📅 ingest_ticketmaster: 30 */6 * * * (every 6 hours, offset by 30 min)"
echo "  📊 hotness_ml: */15 * * * * (every 15 minutes)"  
echo "  📧 daily_digest: 0 9 * * * (daily at 9 AM)"
echo "  ⏰ reminders: 0 13,17 * * * (daily at 1 PM and 5 PM)"
echo ""

echo "🔑 Required API Keys"
echo "===================="
echo ""
echo "Add these secrets in your Supabase Dashboard:"
echo "Go to: https://app.supabase.com/project/$SUPABASE_PROJECT_REF/settings/vault"
echo ""
echo "  🎫 EVENTBRITE_TOKEN - Get from https://www.eventbrite.com/platform/api-keys"
echo "  🎵 TICKETMASTER_API_KEY - Get from https://developer.ticketmaster.com/"
echo "  👥 MEETUP_ACCESS_TOKEN - Get from https://secure.meetup.com/meetup_api/oauth_consumers/"
echo "  🎤 SONGKICK_API_KEY - Get from https://www.songkick.com/developer"
echo "  📍 GOOGLE_PLACES_API_KEY - Get from https://console.cloud.google.com/"
echo "  🍕 YELP_API_KEY - Get from https://www.yelp.com/developers"
echo "  🤖 OPENAI_API_KEY - Get from https://platform.openai.com/api-keys"
echo "  📧 RESEND_API_KEY - Get from https://resend.com/api-keys"
echo ""

echo "✅ Edge Functions deployment complete!"
echo ""
echo "💡 Functions will return '200 disabled: missing X_KEY' when API keys are not configured."
echo "💡 This is expected behavior and allows the functions to be deployed without errors."