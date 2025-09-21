# System Health Monitoring

## Purpose
Real-time system health monitoring procedures and automated health check protocols for SceneScout platform.

## Health Monitoring Overview

### Health Check Categories
1. **System Resources** - CPU, memory, disk usage
2. **Application Health** - Service availability, response times
3. **Database Health** - Connection status, query performance
4. **External Dependencies** - API availability, network connectivity
5. **Security Status** - SSL certificates, authentication systems
6. **Data Pipeline Health** - Event ingestion, data quality

### Monitoring Frequency
- **Continuous**: Critical system metrics (every minute)
- **Frequent**: Application health checks (every 5 minutes)
- **Regular**: Comprehensive health checks (every 15 minutes)
- **Periodic**: Security and certificate checks (every hour)
- **Daily**: Full system health audit

## Automated Health Monitoring

### Real-time Health Check Script
```bash
# Run comprehensive health check
./scripts/monitoring/system-health-monitor.sh

# Run with custom thresholds
./scripts/monitoring/system-health-monitor.sh --cpu-threshold 90 --memory-threshold 90

# Run in quiet mode (for automated scheduling)
./scripts/monitoring/system-health-monitor.sh --quiet
```

### Health Check Components

#### 1. System Resource Monitoring
```bash
# CPU Usage Check
check_cpu_usage() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        send_alert "HIGH_CPU_USAGE" "CPU usage is ${cpu_usage}%"
    fi
}

# Memory Usage Check
check_memory_usage() {
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ $memory_usage -gt 85 ]; then
        send_alert "HIGH_MEMORY_USAGE" "Memory usage is ${memory_usage}%"
    fi
}

# Disk Usage Check
check_disk_usage() {
    local disk_usage=$(df / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    
    if [ $disk_usage -gt 90 ]; then
        send_alert "HIGH_DISK_USAGE" "Disk usage is ${disk_usage}%"
    fi
}
```

#### 2. Application Health Monitoring
```bash
# Application Response Time Check
check_application_response() {
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" "https://scenescout.app/health")
    local response_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_ms > 3000" | bc -l) )); then
        send_alert "SLOW_RESPONSE" "Application response time is ${response_ms}ms"
    fi
}

# Service Availability Check
check_service_availability() {
    local services=("nginx" "postgresql" "redis")
    
    for service in "${services[@]}"; do
        if ! systemctl is-active $service >/dev/null 2>&1; then
            send_alert "SERVICE_DOWN" "Service $service is not running"
        fi
    done
}
```

#### 3. Database Health Monitoring
```bash
# Database Connection Check
check_database_health() {
    # Test basic connectivity
    if ! psql $DATABASE_URL -c "SELECT 1;" >/dev/null 2>&1; then
        send_alert "DATABASE_UNREACHABLE" "Cannot connect to database"
        return 1
    fi
    
    # Check connection pool usage
    local active_connections=$(psql $DATABASE_URL -t -c "
        SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
    ")
    
    local max_connections=$(psql $DATABASE_URL -t -c "SHOW max_connections;" | tr -d ' ')
    local connection_percentage=$(echo "scale=2; $active_connections * 100 / $max_connections" | bc)
    
    if (( $(echo "$connection_percentage > 80" | bc -l) )); then
        send_alert "HIGH_DB_CONNECTIONS" "Database connections at ${connection_percentage}%"
    fi
    
    # Check for long-running queries
    local long_queries=$(psql $DATABASE_URL -t -c "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE state != 'idle' 
          AND query_start < NOW() - INTERVAL '5 minutes';
    ")
    
    if [ $long_queries -gt 0 ]; then
        send_alert "LONG_RUNNING_QUERIES" "$long_queries queries running > 5 minutes"
    fi
}
```

## Health Check Scheduling

### Cron Configuration
```bash
# Add to crontab for automated health monitoring

# Every minute - basic health check
* * * * * /path/to/scripts/monitoring/system-health-monitor.sh --quiet

# Every 5 minutes - application health
*/5 * * * * /path/to/scripts/monitoring/check-application-health.sh

# Every 15 minutes - comprehensive check
*/15 * * * * /path/to/scripts/monitoring/comprehensive-health-check.sh

# Every hour - security and certificate checks
0 * * * * /path/to/scripts/monitoring/security-health-check.sh

# Daily at 2 AM - full system audit
0 2 * * * /path/to/scripts/monitoring/daily-health-audit.sh
```

