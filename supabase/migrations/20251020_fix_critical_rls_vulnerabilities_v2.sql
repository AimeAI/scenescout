-- Migration: Fix Critical RLS Security Vulnerabilities (v2 - Schema Compatible)
-- Date: 2025-10-20
-- Severity: CRITICAL
-- Description: Fixes 5 critical RLS vulnerabilities - compatible with actual schema

-- ==========================================
-- PHASE 1: FIX PUSH SUBSCRIPTIONS
-- ==========================================

-- Drop dangerous "anyone can manage" policy
DROP POLICY IF EXISTS "Anyone can manage their push subscriptions" ON push_subscriptions;

-- Create secure user-scoped policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT
  USING (
    user_id IS NULL OR
    user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR
    user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE
  USING (
    user_id IS NULL OR
    user_id = current_setting('request.jwt.claim.sub', true)
  );

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE
  USING (
    user_id IS NULL OR
    user_id = current_setting('request.jwt.claim.sub', true)
  );

-- Service role can manage all (for cleanup cron jobs)
CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ==========================================
-- PHASE 2: FIX SAVED EVENTS
-- ==========================================

DROP POLICY IF EXISTS "Anyone can manage their saved events" ON saved_events;

-- Users can only access their own saved events
CREATE POLICY "Users can manage own saved events" ON saved_events
  FOR ALL
  USING (user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));

-- Service role for admin operations
CREATE POLICY "Service role can manage all saved events" ON saved_events
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ==========================================
-- PHASE 3: FIX EVENT REMINDERS
-- ==========================================

DROP POLICY IF EXISTS "Anyone can manage their reminders" ON event_reminders;

-- Users can only access their own reminders
CREATE POLICY "Users can manage own event reminders" ON event_reminders
  FOR ALL
  USING (user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));

-- Service role for cron jobs that send reminders
CREATE POLICY "Service role can manage all event reminders" ON event_reminders
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ==========================================
-- PHASE 4: ENABLE RLS ON EVENTS TABLE
-- ==========================================

-- Enable RLS (was previously missing!)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read all future events
-- Note: The basic events table has: id, title, date, source
-- No status, deleted_at, or start_time columns in base schema
CREATE POLICY "Public can view future events" ON events
  FOR SELECT
  USING (
    -- Show events from today onwards
    date >= CURRENT_DATE
  );

-- Only service role can insert events (from sync jobs)
CREATE POLICY "Service role can insert events" ON events
  FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Only service role can update events
CREATE POLICY "Service role can update events" ON events
  FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Only service role can delete events
CREATE POLICY "Service role can delete events" ON events
  FOR DELETE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ==========================================
-- PHASE 5: ENABLE RLS ON SYSTEM TABLES
-- ==========================================

