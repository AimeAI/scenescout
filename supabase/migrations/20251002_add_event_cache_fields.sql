-- Add fields for event caching system
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS city_name TEXT,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS official BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add index for cache freshness queries
CREATE INDEX IF NOT EXISTS idx_events_cached_at ON events(cached_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city_name);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- Add cache status tracking table
CREATE TABLE IF NOT EXISTS cache_status (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'refreshing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for cache status queries
CREATE INDEX IF NOT EXISTS idx_cache_status_key ON cache_status(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_status_refreshed ON cache_status(last_refreshed_at DESC);

-- Trigger to update cache_status updated_at
CREATE TRIGGER update_cache_status_updated_at
    BEFORE UPDATE ON cache_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old cached events (older than 24 hours)
CREATE OR REPLACE FUNCTION clean_old_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE cached_at < NOW() - INTERVAL '24 hours'
  AND source IN ('ticketmaster', 'eventbrite');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
