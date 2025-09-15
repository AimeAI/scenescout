#!/bin/bash

echo "🚀 Manual migration push for SceneScout"
echo ""
echo "Since we can't use 'supabase db push' directly, here's what to do:"
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://app.supabase.com/project/fzsixhfhfndlpzfksdxm/sql"
echo ""
echo "2. Run each migration file in order:"
echo ""

# List all migration files
echo "Migration files to run (in order):"
for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        echo "   - $(basename "$file")"
    fi
done

echo ""
echo "3. After running all migrations, come back here and run:"
echo "   ./regenerate-types.sh"
echo ""

# Create the type regeneration script
cat > regenerate-types.sh << 'EOF'
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
EOF

chmod +x regenerate-types.sh

echo "✅ Scripts created!"
echo ""
echo "For now, let's concatenate all migrations into one file for easy copy-paste:"

# Create combined migration file
cat > combined-migrations.sql << 'EOF'
-- SceneScout Combined Migrations
-- Run this in your Supabase SQL Editor

EOF

# Append all migrations in order
for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        echo "-- ========================================" >> combined-migrations.sql
        echo "-- Migration: $(basename "$file")" >> combined-migrations.sql
        echo "-- ========================================" >> combined-migrations.sql
        echo "" >> combined-migrations.sql
        cat "$file" >> combined-migrations.sql
        echo "" >> combined-migrations.sql
        echo "" >> combined-migrations.sql
    fi
done

echo "📋 Created combined-migrations.sql"
echo "   You can copy this entire file and run it in the SQL editor!"