### Systemd Timer Configuration
```ini
# /etc/systemd/system/scenescout-health-check.timer
[Unit]
Description=SceneScout Health Check Timer
Requires=scenescout-health-check.service

[Timer]
OnCalendar=*:0/5  # Every 5 minutes
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/scenescout-health-check.service
[Unit]
Description=SceneScout Health Check Service

[Service]
Type=oneshot
ExecStart=/path/to/scripts/monitoring/system-health-monitor.sh --quiet
User=scenescout
Group=scenescout
```

## Health Metrics and KPIs

### System Performance KPIs
```bash
# Generate health metrics report
generate_health_metrics() {
    cat > /tmp/health-metrics.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "system": {
        "cpu_usage": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1),
        "memory_usage": $(free | awk 'NR==2{printf "%.1f", $3*100/$2}'),
        "disk_usage": $(df / | awk 'NR==2{print $5}' | cut -d'%' -f1),
        "load_average": "$(uptime | awk -F'load average:' '{print $2}' | tr -d ' ')"
    },
    "application": {
        "response_time_ms": $(curl -o /dev/null -s -w "%{time_total}" "https://scenescout.app/health" | awk '{print $1*1000}'),
        "active_processes": $(ps aux | grep -c '[n]ode'),
        "uptime_seconds": $(ps -o etimes= -p $(pgrep -f 'node.*server' | head -1) 2>/dev/null || echo 0)
    },
    "database": {
        "active_connections": $(psql $DATABASE_URL -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo 0),
        "avg_query_time_ms": $(psql $DATABASE_URL -t -c "SELECT ROUND(AVG(mean_exec_time)) FROM pg_stat_statements WHERE calls > 0;" 2>/dev/null || echo 0)
    }
}
EOF
}
```

### Application Health Endpoints
```javascript
// Health check endpoint implementation
// File: src/api/health.js

app.get('/health', async (req, res) => {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  try {
    // Database health check
    const dbStart = Date.now();
    await supabase.from('events').select('count').limit(1);
    healthCheck.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };

    // External APIs health check
    const apiChecks = await Promise.allSettled([
      checkTicketmasterAPI(),
      checkEventbriteAPI()
    ]);

    healthCheck.checks.apis = apiChecks.map((result, index) => ({
      name: ['ticketmaster', 'eventbrite'][index],
      status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    // Event ingestion health
    const recentEvents = await supabase
      .from('events')
      .select('count')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    healthCheck.checks.ingestion = {
      status: recentEvents.count > 0 ? 'healthy' : 'warning',
      eventsLastHour: recentEvents.count
    };

    // Overall status determination
    const hasUnhealthy = Object.values(healthCheck.checks).some(
      check => check.status === 'unhealthy'
    );
    
    if (hasUnhealthy) {
      healthCheck.status = 'unhealthy';
      res.status(503);
    }

    res.json(healthCheck);
  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});
```

## Alert Configuration

### Alert Severity Levels
```bash
# Alert severity configuration
ALERT_LEVELS=(
    "INFO:0"        # Informational alerts
    "WARNING:1"     # Warning alerts (response within 4 hours)
    "CRITICAL:2"    # Critical alerts (immediate response)
    "EMERGENCY:3"   # Emergency alerts (immediate escalation)
)

# Alert thresholds
declare -A THRESHOLDS=(
    ["cpu_warning"]=80
    ["cpu_critical"]=90
    ["memory_warning"]=85
    ["memory_critical"]=95
    ["disk_warning"]=85
    ["disk_critical"]=95
    ["response_time_warning"]=3000
    ["response_time_critical"]=10000
)
```

### Notification Configuration
```bash
# Alert notification function
send_health_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "$timestamp [$severity] $alert_type: $message" >> /var/log/scenescout/health-alerts.log
    
    # Send notifications based on severity
    case $severity in
        "CRITICAL"|"EMERGENCY")
            # Immediate notifications
            send_slack_alert "#critical-alerts" "🚨 [$severity] $alert_type: $message"
            send_email_alert "ops-team@scenescout.com" "URGENT: SceneScout $alert_type" "$message"
            send_sms_alert "+1234567890" "SceneScout $alert_type: $message"
            ;;
        "WARNING")
            # Standard notifications
            send_slack_alert "#alerts" "⚠️ [$severity] $alert_type: $message"
            send_email_alert "team@scenescout.com" "SceneScout Alert: $alert_type" "$message"
            ;;
        "INFO")
            # Low-priority notifications
            send_slack_alert "#monitoring" "ℹ️ [$severity] $alert_type: $message"
            ;;
    esac
}

# Notification implementations
send_slack_alert() {
    local channel="$1"
    local message="$2"
    
    # Implement Slack webhook
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        "$SLACK_WEBHOOK_URL"
}

send_email_alert() {
    local recipient="$1"
    local subject="$2"
    local body="$3"
    
    # Implement email notification
    echo "$body" | mail -s "$subject" "$recipient"
}
```