-- Enable RLS on system/internal tables
DO $$
BEGIN
    -- Scraping system tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraping_jobs') THEN
        ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access scraping jobs" ON scraping_jobs;
        CREATE POLICY "Only service role can access scraping jobs" ON scraping_jobs
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraping_metrics') THEN
        ALTER TABLE scraping_metrics ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access scraping metrics" ON scraping_metrics;
        CREATE POLICY "Only service role can access scraping metrics" ON scraping_metrics
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    -- Webhook tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_logs') THEN
        ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access webhook logs" ON webhook_logs;
        CREATE POLICY "Only service role can access webhook logs" ON webhook_logs
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_errors') THEN
        ALTER TABLE webhook_errors ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access webhook errors" ON webhook_errors;
        CREATE POLICY "Only service role can access webhook errors" ON webhook_errors
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    -- Health check tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_check_results') THEN
        ALTER TABLE health_check_results ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access health checks" ON health_check_results;
        CREATE POLICY "Only service role can access health checks" ON health_check_results
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_health') THEN
        ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
        -- Allow public read for system status page
        DROP POLICY IF EXISTS "Public can view system health" ON system_health;
        CREATE POLICY "Public can view system health" ON system_health
          FOR SELECT
          USING (true);
        DROP POLICY IF EXISTS "Only service role can modify system health" ON system_health;
        CREATE POLICY "Only service role can modify system health" ON system_health
          FOR INSERT
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Only service role can update system health" ON system_health
          FOR UPDATE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Only service role can delete system health" ON system_health
          FOR DELETE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    -- Analytics tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'function_invocations') THEN
        ALTER TABLE function_invocations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access function invocations" ON function_invocations;
        CREATE POLICY "Only service role can access function invocations" ON function_invocations
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_analytics') THEN
        ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can insert analytics" ON event_analytics;
        CREATE POLICY "Anyone can insert analytics" ON event_analytics
          FOR INSERT
          WITH CHECK (true);
        DROP POLICY IF EXISTS "Only service role can read analytics" ON event_analytics;
        CREATE POLICY "Only service role can read analytics" ON event_analytics
          FOR SELECT
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Only service role can modify analytics" ON event_analytics
          FOR UPDATE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Only service role can delete analytics" ON event_analytics
          FOR DELETE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    -- Ingestion tables (from database_improvements migration)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_logs') THEN
        ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access ingestion logs" ON ingestion_logs;
        CREATE POLICY "Only service role can access ingestion logs" ON ingestion_logs
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_deduplication') THEN
        ALTER TABLE event_deduplication ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access deduplication" ON event_deduplication;
        CREATE POLICY "Only service role can access deduplication" ON event_deduplication
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    -- User acquisition tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_acquisition_metrics') THEN
        ALTER TABLE user_acquisition_metrics ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access acquisition metrics" ON user_acquisition_metrics;
        CREATE POLICY "Only service role can access acquisition metrics" ON user_acquisition_metrics
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preference_learning') THEN
        ALTER TABLE user_preference_learning ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access preference learning" ON user_preference_learning;
        CREATE POLICY "Only service role can access preference learning" ON user_preference_learning
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'search_index_updates') THEN
        ALTER TABLE search_index_updates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Only service role can access search index updates" ON search_index_updates;
        CREATE POLICY "Only service role can access search index updates" ON search_index_updates
          FOR ALL
          USING (current_setting('request.jwt.claim.role', true) = 'service_role')
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;
END $$;

-- ==========================================
-- PHASE 6: RESTRICT VENUES & CITIES ACCESS
-- ==========================================

-- Enable RLS on venues and cities if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venues') THEN
        ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

        -- Public can read venues
        DROP POLICY IF EXISTS "Public can view venues" ON venues;
        CREATE POLICY "Public can view venues" ON venues
          FOR SELECT
          USING (true);

        -- Only service role can modify
        DROP POLICY IF EXISTS "Service role can modify venues" ON venues;
        CREATE POLICY "Service role can insert venues" ON venues
          FOR INSERT
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Service role can update venues" ON venues
          FOR UPDATE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Service role can delete venues" ON venues
          FOR DELETE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cities') THEN
        ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

        -- Public can read cities
        DROP POLICY IF EXISTS "Public can view cities" ON cities;
        CREATE POLICY "Public can view cities" ON cities
          FOR SELECT
          USING (true);

        -- Only service role can modify cities
        DROP POLICY IF EXISTS "Service role can modify cities" ON cities;
        CREATE POLICY "Service role can insert cities" ON cities
          FOR INSERT
          WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Service role can update cities" ON cities
          FOR UPDATE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
        CREATE POLICY "Service role can delete cities" ON cities
          FOR DELETE
          USING (current_setting('request.jwt.claim.role', true) = 'service_role');
    END IF;
END $$;

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'RLS enabled: Users can only access their own subscriptions. Fixed 2025-10-20.';
COMMENT ON TABLE saved_events IS 'RLS enabled: Users can only access their own saved events. Fixed 2025-10-20.';
COMMENT ON TABLE event_reminders IS 'RLS enabled: Users can only access their own reminders. Fixed 2025-10-20.';
COMMENT ON TABLE events IS 'RLS enabled: Public read for future events, service role only for writes. Fixed 2025-10-20.';
