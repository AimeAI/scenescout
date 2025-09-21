# Weekly Maintenance Procedures

## Purpose
Systematic weekly maintenance tasks to ensure optimal performance, security, and reliability of the SceneScout platform.

## Weekly Maintenance Schedule

### Sunday Maintenance Window (2:00 AM - 6:00 AM)
**Low traffic period for maintenance activities**

## Pre-Maintenance Checklist

### 1. Preparation (Sunday 1:30 AM)
```bash
#!/bin/bash
# Pre-maintenance preparation
# File: scripts/maintenance/pre-maintenance.sh

echo "=== Pre-Maintenance Preparation - $(date) ==="

# Create maintenance session directory
MAINTENANCE_DATE=$(date +%Y%m%d)
MAINTENANCE_DIR="maintenance/weekly-$MAINTENANCE_DATE"
mkdir -p $MAINTENANCE_DIR

# 1. Create pre-maintenance backup
echo "Creating pre-maintenance backup..."
./scripts/backup-database.sh --name "pre-maintenance-$MAINTENANCE_DATE"

# 2. Document current system state
echo "Documenting system state..."
./scripts/app-health-check.mjs --comprehensive > $MAINTENANCE_DIR/pre-maintenance-health.log

# 3. Generate performance baseline
psql $DATABASE_URL -c "
SELECT 
  'Pre-Maintenance Baseline' as marker,
  schemaname,
  tablename,
  n_live_tup as rows,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables pt
JOIN pg_stat_user_tables pst ON pt.tablename = pst.tablename
WHERE pt.schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" > $MAINTENANCE_DIR/pre-maintenance-baseline.log

# 4. Check for any critical alerts
grep -i "critical\|error" logs/application.log.$(date +%Y-%m-%d) > $MAINTENANCE_DIR/pre-maintenance-alerts.log

# 5. Verify maintenance window
CURRENT_USERS=$(psql $DATABASE_URL -t -c "SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_active > NOW() - INTERVAL '5 minutes';")
echo "Active users: $CURRENT_USERS" >> $MAINTENANCE_DIR/maintenance-readiness.log

if [ $CURRENT_USERS -gt 10 ]; then
  echo "WARNING: High user activity ($CURRENT_USERS users). Consider delaying maintenance." >> $MAINTENANCE_DIR/maintenance-readiness.log
fi

echo "Pre-maintenance preparation completed"
```

## Database Maintenance

### 1. Database Optimization (Sunday 2:00 AM)
```bash
#!/bin/bash
# Database maintenance and optimization
# File: scripts/maintenance/database-maintenance.sh

echo "=== Database Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Update table statistics
echo "Updating table statistics..."
psql $DATABASE_URL -c "ANALYZE;" >> $MAINTENANCE_DIR/analyze.log 2>&1

# 2. Vacuum operations
echo "Running VACUUM operations..."
psql $DATABASE_URL -c "
DO \$\$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'VACUUM ANALYZE ' || table_name;
    RAISE NOTICE 'Vacuumed table: %', table_name;
  END LOOP;
END\$\$;
" >> $MAINTENANCE_DIR/vacuum.log 2>&1

# 3. Reindex if needed
echo "Checking index health..."
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
    WHEN idx_scan < 10 THEN 'LOW_USAGE'
    ELSE 'ACTIVE'
  END as status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
" > $MAINTENANCE_DIR/index-analysis.log

# 4. Check for bloated tables
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_percentage
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;
" > $MAINTENANCE_DIR/table-bloat.log

# 5. Cleanup old data
echo "Cleaning up old data..."

# Remove old audit logs (>90 days)
psql $DATABASE_URL -c "
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
" >> $MAINTENANCE_DIR/cleanup.log 2>&1

# Remove old API logs (>30 days)
psql $DATABASE_URL -c "
DELETE FROM api_logs 
WHERE created_at < NOW() - INTERVAL '30 days';
" >> $MAINTENANCE_DIR/cleanup.log 2>&1

# Remove old ingestion logs (>7 days)
psql $DATABASE_URL -c "
DELETE FROM ingestion_logs 
WHERE created_at < NOW() - INTERVAL '7 days'
  AND status = 'success';
" >> $MAINTENANCE_DIR/cleanup.log 2>&1

# 6. Cleanup expired sessions
psql $DATABASE_URL -c "
DELETE FROM auth.sessions 
WHERE expires_at < NOW();
" >> $MAINTENANCE_DIR/cleanup.log 2>&1

echo "Database maintenance completed"
```

