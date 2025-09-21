# Security Operations Runbook

## Purpose
Comprehensive security monitoring, incident response, and compliance procedures for SceneScout platform.

## Security Framework Overview

### Security Domains
1. **Authentication & Authorization** - User access and permissions
2. **Data Protection** - Encryption, privacy, and data handling
3. **API Security** - Rate limiting, authentication, input validation
4. **Infrastructure Security** - Server hardening, network security
5. **Third-party Security** - Vendor risk management, API security
6. **Compliance** - GDPR, CCPA, and other regulatory requirements

### Security Monitoring Levels
- **Continuous**: Automated monitoring and alerting
- **Daily**: Security health checks and log reviews
- **Weekly**: Vulnerability scans and access reviews
- **Monthly**: Comprehensive security audits
- **Quarterly**: Penetration testing and risk assessments

## Daily Security Operations

### Morning Security Check (9:00 AM)

#### 1. Authentication & Access Monitoring
```bash
# Check for unusual login patterns
psql $DATABASE_URL -c "
SELECT 
  DATE(created_at) as date,
  COUNT(*) as login_attempts,
  COUNT(CASE WHEN confirmed_at IS NOT NULL THEN 1 END) as successful_logins,
  COUNT(CASE WHEN confirmed_at IS NULL THEN 1 END) as failed_attempts
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND action = 'login'
GROUP BY DATE(created_at);
"

# Check for suspicious IP addresses
psql $DATABASE_URL -c "
SELECT 
  ip_address,
  COUNT(*) as attempts,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND action = 'login'
GROUP BY ip_address
HAVING COUNT(*) > 20
ORDER BY attempts DESC;
"

# Check for admin access
psql $DATABASE_URL -c "
SELECT 
  user_id,
  action,
  ip_address,
  created_at
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (action LIKE '%admin%' OR user_id IN (
    SELECT id FROM auth.users WHERE role = 'admin'
  ))
ORDER BY created_at DESC;
"
```

#### 2. API Security Monitoring
```bash
# Check for API abuse patterns
psql $DATABASE_URL -c "
SELECT 
  ip_address,
  endpoint,
  COUNT(*) as requests,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
  AVG(response_time_ms) as avg_response_time
FROM api_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, endpoint
HAVING COUNT(*) > 1000
ORDER BY requests DESC;
"

# Check for unusual API key usage
psql $DATABASE_URL -c "
SELECT 
  api_key_id,
  COUNT(*) as requests,
  COUNT(DISTINCT ip_address) as unique_ips,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM api_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND api_key_id IS NOT NULL
GROUP BY api_key_id
HAVING COUNT(DISTINCT ip_address) > 10
ORDER BY requests DESC;
"

# Monitor rate limiting effectiveness
grep -c "Rate limit exceeded" logs/application.log.$(date +%Y-%m-%d)
```

#### 3. Data Access Monitoring
```bash
# Check for bulk data access
psql $DATABASE_URL -c "
SELECT 
  user_id,
  COUNT(*) as data_requests,
  COUNT(DISTINCT table_name) as tables_accessed,
  SUM(rows_returned) as total_rows
FROM data_access_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING SUM(rows_returned) > 10000
ORDER BY total_rows DESC;
"

# Monitor sensitive data access
psql $DATABASE_URL -c "
SELECT 
  user_id,
  table_name,
  operation,
  COUNT(*) as operations,
  MAX(created_at) as last_access
FROM data_access_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND table_name IN ('users', 'payments', 'personal_data')
GROUP BY user_id, table_name, operation
ORDER BY operations DESC;
"
```

### Evening Security Review (6:00 PM)

