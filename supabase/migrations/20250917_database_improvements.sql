-- SceneScout Database Improvements Migration
-- Migration: 20250917_database_improvements.sql
-- Purpose: Comprehensive schema improvements, deduplication, and performance optimization

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Drop existing foreign key constraints to modify tables
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS fk_events_venue;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS fk_events_organizer;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_external_unique;

-- Improve events table structure
DO $$
BEGIN
    -- Ensure all essential columns exist with proper types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'id') THEN
        ALTER TABLE events ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
    END IF;
    
    -- Ensure title exists (primary field)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN
        ALTER TABLE events ADD COLUMN title VARCHAR(500) NOT NULL;
    ELSE
        -- Ensure title is not null and has adequate length
        ALTER TABLE events ALTER COLUMN title TYPE VARCHAR(500);
        ALTER TABLE events ALTER COLUMN title SET NOT NULL;
    END IF;
    
    -- Core event metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'description') THEN
        ALTER TABLE events ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
        ALTER TABLE events ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'other';
    ELSE
        ALTER TABLE events ALTER COLUMN category SET NOT NULL;
        ALTER TABLE events ALTER COLUMN category SET DEFAULT 'other';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'subcategory') THEN
        ALTER TABLE events ADD COLUMN subcategory VARCHAR(100);
    END IF;
    
    -- Timing fields with better handling
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_time') THEN
        ALTER TABLE events ADD COLUMN start_time TIMESTAMPTZ;
    ELSE
        ALTER TABLE events ALTER COLUMN start_time TYPE TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_time') THEN
        ALTER TABLE events ADD COLUMN end_time TIMESTAMPTZ;
    ELSE
        ALTER TABLE events ALTER COLUMN end_time TYPE TIMESTAMPTZ;
    END IF;
    
    -- Legacy date field for compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'date') THEN
        ALTER TABLE events ADD COLUMN date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_date') THEN
        ALTER TABLE events ADD COLUMN event_date VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'timezone') THEN
        ALTER TABLE events ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;
    
    -- Pricing with proper decimal handling
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price') THEN
        ALTER TABLE events ADD COLUMN price DECIMAL(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_min') THEN
        ALTER TABLE events ADD COLUMN price_min DECIMAL(12,2);
    ELSE
        ALTER TABLE events ALTER COLUMN price_min TYPE DECIMAL(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_max') THEN
        ALTER TABLE events ADD COLUMN price_max DECIMAL(12,2);
    ELSE
        ALTER TABLE events ALTER COLUMN price_max TYPE DECIMAL(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_currency') THEN
        ALTER TABLE events ADD COLUMN price_currency VARCHAR(3) DEFAULT 'USD';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_free') THEN
        ALTER TABLE events ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
    ELSE
        ALTER TABLE events ALTER COLUMN is_free SET DEFAULT FALSE;
    END IF;
    
    -- Location and venue fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_id') THEN
        ALTER TABLE events ADD COLUMN venue_id UUID;
    ELSE
        ALTER TABLE events ALTER COLUMN venue_id TYPE UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_name') THEN
        ALTER TABLE events ADD COLUMN venue_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'city_id') THEN
        ALTER TABLE events ADD COLUMN city_id UUID;
    ELSE
        ALTER TABLE events ALTER COLUMN city_id TYPE UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'city_name') THEN
        ALTER TABLE events ADD COLUMN city_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'latitude') THEN
        ALTER TABLE events ADD COLUMN latitude DECIMAL(10,8);
    ELSE
        ALTER TABLE events ALTER COLUMN latitude TYPE DECIMAL(10,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'longitude') THEN
        ALTER TABLE events ADD COLUMN longitude DECIMAL(11,8);
    ELSE
        ALTER TABLE events ALTER COLUMN longitude TYPE DECIMAL(11,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'address') THEN
        ALTER TABLE events ADD COLUMN address TEXT;
    END IF;
    
    -- External source tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'source') THEN
        ALTER TABLE events ADD COLUMN source VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'provider') THEN
        ALTER TABLE events ADD COLUMN provider VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'external_id') THEN
        ALTER TABLE events ADD COLUMN external_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'external_url') THEN
        ALTER TABLE events ADD COLUMN external_url TEXT;
    END IF;
    
    -- URLs and media
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'website_url') THEN
        ALTER TABLE events ADD COLUMN website_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_url') THEN
        ALTER TABLE events ADD COLUMN ticket_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image_url') THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'video_url') THEN
        ALTER TABLE events ADD COLUMN video_url TEXT;
    END IF;
    
    -- Status and metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    ELSE
        ALTER TABLE events ALTER COLUMN status SET DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_featured') THEN
        ALTER TABLE events ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    ELSE
        ALTER TABLE events ALTER COLUMN is_featured SET DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'view_count') THEN
        ALTER TABLE events ADD COLUMN view_count INTEGER DEFAULT 0;
    ELSE
        ALTER TABLE events ALTER COLUMN view_count SET DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'hotness_score') THEN
        ALTER TABLE events ADD COLUMN hotness_score DECIMAL(5,2) DEFAULT 0;
    ELSE
        ALTER TABLE events ALTER COLUMN hotness_score TYPE DECIMAL(5,2);
        ALTER TABLE events ALTER COLUMN hotness_score SET DEFAULT 0;
    END IF;
    
    -- JSONB fields for flexible data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE events ADD COLUMN tags JSONB DEFAULT '[]';
    ELSE
        ALTER TABLE events ALTER COLUMN tags SET DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'metadata') THEN
        ALTER TABLE events ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Deduplication fingerprint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'content_hash') THEN
        ALTER TABLE events ADD COLUMN content_hash VARCHAR(64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'dedup_key') THEN
        ALTER TABLE events ADD COLUMN dedup_key VARCHAR(255);
    END IF;
    
    -- Audit fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_at') THEN
        ALTER TABLE events ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        ALTER TABLE events ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'updated_at') THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        ALTER TABLE events ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'last_updated') THEN
        ALTER TABLE events ADD COLUMN last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'submitted_by') THEN
        ALTER TABLE events ADD COLUMN submitted_by UUID;
    ELSE
        ALTER TABLE events ALTER COLUMN submitted_by TYPE UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        ALTER TABLE events ADD COLUMN organizer_id UUID;
    ELSE
        ALTER TABLE events ALTER COLUMN organizer_id TYPE UUID;
    END IF;
