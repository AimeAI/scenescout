# Backup & Recovery Procedures

## Purpose
Comprehensive data protection, backup verification, and disaster recovery procedures for SceneScout.

## Backup Strategy Overview

### Backup Types
1. **Database Backups**: Daily full backups, hourly transaction logs
2. **File System Backups**: Application code, configurations, logs
3. **Configuration Backups**: Environment variables, secrets, API keys
4. **Code Repository**: Git-based version control with multiple remotes

### Retention Policy
- **Daily Backups**: 30 days
- **Weekly Backups**: 12 weeks
- **Monthly Backups**: 12 months
- **Yearly Backups**: 7 years
- **Critical Snapshots**: Indefinite (before major deployments)

## Database Backup Procedures

### Automated Daily Backup
```bash
#!/bin/bash
# This script runs automatically via cron at 2:00 AM daily

# Set variables
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="scenescout_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump $DATABASE_URL \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --format=custom \
  --file="$BACKUP_DIR/$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo "$(date): Backup created successfully: $BACKUP_FILE" >> $BACKUP_DIR/backup.log
  
  # Compress backup
  gzip "$BACKUP_DIR/$BACKUP_FILE"
  
  # Upload to cloud storage
  # aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" s3://scenescout-backups/database/
  
  # Remove old backups
  find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  echo "$(date): Backup completed and uploaded" >> $BACKUP_DIR/backup.log
else
  echo "$(date): ERROR - Backup failed" >> $BACKUP_DIR/backup.log
  # Send alert
  # slack-notify "#alerts" "🚨 Database backup failed for $(date)"
fi
```

### Manual Backup Procedure
```bash
# Create immediate backup
./scripts/backup-database.sh

# Create backup with custom name
./scripts/backup-database.sh --name "pre-migration-$(date +%Y%m%d)"

# Create backup and verify integrity
./scripts/backup-database.sh --verify

# Backup specific tables only
pg_dump $DATABASE_URL \
  --table=events \
  --table=users \
  --table=venues \
  --format=custom \
  --file="partial_backup_$(date +%Y%m%d).sql"
```

### Backup Verification
```bash
# Daily backup verification script
#!/bin/bash

BACKUP_DIR="/backups/database"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup files found"
  exit 1
fi

# Extract backup for testing
TEMP_DIR="/tmp/backup_verify_$$"
mkdir -p $TEMP_DIR
gunzip -c "$LATEST_BACKUP" > "$TEMP_DIR/backup.sql"

# Verify backup can be read
pg_restore --list "$TEMP_DIR/backup.sql" > /dev/null

if [ $? -eq 0 ]; then
  echo "$(date): Backup verification successful: $(basename $LATEST_BACKUP)" >> $BACKUP_DIR/verify.log
else
  echo "$(date): ERROR - Backup verification failed: $(basename $LATEST_BACKUP)" >> $BACKUP_DIR/verify.log
  # Send alert
fi

# Clean up
rm -rf $TEMP_DIR
```

## File System Backup Procedures

### Application Code Backup
```bash
# Backup application files (excluding node_modules and logs)
tar -czf "app_backup_$(date +%Y%m%d).tar.gz" \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  --exclude=backups \
  /path/to/scenescout

# Backup configuration files
tar -czf "config_backup_$(date +%Y%m%d).tar.gz" \
  .env \
  supabase/config.toml \
  package.json \
  package-lock.json \
  tsconfig.json \
  vite.config.ts \
  tailwind.config.js
```

### Log Backup and Rotation
```bash
# Rotate and backup logs
#!/bin/bash

LOG_DIR="/var/log/scenescout"
BACKUP_DIR="/backups/logs"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Compress and move old logs
for logfile in application.log ingestion.log error.log; do
  if [ -f "$LOG_DIR/$logfile" ]; then
    cp "$LOG_DIR/$logfile" "$BACKUP_DIR/${logfile}_$DATE"
    gzip "$BACKUP_DIR/${logfile}_$DATE"
    
    # Truncate current log
    > "$LOG_DIR/$logfile"
  fi
done

# Remove logs older than 90 days
find $BACKUP_DIR -name "*.gz" -mtime +90 -delete
```

## Disaster Recovery Procedures

### Complete System Recovery

#### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/scenescout.git
cd scenescout

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with production values

# Set up Supabase
supabase link --project-ref [project-ref]
supabase db reset
```

#### 2. Database Recovery
```bash
# Download latest backup from cloud storage
# aws s3 cp s3://scenescout-backups/database/latest.sql.gz ./

# Extract backup
gunzip latest.sql.gz

# Restore database
pg_restore \
  --clean \
  --no-acl \
  --no-owner \
  --verbose \
  --dbname=$DATABASE_URL \
  latest.sql

# Verify restore
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
"
```

#### 3. Application Recovery
```bash
# Build application
npm run build

# Start application
npm run dev  # For development
# or
pm2 start ecosystem.config.js  # For production

# Verify application health
./scripts/app-health-check.mjs
```

#### 4. Data Integrity Verification
```bash
# Run data integrity checks
node scripts/verify-data-integrity.js

# Check critical metrics
psql $DATABASE_URL -c "
SELECT 
  'Total Events' as metric,
  COUNT(*) as value
FROM events
UNION ALL
SELECT 
  'Total Users',
  COUNT(*)
