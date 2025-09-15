# SceneScout Database Bootstrap Guide

This guide explains how to set up the SceneScout database schema and RPC functions to eliminate TypeScript "never" type errors and enable full application functionality.

## Overview

The database consists of two main migration files:
- `db/migrations/0001_core.sql` - Core tables, indexes, and RLS policies
- `db/migrations/0002_rpcs.sql` - RPC functions for complex queries

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Supabase project created and linked
- PostgreSQL extensions: `uuid-ossp`, `postgis`, `pg_trgm`

## Quick Setup

### Option 1: Automated Script (Recommended)

```bash
# Run the automated migration script
./scripts/apply-db-migrations.sh
```

This script will:
- Check for Supabase CLI availability
- Apply both migration files
- Run verification tests
- Provide clear status updates

### Option 2: Manual Setup

#### 1. Link to your Supabase project

```bash
# If not already linked
supabase link --project-ref YOUR_PROJECT_REF

# Or using environment variables
export SUPABASE_PROJECT_REF=your-project-ref
export SUPABASE_DB_PASSWORD=your-db-password
supabase link --project-ref $SUPABASE_PROJECT_REF
```

### 2. Run the migrations

Option A: Using Supabase CLI (recommended)
```bash
# Apply migrations using the SQL editor
supabase db reset --linked
# Then manually apply via dashboard SQL editor or:

# Apply core schema via SQL editor
cat db/migrations/0001_core.sql | supabase db query --stdin

# Apply RPC functions via SQL editor 
cat db/migrations/0002_rpcs.sql | supabase db query --stdin
```

Option B: Direct SQL execution (if above doesn't work)
```bash
# Copy the SQL content and paste into Supabase dashboard SQL editor
echo "Copy and paste the following files into your Supabase SQL editor:"
echo "1. db/migrations/0001_core.sql"
echo "2. db/migrations/0002_rpcs.sql"
```

### 3. Verify the setup

```bash
# Test the migrations with provided test queries
cat db/migrations/test-queries.sql | supabase db query --stdin

# Or manually check tables and functions:

# Check that tables were created
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Check that RPC functions were created
supabase db query "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"
```

## Alternative: Manual SQL Execution

If you prefer to run the SQL manually:

### Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Paste and execute `db/migrations/0001_core.sql`
4. Paste and execute `db/migrations/0002_rpcs.sql`

### Via psql
```bash
# Connect to your database
psql "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:6543/postgres"

# Run migrations
\\i db/migrations/0001_core.sql
\\i db/migrations/0002_rpcs.sql
```

## Database Schema

### Core Tables

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `cities` | Geographic locations | Referenced by events, venues, plans |
| `venues` | Event venues | References cities, referenced by events |
| `events` | Main events data | References venues, cities |
| `profiles` | User profiles with subscription info | Links to auth.users via user_id |
| `user_events` | User-event interactions | References events |
| `user_event_saves` | Simple user saves | References events |
| `plans` | User event collections | References cities |
| `plan_events` | Events within plans | References plans, events |
| `signals` | User interaction tracking | References events |

### RPC Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `get_events_by_category` | Category-based event grouping | `categories`, `limit_per_category` |
| `search_events` | Comprehensive event search | `city_slug`, `categories`, `date_range`, `price_range`, `bbox` |
| `record_signal` | User interaction tracking | `user_id`, `event_id`, `kind`, `weight` |
| `get_user_saved_events` | User's saved events | `user_id` |
| `get_featured_events` | Featured events for homepage | `limit` |
| `get_events_by_city` | City-specific events | `city_slug`, `limit` |
| `get_nearby_events` | Location-based events | `lat`, `lng`, `radius_km` |

## Row Level Security (RLS)

The schema includes comprehensive RLS policies:

- **Public read access**: Cities, venues, events are readable by everyone
- **User-scoped access**: Profiles, saves, plans, signals are scoped to `auth.uid()`
- **Public plans**: Plans with `is_public=true` are readable by everyone

## Environment Variables

Ensure these are set in your application:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Seed Data (Optional)

To add initial test data:

```sql
-- Add a test city
INSERT INTO cities (name, slug, country, is_active) 
VALUES ('San Francisco', 'san-francisco', 'US', true);

-- Add a test venue
INSERT INTO venues (name, city_id, latitude, longitude)
SELECT 'The Fillmore', id, 37.7849, -122.4329
FROM cities WHERE slug = 'san-francisco';

-- Add a test event
INSERT INTO events (title, description, date, category, city_id, venue_id)
SELECT 
  'Sample Concert', 
  'A great live music event', 
  CURRENT_DATE + INTERVAL '7 days',
  'music',
  c.id,
  v.id
FROM cities c, venues v 
WHERE c.slug = 'san-francisco' AND v.name = 'The Fillmore';
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure your Supabase user has sufficient privileges
2. **Extension errors**: PostGIS and other extensions may need to be enabled manually
3. **RLS blocking queries**: Check that policies allow the intended access patterns

### Verifying TypeScript Integration

After running migrations, the TypeScript "never" type errors should be resolved:

```bash
# This should now pass without "never" type errors
npm run typecheck

# The dev server should start without database-related errors
npm run dev
```

### Debug Queries

Test the RPC functions directly:

```sql
-- Test event search
SELECT * FROM search_events('san-francisco', ARRAY['music'], null, null, null, null, null, 10, 0);

-- Test category grouping
SELECT * FROM get_events_by_category(ARRAY['music', 'arts'], 5);

-- Test signal recording
SELECT record_signal('user-uuid-here', 'event-uuid-here', 'view', 1.0);
```

## Next Steps

1. **Deploy the database schema** using the commands above
2. **Update TypeScript types** by running `supabase gen types typescript` if needed
3. **Test the application** to ensure all queries work correctly
4. **Add seed data** for development and testing
5. **Set up data ingestion** using the Supabase functions in `/supabase/functions/`

## Support

For issues with database setup:
- Check Supabase project logs in the dashboard  
- Verify all environment variables are set correctly
- Ensure the Supabase CLI is properly authenticated
- Review RLS policies if queries are unexpectedly blocked