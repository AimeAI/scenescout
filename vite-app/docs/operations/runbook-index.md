# SceneScout Operations Runbook Index

## Quick Reference Guide

This comprehensive operations documentation provides systematic procedures for maintaining, monitoring, and operating the SceneScout event discovery platform.

## 📚 Complete Runbook Collection

### Core Operations
1. **[README](README.md)** - Overview and quick reference guide
2. **[Daily Operations](daily-operations.md)** - Daily health checks and monitoring procedures
3. **[System Health Monitoring](system-health.md)** - Real-time monitoring and alerting procedures

### Incident Management
4. **[Incident Response](incident-response.md)** - Step-by-step incident handling procedures
5. **[Emergency Response](emergency-response.md)** - Critical system failure and emergency procedures
6. **[Troubleshooting Guide](troubleshooting.md)** - Common issues and resolution steps *(To be created)*

### Maintenance & Recovery
7. **[Weekly Maintenance](weekly-maintenance.md)** - Regular maintenance tasks and optimization
8. **[Backup & Recovery](backup-recovery.md)** - Data protection and disaster recovery procedures
9. **[Database Maintenance](database-maintenance.md)** - Database optimization and cleanup *(To be created)*

### Performance & Monitoring
10. **[Performance Monitoring](performance-monitoring.md)** - Performance metrics and optimization
11. **[Capacity Planning](capacity-planning.md)** - Resource planning and scaling procedures *(To be created)*
12. **[Event Ingestion Monitoring](event-ingestion-monitoring.md)** - API monitoring and data quality *(To be created)*

### Security Operations
13. **[Security Operations](security-operations.md)** - Security monitoring and incident response
14. **[Access Management](access-management.md)** - User access and permission management *(To be created)*
15. **[Compliance Checklist](compliance-checklist.md)** - Security and compliance validation *(To be created)*

## 🚀 Getting Started

### For New Team Members
1. Start with the [README](README.md) for system overview
2. Review [Daily Operations](daily-operations.md) for routine procedures
3. Familiarize yourself with [Incident Response](incident-response.md)
4. Study [System Health Monitoring](system-health.md) for monitoring basics

### For Incident Response
1. **Immediate**: [Emergency Response](emergency-response.md)
2. **Investigation**: [Incident Response](incident-response.md)
3. **Recovery**: [Backup & Recovery](backup-recovery.md)
4. **Analysis**: [Performance Monitoring](performance-monitoring.md)

### For Maintenance
1. **Weekly**: [Weekly Maintenance](weekly-maintenance.md)
2. **Database**: [Backup & Recovery](backup-recovery.md)
3. **Security**: [Security Operations](security-operations.md)
4. **Performance**: [Performance Monitoring](performance-monitoring.md)

## 🛠 Operational Tools & Scripts

### Monitoring Scripts
- `scripts/monitoring/check-ingestion-health.js` - Event ingestion health checker
- `scripts/monitoring/system-health-monitor.sh` - Comprehensive system health monitor
- `scripts/app-health-check.mjs` - Application health verification
- `scripts/browser-smoke-test.mjs` - End-to-end functionality testing

### Maintenance Scripts
- `scripts/backup-database.sh` - Database backup automation
- `scripts/apply-db-migrations.sh` - Database migration management
- `scripts/production-setup.sh` - Production environment setup
- `scripts/master-automation.sh` - Automated maintenance workflows

### Emergency Scripts
- `scripts/emergency/level1-response.sh` - Critical emergency response
- `scripts/emergency/security-emergency.sh` - Security incident response
- `scripts/emergency/complete-recovery.sh` - System recovery procedures

## 📊 Key Performance Indicators (KPIs)

### System Health
- **Uptime Target**: 99.9%
- **Response Time**: < 2 seconds (95th percentile)
- **Error Rate**: < 0.1%
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80%
- **Disk Usage**: < 85%

### Event Ingestion
- **Ingestion Rate**: > 1000 events/hour
- **API Success Rate**: > 95% per source
- **Data Freshness**: < 1 hour lag
- **Duplicate Rate**: < 1%

### Database Performance
- **Query Response**: < 100ms average
- **Connection Pool**: < 80% usage
- **Transaction Rate**: Monitor for spikes
- **Lock Wait Time**: < 1 second

## 🚨 Emergency Contacts

