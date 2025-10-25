#!/bin/bash

# Apply RLS Security Fixes Migration
# Uses Supabase Management API to execute SQL directly

set -e

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  RLS Security Fixes Migration                 ║"
echo "║  Applying Critical Security Updates           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Verify required environment variables
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: SUPABASE_URL not found in environment"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment"
  exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "⚠️  Warning: SUPABASE_ACCESS_TOKEN not found"
  echo "Migration will be applied using SQL Editor method"
fi

# Use SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}

# Extract project reference from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "📍 Project Reference: $PROJECT_REF"
echo "📍 Database URL: $SUPABASE_URL"
echo ""

# Read the migration file
MIGRATION_FILE="supabase/migrations/20251020_fix_critical_rls_vulnerabilities.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Reading migration file..."
MIGRATION_SQL=$(cat "$MIGRATION_FILE")
SQL_LENGTH=$(echo "$MIGRATION_SQL" | wc -c | xargs)

echo "✅ Migration file loaded ($SQL_LENGTH characters)"
echo ""

# Try to apply using Supabase Management API (requires access token)
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "🔄 Attempting to apply migration via Supabase Management API..."
  echo ""

  # Create a temporary file with the SQL
  TEMP_SQL=$(mktemp)
  echo "$MIGRATION_SQL" > "$TEMP_SQL"

  # Execute via Supabase API
  RESPONSE=$(curl -s -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(jq -Rs . < "$TEMP_SQL")}")

  rm "$TEMP_SQL"

  # Check if successful
  if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ API Error:"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo "Falling back to SQL Editor method..."
  else
    echo "✅ Migration applied successfully via API!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    exit 0
  fi
fi

# Fallback: Provide instructions for manual application
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Manual Migration Instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The migration needs to be applied manually using the Supabase SQL Editor."
echo ""
echo "Steps:"
echo "1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy the SQL from: $MIGRATION_FILE"
echo "3. Paste into the SQL Editor"
echo "4. Click 'Run' to execute"
echo ""
echo "Alternative: Use the apply-via-sql-editor.sh script"
echo ""

# Create a helper script that opens the SQL editor with the migration
cat > apply-via-sql-editor.sh << 'HEREDOC'
#!/bin/bash
echo "Opening Supabase SQL Editor..."
echo ""
echo "Next steps:"
echo "1. Copy the migration SQL (shown below)"
echo "2. Paste into the SQL Editor"
echo "3. Click 'Run'"
echo ""
echo "Press Enter to see the SQL..."
read

cat supabase/migrations/20251020_fix_critical_rls_vulnerabilities.sql

echo ""
echo "SQL shown above - copy and paste into the editor"
HEREDOC

chmod +x apply-via-sql-editor.sh

echo "Helper script created: ./apply-via-sql-editor.sh"
echo ""