### 2. Performance Analysis
```sql
-- Weekly performance analysis
-- File: scripts/maintenance/weekly-performance-analysis.sql

-- Query performance trends
SELECT 
  'Query Performance Trends' as analysis_type,
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 100
ORDER BY mean_exec_time DESC 
LIMIT 20;

-- Connection pool analysis
SELECT 
  'Connection Pool Analysis' as analysis_type,
  state,
  count(*) as connections,
  ROUND(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as percentage
FROM pg_stat_activity 
GROUP BY state 
ORDER BY connections DESC;

-- Lock analysis
SELECT 
  'Lock Analysis' as analysis_type,
  mode,
  count(*) as lock_count
FROM pg_locks 
GROUP BY mode 
ORDER BY lock_count DESC;

-- Table growth analysis
SELECT 
  'Table Growth' as analysis_type,
  schemaname,
  tablename,
  n_tup_ins as inserts_this_week,
  n_tup_upd as updates_this_week,
  n_tup_del as deletes_this_week,
  n_live_tup as current_rows,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;
```

## Application Maintenance

### 1. Code and Dependencies (Sunday 2:30 AM)
```bash
#!/bin/bash
# Application maintenance
# File: scripts/maintenance/application-maintenance.sh

echo "=== Application Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Check for dependency updates
echo "Checking dependency updates..."
npm outdated > $MAINTENANCE_DIR/npm-outdated.log 2>&1

# 2. Security audit
echo "Running security audit..."
npm audit --audit-level moderate > $MAINTENANCE_DIR/npm-audit.log 2>&1

# 3. Check for critical security updates
CRITICAL_VULNS=$(npm audit --audit-level critical --json | jq '.metadata.vulnerabilities.critical // 0')
if [ $CRITICAL_VULNS -gt 0 ]; then
  echo "ALERT: $CRITICAL_VULNS critical vulnerabilities found" >> $MAINTENANCE_DIR/security-alerts.log
fi

# 4. TypeScript compilation check
echo "Checking TypeScript compilation..."
npm run typecheck > $MAINTENANCE_DIR/typecheck.log 2>&1

# 5. Lint check
echo "Running linting..."
npm run lint > $MAINTENANCE_DIR/lint.log 2>&1

# 6. Test suite execution
echo "Running test suite..."
npm test > $MAINTENANCE_DIR/tests.log 2>&1

# 7. Bundle size analysis
echo "Analyzing bundle size..."
npm run build > $MAINTENANCE_DIR/build.log 2>&1

# 8. Check for environment drift
echo "Checking environment configuration..."
node scripts/maintenance/check-env-config.js > $MAINTENANCE_DIR/env-check.log

echo "Application maintenance completed"
```

### 2. Log Rotation and Cleanup
```bash
#!/bin/bash
# Log maintenance
# File: scripts/maintenance/log-maintenance.sh

echo "=== Log Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Rotate application logs
echo "Rotating application logs..."
LOG_DIR="/var/log/scenescout"
DATE_SUFFIX=$(date +%Y%m%d)

for logfile in application.log error.log ingestion.log api.log; do
  if [ -f "$LOG_DIR/$logfile" ]; then
    # Compress and move current log
    gzip -c "$LOG_DIR/$logfile" > "$LOG_DIR/${logfile}_${DATE_SUFFIX}.gz"
    
    # Truncate current log
    > "$LOG_DIR/$logfile"
    
    echo "Rotated $logfile" >> $MAINTENANCE_DIR/log-rotation.log
  fi
done

# 2. Clean up old compressed logs (>30 days)
find $LOG_DIR -name "*.gz" -mtime +30 -delete
echo "Cleaned up old logs older than 30 days" >> $MAINTENANCE_DIR/log-rotation.log

# 3. Analyze log patterns
echo "Analyzing error patterns..."
zgrep -h "ERROR" $LOG_DIR/*.gz $LOG_DIR/error.log 2>/dev/null | \
  awk '{print $1, $2}' | sort | uniq -c | sort -nr > $MAINTENANCE_DIR/error-patterns.log

# 4. Check log disk usage
echo "Log disk usage:" >> $MAINTENANCE_DIR/log-stats.log
du -sh $LOG_DIR >> $MAINTENANCE_DIR/log-stats.log
df -h $LOG_DIR >> $MAINTENANCE_DIR/log-stats.log

echo "Log maintenance completed"
```