### Primary Response Team
- **Incident Commander**: [Primary on-call] / [Backup]
- **Technical Lead**: [Senior engineer] / [Database admin]
- **Security Lead**: [Security officer] / [External consultant]
- **Communications**: [Engineering manager] / [Product manager]

### Escalation Chain
1. **0-30 min**: Primary on-call team
2. **30-60 min**: Engineering management
3. **1-2 hours**: Executive team (CTO/CEO)
4. **2+ hours**: Board notification

### Critical System URLs
- **Production**: https://scenescout.app
- **Health Check**: https://scenescout.app/health
- **Status Page**: [Status page URL]
- **Monitoring**: [Monitoring dashboard URL]

## 📋 Quick Action Checklists

### Daily Health Check
- [ ] System availability check
- [ ] Database health verification
- [ ] Event ingestion status
- [ ] Performance metrics review
- [ ] Security alerts review
- [ ] Backup status confirmation

### Incident Response
- [ ] Acknowledge and assess severity
- [ ] Notify appropriate team members
- [ ] Preserve evidence and logs
- [ ] Implement immediate mitigation
- [ ] Communicate status updates
- [ ] Document timeline and actions

### Weekly Maintenance
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Log rotation and cleanup
- [ ] Security updates application
- [ ] Performance trend analysis
- [ ] Backup verification
- [ ] Monitoring system health

## 🔧 Configuration Files

### Key Configuration Locations
- **Application Config**: `vite.config.ts`, `package.json`
- **Database Config**: `supabase/config.toml`
- **Environment**: `.env` files
- **Monitoring**: `scripts/monitoring/dashboard.json`
- **Deployment**: `vercel.json`, Docker configurations

### Environment Variables
```bash
# Core application
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# API Keys
TICKETMASTER_API_KEY=
EVENTBRITE_TOKEN=
GOOGLE_MAPS_API_KEY=

# Monitoring
SENTRY_DSN=
SLACK_WEBHOOK_URL=
```

## 📈 Monitoring & Alerting

### Alert Categories
- **🔴 Critical**: Immediate response required
- **🟡 Warning**: Response within 4 hours
- **🔵 Info**: Review next business day

### Monitoring Tools
- **Application**: Sentry error tracking
- **Database**: Supabase metrics
- **Infrastructure**: Custom health checks
- **Uptime**: External monitoring service
- **Performance**: Custom dashboards

## 📚 Additional Resources

### Documentation
- **API Documentation**: [API docs location]
- **Database Schema**: `supabase/migrations/`
- **Architecture Docs**: `docs/architecture/`
- **Deployment Guide**: `DEPLOYMENT_CHECKLIST.md`

### Training Materials
- **Onboarding**: New team member guide
- **Incident Response Training**: Annual drill procedures
- **Tool Training**: Monitoring and alerting system usage
- **Security Training**: Security best practices

### External Resources
- **Supabase Documentation**: https://supabase.com/docs
- **Node.js Best Practices**: Performance and security guides
- **PostgreSQL Documentation**: Database optimization guides
- **Incident Response Best Practices**: Industry standards

## 🔄 Continuous Improvement

### Monthly Reviews
- **Performance Trends**: Analyze system performance over time
- **Incident Patterns**: Review incidents for systemic issues
- **Alert Effectiveness**: Tune alerting thresholds
- **Documentation Updates**: Keep runbooks current

### Quarterly Assessments
- **Capacity Planning**: Review resource usage and growth
- **Security Audits**: Comprehensive security review
- **Disaster Recovery Testing**: Full recovery procedure testing
- **Tool Evaluation**: Assess monitoring and operational tools

### Annual Activities
- **Full System Audit**: Comprehensive operational review
- **Documentation Refresh**: Complete runbook updates
- **Team Training**: Operational skills development
- **Vendor Reviews**: Third-party service assessments

## 📞 Support Channels

### Internal Communication
- **Slack Channels**: #ops, #alerts, #incidents
- **Email Lists**: ops-team@scenescout.com
- **Escalation**: emergency-response@scenescout.com

### External Support
- **Supabase Support**: [Support channel]
- **Cloud Provider**: [Support contact]
- **DNS Provider**: [Emergency contact]
- **CDN Provider**: [Support channel]

---

**Remember**: Operations is a team responsibility. These runbooks are living documents that should be updated as systems evolve and new lessons are learned. When in doubt, escalate early and document everything.

**Last Updated**: 2024-09-17
**Next Review Date**: 2024-12-17
**Maintained By**: Operations Team