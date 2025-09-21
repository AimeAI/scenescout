-- SceneScout Ingestion Function Schema Alignment
-- Migration: 20250916_ingest_alignment.sql
-- Purpose: Align schema with ingestion function expectations

-- Add columns expected by ingestion functions to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE events ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_restriction INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotness_score DECIMAL(5,2) DEFAULT 0;

-- Add missing columns that might exist in old schema but with different names
DO $$
BEGIN
    -- If the table already has 'name', rename it to 'title' for consistency
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'name') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN
            ALTER TABLE events RENAME COLUMN name TO title;
        END IF;
    END IF;
    
    -- Add title if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN
        ALTER TABLE events ADD COLUMN title VARCHAR(255);
    END IF;
END $$;

-- Create unique constraint for external events
ALTER TABLE events ADD CONSTRAINT events_external_unique 
    UNIQUE (external_id, source);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_external ON events(external_id, source);

-- Create venues table if it doesn't exist (expected by functions)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state_code VARCHAR(2),
    country_code VARCHAR(2) DEFAULT 'US',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    external_id VARCHAR(255),
    source VARCHAR(50),
    timezone VARCHAR(50),
    capacity INTEGER,
    venue_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create organizers table if it doesn't exist (expected by functions)
CREATE TABLE IF NOT EXISTS organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    external_id VARCHAR(255),
    source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraints for venues and organizers
ALTER TABLE venues ADD CONSTRAINT venues_external_unique 
    UNIQUE (external_id, source);
    
ALTER TABLE organizers ADD CONSTRAINT organizers_external_unique 
    UNIQUE (external_id, source);

-- Add foreign key constraints
ALTER TABLE events 
    ADD CONSTRAINT fk_events_venue 
    FOREIGN KEY (venue_id) REFERENCES venues(id);

ALTER TABLE events 
    ADD CONSTRAINT fk_events_organizer 
    FOREIGN KEY (organizer_id) REFERENCES organizers(id);