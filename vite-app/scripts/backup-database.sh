#!/bin/bash

# SceneScout Database Backup Script
# Runs daily via GitHub Actions or cron

set -e

BACKUP_DIR="/tmp/supabase-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="scenescout_backup_${DATE}.sql"

echo "🗄️  Starting database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
supabase db dump --linked > "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Database backup completed: $BACKUP_FILE"

# Upload to cloud storage (implement based on your preference)
if [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://scenescout-backups/"
    echo "☁️  Backup uploaded to S3"
fi

# Cleanup old local backups (keep last 3)
ls -t $BACKUP_DIR/*.sql | tail -n +4 | xargs -r rm

echo "🧹 Cleanup completed"
