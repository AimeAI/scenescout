#!/bin/bash

# SceneScout Day 1-2 Automation - Simple Runner
# Just run this script and everything will be set up!

echo "🚀 SceneScout Automated Production Setup"
echo "========================================"
echo ""
echo "This will automatically set up:"
echo "✅ Complete authentication system"
echo "✅ Production deployment pipeline" 
echo "✅ Real data ingestion (no mocks!)"
echo "✅ Error monitoring & dashboards"
echo "✅ CI/CD with GitHub Actions"
echo ""

# Check if environment variables are set
if [[ -z "$VITE_SUPABASE_URL" || -z "$VITE_SUPABASE_ANON_KEY" ]]; then
    echo "❌ Missing required environment variables!"
    echo ""
    echo "Please set these first:"
    echo "export VITE_SUPABASE_URL=your_supabase_url"
    echo "export VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo ""
    echo "Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    exit 1
fi

# Run master automation
if [[ -f "scripts/master-automation.sh" ]]; then
    echo "🎯 Starting automated setup..."
    echo ""
    bash scripts/master-automation.sh
else
    echo "❌ Master automation script not found!"
    echo "Make sure you're in the project root directory."
    exit 1
fi