-- Change category from ENUM to TEXT
ALTER TABLE events ALTER COLUMN category TYPE TEXT;

-- Add subcategory column
ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);
