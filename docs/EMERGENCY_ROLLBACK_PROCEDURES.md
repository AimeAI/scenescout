# Emergency Rollback Procedures

## 🚨 Emergency Response Protocol

### Immediate Response Checklist
- [ ] **Assess Impact**: Determine scope and severity of the issue
- [ ] **Notify Team**: Alert stakeholders via emergency communication channels
- [ ] **Start Monitoring**: Begin comprehensive system monitoring
- [ ] **Document Issue**: Record timeline and symptoms for post-mortem

### Severity Levels

#### 🔴 Critical (P0) - Immediate Rollback Required
- Complete site down or major data corruption
- Authentication system compromised
- Database connectivity lost
- **Action**: Execute immediate rollback within 5 minutes

#### 🟡 High (P1) - Rollback Within 15 Minutes
- Core features not working
- API endpoints failing
- Performance degradation > 50%
- **Action**: Quick investigation, rollback if no immediate fix

#### 🟢 Medium (P2) - Can Wait for Fix
- Minor feature issues
- Non-critical performance issues
- UI/UX problems
- **Action**: Monitor and fix in next deployment

## 🔄 Application Rollback Procedures

### Vercel Deployment Rollback

#### Option 1: Dashboard Rollback (Fastest)
1. **Access Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Navigate to scenescout project
   - Click on "Deployments" tab

2. **Select Previous Deployment**
   - Find last known good deployment
   - Click "..." menu next to deployment
   - Select "Promote to Production"

3. **Verify Rollback**
   - Check application URL responds correctly
   - Verify core functionality works
   - Monitor error rates for 10 minutes

#### Option 2: CLI Rollback
```bash
# Install Vercel CLI if not present
npm i -g vercel

# Login to Vercel
vercel login

# List recent deployments
vercel ls

# Promote specific deployment to production
vercel promote [deployment-url] --scope=[team-name]

# Example:
vercel promote https://scenescout-git-main-team.vercel.app --scope=scenescout-team
```

#### Option 3: Git Revert & Redeploy
```bash
# Revert to last known good commit
git log --oneline -10  # Find last good commit
git revert [bad-commit-hash] --no-edit

# Force push if necessary (use with caution)
git push origin main --force-with-lease

# Trigger new deployment (if auto-deploy enabled)
# Otherwise manually deploy via Vercel CLI or dashboard
```

### Next.js Standalone Rollback

#### If Self-Hosting
```bash
# Stop current application
pm2 stop scenescout

# Restore from backup
cp -r /backups/scenescout-$(date -d "yesterday" +%Y%m%d) /var/www/scenescout

# Restart application
pm2 start /var/www/scenescout/ecosystem.config.js

# Verify application health
curl -f http://localhost:3000/api/health || echo "Health check failed"
```

#### Docker Rollback
```bash
# List recent images
docker images scenescout:*

# Stop current container
docker stop scenescout-prod

# Start previous version
docker run -d --name scenescout-prod-rollback \
  -p 3000:3000 \
  --env-file .env.production \
  scenescout:[previous-tag]

# Switch load balancer traffic
# Update nginx/load balancer configuration

# Verify rollback
curl -f http://localhost:3000/api/health
```

## 🗄️ Database Rollback Procedures

### Supabase Database Rollback

#### Option 1: Migration Rollback (Preferred)
```bash
# List recent migrations
supabase migration list

# Rollback specific migration
supabase migration down [migration-timestamp]

# Example:
supabase migration down 20250917_database_improvements

# Apply safe state migration
supabase db push
```

#### Option 2: Point-in-Time Recovery
```bash
# Restore from Supabase backup (requires support ticket)
# This is for critical data loss scenarios

# 1. Create new temporary database
supabase projects create scenescout-recovery

# 2. Contact Supabase support for PITR
# Include: Project ref, timestamp for recovery

# 3. Once restored, dump data
supabase db dump --data-only > recovery-data.sql

# 4. Apply to production after validation
supabase db reset --db-url [recovery-db-url]
```

#### Option 3: Schema Rollback Script
```sql
-- Emergency schema rollback (prepare beforehand)
-- Rollback latest table modifications

-- Example: Rollback new columns
ALTER TABLE events DROP COLUMN IF EXISTS new_feature_column;
ALTER TABLE venues DROP COLUMN IF EXISTS experimental_field;

-- Rollback new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_events_new_feature;

-- Rollback new functions
DROP FUNCTION IF EXISTS new_experimental_function(text);

-- Restore previous function versions
CREATE OR REPLACE FUNCTION search_events_v1(...)
-- [Previous function definition]

-- Validate rollback
SELECT count(*) FROM events; -- Should return expected count
SELECT * FROM events LIMIT 1; -- Should have expected structure
```

### Manual Data Recovery
```sql
-- If data corruption occurred, restore specific tables
-- 1. Export current state for analysis
COPY events TO '/tmp/events_corrupted.csv' CSV HEADER;

-- 2. Restore from backup (if available)
COPY events FROM '/backups/events_last_good.csv' CSV HEADER;

-- 3. Verify data integrity
SELECT 
  count(*) as total_events,
  count(DISTINCT id) as unique_events,
  min(created_at) as oldest_event,
  max(created_at) as newest_event
FROM events;
```

## 🔧 Edge Functions Rollback

