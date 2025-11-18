#!/bin/bash

# Script to add all environment variables to Vercel
# This sets up the production environment with all required credentials

echo "Adding environment variables to Vercel production environment..."

# Supabase Configuration (CRITICAL)
echo "NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://ldgbjmotttuomxzwujrt.supabase.co"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0"
echo "SUPABASE_URL" | vercel env add SUPABASE_URL production <<< "https://ldgbjmotttuomxzwujrt.supabase.co"
echo "SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MDE0MSwiZXhwIjoyMDczMjI2MTQxfQ.4W5qDG_2ljDj01Bqjw35EYlSfVIYy3GrCMGe1pLgMFc"

# API Keys (CRITICAL)
echo "TICKETMASTER_API_KEY" | vercel env add TICKETMASTER_API_KEY production <<< "3DsSM2m9sXBDf8P5uuYnksqs8AwQ7hG6"
echo "EVENTBRITE_TOKEN" | vercel env add EVENTBRITE_TOKEN production <<< "X2O44MNDA2V5OAZILC7C"

# Feature Flags
echo "NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES" | vercel env add NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES production <<< "false"
echo "NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING" | vercel env add NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING production <<< "true"
echo "NEXT_PUBLIC_FEATURE_TRACKING_V1" | vercel env add NEXT_PUBLIC_FEATURE_TRACKING_V1 production <<< "true"
echo "NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS" | vercel env add NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS production <<< "true"
echo "NEXT_PUBLIC_FEATURE_SEEN_STORE" | vercel env add NEXT_PUBLIC_FEATURE_SEEN_STORE production <<< "true"
echo "NEXT_PUBLIC_FEATURE_FILTER_CHIPS_V1" | vercel env add NEXT_PUBLIC_FEATURE_FILTER_CHIPS_V1 production <<< "true"
echo "NEXT_PUBLIC_FEATURE_SIDEBAR_V1" | vercel env add NEXT_PUBLIC_FEATURE_SIDEBAR_V1 production <<< "true"
echo "NEXT_PUBLIC_FEATURE_SAVED_V1" | vercel env add NEXT_PUBLIC_FEATURE_SAVED_V1 production <<< "true"
echo "NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE" | vercel env add NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE production <<< "true"

# Web Push Notifications (VAPID)
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY" | vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production <<< "BDfjDNa6RXKPdsSQnKEP-H3Z4oQAWHd7lDj13z8WGR7Ul5ZeyVTbF7oDlniBCFv_BQ1FwhsIZhjR8B8a5qU8T8E"
echo "VAPID_PRIVATE_KEY" | vercel env add VAPID_PRIVATE_KEY production <<< "GZEBUO8T2A498TWxBFFZgBStLJfAKw8g9ukl1A8F2EY"
echo "VAPID_SUBJECT" | vercel env add VAPID_SUBJECT production <<< "mailto:support@scenescout.app"

# Cron Secret
echo "CRON_SECRET" | vercel env add CRON_SECRET production <<< "scenescout_cron_secret_2025"

echo "✅ All environment variables added to Vercel production environment!"
