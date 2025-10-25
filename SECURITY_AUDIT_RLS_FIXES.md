# Supabase RLS Security Audit & Fixes
## Date: 2025-10-20
## Status: 🚨 CRITICAL VULNERABILITIES IDENTIFIED

---

## Executive Summary

This audit identified **9 CRITICAL security vulnerabilities** in the Supabase Row Level Security (RLS) implementation that expose sensitive user data and allow unauthorized data manipulation.

### Severity Breakdown:
- 🔴 **CRITICAL** (5): Complete data exposure, authentication bypass
- 🟠 **HIGH** (3): Partial data leaks, privilege escalation
- 🟡 **MEDIUM** (1): Information disclosure

---

## 1. Critical Vulnerabilities

###  🔴 CRITICAL #1: Events Table Has NO RLS Policies
**Location**: `events` table
**Severity**: CRITICAL
**Impact**: Complete public read/write access to all events

**Problem**:
```sql
-- NO RLS POLICIES EXIST FOR THE EVENTS TABLE
-- Anyone can:
-- 1. Read ALL events (including soft-deleted ones)
-- 2. Insert fake events
-- 3. Modify ANY event
-- 4. Delete events
```

**Current State**:
- RLS is mentioned in `/db/RLS.sql` but **NOT APPLIED** to actual database
- No `ALTER TABLE events ENABLE ROW LEVEL SECURITY` in migrations
- Service role bypasses RLS everywhere

**Evidence**:
- `/supabase/migrations/20240101000000_create_events_table.sql` - NO RLS
- `/supabase/migrations/20250917_database_improvements.sql` - Grants ALL permissions but NO RLS

---

### 🔴 CRITICAL #2: Push Subscriptions - Complete Data Exposure
**Location**: `push_subscriptions` table
**Severity**: CRITICAL
**Impact**: Anyone can read/modify ALL push subscription keys

**Current Policy** (`20251005_create_reminder_tables.sql:56-57`):
```sql
CREATE POLICY "Anyone can manage their push subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);
```

**Problem**:
- `USING (true)` = **ANYONE** can read ALL subscriptions
- Exposes `endpoint`, `p256dh`, and `auth` keys for **EVERY USER**
- Allows hijacking push notifications
- Allows deleting other users' subscriptions

**Attack Scenario**:
```sql
-- Attacker can:
SELECT endpoint, keys FROM push_subscriptions; -- Get everyone's keys
UPDATE push_subscriptions SET endpoint = 'malicious.com' WHERE user_id != 'attacker';
DELETE FROM push_subscriptions WHERE user_id != 'attacker';
```

---

### 🔴 CRITICAL #3: Saved Events - Cross-User Data Access
**Location**: `saved_events` table
**Severity**: CRITICAL
**Impact**: Anyone can read/modify ALL users' saved events

**Current Policy** (`20251005_create_reminder_tables.sql:59-60`):
```sql
CREATE POLICY "Anyone can manage their saved events" ON saved_events
  FOR ALL USING (true) WITH CHECK (true);
```

**Problem**:
- Complete visibility into **every user's** saved events
- Privacy violation - reveals personal preferences
- Allows mass data harvesting

---

### 🔴 CRITICAL #4: Event Reminders - Notification Hijacking
**Location**: `event_reminders` table
**Severity**: CRITICAL
**Impact**: Anyone can read/modify ALL reminders

**Current Policy** (`20251005_create_reminder_tables.sql:62-63`):
```sql
CREATE POLICY "Anyone can manage their reminders" ON event_reminders
  FOR ALL USING (true) WITH CHECK (true);
```

**Problem**:
- Attackers can see when/where users plan to attend events
- Can delete reminders to cause users to miss events
- Can create spam reminders for other users

---

### 🔴 CRITICAL #5: Service Role Key Overuse
**Location**: Multiple API routes
**Severity**: CRITICAL
**Impact**: Bypasses ALL RLS policies

**Problematic Files**:
```typescript
// src/app/api/events/sync/route.ts:6
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ❌ BYPASSES RLS
)

// src/app/api/events/hybrid/route.ts:6
// src/app/api/events/from-db/route.ts:6
// src/app/api/cron/check-reminders/route.ts:48
```

