# Incident Response Playbook

## Purpose
Comprehensive incident response procedures for SceneScout system outages, performance issues, and security incidents.

## Incident Classification

### Severity Levels

#### Severity 1 - Critical (Response: Immediate)
- Complete system outage
- Data loss or corruption
- Security breach
- Payment system failure
- Major data ingestion failure affecting all sources

#### Severity 2 - High (Response: 30 minutes)
- Partial system outage
- Significant performance degradation (>10 seconds response time)
- Single API source failure
- Authentication issues
- Database connection problems

#### Severity 3 - Medium (Response: 2 hours)
- Minor performance issues
- Non-critical feature failures
- Single component degradation
- High error rates in logs

#### Severity 4 - Low (Response: Next business day)
- Cosmetic issues
- Documentation problems
- Minor configuration issues

## Incident Response Process

### 1. Initial Response (First 5 Minutes)

#### Acknowledge and Assess
```bash
# Immediate system status check
curl -I https://scenescout.app/health
curl -I https://scenescout.app/api/health

# Check core functionality
./scripts/app-health-check.mjs --emergency

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;" || echo "DATABASE DOWN"

# Check recent logs for errors
tail -100 logs/application.log | grep -i error
tail -100 logs/ingestion.log | grep -i error
```

#### Document Incident Start
```bash
# Create incident log
echo "$(date): INCIDENT START - [Brief Description]" >> incidents/incident-$(date +%Y%m%d-%H%M).log

# Notify team (update with actual notification system)
# slack-notify "#incidents" "🚨 INCIDENT: [Description] - Investigating"
```

### 2. Investigation Phase (5-15 Minutes)

#### System Status Investigation
```bash
# Check system resources
top -n 1 | head -20
free -h
df -h

# Network connectivity
ping -c 3 8.8.8.8
nslookup scenescout.app

# Check running processes
ps aux | grep -E "(node|npm|supabase)"

# Database status
psql $DATABASE_URL -c "
SELECT 
  count(*) as active_connections,
  max(query_start) as longest_query_start
FROM pg_stat_activity 
WHERE state = 'active';
"
```

#### Application-Specific Checks
```bash
# Check event ingestion status
psql $DATABASE_URL -c "
SELECT 
  source,
  MAX(created_at) as last_event_time,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/60 as minutes_since_last
FROM events 
GROUP BY source;
"

# Check for stuck transactions
psql $DATABASE_URL -c "
SELECT 
  pid,
  state,
  query_start,
  query
FROM pg_stat_activity 
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes';
"

# Check Supabase functions
supabase functions list
supabase functions logs --limit 20
```

#### Error Analysis
```bash
# Analyze recent errors
grep -A 5 -B 5 -i "error\|exception\|failure" logs/application.log | tail -50

# Check for patterns
grep -i error logs/application.log | awk '{print $1, $2}' | uniq -c | sort -nr

# Database errors
psql $DATABASE_URL -c "
SELECT 
  message,
  detail,
  hint,
  COUNT(*)
FROM pg_stat_database_conflicts 
WHERE datname = current_database()
GROUP BY message, detail, hint;
"
```

### 3. Immediate Mitigation (15-30 Minutes)

#### Quick Fixes by Issue Type

##### Database Connection Issues
```bash
# Check connection pool
psql $DATABASE_URL -c "SHOW max_connections;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running queries (if safe)
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity 
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes'
  AND query NOT LIKE '%pg_stat_activity%';
"

# Restart connection pooler if applicable
# systemctl restart pgbouncer
```

##### High Memory Usage
```bash
# Check memory hogs
ps aux --sort=-%mem | head -10

# Clear cache if safe
sync && echo 3 > /proc/sys/vm/drop_caches

# Restart Node.js processes if needed
pm2 restart all  # If using PM2
```

##### API Rate Limiting
```bash
# Check rate limit status for each API
node scripts/monitoring/check-api-limits.js

# Temporarily disable problematic APIs
psql $DATABASE_URL -c "
UPDATE api_configurations 
SET enabled = false 
WHERE source = '[problematic_source]';
"

# Reduce ingestion frequency
# Update cron jobs or function schedules
```

##### Disk Space Issues
```bash
# Check disk usage
df -h

# Clean up logs
find logs/ -name "*.log" -mtime +7 -delete
find logs/ -name "*.log.*" -mtime +3 -delete

# Clean up temp files
rm -rf /tmp/scenescout-*
```

### 4. Communication

#### Internal Team Notification
```bash
# Update incident log
echo "$(date): Investigation findings: [Summary]" >> incidents/incident-$(date +%Y%m%d-%H%M).log
echo "$(date): Mitigation attempted: [Actions taken]" >> incidents/incident-$(date +%Y%m%d-%H%M).log

# Notify stakeholders
# slack-notify "#team" "📊 Incident Update: [Status] - ETA: [Time]"
```