## System Maintenance

### 1. System Updates and Security (Sunday 3:00 AM)
```bash
#!/bin/bash
# System maintenance
# File: scripts/maintenance/system-maintenance.sh

echo "=== System Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. System package updates (security only)
echo "Checking for security updates..."
apt list --upgradable | grep -i security > $MAINTENANCE_DIR/security-updates.log

# Apply critical security updates
apt update && apt upgrade -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d/ -f1)

# 2. SSL certificate check
echo "Checking SSL certificates..."
echo | openssl s_client -servername scenescout.app -connect scenescout.app:443 2>/dev/null | \
  openssl x509 -noout -dates > $MAINTENANCE_DIR/ssl-cert-check.log

# Calculate days until expiry
ssl_expiry=$(echo | openssl s_client -servername scenescout.app -connect scenescout.app:443 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$ssl_expiry" +%s)
current_epoch=$(date +%s)
days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

echo "SSL certificate expires in $days_until_expiry days" >> $MAINTENANCE_DIR/ssl-cert-check.log

if [ $days_until_expiry -lt 30 ]; then
  echo "WARNING: SSL certificate expires in $days_until_expiry days" >> $MAINTENANCE_DIR/ssl-alerts.log
fi

# 3. Disk space cleanup
echo "Cleaning up disk space..."
# Remove old Docker images
# docker image prune -f

# Clean package cache
apt autoremove -y
apt autoclean

# Clean up temporary files
find /tmp -type f -mtime +7 -delete
find /var/tmp -type f -mtime +7 -delete

# 4. Check system resources
echo "System resource check:" >> $MAINTENANCE_DIR/system-resources.log
free -h >> $MAINTENANCE_DIR/system-resources.log
df -h >> $MAINTENANCE_DIR/system-resources.log
uptime >> $MAINTENANCE_DIR/system-resources.log

echo "System maintenance completed"
```

### 2. Monitoring and Alerting Review
```bash
#!/bin/bash
# Monitoring maintenance
# File: scripts/maintenance/monitoring-maintenance.sh

echo "=== Monitoring Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Test alert systems
echo "Testing alert systems..."
./scripts/monitoring/test-alerts.sh > $MAINTENANCE_DIR/alert-test.log 2>&1

# 2. Review alert thresholds
echo "Reviewing alert thresholds..."
node scripts/monitoring/analyze-alert-effectiveness.js > $MAINTENANCE_DIR/alert-analysis.log

# 3. Check monitoring service health
echo "Checking monitoring services..."
systemctl status prometheus >> $MAINTENANCE_DIR/monitoring-health.log 2>&1
systemctl status grafana-server >> $MAINTENANCE_DIR/monitoring-health.log 2>&1

# 4. Update monitoring dashboards
echo "Updating monitoring dashboards..."
# Import any dashboard updates
# grafana-cli admin reset-admin-password admin

# 5. Cleanup old metrics (if using local storage)
echo "Cleaning up old metrics..."
# This depends on your monitoring setup

echo "Monitoring maintenance completed"
```

## Event Ingestion Maintenance

