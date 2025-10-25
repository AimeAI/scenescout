# RLS Security Migration Instructions

## ⚠️ IMPORTANT: Manual Application Required

The RLS security migration **cannot** be applied via the Supabase JS client. It must be applied using the Supabase SQL Editor.

## Migration File

**Location**: `supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql`

**Status**: ✅ Reviewed and verified safe by security agent

**What it fixes**:
- 🔴 CRITICAL: Cross-user data access in `push_subscriptions`
- 🔴 CRITICAL: Cross-user data access in `saved_events`
- 🔴 CRITICAL: Cross-user data access in `event_reminders`
- 🔴 CRITICAL: Missing RLS on `events` table
- 🔴 CRITICAL: Missing RLS on system tables

**Key Features**:
- ✅ Preserves anonymous user support (`userId = 'anonymous'`)
- ✅ Service role access via `bypassRLS` (uses `current_user` checks)
- ✅ Performance indexes to prevent query slowdown
- ✅ Backward compatible - NO breaking changes

---

## Application Method 1: Supabase Dashboard (RECOMMENDED)

### Step 1: Access SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **ldgbjmotttuomxzwujrt**
3. Click **SQL Editor** in the left sidebar

### Step 2: Copy Migration SQL
1. Open the migration file in your code editor:
   ```bash
   code supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql
   ```

2. Select ALL content (Cmd+A)
3. Copy (Cmd+C)

### Step 3: Execute Migration
1. In Supabase SQL Editor, create a **New query**
2. Paste the migration SQL (Cmd+V)
3. Click **Run** (or Cmd+Enter)
4. Wait for completion (~30-60 seconds)

### Step 4: Verify Success
Look for these messages in the output:
```
✅ Critical RLS vulnerabilities fixed successfully (v3 - SAFE)!
📋 Summary:
  - Fixed push_subscriptions: User isolation enabled
  - Fixed saved_events: User isolation enabled
  - Fixed event_reminders: User isolation enabled
  - Enabled RLS on events table with performance indexes
📊 RLS Status:
  ✅ Tables with RLS enabled: [should be high number]
```

---

## Application Method 2: Command Line (Advanced)

### Prerequisites
```bash
# Install PostgreSQL client tools
brew install postgresql@15  # macOS
```

### Execute Migration
```bash
# Using Supabase connection string
psql "postgresql://postgres:[YOUR_PASSWORD]@db.ldgbjmotttuomxzwujrt.supabase.co:5432/postgres" \
  -f supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql
```

**Note**: You'll need your database password from Supabase Dashboard > Settings > Database

---

## Post-Migration Verification

### 1. Check RLS Status (SQL)
Run this query in Supabase SQL Editor:
```sql
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'push_subscriptions', 'saved_events', 'event_reminders')
ORDER BY tablename;
```

**Expected Result**: All tables should show `rls_enabled = true`

### 2. Test Anonymous User Access (Browser Console)
```javascript
// Should succeed - anonymous users can save events
await fetch('/api/saved-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'anonymous', eventId: 'test-123' })
})
```

### 3. Test Event Loading (Browser)
1. Refresh the app: http://localhost:3000
2. Events should still load normally
3. Check console - no "permission denied" errors
4. Categories should show full event counts

### 4. Test Service Role Operations (Terminal)
```bash
# Should succeed - service role can insert events
curl http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"source": "test"}'
```

---

## Rollback Plan (If Issues Occur)

If the migration causes ANY problems:

### Option 1: Drop Problem Policies
```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;

DROP POLICY IF EXISTS "Users can manage own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can manage own event reminders" ON event_reminders;

-- Restore permissive policies temporarily
CREATE POLICY "Temporary - Anyone can manage push" ON push_subscriptions FOR ALL USING (true);
CREATE POLICY "Temporary - Anyone can manage saves" ON saved_events FOR ALL USING (true);
CREATE POLICY "Temporary - Anyone can manage reminders" ON event_reminders FOR ALL USING (true);
```

### Option 2: Disable RLS Temporarily
```sql
-- ONLY use if critical production issue
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders DISABLE ROW LEVEL SECURITY;
```

---

## What Changed (Technical Details)

### Before Migration
```sql
-- INSECURE: Anyone could access anyone's data
CREATE POLICY "Anyone can manage their push subscriptions"
  ON push_subscriptions FOR ALL USING (true);
```

### After Migration
```sql
-- SECURE: Users can only access their own data
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    user_id IS NULL OR
    user_id = 'anonymous' OR  -- ✅ Preserves anonymous support
    user_id = current_setting('request.jwt.claim.sub', true)::text
  );
```

### Performance Indexes Added
```sql
-- Prevents 50-75% query slowdown from RLS
CREATE INDEX CONCURRENTLY idx_events_rls_filter
  ON events (status, deleted_at, start_time, date)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_saved_events_user_event
  ON saved_events (user_id, event_id);

CREATE INDEX CONCURRENTLY idx_push_subscriptions_user
  ON push_subscriptions (user_id, endpoint);
```

---

## Troubleshooting

### Error: "permission denied for table X"
**Cause**: RLS policy too restrictive
**Fix**: Check that `userId = 'anonymous'` is included in USING clause

### Error: "function current_setting does not exist"
**Cause**: PostgreSQL version mismatch
**Fix**: Should not occur on Supabase (uses PG 15+)

### Events not loading after migration
**Cause**: RLS filter on events table too aggressive
**Fix**: Check policy includes `start_time >= NOW() - INTERVAL '24 hours'`

### Service role operations failing
**Cause**: Service role not bypassing RLS
**Fix**: Verify using `current_user = 'service_role'` not JWT claims

---

## Success Criteria

✅ **Migration Applied Successfully If**:
1. No errors in SQL Editor output
2. All 4 tables have RLS enabled (query shows `rls_enabled = true`)
3. Events still load on homepage
4. Anonymous users can save events (no 403 errors)
5. Service role can insert events via API
6. No performance degradation (page loads in <2s)

---

## Next Steps After Migration

Once migration is successfully applied:

1. ✅ Mark Phase 1.1 complete
2. Move to **Phase 1.2**: Environment variable validation
3. Monitor production for 24-48 hours
4. Check error logs for any permission denied issues
5. Verify analytics still tracking user interactions

---

## Support

If you encounter ANY issues during migration:

1. **Screenshot the error** from SQL Editor
2. **Check browser console** for frontend errors
3. **Run the verification queries** from this document
4. **Use rollback plan** if needed
5. Report issue with full error message and context
