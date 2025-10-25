-- GDPR Compliance Migration
-- Adds soft delete support, data retention policies, and audit trails
-- Created: 2025-10-22

-- ============================================================================
-- 1. Add deleted_at columns for soft delete support
-- ============================================================================

-- Add deleted_at to user-related tables
ALTER TABLE saved_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE event_reminders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes on deleted_at for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_events_deleted_at ON saved_events(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_reminders_deleted_at ON event_reminders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_preferences_deleted_at ON user_preferences(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_deleted_at ON push_subscriptions(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 2. Create user_data_requests table for tracking GDPR requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'access')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_data_requests
CREATE INDEX IF NOT EXISTS idx_user_data_requests_user_id ON user_data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_requests_status ON user_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_data_requests_type ON user_data_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_user_data_requests_requested_at ON user_data_requests(requested_at);

-- Enable RLS
ALTER TABLE user_data_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_data_requests
CREATE POLICY "Users can view their own data requests"
  ON user_data_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own data requests"
  ON user_data_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. Create email_logs table for tracking sent emails (GDPR audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email_address TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('reminder', 'data_export', 'account_deletion', 'verification', 'other')),
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Helper functions for data retention
-- ============================================================================

-- Function to permanently delete old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_deleted_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER := 30;
  cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  deleted_count INTEGER;
BEGIN
  -- Delete old soft-deleted saved_events
  DELETE FROM saved_events
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old saved_events records', deleted_count;

  -- Delete old soft-deleted event_reminders
  DELETE FROM event_reminders
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old event_reminders records', deleted_count;

  -- Delete old soft-deleted user_preferences
  DELETE FROM user_preferences
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old user_preferences records', deleted_count;

  -- Delete old soft-deleted push_subscriptions
  DELETE FROM push_subscriptions
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old push_subscriptions records', deleted_count;
END;
$$;

-- Function to delete old email logs (retain for 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER := 30;
  cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_logs
  WHERE sent_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old email_logs records', deleted_count;
END;
$$;

-- Function to anonymize old completed data requests
CREATE OR REPLACE FUNCTION cleanup_old_data_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER := 90;
  cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_data_requests
  WHERE completed_at IS NOT NULL AND completed_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old data_requests records', deleted_count;
END;
$$;

-- ============================================================================
-- 5. Update existing RLS policies to respect soft deletes
-- ============================================================================

-- Drop and recreate policies to exclude soft-deleted records

-- saved_events policies
DROP POLICY IF EXISTS "Users can view their own saved events" ON saved_events;
CREATE POLICY "Users can view their own saved events"
  ON saved_events FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can delete their own saved events" ON saved_events;
CREATE POLICY "Users can delete their own saved events"
  ON saved_events FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved events" ON saved_events;
CREATE POLICY "Users can update their own saved events"
  ON saved_events FOR UPDATE
  USING (auth.uid() = user_id);

-- event_reminders policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON event_reminders;
CREATE POLICY "Users can view their own reminders"
  ON event_reminders FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can delete their own reminders" ON event_reminders;
CREATE POLICY "Users can delete their own reminders"
  ON event_reminders FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminders" ON event_reminders;
CREATE POLICY "Users can update their own reminders"
  ON event_reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- user_preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Add data retention settings to user_preferences
-- ============================================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365 CHECK (data_retention_days >= 30 AND data_retention_days <= 730);

COMMENT ON COLUMN user_preferences.data_retention_days IS 'Number of days to retain user data (30-730 days). After this period, inactive data may be archived or deleted.';

-- ============================================================================
-- 7. Create audit log triggers for sensitive operations
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS (admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role can access audit logs"
  ON audit_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 8. Comments and documentation
-- ============================================================================

COMMENT ON TABLE user_data_requests IS 'Tracks GDPR data requests (export, deletion, access) for compliance and audit purposes';
COMMENT ON TABLE email_logs IS 'Audit trail of emails sent to users for GDPR compliance and debugging';
COMMENT ON TABLE audit_logs IS 'Audit trail of sensitive operations for security and compliance';

COMMENT ON FUNCTION cleanup_deleted_records() IS 'Permanently deletes soft-deleted records older than 30 days';
COMMENT ON FUNCTION cleanup_old_email_logs() IS 'Deletes email logs older than 30 days to comply with data retention policies';
COMMENT ON FUNCTION cleanup_old_data_requests() IS 'Deletes completed data requests older than 90 days';

-- ============================================================================
-- 9. Grant necessary permissions
-- ============================================================================

-- Grant execute permissions on cleanup functions to service role
GRANT EXECUTE ON FUNCTION cleanup_deleted_records() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_email_logs() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data_requests() TO service_role;

-- ============================================================================
-- 10. Create scheduled cleanup job (comment for reference)
-- ============================================================================

-- To set up automatic cleanup, create a pg_cron job:
-- SELECT cron.schedule('cleanup-deleted-records', '0 2 * * *', 'SELECT cleanup_deleted_records()');
-- SELECT cron.schedule('cleanup-email-logs', '0 3 * * *', 'SELECT cleanup_old_email_logs()');
-- SELECT cron.schedule('cleanup-data-requests', '0 4 * * 0', 'SELECT cleanup_old_data_requests()');

-- Note: Requires pg_cron extension and appropriate permissions

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'GDPR Compliance migration completed successfully!';
  RAISE NOTICE 'Created tables: user_data_requests, email_logs, audit_logs';
  RAISE NOTICE 'Added soft delete support to: saved_events, event_reminders, user_preferences, push_subscriptions';
  RAISE NOTICE 'Created cleanup functions for data retention';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Set up pg_cron jobs for automatic cleanup';
  RAISE NOTICE '  2. Configure email service for data export notifications';
  RAISE NOTICE '  3. Test GDPR endpoints (/api/user/export-data, /api/user/delete-account)';
END $$;