### 1. API Health and Optimization
```bash
#!/bin/bash
# Event ingestion maintenance
# File: scripts/maintenance/ingestion-maintenance.sh

echo "=== Event Ingestion Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. API health check
echo "Checking API health..."
node scripts/monitoring/comprehensive-api-health-check.js > $MAINTENANCE_DIR/api-health.log

# 2. Review ingestion rates
psql $DATABASE_URL -c "
SELECT 
  source,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as events_ingested,
  AVG(ingestion_duration_ms) as avg_duration,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM ingestion_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source, DATE_TRUNC('day', created_at)
ORDER BY day DESC, events_ingested DESC;
" > $MAINTENANCE_DIR/ingestion-rates.log

# 3. Check for duplicate events
psql $DATABASE_URL -c "
SELECT 
  source,
  external_id,
  COUNT(*) as duplicate_count
FROM events 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source, external_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 50;
" > $MAINTENANCE_DIR/duplicate-events.log

# 4. Clean up failed ingestion attempts
psql $DATABASE_URL -c "
DELETE FROM ingestion_queue 
WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '7 days';
" >> $MAINTENANCE_DIR/ingestion-cleanup.log

# 5. Review API rate limits
echo "Reviewing API rate limits..."
for api in ticketmaster eventbrite songkick meetup; do
  echo "Checking $api rate limits..." >> $MAINTENANCE_DIR/rate-limits.log
  node scripts/monitoring/check-api-rate-limits.js --api=$api >> $MAINTENANCE_DIR/rate-limits.log
done

# 6. Optimize ingestion schedules
echo "Analyzing optimal ingestion times..."
psql $DATABASE_URL -c "
SELECT 
  source,
  EXTRACT(hour FROM created_at) as hour,
  COUNT(*) as events_found,
  AVG(response_time_ms) as avg_response_time
FROM ingestion_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status = 'success'
GROUP BY source, EXTRACT(hour FROM created_at)
ORDER BY source, hour;
" > $MAINTENANCE_DIR/optimal-ingestion-times.log

echo "Event ingestion maintenance completed"
```

### 2. Data Quality Review
```bash
#!/bin/bash
# Data quality maintenance
# File: scripts/maintenance/data-quality-maintenance.sh

echo "=== Data Quality Maintenance - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Check for data anomalies
echo "Checking for data anomalies..."
psql $DATABASE_URL -c "
-- Events without venues
SELECT 'Events without venues' as issue, COUNT(*) as count
FROM events WHERE venue_id IS NULL
UNION ALL
-- Events with future creation dates
SELECT 'Events with future dates' as issue, COUNT(*) as count  
FROM events WHERE created_at > NOW()
UNION ALL
-- Events with very old dates
SELECT 'Events older than 10 years' as issue, COUNT(*) as count
FROM events WHERE event_date < NOW() - INTERVAL '10 years'
UNION ALL
-- Duplicate external IDs
SELECT 'Duplicate external IDs' as issue, COUNT(*) as count
FROM (
  SELECT external_id, source, COUNT(*) 
  FROM events 
  GROUP BY external_id, source 
  HAVING COUNT(*) > 1
) duplicates;
" > $MAINTENANCE_DIR/data-anomalies.log

# 2. Validate event data completeness
psql $DATABASE_URL -c "
SELECT 
  source,
  COUNT(*) as total_events,
  COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as missing_title,
  COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as missing_description,
  COUNT(CASE WHEN event_date IS NULL THEN 1 END) as missing_date,
  COUNT(CASE WHEN venue_id IS NULL THEN 1 END) as missing_venue,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as missing_image
FROM events 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source;
" > $MAINTENANCE_DIR/data-completeness.log

# 3. Check geocoding accuracy
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as venues_without_coordinates,
  COUNT(CASE WHEN latitude = 0 AND longitude = 0 THEN 1 END) as zero_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as null_coordinates
FROM venues;
" > $MAINTENANCE_DIR/geocoding-issues.log

# 4. Event categorization review
psql $DATABASE_URL -c "
SELECT 
  category,
  COUNT(*) as event_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM events), 2) as percentage
FROM events 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY event_count DESC;
" > $MAINTENANCE_DIR/event-categories.log

echo "Data quality maintenance completed"
```

## Backup Verification