#### 1. Security Incident Review
```bash
# Check security logs for incidents
grep -i "security\|breach\|attack\|malicious" logs/security.log.$(date +%Y-%m-%d)

# Review WAF logs (if applicable)
# aws waf get-sampled-requests --web-acl-id [ACL_ID] --rule-id [RULE_ID] --time-window StartTime=$(date -d '1 day ago' +%s),EndTime=$(date +%s) --max-items 100

# Check for failed authentication attempts
psql $DATABASE_URL -c "
SELECT 
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND action = 'login'
  AND confirmed_at IS NULL
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
"
```

#### 2. Certificate and SSL Monitoring
```bash
# Check SSL certificate expiration
echo | openssl s_client -servername scenescout.app -connect scenescout.app:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate validity
ssl_expiry=$(echo | openssl s_client -servername scenescout.app -connect scenescout.app:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$ssl_expiry" +%s)
current_epoch=$(date +%s)
days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

if [ $days_until_expiry -lt 30 ]; then
  echo "WARNING: SSL certificate expires in $days_until_expiry days"
fi

# Check for mixed content issues
curl -s https://scenescout.app/ | grep -i "http://" | grep -v "localhost"
```

## Weekly Security Procedures

### Vulnerability Scanning
```bash
# Weekly vulnerability scan script
#!/bin/bash
# File: scripts/security/weekly-vulnerability-scan.sh

echo "=== Weekly Vulnerability Scan - $(date) ==="

# 1. Dependency vulnerability scan
npm audit --audit-level high

# 2. Docker image scanning (if applicable)
# docker scan scenescout:latest

# 3. Network port scan
nmap -sV localhost

# 4. Web application security scan
# Use tools like OWASP ZAP, Nikto, or commercial solutions
# nikto -h https://scenescout.app

# 5. Database security check
psql $DATABASE_URL -c "
SELECT 
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin,
  rolreplication
FROM pg_roles 
WHERE rolcanlogin = true;
"

# 6. Check for default passwords
echo "Checking for default passwords..."
# Add specific checks for your environment

# 7. File permission check
find /path/to/app -type f -perm /o+w | head -20

echo "Vulnerability scan completed. Review results above."
```

### Access Review
```bash
# Weekly access review
#!/bin/bash
# File: scripts/security/weekly-access-review.sh

echo "=== Weekly Access Review - $(date) ==="

# 1. Review user permissions
psql $DATABASE_URL -c "
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at,
  u.last_sign_in_at,
  CASE 
    WHEN u.last_sign_in_at < NOW() - INTERVAL '90 days' THEN 'INACTIVE'
    WHEN u.created_at < NOW() - INTERVAL '30 days' AND u.last_sign_in_at IS NULL THEN 'NEVER_USED'
    ELSE 'ACTIVE'
  END as status
FROM auth.users u
WHERE u.role IN ('admin', 'moderator')
ORDER BY u.last_sign_in_at DESC NULLS LAST;
"

# 2. Review API key usage
psql $DATABASE_URL -c "
SELECT 
  ak.id,
  ak.name,
  ak.created_at,
  ak.last_used_at,
  COUNT(al.id) as usage_count
FROM api_keys ak
LEFT JOIN api_logs al ON ak.id = al.api_key_id 
  AND al.created_at > NOW() - INTERVAL '7 days'
GROUP BY ak.id, ak.name, ak.created_at, ak.last_used_at
ORDER BY ak.last_used_at DESC NULLS LAST;
"

# 3. Review database connections
psql $DATABASE_URL -c "
SELECT 
  usename,
  datname,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity 
WHERE usename NOT IN ('postgres', 'rdsadmin')
ORDER BY query_start DESC;
"

echo "Access review completed."
```

## Security Incident Response

### Incident Classification

#### Severity 1 - Critical Security Incident
- Data breach or unauthorized data access
- System compromise or malware detection
- Payment system security breach
- Admin account compromise
- Large-scale DDoS attack

#### Severity 2 - High Security Incident
- Failed authentication anomalies
- Suspicious API usage patterns
- Minor data exposure
- Privilege escalation attempts
- Successful but limited intrusion

#### Severity 3 - Medium Security Incident
- Rate limiting violations
- Suspicious user behavior
- Failed penetration attempts
- Security policy violations

