# Daily Operations Checklist

## Purpose
Daily operational procedures to ensure SceneScout system health, performance, and data quality.

## Prerequisites
- Access to production environment
- Monitoring dashboard access
- Database read access
- Log viewing permissions

## Daily Health Check Schedule

### Morning Health Check (9:00 AM)

#### 1. System Availability Check
```bash
# Run comprehensive health check
npm run smoke

# Check application response
curl -I https://scenescout.app/health
# Expected: HTTP/1.1 200 OK

# Verify core pages load
curl -s https://scenescout.app/ | grep -q "SceneScout"
curl -s https://scenescout.app/discover | grep -q "Events"
curl -s https://scenescout.app/map | grep -q "Map"
```

**Expected Results:**
- ✅ All endpoints return 200 status
- ✅ Core pages load with expected content
- ✅ Response time < 2 seconds

#### 2. Database Health Check
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;"

# Check table health
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 10;
"
```

**Expected Results:**
- ✅ Database connection successful
- ✅ Active connections < 80% of max
- ✅ No unexpected table size growth
- ✅ Reasonable insert/update rates

#### 3. Event Ingestion Health
```bash
# Check recent event ingestion
node scripts/monitoring/check-ingestion-health.js

# Verify event counts by source
psql $DATABASE_URL -c "
SELECT 
  source,
  COUNT(*) as total_events,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_events
FROM events 
GROUP BY source 
ORDER BY recent_events DESC;
"

# Check for ingestion errors
psql $DATABASE_URL -c "
SELECT 
  source,
  error_message,
  COUNT(*) as error_count
FROM ingestion_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'error'
GROUP BY source, error_message
ORDER BY error_count DESC;
"
```

**Expected Results:**
- ✅ Events ingested in last 24 hours from all sources
- ✅ Ingestion error rate < 5%
- ✅ No critical API failures

#### 4. Performance Metrics Review
```bash
# Check response times
./scripts/app-health-check.mjs --detailed

# Review error rates
grep -c "ERROR" logs/application.log.$(date +%Y-%m-%d)

# Check memory usage
free -h

# Check disk usage
df -h
```

**Expected Results:**
- ✅ Average response time < 2 seconds
- ✅ Error rate < 0.1%
- ✅ Memory usage < 80%
- ✅ Disk usage < 85%

### Evening Health Check (6:00 PM)

#### 1. Daily Summary Report
```bash
# Generate daily stats
psql $DATABASE_URL -c "
SELECT 
  'Total Events' as metric,
  COUNT(*) as value
FROM events
UNION ALL
SELECT 
  'Events Added Today',
  COUNT(*)
FROM events 
WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT 
  'Active Users Today',
  COUNT(DISTINCT user_id)
FROM user_events 
WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT 
  'API Calls Today',
  COUNT(*)
FROM api_logs 
WHERE created_at >= CURRENT_DATE;
"
```

#### 2. Check Backup Status
```bash
# Verify latest backup
ls -la backups/ | head -5

# Check backup size and integrity
./scripts/backup-database.sh --verify-latest

# Verify backup upload to cloud storage
# [Add cloud storage verification command]
```

#### 3. Review Alerts and Logs
```bash
# Check for any alerts
grep -i "alert\|warning\|critical" logs/application.log.$(date +%Y-%m-%d)

# Review Supabase function logs
supabase functions logs --limit 50

# Check ingestion function status
supabase functions logs ingest_ticketmaster --limit 10
supabase functions logs ingest_eventbrite --limit 10
```

## Weekly Summary (Fridays)

### 1. Performance Trend Analysis
```bash
# Generate weekly performance report
node scripts/monitoring/weekly-performance-report.js

# Database performance trends
psql $DATABASE_URL -c "
SELECT 
  DATE(created_at) as date,
  AVG(response_time_ms) as avg_response_time,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
FROM api_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;
"
```

### 2. Capacity Planning Review
```bash
# Check growth trends
psql $DATABASE_URL -c "
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as events_added
FROM events 
WHERE created_at >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY week
ORDER BY week;
"

# Database size trends
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

## Alert Thresholds

### Critical Alerts (Immediate Response)
- ❌ Application down (response time > 30 seconds)
- ❌ Database connection failure
- ❌ Error rate > 5%
- ❌ Event ingestion stopped for > 2 hours
- ❌ Disk usage > 90%

### Warning Alerts (Response within 4 hours)
- ⚠️ Response time > 5 seconds
- ⚠️ Error rate > 1%
- ⚠️ Memory usage > 85%
- ⚠️ Event ingestion rate < 50% of normal
- ⚠️ Backup failure

### Info Alerts (Review next business day)
- ℹ️ Unusual traffic patterns
- ℹ️ New error types
- ℹ️ Performance degradation trends
- ℹ️ Capacity planning triggers

## Documentation

### Daily Log Entry Template
```
Date: [YYYY-MM-DD]
Operator: [Name]

Morning Check:
- [ ] System availability: OK/ISSUES
- [ ] Database health: OK/ISSUES  
- [ ] Event ingestion: OK/ISSUES
- [ ] Performance metrics: OK/ISSUES

Evening Check:
- [ ] Daily summary generated: YES/NO
- [ ] Backup verified: OK/FAILED
- [ ] Alerts reviewed: COUNT
- [ ] Issues identified: NONE/LIST

Notes:
[Any observations, issues, or actions taken]

Escalations:
[Any issues escalated and to whom]
```

## Common Issues and Quick Fixes

### Slow Response Times
1. Check database connection pool
2. Review slow query log
3. Check for long-running transactions
4. Verify cache hit rates

### Event Ingestion Issues
1. Check API rate limits
2. Verify API keys/credentials
3. Review ingestion function logs
4. Check for data format changes

### Database Connection Issues
1. Check connection pool settings
2. Verify database server status
3. Review connection string configuration
4. Check for connection leaks

## Escalation Triggers

Escalate immediately if:
- System downtime > 5 minutes
- Data loss suspected
- Security incident detected
- Unable to resolve critical alert within 30 minutes
- Backup failures for > 24 hours

## Contact Information

- **On-Call Engineer**: [Phone/Slack]
- **Database Administrator**: [Contact]
- **Development Team Lead**: [Contact]
- **Infrastructure Team**: [Contact]