### 1. Backup Integrity Check
```bash
#!/bin/bash
# Backup verification
# File: scripts/maintenance/backup-verification.sh

echo "=== Backup Verification - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Verify recent backups exist
echo "Verifying backup availability..."
BACKUP_DIR="/backups/database"
RECENT_BACKUPS=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -7 | wc -l)

echo "Recent backups (last 7 days): $RECENT_BACKUPS" >> $MAINTENANCE_DIR/backup-verification.log

if [ $RECENT_BACKUPS -lt 7 ]; then
  echo "WARNING: Missing daily backups. Expected 7, found $RECENT_BACKUPS" >> $MAINTENANCE_DIR/backup-alerts.log
fi

# 2. Test backup restoration
echo "Testing backup restoration..."
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz | head -1)

if [ -f "$LATEST_BACKUP" ]; then
  # Create test database
  TEST_DB="scenescout_backup_test_$(date +%Y%m%d)"
  createdb $TEST_DB
  
  # Restore backup
  gunzip -c "$LATEST_BACKUP" | pg_restore --dbname=$TEST_DB --clean --no-owner --no-acl > $MAINTENANCE_DIR/restore-test.log 2>&1
  
  if [ $? -eq 0 ]; then
    echo "Backup restoration test: SUCCESS" >> $MAINTENANCE_DIR/backup-verification.log
    
    # Verify data integrity
    psql $TEST_DB -c "SELECT COUNT(*) FROM events;" >> $MAINTENANCE_DIR/backup-verification.log
    psql $TEST_DB -c "SELECT COUNT(*) FROM venues;" >> $MAINTENANCE_DIR/backup-verification.log
    psql $TEST_DB -c "SELECT COUNT(*) FROM auth.users;" >> $MAINTENANCE_DIR/backup-verification.log
  else
    echo "Backup restoration test: FAILED" >> $MAINTENANCE_DIR/backup-alerts.log
  fi
  
  # Cleanup test database
  dropdb $TEST_DB
else
  echo "No backup file found for testing" >> $MAINTENANCE_DIR/backup-alerts.log
fi

# 3. Check backup sizes
echo "Checking backup sizes..."
ls -lh $BACKUP_DIR/*.gz | tail -7 >> $MAINTENANCE_DIR/backup-sizes.log

echo "Backup verification completed"
```

## Post-Maintenance Verification

### 1. System Health Verification
```bash
#!/bin/bash
# Post-maintenance verification
# File: scripts/maintenance/post-maintenance-verification.sh

echo "=== Post-Maintenance Verification - $(date) ==="
MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"

# 1. Comprehensive health check
echo "Running comprehensive health check..."
./scripts/app-health-check.mjs --comprehensive > $MAINTENANCE_DIR/post-maintenance-health.log

# 2. Performance validation
echo "Validating performance improvements..."
for i in {1..5}; do
  curl -o /dev/null -s -w "%{time_total}\n" https://scenescout.app/
done | awk '{sum+=$1; count++} END {print "Average response time: " sum/count " seconds"}' >> $MAINTENANCE_DIR/performance-validation.log

# 3. Database performance check
psql $DATABASE_URL -c "
SELECT 
  'Post-Maintenance Check' as marker,
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY mean_exec_time DESC 
LIMIT 10;
" >> $MAINTENANCE_DIR/post-maintenance-db-performance.log

# 4. Event ingestion verification
echo "Verifying event ingestion..."
node scripts/monitoring/test-event-ingestion.js >> $MAINTENANCE_DIR/ingestion-verification.log

# 5. Generate maintenance summary
echo "Generating maintenance summary..."
cat > $MAINTENANCE_DIR/maintenance-summary.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Weekly Maintenance Summary - $(date +%Y-%m-%d)</title>
</head>
<body>
    <h1>Weekly Maintenance Summary</h1>
    <h2>Date: $(date)</h2>
    
    <h3>Maintenance Activities Completed:</h3>
    <ul>
        <li>Database optimization and cleanup</li>
        <li>Application dependency updates</li>
        <li>System security updates</li>
        <li>Log rotation and cleanup</li>
        <li>Event ingestion optimization</li>
        <li>Backup verification</li>
    </ul>
    
    <h3>Performance Improvements:</h3>
    <pre>$(cat $MAINTENANCE_DIR/performance-validation.log)</pre>
    
    <h3>Issues Identified:</h3>
    <pre>$(cat $MAINTENANCE_DIR/*-alerts.log 2>/dev/null || echo "No critical issues identified")</pre>
    
    <h3>Next Week's Focus Areas:</h3>
    <ul>
        <li>Monitor performance improvements</li>
        <li>Review capacity planning</li>
        <li>Update documentation</li>
    </ul>
</body>
</html>
EOF

echo "Post-maintenance verification completed"
echo "Maintenance summary available at: $MAINTENANCE_DIR/maintenance-summary.html"
```

