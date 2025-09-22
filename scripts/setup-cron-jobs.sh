#!/bin/bash

# Setup automated scraping cron jobs for SceneScout

echo "Setting up SceneScout automated scraping..."

# Create cron job for event orchestrator (runs every 30 minutes)
CRON_JOB_SCRAPER="*/30 * * * * curl -X POST ${SUPABASE_URL}/functions/v1/event-orchestrator -H 'Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}'"

# Create cron job for trending score updates (runs every hour)
CRON_JOB_TRENDING="0 * * * * curl -X POST ${SUPABASE_URL}/functions/v1/update-trending-scores -H 'Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}'"

# Create cron job for cleanup (runs daily at 2 AM)
CRON_JOB_CLEANUP="0 2 * * * curl -X POST ${SUPABASE_URL}/functions/v1/cleanup-old-events -H 'Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}'"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB_SCRAPER") | crontab -
(crontab -l 2>/dev/null; echo "$CRON_JOB_TRENDING") | crontab -
(crontab -l 2>/dev/null; echo "$CRON_JOB_CLEANUP") | crontab -

echo "Cron jobs setup complete!"
echo "- Event scraping: Every 30 minutes"
echo "- Trending updates: Every hour"
echo "- Cleanup: Daily at 2 AM"

# Create Supabase cron jobs (alternative to system cron)
cat > supabase_cron_setup.sql << EOF
-- Setup Supabase cron jobs using pg_cron extension

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule event scraping every 30 minutes
SELECT cron.schedule(
    'event-scraping',
    '*/30 * * * *',
    \$\$
    SELECT net.http_post(
        url := '${SUPABASE_URL}/functions/v1/event-orchestrator',
        headers := '{"Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    \$\$
);

-- Schedule trending score updates every hour
SELECT cron.schedule(
    'trending-updates',
    '0 * * * *',
    \$\$
    UPDATE events 
    SET trending_score = calculate_trending_score(id)
    WHERE event_date >= CURRENT_DATE;
    \$\$
);

-- Schedule cleanup daily at 2 AM
SELECT cron.schedule(
    'daily-cleanup',
    '0 2 * * *',
    \$\$
    DELETE FROM events 
    WHERE event_date < CURRENT_DATE - INTERVAL '30 days'
    AND deleted_at IS NULL;
    
    DELETE FROM scraping_jobs 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
    \$\$
);

EOF

echo "Supabase cron setup SQL created: supabase_cron_setup.sql"
echo "Run this in your Supabase SQL editor to enable database-level cron jobs"