END $$;

-- Improve venues table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        CREATE TABLE venues (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(100) DEFAULT 'venue',
            address TEXT,
            city_id UUID,
            city_name VARCHAR(100),
            neighborhood VARCHAR(100),
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            phone VARCHAR(20),
            email VARCHAR(255),
            website_url TEXT,
            capacity INTEGER,
            amenities JSONB DEFAULT '[]',
            operating_hours JSONB DEFAULT '{}',
            social_links JSONB DEFAULT '{}',
            images JSONB DEFAULT '[]',
            is_verified BOOLEAN DEFAULT FALSE,
            rating DECIMAL(3,2),
            external_id VARCHAR(255),
            source VARCHAR(50),
            timezone VARCHAR(50) DEFAULT 'UTC',
            venue_type VARCHAR(50),
            content_hash VARCHAR(64),
            dedup_key VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            submitted_by UUID
        );
    END IF;
END $$;

-- Improve cities table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
        CREATE TABLE cities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            country VARCHAR(100) DEFAULT 'United States',
            country_code VARCHAR(2) DEFAULT 'US',
            state_code VARCHAR(2),
            description TEXT,
            image_url TEXT,
            timezone VARCHAR(50) DEFAULT 'UTC',
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            is_active BOOLEAN DEFAULT TRUE,
            population INTEGER,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create ingestion tracking table
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    events_processed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create event deduplication tracking
CREATE TABLE IF NOT EXISTS event_deduplication (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    duplicate_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4),
    merge_strategy VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(primary_event_id, duplicate_event_id)
);

-- Create unique constraints for deduplication
DROP INDEX IF EXISTS idx_events_dedup_key;
CREATE UNIQUE INDEX idx_events_dedup_key ON events(dedup_key) WHERE dedup_key IS NOT NULL;

DROP INDEX IF EXISTS idx_events_external_unique;
CREATE UNIQUE INDEX idx_events_external_unique ON events(external_id, source) WHERE external_id IS NOT NULL AND source IS NOT NULL;