**Problem**:
- Service role key bypasses **ALL RLS POLICIES**
- Should only be used for:
  - Cron jobs (authenticated via `CRON_SECRET`)
  - Administrative operations
  - Background sync tasks
- Currently used for **PUBLIC API endpoints** (hybrid, from-db)

---

## 2. High Severity Issues

### 🟠 HIGH #1: User Tables - Weak Authentication
**Location**: `user_event_interactions`, `user_preferences`, `user_notifications`, `event_recommendations`
**Severity**: HIGH

**Current Policies** (`20241221000004_create_scraping_tables.sql:263-273`):
```sql
CREATE POLICY "Users can view their own interactions" ON user_event_interactions
    FOR ALL USING (auth.uid() = user_id);
```

**Problem**:
- `user_id` is **TEXT**, not UUID
- No foreign key constraint to `auth.users`
- Users can set arbitrary `user_id` values
- Weak isolation

**Attack**:
```sql
-- Attacker inserts with someone else's user_id
INSERT INTO user_preferences (user_id, categories)
VALUES ('victim-uuid-here', ARRAY['spam']);
```

---

### 🟠 HIGH #2: Missing RLS on System Tables
**Location**: All system/scraping tables
**Severity**: HIGH

**Affected Tables** (NO RLS):
```
- scraping_jobs
- scraping_metrics
- webhook_logs
- webhook_errors
- health_check_results
- system_health
- function_invocations
- search_index_updates
- event_analytics
- user_acquisition_metrics
- user_preference_learning
- ingestion_logs
- event_deduplication
```

**Problem**:
- System metrics exposed to authenticated users
- Analytics data can be harvested
- Internal operations visible

---

### 🟠 HIGH #3: Venues & Cities - Write Access
**Location**: `venues`, `cities` tables
**Severity**: HIGH

**Current Grants** (`20250917_database_improvements.sql:623-626`):
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; -- ❌ TOO PERMISSIVE
```

**Problem**:
- **Authenticated users get ALL permissions** on venues/cities
- Should be READ-ONLY for normal users
- Only admins should INSERT/UPDATE/DELETE

---

## 3. Medium Severity Issues

### 🟡 MEDIUM #1: Permission Grants Too Broad
**Location**: Multiple migrations
**Severity**: MEDIUM

**Overly Permissive Grants**:
```sql
-- 20250917_database_improvements.sql:628
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role, anon;
```

**Problem**:
- Anonymous users can execute **ALL functions**
- Should whitelist specific functions for anon role

---

## 4. Recommended Fixes

### Fix #1: Enable RLS on Events Table

**Create New Migration**: `20251020_fix_events_rls.sql`

```sql
-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active events only
CREATE POLICY "Public can view active events" ON events
  FOR SELECT
  USING (
    status = 'active'
    AND (start_time IS NULL OR start_time >= NOW() - INTERVAL '24 hours')
    AND deleted_at IS NULL
  );

-- Only service role can insert (from sync jobs)
CREATE POLICY "Service role can insert events" ON events
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Only service role can update
CREATE POLICY "Service role can update events" ON events
  FOR UPDATE
  USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Only service role can delete
CREATE POLICY "Service role can delete events" ON events
  FOR DELETE
  USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );
```

---

### Fix #2: Secure Push Subscriptions

```sql
-- Drop dangerous policy
DROP POLICY IF EXISTS "Anyone can manage their push subscriptions" ON push_subscriptions;

