# Performance Monitoring Guide

## Purpose
Comprehensive performance monitoring, analysis, and optimization procedures for SceneScout platform.

## Key Performance Indicators (KPIs)

### Application Performance
- **Response Time**: < 2 seconds (95th percentile)
- **Throughput**: > 100 requests/second
- **Error Rate**: < 0.1%
- **Availability**: 99.9% uptime

### Database Performance
- **Query Response Time**: < 100ms (average)
- **Connection Pool Usage**: < 80%
- **Transaction Rate**: Monitor for spikes
- **Lock Wait Time**: < 1 second

### Event Ingestion Performance
- **Ingestion Rate**: > 1000 events/hour
- **API Response Time**: < 5 seconds per API
- **Success Rate**: > 95% per API source
- **Data Freshness**: < 1 hour lag

### System Resources
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80%
- **Disk Usage**: < 85%
- **Network Latency**: < 100ms

## Real-Time Monitoring Setup

### Application Performance Monitoring
```bash
# Custom health check script for detailed metrics
#!/bin/bash
# File: scripts/monitoring/performance-monitor.js

const startTime = Date.now();

// Test core endpoints
const endpoints = [
  '/',
  '/discover',
  '/map',
  '/api/events',
  '/api/venues',
  '/health'
];

for (const endpoint of endpoints) {
  const url = `https://scenescout.app${endpoint}`;
  const start = Date.now();
  
  try {
    const response = await fetch(url);
    const duration = Date.now() - start;
    
    console.log(`${endpoint}: ${response.status} - ${duration}ms`);
    
    if (duration > 2000) {
      console.warn(`SLOW: ${endpoint} took ${duration}ms`);
    }
    
    if (response.status >= 400) {
      console.error(`ERROR: ${endpoint} returned ${response.status}`);
    }
  } catch (error) {
    console.error(`FAILED: ${endpoint} - ${error.message}`);
  }
}
```

### Database Performance Monitoring
```sql
-- Database performance monitoring queries

-- 1. Slow Query Analysis
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_exec_time > 100  -- Queries taking > 100ms
ORDER BY mean_exec_time DESC 
LIMIT 20;