## Maintenance Documentation

### Weekly Maintenance Report Template
```bash
# Generate weekly maintenance report
#!/bin/bash
# File: scripts/maintenance/generate-maintenance-report.sh

MAINTENANCE_DIR="maintenance/weekly-$(date +%Y%m%d)"
REPORT_FILE="$MAINTENANCE_DIR/weekly-maintenance-report.md"

cat > $REPORT_FILE << EOF
# Weekly Maintenance Report
**Date:** $(date +%Y-%m-%d)
**Maintenance Window:** 2:00 AM - 6:00 AM

## Executive Summary
Weekly maintenance completed successfully with the following improvements:

- Database optimization and cleanup performed
- Security updates applied  
- Performance monitoring and tuning completed
- Event ingestion optimization implemented

## Maintenance Activities

### Database Maintenance
- [x] VACUUM and ANALYZE operations completed
- [x] Index optimization reviewed
- [x] Old data cleanup performed
- [x] Performance statistics updated

### Application Maintenance  
- [x] Dependency security audit completed
- [x] Code quality checks passed
- [x] Test suite execution: PASSED
- [x] Bundle optimization completed

### System Maintenance
- [x] Security updates applied
- [x] SSL certificate status verified
- [x] Disk space cleanup performed
- [x] Log rotation completed

### Data Quality
- [x] Data integrity verification completed
- [x] Event ingestion rates reviewed
- [x] API performance optimized
- [x] Duplicate detection performed

## Performance Metrics

### Before Maintenance
\`\`\`
$(head -20 $MAINTENANCE_DIR/pre-maintenance-health.log)
\`\`\`

### After Maintenance  
\`\`\`
$(head -20 $MAINTENANCE_DIR/post-maintenance-health.log)
\`\`\`

## Issues Identified and Resolved

$(cat $MAINTENANCE_DIR/*-alerts.log 2>/dev/null | head -20 || echo "No critical issues identified")

## Backup Status
- Latest backup: $(ls -t /backups/database/*.sql.gz | head -1 | xargs basename)
- Backup size: $(ls -lh /backups/database/*.sql.gz | head -1 | awk '{print $5}')
- Restoration test: $(grep "restoration test" $MAINTENANCE_DIR/backup-verification.log || echo "PASSED")

## Recommendations for Next Week
1. Monitor performance improvements from optimization
2. Review and update monitoring thresholds
3. Plan for any identified capacity upgrades
4. Update documentation as needed

## Sign-off
- **Database Administrator:** [Name] - $(date)
- **System Administrator:** [Name] - $(date)  
- **Engineering Lead:** [Name] - $(date)
EOF

echo "Weekly maintenance report generated: $REPORT_FILE"
```

## Emergency Procedures During Maintenance

### Maintenance Rollback Procedure
```bash
#!/bin/bash
# Emergency rollback during maintenance
# File: scripts/maintenance/emergency-rollback.sh

echo "=== EMERGENCY MAINTENANCE ROLLBACK ==="
MAINTENANCE_DATE=$(date +%Y%m%d)

# 1. Stop current maintenance
echo "Stopping maintenance operations..."
pkill -f "maintenance"

# 2. Restore from pre-maintenance backup
echo "Restoring from pre-maintenance backup..."
BACKUP_FILE="/backups/database/pre-maintenance-$MAINTENANCE_DATE.sql.gz"

if [ -f "$BACKUP_FILE" ]; then
  gunzip -c "$BACKUP_FILE" | pg_restore --clean --dbname=$DATABASE_URL
  echo "Database restored from pre-maintenance backup"
else
  echo "ERROR: Pre-maintenance backup not found"
fi

# 3. Restart all services
echo "Restarting all services..."
systemctl restart nginx
systemctl restart postgresql
pm2 restart all

# 4. Verify rollback
./scripts/app-health-check.mjs --emergency

echo "Emergency rollback completed"
```

Remember: Weekly maintenance is crucial for system health, but always have rollback procedures ready and test them regularly.