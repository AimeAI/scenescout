#!/bin/bash

# Interactive Supabase setup script

echo "🚀 Interactive Supabase Setup"
echo "============================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
else
    echo "✅ Supabase CLI is installed"
fi

echo ""
echo "📝 Step 1: Login to Supabase"
echo "----------------------------"
echo "Run the following command and enter your credentials when prompted:"
echo ""
echo "supabase login"
echo ""
echo "Credentials:"
echo "Email: aimeintelligence@gmail.com"
echo "Password: sZgAlkqN8fD2nEqo"
echo ""
read -p "Press Enter after you've logged in successfully..."

echo ""
echo "🔗 Step 2: Get your project reference"
echo "-------------------------------------"
echo "1. Go to https://app.supabase.com"
echo "2. Select your project"
echo "3. Go to Settings > General"
echo "4. Copy the 'Reference ID' (looks like: abcdefghijklmnopqrst)"
echo ""
read -p "Enter your project reference ID: " PROJECT_REF

echo ""
echo "🔐 Step 3: Get your database password"
echo "-------------------------------------"
echo "In the same Settings > Database section, find your database password"
echo ""
read -sp "Enter your database password: " DB_PASSWORD
echo ""

echo ""
echo "📁 Step 4: Initialize Supabase in your project"
echo "----------------------------------------------"
cd vite-app

# Initialize supabase
supabase init

# Link the project
echo ""
echo "Linking to project..."
supabase link --project-ref $PROJECT_REF --password $DB_PASSWORD

# Pull schema
echo ""
echo "Pulling database schema..."
supabase db pull

# Generate types
echo ""
echo "Generating TypeScript types..."
supabase gen types typescript --local > src/types/database.types.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your project is now connected to Supabase!"
echo "Database types have been generated at: vite-app/src/types/database.types.ts"