#### External Communication (For Severity 1 & 2)
```bash
# Update status page
# curl -X POST "https://api.statuspage.io/v1/pages/{page-id}/incidents" \
#   -H "Authorization: OAuth {token}" \
#   -H "Content-Type: application/json" \
#   -d '{"incident": {"name": "Service Degradation", "status": "investigating"}}'

# Social media updates for major outages
# Prepare user communication if needed
```

### 5. Resolution and Recovery

#### Verify Fix
```bash
# Full system health check
npm run smoke

# Comprehensive functional test
./scripts/browser-smoke-test.mjs

# Check all critical metrics
./scripts/app-health-check.mjs --comprehensive

# Verify event ingestion resumed
node scripts/monitoring/verify-ingestion-recovery.js
```

#### Performance Validation
```bash
# Response time validation
for i in {1..10}; do
  curl -o /dev/null -s -w "%{time_total}\n" https://scenescout.app/
done | awk '{sum+=$1} END {print "Average:", sum/NR}'

# Database performance check
psql $DATABASE_URL -c "
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

### 6. Post-Incident Activities

#### Incident Documentation
```bash
# Complete incident log
cat >> incidents/incident-$(date +%Y%m%d-%H%M).log << EOF
$(date): INCIDENT RESOLVED
Resolution: [Description of fix]
Root Cause: [Analysis]
Duration: [Start time] to [End time]
Impact: [User impact description]
Next Steps: [Follow-up actions needed]
EOF
```

#### Post-Incident Review (Within 24 hours)
1. **Timeline Analysis**
   - Detection time
   - Response time
   - Resolution time
   - Communication timeline

2. **Root Cause Analysis**
   - Technical root cause
   - Contributing factors
   - Why it wasn't caught earlier

3. **Action Items**
   - Immediate fixes
   - Medium-term improvements
   - Long-term preventive measures

## Incident Response Contacts

### Primary On-Call
- **Name**: [On-call engineer]
- **Phone**: [Emergency contact]
- **Slack**: @[username]

### Escalation Chain
1. **Level 1**: On-call engineer (0-30 minutes)
2. **Level 2**: Team lead (30-60 minutes)
3. **Level 3**: Engineering manager (1-2 hours)
4. **Level 4**: CTO/VP Engineering (2+ hours)

### Specialist Contacts
- **Database Issues**: [DBA contact]
- **Security Issues**: [Security team]
- **Infrastructure**: [DevOps/SRE team]
- **Third-party APIs**: [Integration team]

## Common Incident Scenarios

### Scenario 1: Complete Site Down
```bash
# Quick diagnostic
curl -I https://scenescout.app/ || echo "SITE DOWN"

# Check if it's DNS, CDN, or application
nslookup scenescout.app
curl -I [direct IP if known]

# Check application server
ps aux | grep node
systemctl status [service-name] # if using systemd

# Check reverse proxy/load balancer
nginx -t && systemctl status nginx  # if using nginx
```

### Scenario 2: Database Connection Failures
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check database server status
# (Commands depend on hosting solution)

# Check connection pool
psql $DATABASE_URL -c "
SELECT 
  state,
  count(*) 
FROM pg_stat_activity 
GROUP BY state;
"

# Reset connections if needed
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity 
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
"
```

### Scenario 3: API Ingestion Failure
```bash
# Check API health for each source
curl -I "https://api.ticketmaster.com/discovery/v2/events.json?apikey=[key]&size=1"
curl -I "https://www.eventbriteapi.com/v3/events/search/?token=[token]"

# Check ingestion function logs
supabase functions logs ingest_ticketmaster --limit 50
supabase functions logs ingest_eventbrite --limit 50

# Manual ingestion test
node scripts/test-api-ingestion.js --source ticketmaster
```

### Scenario 4: Performance Degradation
```bash
# Identify slow components
./scripts/app-health-check.mjs --detailed

# Check database performance
psql $DATABASE_URL -c "
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 20;
"

# Check for blocking queries
psql $DATABASE_URL -c "
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

## Recovery Procedures

### Application Recovery
```bash
# Restart application
pm2 restart all  # If using PM2
# or
systemctl restart scenescout  # If using systemd

# Clear application cache
redis-cli FLUSHALL  # If using Redis

# Restart reverse proxy
systemctl restart nginx
```

### Database Recovery
```bash
# Check database health
psql $DATABASE_URL -c "SELECT pg_is_in_recovery();"

# Restart database connections
# This depends on your hosting solution

# Run integrity checks
psql $DATABASE_URL -c "
DO $$ 
DECLARE 
  tbl text;
BEGIN 
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
  LOOP 
    EXECUTE 'SELECT count(*) FROM ' || tbl; 
  END LOOP; 
END $$;
"
```

### Data Recovery
```bash
# Restore from backup (if needed)
./scripts/restore-from-backup.sh --timestamp [YYYYMMDD-HHMMSS]

# Verify data integrity after restore
node scripts/verify-data-integrity.js

# Re-run any failed ingestion
node scripts/backfill-events.js --start-date [DATE] --end-date [DATE]
```

Remember: Document everything, communicate early and often, and prioritize user impact over perfect solutions during active incidents.