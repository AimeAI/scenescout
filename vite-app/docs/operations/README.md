# SceneScout Operations Documentation

This directory contains comprehensive operational runbooks for maintaining and monitoring the SceneScout event discovery platform.

## 📋 Runbook Directory

### Daily Operations
- [Daily Operations Checklist](daily-operations.md) - Daily health checks and monitoring procedures
- [System Health Monitoring](system-health.md) - Real-time monitoring and alerting procedures

### Incident Response
- [Incident Response Playbook](incident-response.md) - Step-by-step incident handling procedures
- [Troubleshooting Guide](troubleshooting.md) - Common issues and resolution steps
- [Error Investigation](error-investigation.md) - Log analysis and debugging procedures

### Maintenance & Recovery
- [Weekly Maintenance](weekly-maintenance.md) - Regular maintenance tasks and optimization
- [Backup & Recovery](backup-recovery.md) - Data protection and disaster recovery procedures
- [Database Maintenance](database-maintenance.md) - Database optimization and cleanup

### Performance & Monitoring
- [Performance Monitoring](performance-monitoring.md) - Performance metrics and optimization
- [Capacity Planning](capacity-planning.md) - Resource planning and scaling procedures
- [Event Ingestion Monitoring](event-ingestion-monitoring.md) - API monitoring and data quality

### Security Operations
- [Security Operations](security-operations.md) - Security monitoring and incident response
- [Access Management](access-management.md) - User access and permission management
- [Compliance Checklist](compliance-checklist.md) - Security and compliance validation

### Emergency Procedures
- [Emergency Response](emergency-response.md) - Critical system failure procedures
- [Escalation Procedures](escalation-procedures.md) - When and how to escalate issues
- [Recovery Procedures](recovery-procedures.md) - System recovery and rollback procedures

## 🚨 Quick Reference

### Emergency Contacts
- **Development Team Lead**: [Contact Info]
- **Database Administrator**: [Contact Info]
- **DevOps/Infrastructure**: [Contact Info]
- **Security Team**: [Contact Info]

### Critical System URLs
- **Production App**: https://scenescout.app
- **Supabase Dashboard**: [Production Supabase URL]
- **Monitoring Dashboard**: [Monitoring URL]
- **Error Tracking**: [Sentry/Error Tracking URL]

### Key Performance Indicators (KPIs)
- **Uptime Target**: 99.9%
- **Response Time**: < 2 seconds (95th percentile)
- **Event Ingestion Rate**: > 1000 events/hour
- **Database Performance**: < 100ms query response time
- **Error Rate**: < 0.1%

## 🔧 Common Operations

### Quick Health Check
```bash
# Run health check script
npm run smoke

# Check system status
./scripts/app-health-check.mjs

# Monitor event ingestion
node scripts/monitoring/check-ingestion-health.js
```

### Database Quick Status
```bash
# Check database connection
npm run db:ping

# View recent migrations
supabase migration list

# Check table sizes
psql -c "SELECT schemaname,tablename,pg_size_pretty(size) as size FROM (SELECT schemaname,tablename,pg_total_relation_size(schemaname||'.'||tablename) AS size FROM pg_tables WHERE schemaname='public') ORDER BY size DESC;"
```

### Log Monitoring
```bash
# View application logs
tail -f logs/application.log

# Monitor error logs
tail -f logs/error.log

# Check ingestion logs
tail -f logs/ingestion.log
```

## 📊 Monitoring Stack

- **Application Monitoring**: Sentry
- **Database Monitoring**: Supabase built-in metrics
- **Uptime Monitoring**: [Uptime service]
- **Performance Monitoring**: Custom health checks
- **Log Aggregation**: [Log service]

## 🔄 Automation

Many operational tasks are automated through scripts in the `/scripts` directory:
- Database backups (daily)
- Health checks (every 5 minutes)
- Event ingestion monitoring (continuous)
- Performance metrics collection (hourly)
- Security scans (daily)

## 📖 Documentation Standards

All runbooks follow a standard format:
1. **Purpose** - What the procedure accomplishes
2. **Prerequisites** - Required access, tools, or conditions
3. **Steps** - Detailed step-by-step instructions
4. **Verification** - How to confirm success
5. **Rollback** - How to undo changes if needed
6. **Escalation** - When and how to escalate

## 🆘 Getting Help

1. Check the specific runbook for your issue
2. Review the troubleshooting guide
3. Check recent incidents for similar issues
4. Follow escalation procedures if needed
5. Document any new solutions found

Remember: When in doubt, escalate early rather than risk system stability.