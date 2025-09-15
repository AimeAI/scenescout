#!/bin/bash

echo "🔄 Regenerating TypeScript types..."

# Using npx to run supabase commands
PROJECT_REF="fzsixhfhfndlpzfksdxm"

# Method 1: Try with supabase CLI
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase gen types typescript --project-id "$PROJECT_REF" > src/types/database.types.ts 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Types generated successfully!"
        exit 0
    fi
fi

# Method 2: Manual type generation reminder
echo ""
echo "⚠️  Could not generate types automatically. Please:"
echo "1. Go to https://app.supabase.com/project/$PROJECT_REF/api"
echo "2. Click on 'Documentation' in the sidebar"
echo "3. Select 'TypeScript' tab"
echo "4. Copy all the types"
echo "5. Replace contents of src/types/database.types.ts"
echo ""