## Health Dashboard

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "SceneScout System Health",
    "panels": [
      {
        "title": "System Resources",
        "targets": [
          {
            "expr": "cpu_usage_percentage",
            "legendFormat": "CPU Usage"
          },
          {
            "expr": "memory_usage_percentage", 
            "legendFormat": "Memory Usage"
          },
          {
            "expr": "disk_usage_percentage",
            "legendFormat": "Disk Usage"
          }
        ]
      },
      {
        "title": "Application Performance",
        "targets": [
          {
            "expr": "response_time_milliseconds",
            "legendFormat": "Response Time"
          },
          {
            "expr": "requests_per_second",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "title": "Database Health",
        "targets": [
          {
            "expr": "database_connections_active",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "database_query_time_avg",
            "legendFormat": "Avg Query Time"
          }
        ]
      }
    ]
  }
}
```

### Health Status Page
```html
<!-- Simple health status page -->
<!DOCTYPE html>
<html>
<head>
    <title>SceneScout System Status</title>
    <meta http-equiv="refresh" content="30">
    <style>
        .status-healthy { color: green; }
        .status-warning { color: orange; }
        .status-critical { color: red; }
    </style>
</head>
<body>
    <h1>SceneScout System Status</h1>
    
    <div id="status-grid">
        <!-- Auto-populated by health check script -->
    </div>
    
    <script>
        async function updateStatus() {
            const response = await fetch('/api/health');
            const health = await response.json();
            
            document.getElementById('status-grid').innerHTML = `
                <div class="status-${health.status}">
                    Overall Status: ${health.status.toUpperCase()}
                </div>
                <div>Last Updated: ${health.timestamp}</div>
                <div>Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m</div>
            `;
        }
        
        updateStatus();
        setInterval(updateStatus, 30000);
    </script>
</body>
</html>
```

## Troubleshooting Health Issues

### Common Health Check Failures

#### High CPU Usage
```bash
# Investigate high CPU usage
top -bn1 | head -20
ps aux --sort=-%cpu | head -10

# Check for runaway processes
ps aux | awk '$3 > 50 {print $0}'

# Node.js specific CPU profiling
node --prof your-app.js
node --prof-process isolate-*.log > processed.txt
```

#### High Memory Usage
```bash
# Memory analysis
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks in Node.js
node --inspect your-app.js
# Use Chrome DevTools for heap analysis

# Clear system cache if needed
sync && echo 3 > /proc/sys/vm/drop_caches
```

#### Database Connection Issues
```sql
-- Check connection pool
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Identify blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
    ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity 
    ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- Kill long-running queries if necessary
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity 
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes';
```

## Health Check Best Practices

### 1. Monitoring Principles
- **Proactive Detection**: Catch issues before they impact users
- **Comprehensive Coverage**: Monitor all critical components
- **Appropriate Thresholds**: Balance sensitivity with false positives
- **Clear Escalation**: Define who gets notified when
- **Historical Tracking**: Maintain health metrics over time

### 2. Alert Management
- **Alert Fatigue Prevention**: Tune thresholds to reduce noise
- **Actionable Alerts**: Every alert should have a clear response
- **Context Inclusion**: Provide enough information to diagnose
- **Escalation Paths**: Clear chain of responsibility
- **Alert Acknowledgment**: Track response to alerts

### 3. Performance Optimization
- **Efficient Checks**: Health checks shouldn't impact performance
- **Batch Operations**: Group related checks together
- **Caching**: Cache expensive checks appropriately
- **Async Monitoring**: Don't block operations for health checks
- **Resource Cleanup**: Clean up monitoring resources

Remember: A healthy monitoring system is one that provides early warning of problems while minimizing false alarms and operational overhead.