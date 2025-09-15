# Manual Database Setup Instructions

Since the automated migration script requires Supabase CLI linking, here's how to manually set up the database:

## Step 1: Access your Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/projects/fzsixhfhfndlpzfksdxm
2. Navigate to "SQL Editor" in the left sidebar

## Step 2: Execute Core Schema

Copy and paste the contents of `db/migrations/0001_core.sql` into the SQL editor and run it.

## Step 3: Execute RPC Functions

Copy and paste the contents of `db/migrations/0002_rpcs.sql` into the SQL editor and run it.

## Step 4: Verify Setup

Copy and paste the contents of `db/migrations/test-queries.sql` into the SQL editor and run it to verify everything works.

## Files to Execute (in order):

1. **Core Schema** (db/migrations/0001_core.sql)
2. **RPC Functions** (db/migrations/0002_rpcs.sql)
3. **Test Queries** (db/migrations/test-queries.sql)

After completing these steps, run:

```bash
npm run smoke
```

This should eliminate the TypeScript "never" type errors.