DROP INDEX IF EXISTS idx_venues_external_unique;
CREATE UNIQUE INDEX idx_venues_external_unique ON venues(external_id, source) WHERE external_id IS NOT NULL AND source IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_is_free ON events(is_free);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON events(city_id);
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_hotness_score ON events(hotness_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_view_count ON events(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_events_price_range ON events(price_min, price_max);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_content_hash ON events(content_hash) WHERE content_hash IS NOT NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_events_title_search ON events USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_description_search ON events USING gin(description gin_trgm_ops) WHERE description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_combined_search ON events USING gin((title || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_venues_amenities ON venues USING gin(amenities);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_active_by_date ON events(status, start_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_active_by_city ON events(status, city_id, start_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_active_by_category ON events(status, category, start_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_featured_by_score ON events(is_featured, hotness_score DESC, start_time) WHERE is_featured = true;

-- Venue indexes
CREATE INDEX IF NOT EXISTS idx_venues_name_search ON venues USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_city_id ON venues(city_id);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- City indexes
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_name_search ON cities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active) WHERE is_active = true;

-- Add foreign key constraints
ALTER TABLE events ADD CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE events ADD CONSTRAINT fk_events_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;
ALTER TABLE venues ADD CONSTRAINT fk_venues_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cities_updated_at ON cities;
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create event deduplication function
CREATE OR REPLACE FUNCTION generate_event_dedup_key(title TEXT, venue_name TEXT, start_time TIMESTAMPTZ, source TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN md5(
        LOWER(TRIM(COALESCE(title, ''))) || '|' ||
        LOWER(TRIM(COALESCE(venue_name, ''))) || '|' ||
        COALESCE(start_time::TEXT, '') || '|' ||
        COALESCE(source, '')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create content hash function for similarity detection
CREATE OR REPLACE FUNCTION generate_content_hash(title TEXT, description TEXT, venue_name TEXT, start_time TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(sha256(
        (LOWER(TRIM(COALESCE(title, ''))) || '|' ||
         LOWER(TRIM(COALESCE(substring(description, 1, 200), ''))) || '|' ||
         LOWER(TRIM(COALESCE(venue_name, ''))) || '|' ||
         COALESCE(start_time::TEXT, ''))::bytea
    ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create event upsert function
CREATE OR REPLACE FUNCTION upsert_event(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_category VARCHAR(50) DEFAULT 'other',
    p_subcategory VARCHAR(100) DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_venue_name VARCHAR(255) DEFAULT NULL,
    p_venue_id UUID DEFAULT NULL,
    p_city_name VARCHAR(100) DEFAULT NULL,
    p_city_id UUID DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_latitude DECIMAL(10,8) DEFAULT NULL,
    p_longitude DECIMAL(11,8) DEFAULT NULL,
    p_price DECIMAL(12,2) DEFAULT NULL,
    p_price_min DECIMAL(12,2) DEFAULT NULL,
    p_price_max DECIMAL(12,2) DEFAULT NULL,
    p_price_currency VARCHAR(3) DEFAULT 'USD',
    p_is_free BOOLEAN DEFAULT FALSE,
    p_website_url TEXT DEFAULT NULL,
    p_ticket_url TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_external_id VARCHAR(255) DEFAULT NULL,
    p_external_url TEXT DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT NULL,
    p_provider VARCHAR(50) DEFAULT NULL,
    p_tags JSONB DEFAULT '[]',
    p_metadata JSONB DEFAULT '{}',
    p_status VARCHAR(50) DEFAULT 'active'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_dedup_key TEXT;
    v_content_hash TEXT;
    v_existing_event_id UUID;
BEGIN
    -- Generate deduplication key
    v_dedup_key := generate_event_dedup_key(p_title, p_venue_name, p_start_time, p_source);
    v_content_hash := generate_content_hash(p_title, p_description, p_venue_name, p_start_time);
    
    -- Check for existing event by external_id + source
    IF p_external_id IS NOT NULL AND p_source IS NOT NULL THEN
        SELECT id INTO v_existing_event_id 
        FROM events 
        WHERE external_id = p_external_id AND source = p_source;
    END IF;
    
    -- If no external match, check dedup_key
    IF v_existing_event_id IS NULL THEN
        SELECT id INTO v_existing_event_id 
        FROM events 
        WHERE dedup_key = v_dedup_key;
    END IF;
    
    -- Update existing event or insert new one
    IF v_existing_event_id IS NOT NULL THEN
        -- Update existing event
        UPDATE events SET
            title = p_title,
            description = COALESCE(p_description, description),
            category = p_category,
            subcategory = p_subcategory,
            start_time = COALESCE(p_start_time, start_time),
            end_time = COALESCE(p_end_time, end_time),
            venue_name = COALESCE(p_venue_name, venue_name),
            venue_id = COALESCE(p_venue_id, venue_id),
            city_name = COALESCE(p_city_name, city_name),
            city_id = COALESCE(p_city_id, city_id),
            address = COALESCE(p_address, address),
            latitude = COALESCE(p_latitude, latitude),
            longitude = COALESCE(p_longitude, longitude),
            price = COALESCE(p_price, price),
            price_min = COALESCE(p_price_min, price_min),
            price_max = COALESCE(p_price_max, price_max),
            price_currency = p_price_currency,
            is_free = p_is_free,
            website_url = COALESCE(p_website_url, website_url),
            ticket_url = COALESCE(p_ticket_url, ticket_url),
            image_url = COALESCE(p_image_url, image_url),
            external_id = COALESCE(p_external_id, external_id),
            external_url = COALESCE(p_external_url, external_url),
            source = COALESCE(p_source, source),
            provider = COALESCE(p_provider, provider),
            tags = p_tags,
            metadata = metadata || p_metadata,
            status = p_status,
            content_hash = v_content_hash,
            dedup_key = v_dedup_key,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = v_existing_event_id;
        
        v_event_id := v_existing_event_id;
    ELSE
        -- Insert new event
        INSERT INTO events (
            title, description, category, subcategory, start_time, end_time,
            venue_name, venue_id, city_name, city_id, address, latitude, longitude,
            price, price_min, price_max, price_currency, is_free,
            website_url, ticket_url, image_url, external_id, external_url,
            source, provider, tags, metadata, status,
            content_hash, dedup_key, last_updated
        ) VALUES (
            p_title, p_description, p_category, p_subcategory, p_start_time, p_end_time,
            p_venue_name, p_venue_id, p_city_name, p_city_id, p_address, p_latitude, p_longitude,
            p_price, p_price_min, p_price_max, p_price_currency, p_is_free,
            p_website_url, p_ticket_url, p_image_url, p_external_id, p_external_url,
            p_source, p_provider, p_tags, p_metadata, p_status,
            v_content_hash, v_dedup_key, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_event_id;
    END IF;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Create similar event detection function
CREATE OR REPLACE FUNCTION find_similar_events(
    p_event_id UUID,
    p_similarity_threshold DECIMAL(5,4) DEFAULT 0.8
)
RETURNS TABLE(
    similar_event_id UUID,
    similarity_score DECIMAL(5,4),
    title_similarity DECIMAL(5,4),
    venue_similarity DECIMAL(5,4),
    time_similarity DECIMAL(5,4)
) AS $$
DECLARE
    v_event RECORD;
BEGIN
    -- Get the source event details
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        (
            COALESCE(similarity(v_event.title, e.title), 0) * 0.4 +
            COALESCE(similarity(v_event.venue_name, e.venue_name), 0) * 0.3 +
            CASE 
                WHEN v_event.start_time IS NOT NULL AND e.start_time IS NOT NULL THEN
                    GREATEST(0, 1 - (EXTRACT(EPOCH FROM ABS(v_event.start_time - e.start_time)) / 86400.0)) * 0.3
                ELSE 0
            END
        )::DECIMAL(5,4),
        similarity(v_event.title, e.title)::DECIMAL(5,4),
        similarity(v_event.venue_name, e.venue_name)::DECIMAL(5,4),
        CASE 
            WHEN v_event.start_time IS NOT NULL AND e.start_time IS NOT NULL THEN
                GREATEST(0, 1 - (EXTRACT(EPOCH FROM ABS(v_event.start_time - e.start_time)) / 86400.0))::DECIMAL(5,4)
            ELSE 0::DECIMAL(5,4)
        END
    FROM events e
    WHERE e.id != p_event_id
      AND e.status = 'active'
      AND (
          similarity(v_event.title, e.title) > 0.3 OR
          similarity(v_event.venue_name, e.venue_name) > 0.3 OR
          (v_event.start_time IS NOT NULL AND e.start_time IS NOT NULL AND 
           ABS(EXTRACT(EPOCH FROM (v_event.start_time - e.start_time))) < 86400)
      )
    HAVING (
        COALESCE(similarity(v_event.title, e.title), 0) * 0.4 +
        COALESCE(similarity(v_event.venue_name, e.venue_name), 0) * 0.3 +
        CASE 
            WHEN v_event.start_time IS NOT NULL AND e.start_time IS NOT NULL THEN
                GREATEST(0, 1 - (EXTRACT(EPOCH FROM ABS(v_event.start_time - e.start_time)) / 86400.0)) * 0.3
            ELSE 0
        END
    ) >= p_similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role, anon;

-- Insert default categories if needed
INSERT INTO cities (name, slug, country, timezone, is_active) 
VALUES 
    ('Toronto', 'toronto', 'Canada', 'America/Toronto', true),
    ('New York', 'new-york', 'United States', 'America/New_York', true),
    ('Los Angeles', 'los-angeles', 'United States', 'America/Los_Angeles', true),
    ('London', 'london', 'United Kingdom', 'Europe/London', true),
    ('Paris', 'paris', 'France', 'Europe/Paris', true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;