FROM auth.users
UNION ALL
SELECT 
  'Total Venues',
  COUNT(*)
FROM venues;
"

# Verify recent data
psql $DATABASE_URL -c "
SELECT 
  source,
  COUNT(*) as count,
  MAX(created_at) as latest_event
FROM events
GROUP BY source;
"
```

### Partial Recovery Scenarios

#### Database Table Recovery
```bash
# Restore specific table from backup
pg_restore \
  --table=events \
  --clean \
  --verbose \
  --dbname=$DATABASE_URL \
  backup_file.sql

# Verify table restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM events;"
```

#### Point-in-Time Recovery
```bash
# For PostgreSQL with WAL archiving
# Restore to specific timestamp
pg_restore \
  --clean \
  --no-acl \
  --no-owner \
  --verbose \
  --dbname=$DATABASE_URL \
  backup_file.sql

# Apply WAL files up to specific time
# This requires WAL archiving to be set up
```

#### Configuration Recovery
```bash
# Restore configuration files
tar -xzf config_backup_20241201.tar.gz

# Verify configuration
npm run typecheck
supabase db lint

# Test configuration
npm run smoke
```

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

### Service Tiers

#### Tier 1 - Critical Services (Database, Core API)
- **RTO**: 1 hour
- **RPO**: 1 hour
- **Backup Frequency**: Hourly transaction logs, daily full backup

#### Tier 2 - Important Services (Event Ingestion, User Features)
- **RTO**: 4 hours
- **RPO**: 4 hours
- **Backup Frequency**: Daily backups

#### Tier 3 - Supporting Services (Analytics, Reporting)
- **RTO**: 24 hours
- **RPO**: 24 hours
- **Backup Frequency**: Weekly backups

## Backup Monitoring and Alerting

### Automated Monitoring
```bash
# Backup monitoring script (run every hour)
#!/bin/bash

BACKUP_DIR="/backups/database"
HOURS_THRESHOLD=26  # Alert if no backup in 26 hours

# Check latest backup time
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "CRITICAL: No database backups found"
  # Send critical alert
  exit 1
fi

# Check backup age
BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))

if [ $AGE_HOURS -gt $HOURS_THRESHOLD ]; then
  echo "WARNING: Latest backup is $AGE_HOURS hours old"
  # Send warning alert
fi

# Check backup size (should be reasonable)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")
MIN_SIZE=1048576  # 1MB minimum

if [ $BACKUP_SIZE -lt $MIN_SIZE ]; then
  echo "WARNING: Backup size seems too small: $BACKUP_SIZE bytes"
  # Send warning alert
fi
```

### Backup Health Dashboard
```bash
# Generate backup status report
#!/bin/bash

echo "=== SceneScout Backup Status Report ==="
echo "Generated: $(date)"
echo ""

# Database backups
echo "Database Backups:"
ls -lh /backups/database/*.gz | tail -7 | while read line; do
  echo "  $line"
done

echo ""

# Application backups
echo "Application Backups:"
ls -lh /backups/app/*.tar.gz | tail -3 | while read line; do
  echo "  $line"
done

echo ""

# Backup sizes by day
echo "Backup Size Trends (Last 7 days):"
for i in {0..6}; do
  DATE=$(date -d "$i days ago" +%Y%m%d)
  SIZE=$(ls -l /backups/database/*${DATE}*.gz 2>/dev/null | awk '{sum+=$5} END {print sum/1024/1024}')
  if [ ! -z "$SIZE" ]; then
    echo "  $DATE: ${SIZE}MB"
  fi
done
```

## Testing Recovery Procedures

### Monthly Recovery Test
```bash
# Test database restore to staging environment
STAGING_DB="scenescout_staging"

# 1. Create test database
createdb $STAGING_DB

# 2. Restore latest backup
LATEST_BACKUP=$(ls -t /backups/database/*.sql.gz | head -1)
gunzip -c "$LATEST_BACKUP" | pg_restore --dbname=$STAGING_DB

# 3. Verify data integrity
psql $STAGING_DB -c "
SELECT 
  tablename,
  n_live_tup
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
"

# 4. Run application tests
DATABASE_URL="postgresql://localhost/$STAGING_DB" npm test

# 5. Clean up
dropdb $STAGING_DB
```

### Annual Disaster Recovery Drill
1. **Simulate complete system failure**
2. **Follow full recovery procedures**
3. **Time all recovery steps**
4. **Document any issues or improvements**
5. **Update procedures based on findings**

## Emergency Contact Information

### Backup/Recovery Team
- **Primary**: [Backup Administrator]
- **Secondary**: [Database Administrator]
- **Escalation**: [Engineering Manager]

### Cloud Storage Access
- **AWS Account**: [Account details]
- **Backup Bucket**: s3://scenescout-backups
- **Access Keys**: [Secure location]

### Critical Vendor Contacts
- **Database Hosting**: [Contact info]
- **Cloud Storage**: [Contact info]
- **DNS Provider**: [Contact info]

## Documentation and Compliance

### Backup Documentation
- Maintain backup logs for audit purposes
- Document all recovery procedures
- Track RTO/RPO compliance
- Regular backup strategy reviews

### Compliance Requirements
- Data retention policies
- Geographic backup requirements
- Encryption requirements
- Access control documentation

Remember: Test your backups regularly - an untested backup is not a backup!