-- Create secure policies
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT
  USING (
    user_id IS NULL OR user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE
  USING (
    user_id IS NULL OR user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE
  USING (
    user_id IS NULL OR user_id = current_setting('request.jwt.claim.sub', true)
  );

-- Service role can manage all (for cleanup jobs)
CREATE POLICY "Service role can manage all subscriptions" ON push_subscriptions
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
```

---

### Fix #3: Secure Saved Events

```sql
DROP POLICY IF EXISTS "Anyone can manage their saved events" ON saved_events;

CREATE POLICY "Users can manage own saved events" ON saved_events
  FOR ALL
  USING (user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "Service role can manage all saved events" ON saved_events
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
```

---

### Fix #4: Secure Event Reminders

```sql
DROP POLICY IF EXISTS "Anyone can manage their reminders" ON event_reminders;

CREATE POLICY "Users can manage own reminders" ON event_reminders
  FOR ALL
  USING (user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "Service role can manage all reminders" ON event_reminders
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
```

---

### Fix #5: Replace Service Role with Anon Key in Public APIs

**Update** `/src/app/api/events/from-db/route.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

// ❌ BEFORE (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ AFTER (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Apply same fix to**:
- `/src/app/api/events/hybrid/route.ts`

**Keep service role ONLY in**:
- `/src/app/api/events/sync/route.ts` (protected by `CRON_SECRET`)
- `/src/app/api/cron/check-reminders/route.ts` (cron job)

---

### Fix #6: Enable RLS on System Tables

```sql
-- Enable RLS on all system tables
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_deduplication ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "Only service role can access system tables" ON scraping_jobs
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Repeat for all system tables...
```

---

### Fix #7: Restrict Venues & Cities Writes

```sql
-- Revoke broad permissions
REVOKE ALL ON venues, cities FROM authenticated;

-- Grant specific permissions
GRANT SELECT ON venues, cities TO authenticated;
GRANT INSERT ON venues TO authenticated; -- For user submissions

-- Cities should be read-only for users
GRANT SELECT ON cities TO authenticated, anon;
```

---

### Fix #8: Whitelist Anon Function Access

```sql
-- Revoke broad grants
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant specific functions only
GRANT EXECUTE ON FUNCTION find_nearby_events TO anon;
GRANT EXECUTE ON FUNCTION get_trending_events TO anon;
GRANT EXECUTE ON FUNCTION search_events TO anon;
GRANT EXECUTE ON FUNCTION get_city_calendar TO anon;
```

---

## 5. Implementation Priority

### Phase 1 (IMMEDIATE - Deploy Today):
1. ✅ Fix push_subscriptions RLS
2. ✅ Fix saved_events RLS
3. ✅ Fix event_reminders RLS
4. ✅ Enable RLS on events table
5. ✅ Replace service role in public APIs

### Phase 2 (This Week):
1. Enable RLS on system tables
2. Restrict venues/cities writes
3. Whitelist anon function access

### Phase 3 (Next Sprint):
1. Implement audit logging
2. Add rate limiting
3. Set up monitoring/alerting

---

## 6. Testing Checklist

After applying fixes, verify:

```sql
-- Test 1: Verify anon cannot access user data
SET ROLE anon;
SELECT * FROM push_subscriptions; -- Should return 0 rows
SELECT * FROM saved_events; -- Should return 0 rows
SELECT * FROM event_reminders; -- Should return 0 rows

-- Test 2: Verify authenticated user isolation
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-1-uuid';
SELECT * FROM saved_events; -- Should only return user-1's data

-- Test 3: Verify events table public access
SET ROLE anon;
SELECT * FROM events WHERE status = 'active'; -- Should work
INSERT INTO events (title) VALUES ('test'); -- Should FAIL

-- Test 4: Verify service role still works
SET ROLE service_role;
INSERT INTO events (title, category, status) VALUES ('test', 'music', 'active'); -- Should work
```

---

## 7. Monitoring Recommendations

### Set up alerts for:
1. Unauthorized access attempts
2. Bulk data queries
3. Service role usage outside cron jobs
4. Policy violations

### Metrics to track:
- RLS policy evaluation time
- Failed permission checks
- Service role API calls
- User data access patterns

---

## 8. Additional Security Recommendations

1. **Implement Authentication**:
   - Currently no auth system in place
   - Add Supabase Auth
   - Require email verification

2. **Add Rate Limiting**:
   - Prevent abuse of public APIs
   - Use Vercel edge middleware

3. **Enable Audit Logging**:
   - Track all data modifications
   - Log security events

4. **Regular Security Audits**:
   - Quarterly RLS review
   - Dependency vulnerability scans
   - Penetration testing

---

## 9. References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

## Conclusion

The current RLS implementation has **critical security vulnerabilities** that expose user data and allow unauthorized modifications. The recommended fixes must be implemented **immediately** to prevent data breaches and maintain user trust.

**Estimated Fix Time**: 2-4 hours
**Risk if Not Fixed**: Data breach, privacy violations, regulatory penalties

---

**Audit Conducted By**: AI Security Analyst
**Date**: 2025-10-20
**Next Review**: 2025-11-20
