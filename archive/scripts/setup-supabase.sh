#!/bin/bash

# Setup script for Supabase CLI and project connection

echo "🚀 Setting up Supabase CLI..."

# Install Supabase CLI (macOS)
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    brew install supabase/tap/supabase
else
    echo "Supabase CLI already installed"
fi

# Login to Supabase
echo "Logging into Supabase..."
echo "Please use the following credentials when prompted:"
echo "Email: aimeintelligence@gmail.com"
echo "Password: sZgAlkqN8fD2nEqo"
echo ""

supabase login

# Link to project
echo "Linking to your Supabase project..."
echo "When prompted, select your project or enter the project ID"
supabase link

# Pull database schema
echo "Pulling database schema..."
supabase db pull

# Generate TypeScript types
echo "Generating TypeScript types..."
supabase gen types typescript --local > vite-app/src/types/database.types.ts

echo "✅ Supabase setup complete!"
echo ""
echo "Next steps:"
echo "1. Check vite-app/src/types/database.types.ts for updated types"
echo "2. Your local environment is now connected to Supabase"
echo "3. You can run 'supabase db diff' to see schema changes"