### Incident Response Procedure

#### 1. Immediate Response (First 15 minutes)
```bash
# Security incident response checklist

# 1. Identify the incident type
echo "$(date): SECURITY INCIDENT DETECTED" >> security-incidents/incident-$(date +%Y%m%d-%H%M).log

# 2. Assess immediate impact
# Check if systems are compromised
ps aux | grep -E "(malware|suspicious|unknown)"

# Check for unauthorized processes
netstat -tulpn | grep -E "(LISTEN|ESTABLISHED)"

# 3. Preserve evidence
# Snapshot current system state
df -h > security-incidents/disk-usage-$(date +%Y%m%d-%H%M).log
ps aux > security-incidents/processes-$(date +%Y%m%d-%H%M).log
netstat -tulpn > security-incidents/network-$(date +%Y%m%d-%H%M).log

# 4. Initial containment (if needed)
# Block suspicious IPs
# iptables -A INPUT -s [SUSPICIOUS_IP] -j DROP

# Disable compromised accounts
# psql $DATABASE_URL -c "UPDATE auth.users SET banned_until = NOW() + INTERVAL '24 hours' WHERE id = '[USER_ID]';"
```

#### 2. Investigation Phase (15-60 minutes)
```bash
# Detailed investigation procedures

# 1. Analyze authentication logs
psql $DATABASE_URL -c "
SELECT 
  user_id,
  action,
  ip_address,
  user_agent,
  created_at,
  traits
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (
    action = 'login' 
    OR action LIKE '%admin%'
    OR ip_address = '[SUSPICIOUS_IP]'
  )
ORDER BY created_at DESC;
"

# 2. Check for data exfiltration
psql $DATABASE_URL -c "
SELECT 
  user_id,
  endpoint,
  ip_address,
  response_size_bytes,
  created_at
FROM api_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND response_size_bytes > 1000000  -- Large responses
ORDER BY response_size_bytes DESC;
"

# 3. Analyze file system changes
find /path/to/app -type f -mtime -1 -ls

# 4. Check for privilege escalation
grep -i "sudo\|su\|root" logs/application.log.$(date +%Y-%m-%d)

# 5. Review network connections
ss -tulpn | grep -E "(LISTEN|ESTABLISHED)"
```

#### 3. Containment and Eradication
```bash
# Containment procedures

# 1. Block malicious IPs
while read ip; do
  iptables -A INPUT -s $ip -j DROP
  echo "Blocked IP: $ip"
done < suspicious-ips.txt

# 2. Disable compromised accounts
psql $DATABASE_URL -c "
UPDATE auth.users 
SET 
  banned_until = NOW() + INTERVAL '24 hours',
  ban_reason = 'Security incident - suspected compromise'
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM suspicious_activity_log 
  WHERE incident_id = '[INCIDENT_ID]'
);
"

# 3. Revoke API keys
psql $DATABASE_URL -c "
UPDATE api_keys 
SET 
  revoked_at = NOW(),
  revoked_reason = 'Security incident'
WHERE id IN (
  SELECT DISTINCT api_key_id
  FROM suspicious_api_usage
  WHERE incident_id = '[INCIDENT_ID]'
);
"

# 4. Force password resets (if needed)
psql $DATABASE_URL -c "
UPDATE auth.users 
SET password_reset_required = true
WHERE last_sign_in_at > NOW() - INTERVAL '24 hours';
"
```

#### 4. Recovery and Monitoring
```bash
# Recovery procedures

# 1. Remove malicious content (if any)
# rm -f /path/to/malicious/files

# 2. Update security patches
npm audit fix
# Apply system security updates

# 3. Regenerate API keys
node scripts/security/regenerate-api-keys.js

# 4. Enhanced monitoring
# Enable additional logging
# Increase monitoring frequency

# 5. Notify affected users (if required)
# Send security notification emails
```

## Security Monitoring Tools

