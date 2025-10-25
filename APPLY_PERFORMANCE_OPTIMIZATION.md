# Apply Performance Optimization - Checklist

## Quick Start Guide

Follow these steps to apply the performance optimizations to your SceneScout database.

---

## Prerequisites

- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Supabase project linked (`supabase link`)
- ✅ Database credentials in `.env` file
- ✅ Node.js 18+ installed

---

## Step 1: Review Changes

### Files to Review

1. **Migration**: `/supabase/migrations/20251022_performance_indexes.sql`
   - Creates 9 strategic indexes
   - Adds ANALYZE commands for query planner
   - ~50MB additional storage

2. **Cache Utility**: `/src/lib/query-cache.ts`
   - In-memory LRU cache with TTL
   - Automatic cleanup of expired entries
   - Pattern-based invalidation

3. **Performance Monitor**: `/src/lib/performance-monitor.ts`
   - Query timing and metrics
   - Slow query detection
   - Statistics tracking

4. **API Routes**:
   - `/src/app/api/saved-events/route.ts`
   - `/src/app/api/reminders/set/route.ts`
   - `/src/app/api/events/from-db/route.ts`

---

## Step 2: Apply Migration

### Option A: Local Development

```bash
# Reset database (includes all migrations)
supabase db reset

# Verify migration applied
supabase db inspect
```

### Option B: Production (Recommended)

```bash
# Preview changes
supabase db diff

# Push to production
supabase db push

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/20251022_performance_indexes.sql
```

---

## Step 3: Verify Indexes

### Check if indexes were created

```sql
-- Connect to your database
psql $DATABASE_URL

-- List all performance indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected output: 9+ indexes starting with idx_
```

### Verify index usage (after some traffic)

```sql
-- Check index scan statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- High idx_scan numbers = index is being used ✅
```

---

## Step 4: Test API Endpoints

### Test saved events

```bash
# First call (cold - should show queryTime)
curl "http://localhost:3000/api/saved-events?userId=test-user" | jq

# Second call within 30s (should show cached: true)
curl "http://localhost:3000/api/saved-events?userId=test-user" | jq
```

### Test reminders

```bash
# GET reminders
curl "http://localhost:3000/api/reminders/set?userId=test-user" | jq

# Should return queryTime on first call, cached: true on second
```

### Test events

```bash
# GET events from database
curl "http://localhost:3000/api/events/from-db?category=music&limit=20" | jq

# Check for queryTime and cached fields in response
```

---

## Step 5: Run Automated Tests

### Install dependencies (if needed)

```bash
npm install tsx @supabase/supabase-js
```

### Run test suite

```bash
npx tsx scripts/test-performance-optimization.ts
```

**Expected output**:
```
🚀 Starting Performance Optimization Tests...

📊 Test 1: Checking if indexes exist...
✅ All 9 indexes exist

⏱️ Test 2: Testing saved_events query performance...
✅ Saved events query: 45ms (target: <200ms)

⏱️ Test 3: Testing event_reminders query performance...
✅ Reminders query: 38ms (target: <200ms)

⏱️ Test 4: Testing events query performance...
✅ Events query: 125ms (target: <300ms)

💾 Test 5: Testing query cache utility...
✅ Cache set/get works correctly

📈 Test 6: Testing performance monitor...
✅ Performance monitor working correctly

========================================================
📊 PERFORMANCE OPTIMIZATION TEST REPORT
========================================================
1. ✅ Indexes Exist (All 9 indexes found)
2. ✅ Saved Events Performance (45ms)
3. ✅ Reminders Performance (38ms)
4. ✅ Events Performance (125ms)
5. ✅ Cache Utility (Cache set/get functioning correctly)
6. ✅ Performance Monitor (Tracking queries)

Total Tests: 6
✅ Passed: 6
❌ Failed: 0
Success Rate: 100%
========================================================

🎉 All tests passed! Performance optimizations are working correctly.
```

---

## Step 6: Monitor Performance

### Check query logs

```bash
# Start dev server
npm run dev

# Watch for query timing logs
# You should see:
# ✅ Query completed: /api/saved-events - GET saved_events (45ms)
# ⚠️ Slow query detected: /api/events - complex_query (650ms)
```

### Check cache statistics

```typescript
// In browser console or API route
import { queryCache } from '@/lib/query-cache'

const stats = queryCache.getStats()
console.log(stats)
// { size: 42, maxSize: 1000, entries: [...] }
```

### Check performance stats

