#!/bin/bash
# System Health Monitor
# Comprehensive system health monitoring script for SceneScout

# Configuration
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_RESPONSE_TIME=3000  # milliseconds
LOG_DIR="/var/log/scenescout"
HEALTH_LOG="$LOG_DIR/health-monitor.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$HEALTH_LOG"
}

# Function to send alert (implement with your notification system)
send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="$3"
    
    log_message "ALERT [$severity] $alert_type: $message"
    
    # Implement actual alerting here
    # Examples:
    # slack-notify "#alerts" "🚨 [$severity] $alert_type: $message"
    # echo "$message" | mail -s "SceneScout Alert: $alert_type" ops-team@scenescout.com
    
    # For now, just write to alert log
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$severity] $alert_type: $message" >> "$LOG_DIR/alerts.log"
}

# System resource monitoring
check_cpu_usage() {
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    log_message "CPU Usage: ${cpu_usage}%"
    
    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        send_alert "HIGH_CPU_USAGE" "CPU usage is ${cpu_usage}%" "WARNING"
        
        # Get top CPU processes
        log_message "Top CPU processes:"
        ps aux --sort=-%cpu | head -10 | tee -a "$HEALTH_LOG"
    fi
    
    echo "$cpu_usage"
}

check_memory_usage() {
    local memory_info
    memory_info=$(free | awk 'NR==2{printf "%.0f %.0f %.2f", $3,$2,$3*100/$2}')
    read -r used total percentage <<< "$memory_info"
    
    log_message "Memory Usage: ${used}MB/${total}MB (${percentage}%)"
    
    if (( $(echo "$percentage > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        send_alert "HIGH_MEMORY_USAGE" "Memory usage is ${percentage}%" "WARNING"
        
        # Get top memory processes
        log_message "Top memory processes:"
        ps aux --sort=-%mem | head -10 | tee -a "$HEALTH_LOG"
    fi
    
    echo "$percentage"
}

check_disk_usage() {
    local disk_usage
    disk_usage=$(df / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    
    log_message "Disk Usage: ${disk_usage}%"
    
    if [ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        send_alert "HIGH_DISK_USAGE" "Disk usage is ${disk_usage}%" "CRITICAL"
        
        # Show largest directories
        log_message "Largest directories:"
        du -h / 2>/dev/null | sort -hr | head -10 | tee -a "$HEALTH_LOG"
    fi
    
    echo "$disk_usage"
}

check_application_health() {
    log_message "Checking application health..."
    
    # Check if Node.js processes are running
    local node_processes
    node_processes=$(ps aux | grep -c '[n]ode')
    log_message "Node.js processes running: $node_processes"
    
    if [ "$node_processes" -eq 0 ]; then
        send_alert "APPLICATION_DOWN" "No Node.js processes running" "CRITICAL"
        return 1
    fi
    
    # Check application response time
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:3000/health" 2>/dev/null | awk '{print $1*1000}')
    
    if [ -n "$response_time" ]; then
        log_message "Application response time: ${response_time}ms"
        
        if (( $(echo "$response_time > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
            send_alert "SLOW_RESPONSE" "Application response time is ${response_time}ms" "WARNING"
        fi
    else
        send_alert "APPLICATION_UNREACHABLE" "Application health endpoint unreachable" "CRITICAL"
        return 1
    fi
    
    return 0
}

check_database_health() {
    log_message "Checking database health..."
    
    # Check database connectivity
    if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        send_alert "DATABASE_UNREACHABLE" "Cannot connect to database" "CRITICAL"
        return 1
    fi
    
    # Check active connections
    local active_connections
    active_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null)
    
    if [ -n "$active_connections" ]; then
        log_message "Active database connections: $active_connections"
        
        # Get max connections
        local max_connections
        max_connections=$(psql "$DATABASE_URL" -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
        
        if [ -n "$max_connections" ]; then
            local connection_percentage
            connection_percentage=$(echo "scale=2; $active_connections * 100 / $max_connections" | bc)
            
            if (( $(echo "$connection_percentage > 80" | bc -l) )); then
                send_alert "HIGH_DB_CONNECTIONS" "Database connections at ${connection_percentage}%" "WARNING"
            fi
        fi
    fi
    
    # Check for long-running queries
    local long_queries
    long_queries=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE state != 'idle' 
          AND query_start < NOW() - INTERVAL '5 minutes'
          AND query NOT LIKE '%pg_stat_activity%';
    " 2>/dev/null)
    
    if [ -n "$long_queries" ] && [ "$long_queries" -gt 0 ]; then
        send_alert "LONG_RUNNING_QUERIES" "$long_queries queries running > 5 minutes" "WARNING"
        
        # Log the long-running queries
        log_message "Long-running queries:"
        psql "$DATABASE_URL" -c "
            SELECT 
                pid,
                state,
                query_start,
                EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
                LEFT(query, 100) as query_preview
            FROM pg_stat_activity 
            WHERE state != 'idle' 
              AND query_start < NOW() - INTERVAL '5 minutes'
              AND query NOT LIKE '%pg_stat_activity%'
            ORDER BY query_start;
        " 2>/dev/null | tee -a "$HEALTH_LOG"
    fi
    
    return 0
}

check_web_server_health() {
    log_message "Checking web server health..."
    
    # Check if nginx is running
    if ! systemctl is-active nginx >/dev/null 2>&1; then
        send_alert "NGINX_DOWN" "Nginx service is not running" "CRITICAL"
        return 1
    fi
    
    # Check nginx configuration
    if ! nginx -t >/dev/null 2>&1; then
        send_alert "NGINX_CONFIG_ERROR" "Nginx configuration test failed" "CRITICAL"
    fi
    
    # Check if we can connect to the web server
    if ! curl -f --max-time 10 "http://localhost/" >/dev/null 2>&1; then
        send_alert "WEB_SERVER_UNREACHABLE" "Cannot reach web server on port 80" "CRITICAL"
        return 1
    fi
    
    return 0
}

check_ssl_certificates() {
    log_message "Checking SSL certificates..."
    
    # Check main domain certificate
    local cert_expiry
    cert_expiry=$(echo | openssl s_client -servername scenescout.app -connect scenescout.app:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -n "$cert_expiry" ]; then
        local expiry_epoch
        local current_epoch
        local days_until_expiry
        
        expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null)
        current_epoch=$(date +%s)
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        log_message "SSL certificate expires in $days_until_expiry days"
        
        if [ "$days_until_expiry" -lt 30 ]; then
            send_alert "SSL_EXPIRING" "SSL certificate expires in $days_until_expiry days" "WARNING"
        elif [ "$days_until_expiry" -lt 7 ]; then
            send_alert "SSL_CRITICAL" "SSL certificate expires in $days_until_expiry days" "CRITICAL"
        fi
    else
        send_alert "SSL_CHECK_FAILED" "Cannot check SSL certificate" "WARNING"
    fi
}

check_event_ingestion() {
    log_message "Checking event ingestion..."
    
    # Check if ingestion scripts are running
    local ingestion_processes
    ingestion_processes=$(ps aux | grep -c '[i]ngestion')
    log_message "Ingestion processes running: $ingestion_processes"
    
    # Check recent event ingestion
    local recent_events
    recent_events=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM events 
        WHERE created_at > NOW() - INTERVAL '1 hour';
    " 2>/dev/null)
    
    if [ -n "$recent_events" ]; then
        log_message "Events ingested in last hour: $recent_events"
        
        if [ "$recent_events" -lt 10 ]; then
            send_alert "LOW_INGESTION_RATE" "Only $recent_events events ingested in last hour" "WARNING"
        fi
    else
        send_alert "INGESTION_CHECK_FAILED" "Cannot check event ingestion" "WARNING"
    fi
    
    # Check for ingestion errors
    local ingestion_errors
    ingestion_errors=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM ingestion_logs 
        WHERE created_at > NOW() - INTERVAL '1 hour' 
          AND status = 'error';
    " 2>/dev/null)
    
    if [ -n "$ingestion_errors" ] && [ "$ingestion_errors" -gt 5 ]; then
        send_alert "HIGH_INGESTION_ERRORS" "$ingestion_errors ingestion errors in last hour" "WARNING"
    fi
}

check_log_files() {
    log_message "Checking log files..."
    
    # Check for recent errors in application log
    if [ -f "$LOG_DIR/application.log" ]; then
        local error_count
        error_count=$(grep -c "ERROR" "$LOG_DIR/application.log" 2>/dev/null || echo "0")
        log_message "Errors in application log: $error_count"
        
        if [ "$error_count" -gt 50 ]; then
            send_alert "HIGH_ERROR_COUNT" "$error_count errors in application log" "WARNING"
        fi
    fi
    
    # Check log file sizes
    for logfile in application.log error.log ingestion.log; do
        if [ -f "$LOG_DIR/$logfile" ]; then
            local size
            size=$(du -h "$LOG_DIR/$logfile" | cut -f1)
            log_message "Log file $logfile size: $size"
            
            # Check if log file is too large (>100MB)
            local size_bytes
            size_bytes=$(stat -c%s "$LOG_DIR/$logfile" 2>/dev/null || echo "0")
            if [ "$size_bytes" -gt 104857600 ]; then  # 100MB
                send_alert "LARGE_LOG_FILE" "Log file $logfile is ${size}" "WARNING"
            fi
        fi
    done
}

check_external_dependencies() {
    log_message "Checking external dependencies..."
    
    # Check external APIs
    local apis=("https://api.ticketmaster.com" "https://www.eventbriteapi.com")
    
    for api in "${apis[@]}"; do
        if curl -f --max-time 10 "$api" >/dev/null 2>&1; then
            log_message "External API $api: OK"
        else
            send_alert "EXTERNAL_API_DOWN" "External API $api is unreachable" "WARNING"
        fi
    done
    
    # Check DNS resolution
    if nslookup scenescout.app >/dev/null 2>&1; then
        log_message "DNS resolution: OK"
    else
        send_alert "DNS_RESOLUTION_FAILED" "Cannot resolve scenescout.app" "CRITICAL"
    fi
}

generate_health_summary() {
    log_message "=== Health Check Summary ==="
    
    local cpu_usage
    local memory_usage
    local disk_usage
    
    cpu_usage=$(check_cpu_usage)
    memory_usage=$(check_memory_usage)
    disk_usage=$(check_disk_usage)
    
    # Generate JSON summary for monitoring systems
    cat > "/tmp/health-summary.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "healthy",
    "metrics": {
        "cpu_usage": $cpu_usage,
        "memory_usage": $memory_usage,
        "disk_usage": $disk_usage
    },
    "services": {
        "application": "$(check_application_health && echo "healthy" || echo "unhealthy")",
        "database": "$(check_database_health && echo "healthy" || echo "unhealthy")",
        "web_server": "$(check_web_server_health && echo "healthy" || echo "unhealthy")"
    }
}
EOF
    
    log_message "Health summary generated at /tmp/health-summary.json"
}

# Main execution
main() {
    log_message "=== Starting System Health Check ==="
    
    # System resources
    check_cpu_usage >/dev/null
    check_memory_usage >/dev/null
    check_disk_usage >/dev/null
    
    # Application components
    check_application_health
    check_database_health
    check_web_server_health
    
    # Security and certificates
    check_ssl_certificates
    
    # Application-specific checks
    check_event_ingestion
    check_log_files
    check_external_dependencies
    
    # Generate summary
    generate_health_summary
    
    log_message "=== Health Check Completed ==="
    
    # Check if any critical alerts were generated
    local critical_alerts
    critical_alerts=$(grep -c "\\[CRITICAL\\]" "$LOG_DIR/alerts.log" 2>/dev/null || echo "0")
    
    if [ "$critical_alerts" -gt 0 ]; then
        log_message "❌ CRITICAL ISSUES DETECTED: $critical_alerts"
        exit 1
    else
        log_message "✅ All systems healthy"
        exit 0
    fi
}

# Help function
show_help() {
    cat << EOF
System Health Monitor for SceneScout

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -q, --quiet         Quiet mode (less verbose output)
    -v, --verbose       Verbose mode (more detailed output)
    --cpu-threshold     CPU usage alert threshold (default: $ALERT_THRESHOLD_CPU%)
    --memory-threshold  Memory usage alert threshold (default: $ALERT_THRESHOLD_MEMORY%)
    --disk-threshold    Disk usage alert threshold (default: $ALERT_THRESHOLD_DISK%)

Examples:
    $0                          # Run standard health check
    $0 --cpu-threshold 90       # Use custom CPU threshold
    $0 --quiet                  # Run in quiet mode

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quiet)
            exec >/dev/null 2>&1
            shift
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --cpu-threshold)
            ALERT_THRESHOLD_CPU="$2"
            shift 2
            ;;
        --memory-threshold)
            ALERT_THRESHOLD_MEMORY="$2"
            shift 2
            ;;
        --disk-threshold)
            ALERT_THRESHOLD_DISK="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main