-- 2. Connection Pool Monitoring
SELECT 
  state,
  count(*) as connections,
  ROUND(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as percentage
FROM pg_stat_activity 
GROUP BY state 
ORDER BY connections DESC;

-- 3. Lock Monitoring
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

-- 4. Table Size and Growth Monitoring
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 5. Index Usage Analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW_USAGE'
    ELSE 'ACTIVE'
  END as usage_status
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### System Resource Monitoring
```bash
# System resource monitoring script
#!/bin/bash
# File: scripts/monitoring/system-monitor.sh

echo "=== System Performance Report - $(date) ==="

# CPU Usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Memory Usage
echo "Memory Usage:"
free -h | awk 'NR==2{printf "Memory Usage: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'

# Disk Usage
echo "Disk Usage:"
df -h | awk '$NF=="/"{printf "Disk Usage: %d/%dGB (%s)\n", $3,$2,$5}'

# Network Statistics
echo "Network Statistics:"
ss -tuln | wc -l | awk '{print "Active Connections: " $1}'

# Load Average
echo "Load Average:"
uptime | awk -F'load average:' '{ print $2 }'

# Process Information
echo "Top Processes by CPU:"
ps aux --sort=-%cpu | head -10

echo "Top Processes by Memory:"
ps aux --sort=-%mem | head -10

# Node.js specific monitoring
echo "Node.js Processes:"
ps aux | grep node | grep -v grep

# Check for Node.js memory leaks
if command -v node &> /dev/null; then
  echo "Node.js Memory Usage:"
  node -e "console.log(process.memoryUsage())"
fi
```

## Event Ingestion Performance

### API Response Time Monitoring
```bash
# Monitor all API sources
#!/bin/bash
# File: scripts/monitoring/api-performance.sh

declare -A APIS
APIS[ticketmaster]="https://app.ticketmaster.com/discovery/v2/events.json"
APIS[eventbrite]="https://www.eventbriteapi.com/v3/events/search/"
# Add other APIs as configured

for api in "${!APIS[@]}"; do
  echo "Testing $api API..."
  
  start_time=$(date +%s%N)
  
  # Test API (with proper auth headers)
  status_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $EVENTBRITE_TOKEN" \
    "${APIS[$api]}?limit=1")
  
  end_time=$(date +%s%N)
  duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
  
  echo "$api: HTTP $status_code - ${duration}ms"
  
  # Alert if slow or failing
  if [ $duration -gt 5000 ]; then
    echo "WARNING: $api is slow (${duration}ms)"
  fi
  
  if [ $status_code -ge 400 ]; then
    echo "ERROR: $api returned HTTP $status_code"
  fi
done
```

### Ingestion Rate Monitoring
```sql
-- Monitor event ingestion rates
SELECT 
  source,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as events_ingested,
  AVG(CASE 
    WHEN ingestion_duration_ms IS NOT NULL 
    THEN ingestion_duration_ms 
    END) as avg_ingestion_time_ms
FROM events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, events_ingested DESC;

-- Check for ingestion gaps
SELECT 
  source,
  MAX(created_at) as last_event,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/3600 as hours_since_last
FROM events 
GROUP BY source
HAVING EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/3600 > 2;  -- Alert if > 2 hours

-- Monitor ingestion errors
SELECT 
  source,
  error_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_error
FROM ingestion_logs 
WHERE status = 'error' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, error_type
ORDER BY error_count DESC;
```

## Performance Analysis and Optimization

### Database Query Optimization
```sql
-- Identify queries needing optimization
WITH slow_queries AS (
  SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
  FROM pg_stat_statements 
  WHERE mean_exec_time > 100
)
SELECT 
  *,
  CASE 
    WHEN hit_percent < 95 THEN 'Low cache hit ratio - consider indexing'
    WHEN mean_exec_time > 1000 THEN 'Very slow - urgent optimization needed'
    WHEN calls > 1000 AND mean_exec_time > 100 THEN 'High frequency slow query'
    ELSE 'Monitor for improvements'
  END as recommendation
FROM slow_queries
ORDER BY mean_exec_time DESC;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  seq_tup_read / seq_scan as avg_tup_read,
  CASE 
    WHEN seq_scan > 1000 AND seq_tup_read / seq_scan > 10000 
    THEN 'Consider adding index'
    ELSE 'OK'
  END as recommendation
FROM pg_stat_user_tables 
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;

-- Analyze table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins + n_tup_upd + n_tup_del as total_writes,
  n_live_tup,
  n_dead_tup,
  CASE 
    WHEN n_dead_tup > n_live_tup * 0.1 THEN 'Needs VACUUM'
    ELSE 'OK'
  END as vacuum_recommendation
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC;
```

### Application Performance Optimization
```bash
# Application performance analysis
#!/bin/bash
# File: scripts/monitoring/app-performance-analysis.sh

echo "=== Application Performance Analysis ==="

# Check for memory leaks in Node.js
echo "Node.js Memory Usage Trend:"
for i in {1..5}; do
  echo "Sample $i:"
  node -e "
    const used = process.memoryUsage();
    for (let key in used) {
      console.log(\`\${key}: \${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB\`);
    }
  "
  sleep 10
done

# Check for slow endpoints
echo "Testing Endpoint Performance:"
endpoints=("/" "/discover" "/map" "/api/events" "/api/venues")

for endpoint in "${endpoints[@]}"; do
  echo "Testing $endpoint..."
  
  # Run multiple requests and calculate average
  total_time=0
  for i in {1..5}; do
    time=$(curl -o /dev/null -s -w "%{time_total}" "https://scenescout.app$endpoint")
    total_time=$(echo "$total_time + $time" | bc)
  done
  
  avg_time=$(echo "scale=3; $total_time / 5" | bc)
  echo "$endpoint: ${avg_time}s average"
done

# Check for high CPU usage patterns
echo "CPU Usage by Process:"
ps aux --sort=-%cpu | head -10 | while read line; do
  echo "$line"
done
```

### Frontend Performance Monitoring
```javascript
// Frontend performance monitoring
// File: src/utils/performance-monitor.js

class PerformanceMonitor {
  static measurePageLoad() {
    if (performance.navigation) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log(`Page load time: ${loadTime}ms`);
      
      // Send to analytics
      this.sendMetric('page_load_time', loadTime);
    }
  }
  
  static measureComponentRender(componentName, renderFunction) {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();
    
    const duration = end - start;
    console.log(`${componentName} render time: ${duration}ms`);
    
    if (duration > 100) {
      console.warn(`Slow component render: ${componentName} took ${duration}ms`);
    }
    
    this.sendMetric('component_render_time', duration, { component: componentName });
    return result;
  }
  
  static measureAPICall(apiName, apiCall) {
    const start = performance.now();
    
    return apiCall().then(result => {
      const end = performance.now();
      const duration = end - start;
      
      console.log(`API call ${apiName}: ${duration}ms`);
      this.sendMetric('api_call_time', duration, { api: apiName });
      
      return result;
    }).catch(error => {
      const end = performance.now();
      const duration = end - start;
      
      console.error(`API call ${apiName} failed after ${duration}ms:`, error);
      this.sendMetric('api_call_error', duration, { api: apiName, error: error.message });
      
      throw error;
    });
  }
  
  static sendMetric(name, value, tags = {}) {
    // Send to your analytics service
    // Example: Sentry, DataDog, etc.
    console.log('Metric:', { name, value, tags });
  }
  
  static startPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.sendMetric('custom_measure', entry.duration, { name: entry.name });
          } else if (entry.entryType === 'navigation') {
            this.sendMetric('navigation_timing', entry.loadEventEnd - entry.loadEventStart);
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }
}

export default PerformanceMonitor;
```

## Automated Performance Alerts

### Alert Configuration
```bash
# Performance alerting script
#!/bin/bash
# File: scripts/monitoring/performance-alerts.sh

# Configuration
RESPONSE_TIME_THRESHOLD=2000  # milliseconds
CPU_THRESHOLD=80              # percentage
MEMORY_THRESHOLD=85           # percentage
DISK_THRESHOLD=90            # percentage
ERROR_RATE_THRESHOLD=1       # percentage

# Check response time
avg_response_time=$(curl -o /dev/null -s -w "%{time_total}" https://scenescout.app/ | awk '{print $1*1000}')
if (( $(echo "$avg_response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
  echo "ALERT: High response time: ${avg_response_time}ms"
  # Send alert
fi

# Check CPU usage
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
  echo "ALERT: High CPU usage: ${cpu_usage}%"
  # Send alert
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
  echo "ALERT: High memory usage: ${memory_usage}%"
  # Send alert
fi

# Check disk usage
disk_usage=$(df / | awk 'NR==2{print $5}' | cut -d'%' -f1)
if [ $disk_usage -gt $DISK_THRESHOLD ]; then
  echo "ALERT: High disk usage: ${disk_usage}%"
  # Send alert
fi

# Check error rate
error_count=$(grep -c "ERROR" logs/application.log.$(date +%Y-%m-%d))
total_requests=$(grep -c "HTTP" logs/application.log.$(date +%Y-%m-%d))
if [ $total_requests -gt 0 ]; then
  error_rate=$(echo "scale=2; $error_count * 100 / $total_requests" | bc)
  if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
    echo "ALERT: High error rate: ${error_rate}%"
    # Send alert
  fi
fi
```

### Database Performance Alerts
```sql
-- Database performance alerts (run every 5 minutes)

-- Alert on long-running queries
SELECT 
  'LONG_RUNNING_QUERY' as alert_type,
  pid,
  state,
  query_start,
  EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
  query
FROM pg_stat_activity 
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';

-- Alert on high connection usage
WITH connection_stats AS (
  SELECT 
    COUNT(*) as current_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
  FROM pg_stat_activity
)
SELECT 
  'HIGH_CONNECTION_USAGE' as alert_type,
  current_connections,
  max_connections,
  ROUND(100.0 * current_connections / max_connections, 2) as usage_percent
FROM connection_stats 
WHERE 100.0 * current_connections / max_connections > 80;

-- Alert on blocking queries
SELECT 
  'BLOCKING_QUERY' as alert_type,
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  EXTRACT(EPOCH FROM (NOW() - blocked_activity.query_start)) as blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND EXTRACT(EPOCH FROM (NOW() - blocked_activity.query_start)) > 30;
```

## Performance Reporting

### Daily Performance Report
```bash
# Generate daily performance report
#!/bin/bash
# File: scripts/monitoring/daily-performance-report.sh

DATE=$(date +%Y-%m-%d)
REPORT_FILE="reports/performance_report_$DATE.html"

cat > $REPORT_FILE << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SceneScout Performance Report - $DATE</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .good { border-left: 5px solid #4CAF50; }
        .warning { border-left: 5px solid #FF9800; }
        .critical { border-left: 5px solid #F44336; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>SceneScout Performance Report</h1>
    <h2>Date: $DATE</h2>
    
    <h3>System Overview</h3>
EOF

# Add system metrics
echo "<div class='metric good'>" >> $REPORT_FILE
echo "<h4>Response Time</h4>" >> $REPORT_FILE
avg_response=$(curl -o /dev/null -s -w "%{time_total}" https://scenescout.app/)
echo "<p>Average Response Time: ${avg_response}s</p>" >> $REPORT_FILE
echo "</div>" >> $REPORT_FILE

# Add database metrics
echo "<h3>Database Performance</h3>" >> $REPORT_FILE
echo "<table>" >> $REPORT_FILE
echo "<tr><th>Metric</th><th>Value</th><th>Status</th></tr>" >> $REPORT_FILE

# Get database metrics and add to report
psql $DATABASE_URL -t -c "
SELECT 
  'Active Connections',
  COUNT(*),
  CASE WHEN COUNT(*) < 50 THEN 'Good' ELSE 'Warning' END
FROM pg_stat_activity WHERE state = 'active'
" | while IFS='|' read -r metric value status; do
  echo "<tr><td>$metric</td><td>$value</td><td>$status</td></tr>" >> $REPORT_FILE
done

echo "</table>" >> $REPORT_FILE
echo "</body></html>" >> $REPORT_FILE

echo "Performance report generated: $REPORT_FILE"
```

### Weekly Performance Trends
```sql
-- Weekly performance trends analysis
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT source) as active_sources
  FROM events 
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(created_at)
),
api_performance AS (
  SELECT 
    DATE(created_at) as date,
    source,
    AVG(response_time_ms) as avg_response_time,
    COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as success_rate
  FROM api_logs 
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(created_at), source
)
SELECT 
  d.date,
  d.total_events,
  d.active_sources,
  ROUND(AVG(a.avg_response_time), 2) as avg_api_response_time,
  ROUND(AVG(a.success_rate), 2) as avg_success_rate
FROM daily_stats d
LEFT JOIN api_performance a ON d.date = a.date
GROUP BY d.date, d.total_events, d.active_sources
ORDER BY d.date;
```

## Performance Optimization Recommendations

### Database Optimizations
1. **Index Optimization**: Regularly analyze and create missing indexes
2. **Query Optimization**: Rewrite slow queries, use EXPLAIN ANALYZE
3. **Connection Pooling**: Optimize connection pool settings
4. **Vacuum Strategy**: Regular VACUUM and ANALYZE operations
5. **Partitioning**: Consider table partitioning for large tables

### Application Optimizations
1. **Caching Strategy**: Implement Redis for frequently accessed data
2. **Code Splitting**: Use dynamic imports for large components
3. **Image Optimization**: Optimize and lazy-load images
4. **API Rate Limiting**: Implement rate limiting to prevent abuse
5. **Memory Management**: Monitor and fix memory leaks

### Infrastructure Optimizations
1. **CDN Usage**: Use CDN for static assets
2. **Load Balancing**: Distribute traffic across multiple servers
3. **Auto-scaling**: Implement auto-scaling based on metrics
4. **Monitoring Enhancement**: Add more detailed monitoring
5. **Backup Optimization**: Optimize backup strategies for performance

Remember: Performance monitoring is an ongoing process. Regular analysis and optimization are essential for maintaining system health and user satisfaction.