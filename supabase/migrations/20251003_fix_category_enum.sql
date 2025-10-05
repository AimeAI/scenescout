-- Fix category column to accept custom category values
-- This changes the enum constraint to TEXT type

-- First, alter the column type from enum to TEXT
ALTER TABLE events
ALTER COLUMN category TYPE TEXT;

-- Now category can store any text value like:
-- 'music-concerts', 'nightlife-dj', 'comedy-improv', etc.

-- Optional: Add index for faster category queries
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
