-- Migration: Create tables for push notification reminders
-- Created: 2025-10-05

-- 1. Push Notification Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Optional: can be anonymous
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL, -- {p256dh, auth}
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Saved Events Table (for cross-device sync)
CREATE TABLE IF NOT EXISTS saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Can be device_id or user_id
  event_id TEXT NOT NULL,
  event_data JSONB NOT NULL, -- Full event object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one save per event per user
  UNIQUE(user_id, event_id)
);

-- 3. Event Reminders Table
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_data JSONB NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for cron job to find pending reminders
  INDEX idx_reminders_pending (remind_at, sent) WHERE sent = FALSE
);

-- 4. Indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX idx_event_reminders_user_id ON event_reminders(user_id);

-- 5. RLS Policies (Public Access for MVP - Secure Later)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/read their own data
CREATE POLICY "Anyone can manage their push subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage their saved events" ON saved_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage their reminders" ON event_reminders
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_events_updated_at
    BEFORE UPDATE ON saved_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