```typescript
// In browser console or API route
import { performanceMonitor } from '@/lib/performance-monitor'

const stats = performanceMonitor.getStats()
console.log(stats)
// { totalQueries: 245, avgDuration: 85, slowQueries: 12, ... }
```

---

## Step 7: Production Deployment

### Pre-deployment checklist

- [ ] Migration tested locally
- [ ] All tests passing
- [ ] Performance improvements verified
- [ ] No breaking changes to API contracts
- [ ] Cache invalidation working correctly

### Deploy steps

```bash
# 1. Push code changes
git add .
git commit -m "feat: add database performance optimizations"
git push

# 2. Apply migration to production
supabase db push --linked

# 3. Verify deployment
curl "https://your-domain.com/api/saved-events?userId=test" | jq
```

### Post-deployment monitoring

**First 24 hours**:
- Monitor error rates in Sentry/logs
- Check response times in analytics
- Verify cache hit rates
- Watch for slow query warnings

**First week**:
- Compare before/after metrics
- Adjust cache TTLs if needed
- Fine-tune query patterns
- Review index usage statistics

---

## Troubleshooting

### Issue: Migration fails

**Symptoms**: Error applying migration
**Solution**:
```bash
# Check migration syntax
cat supabase/migrations/20251022_performance_indexes.sql

# Try applying manually
psql $DATABASE_URL -f supabase/migrations/20251022_performance_indexes.sql
```

### Issue: Indexes not being used

**Symptoms**: Queries still slow despite indexes
**Solution**:
```sql
-- Update table statistics
ANALYZE public.saved_events;
ANALYZE public.event_reminders;
ANALYZE public.events;

-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM saved_events
WHERE user_id = 'test-user'
ORDER BY created_at DESC
LIMIT 100;

-- Should show "Index Scan using idx_saved_events_user_created"
```

### Issue: Cache not working

**Symptoms**: cached: false on all requests
**Solution**:
1. Verify imports are correct
2. Check cache TTL is not 0
3. Verify cache key generation
4. Check cache statistics

```typescript
import { queryCache } from '@/lib/query-cache'
console.log(queryCache.getStats()) // Should show entries
```

### Issue: High memory usage

**Symptoms**: Server using too much memory
**Solution**:
```typescript
// Reduce cache size in query-cache.ts
constructor(maxSize = 500, ...) // Default is 1000

// Or reduce TTLs
export const CACHE_TTL = {
  SAVED_EVENTS: 15,      // 15 seconds instead of 30
  USER_REMINDERS: 30,    // 30 seconds instead of 60
  // ...
}
```

---

## Rollback Plan

If something goes wrong:

### Rollback migration

```bash
# Option 1: Revert to previous migration
supabase db reset --version <previous-migration-number>

# Option 2: Drop indexes manually
psql $DATABASE_URL -c "DROP INDEX IF EXISTS idx_saved_events_user_created;"
psql $DATABASE_URL -c "DROP INDEX IF EXISTS idx_event_reminders_pending;"
# ... repeat for all indexes
```

### Rollback code changes

```bash
# Revert commit
git revert HEAD

# Or checkout previous version
git checkout <previous-commit-hash>

# Deploy
git push
```

---

## Success Criteria

After applying optimizations, you should see:

✅ **API Response Times**
- Saved events: <100ms cold, <50ms cached
- Reminders: <100ms cold, <40ms cached
- Events: <200ms cold, <60ms cached

✅ **Cache Hit Rates**
- Overall: >45%
- Saved events: >50%
- Events listing: >60%

✅ **Query Performance**
- Average query time: <150ms
- Slow queries (>500ms): <5%
- p95 response time: <250ms

✅ **User Experience**
- Faster page loads
- Smoother interactions
- No timeout errors

---

## Next Steps

After successful deployment:

1. **Week 1**: Monitor metrics, adjust TTLs
2. **Week 2**: Review slow query logs, optimize further
3. **Week 3**: Consider Redis for distributed caching
4. **Week 4**: Evaluate additional optimizations

---

## Resources

- **Full Documentation**: `/DATABASE_PERFORMANCE_OPTIMIZATION.md`
- **Quick Summary**: `/PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- **Migration File**: `/supabase/migrations/20251022_performance_indexes.sql`
- **Test Script**: `/scripts/test-performance-optimization.ts`

---

## Support

If you encounter issues:

1. Check troubleshooting section above
2. Review test output from validation script
3. Check Supabase dashboard for errors
4. Review API logs for slow query warnings

---

**Created**: 2025-10-22
**Status**: Ready for Production
**Estimated Time**: 30 minutes to apply
**Risk Level**: Low (non-breaking changes)