### Log Analysis Script
```bash
#!/bin/bash
# File: scripts/security/security-log-analyzer.sh

echo "=== Security Log Analysis - $(date) ==="

# 1. Failed login attempts
echo "Failed Login Attempts (Last 24h):"
grep "failed login" logs/auth.log | grep "$(date +%Y-%m-%d)" | wc -l

# 2. Suspicious API requests
echo "Suspicious API Requests:"
grep -E "(SQL|script|exec|eval)" logs/api.log | tail -10

# 3. Large response sizes
echo "Large API Responses (>1MB):"
awk '$7 > 1000000 {print $1, $2, $7, $9}' logs/api-access.log | tail -10

# 4. Unusual user agents
echo "Unusual User Agents:"
grep -i "bot\|crawl\|scan\|hack" logs/access.log | cut -d'"' -f6 | sort | uniq -c | sort -nr | head -10

# 5. Geographic anomalies (if GeoIP is available)
echo "Geographic Login Analysis:"
# This would require GeoIP integration
```

### Real-time Security Monitoring
```javascript
// Real-time security monitor
// File: scripts/security/realtime-monitor.js

const fs = require('fs');
const { Tail } = require('tail');

class SecurityMonitor {
  constructor() {
    this.alerts = [];
    this.patterns = {
      sqlInjection: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b)/i,
      xssAttempt: /<script|javascript:|onload=|onerror=/i,
      bruteForce: /failed login/i,
      suspiciousUserAgent: /(nmap|nikto|sqlmap|dirb|gobuster)/i
    };
  }

  startMonitoring() {
    const logFiles = [
      'logs/application.log',
      'logs/auth.log',
      'logs/api.log'
    ];

    logFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const tail = new Tail(file);
        tail.on('line', (data) => this.analyzeLine(data, file));
      }
    });
  }

  analyzeLine(line, source) {
    const timestamp = new Date().toISOString();
    
    // Check for security patterns
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(line)) {
        const alert = {
          type,
          source,
          timestamp,
          line: line.substring(0, 200) // Truncate for storage
        };
        
        this.handleAlert(alert);
      }
    }

    // Check for rate limiting
    if (line.includes('rate limit exceeded')) {
      const ip = this.extractIP(line);
      this.trackRateLimit(ip);
    }
  }

  handleAlert(alert) {
    console.log(`SECURITY ALERT: ${alert.type} detected in ${alert.source}`);
    
    // Store alert
    this.alerts.push(alert);
    
    // Send immediate notification for critical alerts
    if (['sqlInjection', 'xssAttempt'].includes(alert.type)) {
      this.sendCriticalAlert(alert);
    }
    
    // Persist to file
    fs.appendFileSync('logs/security-alerts.log', JSON.stringify(alert) + '\n');
  }

  sendCriticalAlert(alert) {
    // Implement notification logic (Slack, email, etc.)
    console.log(`CRITICAL ALERT: ${JSON.stringify(alert)}`);
  }

  extractIP(line) {
    const ipMatch = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return ipMatch ? ipMatch[0] : null;
  }

  trackRateLimit(ip) {
    // Track rate limit violations by IP
    // Implement auto-blocking logic if needed
  }
}

// Start monitoring
const monitor = new SecurityMonitor();
monitor.startMonitoring();
console.log('Security monitoring started...');
```

## Compliance Procedures