### Supabase Edge Functions Rollback
```bash
# List function deployments (if versioning enabled)
supabase functions list

# Deploy previous version
git checkout [previous-commit-with-working-functions]
supabase functions deploy --project-ref [project-ref]

# Or rollback specific function
supabase functions deploy ingest_ticketmaster --project-ref [project-ref]

# Verify function works
curl -X POST \
  '[supabase-url]/functions/v1/ingest_ticketmaster' \
  -H 'Authorization: Bearer [anon-key]' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

### Environment Variables Rollback
```bash
# If environment variables caused issues
# Restore previous values via Vercel dashboard or CLI

# Vercel CLI approach
vercel env rm PROBLEMATIC_VAR production
vercel env add PROBLEMATIC_VAR production < previous_value.txt

# Force redeploy to pick up changes
vercel --prod --force
```

## 🔍 DNS & CDN Rollback

### DNS Rollback (if DNS changes were made)
```bash
# If using Cloudflare
# Revert DNS records via dashboard or API

curl -X PUT "https://api.cloudflare.com/client/v4/zones/[zone-id]/dns_records/[record-id]" \
  -H "X-Auth-Email: [email]" \
  -H "X-Auth-Key: [api-key]" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "scenescout.app",
    "content": "[previous-ip]",
    "ttl": 1
  }'
```

### CDN Cache Purge
```bash
# Cloudflare cache purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/[zone-id]/purge_cache" \
  -H "X-Auth-Email: [email]" \
  -H "X-Auth-Key: [api-key]" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Vercel cache purge
vercel deploy --force  # Forces fresh deployment without cache
```

## 📊 Monitoring During Rollback

### Health Check Script
```bash
#!/bin/bash
# health-check.sh - Monitor application during rollback

APP_URL="https://scenescout.app"
HEALTH_ENDPOINT="$APP_URL/api/health"
SLACK_WEBHOOK="[your-slack-webhook]"

check_health() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT")
  
  if [ "$response" = "200" ]; then
    echo "[$timestamp] ✅ Health check passed ($response)"
    return 0
  else
    echo "[$timestamp] ❌ Health check failed ($response)"
    
    # Alert Slack
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 SceneScout health check failed: HTTP $response\"}" \
      "$SLACK_WEBHOOK"
    
    return 1
  fi
}

# Monitor for 10 minutes after rollback
for i in {1..20}; do
  check_health
  sleep 30
done
```

### Database Health Check
```sql
-- database-health-check.sql
-- Run after database rollback

-- Check table integrity
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for missing indexes
SELECT 
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND tablename IN ('events', 'venues', 'user_events');

-- Check recent operations
SELECT 
  query_start,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%';
```

## 📋 Post-Rollback Checklist

### Immediate Verification (First 5 Minutes)
- [ ] **Application Loads**: Homepage accessible
- [ ] **Authentication**: Login/logout works
- [ ] **Database**: Core queries executing
- [ ] **APIs**: Event data loading
- [ ] **Maps**: Location features working

### Extended Verification (Next 30 Minutes)
- [ ] **User Registration**: New users can sign up
- [ ] **Event Discovery**: Search and filters functional
- [ ] **Mobile Experience**: Mobile UI responsive
- [ ] **Performance**: Response times acceptable
- [ ] **Error Rates**: No spike in error logs

### Comprehensive Testing (Next 2 Hours)
- [ ] **E2E Tests**: Run automated test suite
- [ ] **Load Testing**: Verify system handles normal load
- [ ] **Integration Testing**: All external APIs working
- [ ] **Security**: Authentication and authorization intact
- [ ] **Monitoring**: All dashboards showing green

## 📞 Communication During Rollback

### Internal Team Notification
```markdown
🚨 **EMERGENCY ROLLBACK IN PROGRESS**

**Time**: [timestamp]
**Issue**: [brief description]
**Action**: Rolling back to deployment [deployment-id]
**ETA**: [estimated completion time]
**Status**: [in-progress/completed]

**Next Steps**:
- Monitor application health
- Investigate root cause
- Prepare hotfix if needed

**Point of Contact**: [name] - [contact-info]
```

### Customer Communication Template
```markdown
📢 **Service Update**

We experienced a brief service disruption and have implemented a fix. 
All systems are now operational.

If you continue to experience issues, please contact support.

Timeline:
- [time]: Issue detected
- [time]: Fix implemented
- [time]: Service restored

We apologize for any inconvenience.
```

## 🔍 Post-Mortem Requirements

### Incident Documentation
- **Timeline**: Detailed sequence of events
- **Root Cause**: Technical cause of the issue
- **Impact**: Users and systems affected
- **Resolution**: Steps taken to resolve
- **Prevention**: Measures to prevent recurrence

### Action Items Template
1. **Immediate**: Fix deployed and monitored
2. **Short-term** (1-3 days): Additional safeguards
3. **Long-term** (1-4 weeks): Process improvements
4. **Prevention**: Automated checks and alerts

---

**Emergency Contacts**:
- **Technical Lead**: [phone] / [email]
- **DevOps Engineer**: [phone] / [email]
- **On-Call**: [phone] / [slack]

**Last Updated**: September 17, 2025  
**Version**: 1.0  
**Prepared By**: Deployment Checklist Generator Agent