### GDPR Compliance Monitoring
```bash
# GDPR compliance check
#!/bin/bash
# File: scripts/security/gdpr-compliance-check.sh

echo "=== GDPR Compliance Check - $(date) ==="

# 1. Check data retention policies
psql $DATABASE_URL -c "
SELECT 
  'Personal Data Retention' as check_type,
  COUNT(*) as records,
  MIN(created_at) as oldest_record,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '7 years' THEN 1 END) as old_records
FROM users;
"

# 2. Review data processing logs
psql $DATABASE_URL -c "
SELECT 
  operation_type,
  COUNT(*) as operations,
  COUNT(DISTINCT user_id) as affected_users
FROM data_processing_log 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY operation_type;
"

# 3. Check consent records
psql $DATABASE_URL -c "
SELECT 
  consent_type,
  COUNT(*) as total_consents,
  COUNT(CASE WHEN withdrawn_at IS NOT NULL THEN 1 END) as withdrawn,
  COUNT(CASE WHEN withdrawn_at IS NULL THEN 1 END) as active
FROM user_consents 
GROUP BY consent_type;
"

# 4. Data export requests
psql $DATABASE_URL -c "
SELECT 
  status,
  COUNT(*) as requests,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours_to_complete
FROM data_export_requests 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
"
```

### Security Compliance Audit
```bash
# Security compliance audit
#!/bin/bash
# File: scripts/security/compliance-audit.sh

echo "=== Security Compliance Audit - $(date) ==="

# 1. Password policy compliance
psql $DATABASE_URL -c "
SELECT 
  'Password Policy' as audit_item,
  COUNT(*) as total_users,
  COUNT(CASE 
    WHEN length(encrypted_password) < 60 THEN 1 
  END) as weak_passwords,
  COUNT(CASE 
    WHEN password_updated_at < NOW() - INTERVAL '90 days' THEN 1 
  END) as old_passwords
FROM auth.users;
"

# 2. Session management
psql $DATABASE_URL -c "
SELECT 
  'Session Management' as audit_item,
  COUNT(*) as active_sessions,
  COUNT(CASE 
    WHEN created_at < NOW() - INTERVAL '24 hours' THEN 1 
  END) as old_sessions,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_session_age_hours
FROM auth.sessions 
WHERE expires_at > NOW();
"

# 3. API key security
psql $DATABASE_URL -c "
SELECT 
  'API Key Security' as audit_item,
  COUNT(*) as total_keys,
  COUNT(CASE WHEN last_used_at IS NULL THEN 1 END) as unused_keys,
  COUNT(CASE 
    WHEN created_at < NOW() - INTERVAL '365 days' THEN 1 
  END) as old_keys
FROM api_keys 
WHERE revoked_at IS NULL;
"

# 4. Access control
psql $DATABASE_URL -c "
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(CASE 
    WHEN last_sign_in_at < NOW() - INTERVAL '90 days' THEN 1 
  END) as inactive_users
FROM auth.users 
GROUP BY role;
"
```

## Security Contact Information

### Security Team
- **Security Officer**: [Name, Contact]
- **Incident Response Lead**: [Name, Contact]
- **Compliance Officer**: [Name, Contact]
- **External Security Consultant**: [Name, Contact]

### Emergency Contacts
- **Law Enforcement**: [Local contact for cyber crimes]
- **Legal Counsel**: [Legal team contact]
- **Public Relations**: [PR team for breach communications]
- **Insurance**: [Cyber insurance provider]

### Vendor Security Contacts
- **Supabase Security**: [Security contact]
- **Cloud Provider**: [Security team contact]
- **Third-party APIs**: [Security contacts for each API]

## Security Documentation

### Incident Documentation Template
```
Incident ID: SEC-[YYYYMMDD]-[Number]
Date/Time: [Timestamp]
Reported By: [Name]
Severity: [1-4]
Status: [Open/Investigating/Contained/Resolved]

Description:
[Detailed description of the incident]

Timeline:
[Chronological sequence of events]

Impact Assessment:
- Users Affected: [Number/None]
- Data Compromised: [Yes/No/Unknown]
- Systems Affected: [List]
- Business Impact: [Description]

Response Actions:
[List of actions taken]

Root Cause:
[Analysis of what caused the incident]

Preventive Measures:
[Actions to prevent recurrence]

Lessons Learned:
[Key takeaways and improvements]
```

Remember: Security is everyone's responsibility. Report suspicious activities immediately and follow the principle of least privilege for all access controls.