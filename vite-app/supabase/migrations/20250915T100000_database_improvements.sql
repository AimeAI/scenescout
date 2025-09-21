-- SceneScout Database Scaling & Correctness Improvements
-- Migration: 20250915T100000_database_improvements.sql

-- ========================================
-- 1. GEOSPATIAL TYPES + INDEXES
-- ========================================

-- Create master_events table with proper PostGIS geography column
CREATE TABLE IF NOT EXISTS master_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    venue_name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_code VARCHAR(2),
    country_code VARCHAR(2) DEFAULT 'US',
    timezone VARCHAR(50) DEFAULT 'America/Toronto',
    
    -- PostGIS geography column (explicit SRID 4326)
    coordinates geography(Point,4326) NOT NULL,
    
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    
    category VARCHAR(50) NOT NULL,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_tier VARCHAR(20) CHECK (price_tier IN ('free', 'budget', 'moderate', 'premium', 'luxury')),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Source tracking
    source_name VARCHAR(100) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,
    source_payload JSONB DEFAULT '{}',
    
    -- Quality and metadata
    quality_score NUMERIC,
    popularity_score INTEGER DEFAULT 0,
    hero_image_url TEXT,
    ticket_url TEXT,
    
    -- Deduplication
    dedup_hash VARCHAR(64) UNIQUE NOT NULL,
    
    -- Venue relationship
    venue_id UUID REFERENCES venues(id),
    
    -- Timestamps
    last_verified TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicates per source
    UNIQUE(source_name, source_event_id)
) PARTITION BY RANGE (event_date);

-- Create geospatial indexes
CREATE INDEX IF NOT EXISTS ix_events_geo ON master_events USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS ix_events_city_cat_price_date ON master_events (city, category, price_tier, event_date);
CREATE INDEX IF NOT EXISTS ix_events_date ON master_events (event_date);
CREATE INDEX IF NOT EXISTS ix_events_dedup_hash ON master_events (dedup_hash);
CREATE INDEX IF NOT EXISTS ix_events_source ON master_events (source_name, last_verified);
CREATE INDEX IF NOT EXISTS ix_events_quality ON master_events (quality_score DESC) WHERE quality_score IS NOT NULL;

-- ========================================
-- 2. DETERMINISTIC DEDUP FUNCTION
-- ========================================

-- Install unaccent extension for text normalization
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Function to generate deterministic dedup hash
CREATE OR REPLACE FUNCTION generate_dedup_hash(
    p_title TEXT,
    p_venue_name TEXT DEFAULT NULL,
    p_event_date DATE,
    p_city TEXT,
    p_timezone TEXT DEFAULT 'America/Toronto'
) RETURNS TEXT AS $$
DECLARE
    normalized_title TEXT;
    normalized_venue TEXT;
    local_date DATE;
    hash_input TEXT;
BEGIN
    -- Normalize title: remove accents, lowercase, collapse whitespace
    normalized_title := unaccent(lower(regexp_replace(p_title, '\s+', ' ', 'g')));
    
    -- Normalize venue name: remove accents, lowercase, handle nulls
    normalized_venue := COALESCE(unaccent(lower(p_venue_name)), '');
    
    -- Convert event_date to local calendar day in the event's timezone
    local_date := (p_event_date AT TIME ZONE p_timezone)::date;
    
    -- Create hash input string
    hash_input := normalized_title || '|' || normalized_venue || '|' || local_date || '|' || lower(p_city);
    
    -- Return SHA256 hash
    RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- 3. TABLE PARTITIONING BY MONTH
-- ========================================

-- Create partition for current month
CREATE TABLE IF NOT EXISTS master_events_2025_09 PARTITION OF master_events
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Create partition for next month  
CREATE TABLE IF NOT EXISTS master_events_2025_10 PARTITION OF master_events
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Create partition for following month
CREATE TABLE IF NOT EXISTS master_events_2025_11 PARTITION OF master_events
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Calculate partition boundaries
    start_date := date_trunc('month', target_date)::date;
    end_date := (start_date + interval '1 month')::date;
    
    -- Generate partition name
    partition_name := 'master_events_' || to_char(start_date, 'YYYY_MM');
    
    -- Create partition if it doesn't exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF master_events
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created partition % for period % to %', partition_name, start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. MATERIALIZED VIEWS WITH CONCURRENCY
-- ========================================

-- User preference vectors materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_preference_vectors AS
SELECT 
    user_id,
    category,
    COUNT(*) as interaction_count,
    AVG(CASE 
        WHEN interaction_type = 'view' THEN 1
        WHEN interaction_type = 'save' THEN 3
        WHEN interaction_type = 'share' THEN 5
        WHEN interaction_type = 'attend' THEN 10
        ELSE 1
    END) as affinity_score,
    COUNT(*) FILTER (WHERE interaction_type = 'attend') as attendance_count,
    AVG(CASE 
        WHEN price_tier = 'free' THEN 0
        WHEN price_tier = 'budget' THEN 25
        WHEN price_tier = 'moderate' THEN 75
        WHEN price_tier = 'premium' THEN 150
        WHEN price_tier = 'luxury' THEN 300
        ELSE 50
    END) as preferred_price_point,
    MAX(created_at) as last_interaction
FROM user_event_interactions uei
JOIN master_events me ON uei.event_id = me.id
GROUP BY user_id, category
WITH NO DATA;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS ux_upv_user_cat ON user_preference_vectors(user_id, category);

-- Initial data population
REFRESH MATERIALIZED VIEW user_preference_vectors;

-- ========================================
-- 5. GENERATED QUALITY SCORE COLUMN
-- ========================================

-- Add generated quality score column to master_events
ALTER TABLE master_events
ADD COLUMN IF NOT EXISTS quality_score_generated NUMERIC GENERATED ALWAYS AS (
    0.30 * LEAST(COALESCE(popularity_score, 0), 100) / 100.0 +
    0.20 * (CASE WHEN hero_image_url IS NOT NULL THEN 1 ELSE 0 END) +
    0.20 * (CASE WHEN length(COALESCE(description, '')) > 100 THEN 1 ELSE 0 END) +
    0.15 * (CASE WHEN venue_id IS NOT NULL THEN 1 ELSE 0 END) +
    0.15 * COALESCE(
        (NULLIF(source_payload->>'rating', '')::numeric) / 5.0, 
        0.5
    )
) STORED;

-- ========================================
-- 6. SWARM JOBS TABLE FOR PERSISTENCE
-- ========================================

CREATE TABLE IF NOT EXISTS swarm_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL CHECK (job_type IN ('priority_discovery', 'backfill', 'quality_enhance', 'dedup')),
    city TEXT NOT NULL,
    category TEXT,
    price_tier TEXT,
    events_needed INTEGER,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'normal', 'low')),
    
    -- Idempotency key
    job_key TEXT UNIQUE NOT NULL,
    
    -- Status tracking  
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    last_error TEXT,
    error_details JSONB DEFAULT '{}',
    
    -- Metadata
    job_params JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job management
CREATE INDEX IF NOT EXISTS ix_swarm_jobs_status ON swarm_jobs (status, scheduled_at);
CREATE INDEX IF NOT EXISTS ix_swarm_jobs_type_city ON swarm_jobs (job_type, city);
CREATE INDEX IF NOT EXISTS ix_swarm_jobs_priority ON swarm_jobs (priority, scheduled_at) WHERE status = 'queued';

-- ========================================
-- 7. SOURCE POLICIES TABLE FOR COMPLIANCE
-- ========================================

CREATE TABLE IF NOT EXISTS source_policies (
    source_name TEXT PRIMARY KEY,
    
    -- Caching rules
    cache_ttl_minutes INTEGER DEFAULT 1440, -- 24 hours default
    allow_persist BOOLEAN DEFAULT TRUE,
    
    -- Legal compliance
    attribution_required BOOLEAN DEFAULT TRUE,
    redistribution_allowed BOOLEAN DEFAULT FALSE,
    tos_url TEXT,
    api_documentation_url TEXT,
    
    -- Rate limiting
    max_requests_per_hour INTEGER DEFAULT 100,
    max_requests_per_day INTEGER DEFAULT 1000,
    
    -- Data retention
    data_retention_days INTEGER DEFAULT 90,
    purge_raw_payloads BOOLEAN DEFAULT FALSE,
    
    -- Quality thresholds
    min_quality_score NUMERIC DEFAULT 0.3,
    require_venue BOOLEAN DEFAULT FALSE,
    require_description BOOLEAN DEFAULT FALSE,
    
    -- Geographic restrictions
    allowed_regions TEXT[] DEFAULT ARRAY['US', 'CA'],
    blocked_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial source policies
INSERT INTO source_policies (source_name, cache_ttl_minutes, attribution_required, max_requests_per_hour) VALUES
('ticketmaster', 720, true, 50),
('eventbrite', 1440, true, 100),
('facebook_events', 2160, true, 25),
('meetup', 1440, false, 75),
('city_toronto', 4320, true, 200),
('manual', 43200, false, 1000)
ON CONFLICT (source_name) DO NOTHING;

-- ========================================
-- 8. RECURRING EVENTS SUPPORT
-- ========================================

-- Add RRULE support to master_events
ALTER TABLE master_events
ADD COLUMN IF NOT EXISTS rrule TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES master_events(id),
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- Create index for recurring events
CREATE INDEX IF NOT EXISTS ix_events_recurring ON master_events (parent_event_id, event_date) WHERE is_recurring = true;

-- ========================================
-- 9. RLS BOUNDARIES & SECURITY
-- ========================================

-- Enable RLS on sensitive tables
ALTER TABLE user_preference_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user preference vectors
CREATE POLICY "Users can view own preferences" ON user_preference_vectors
    FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for swarm jobs (admin only)
CREATE POLICY "Admins can manage swarm jobs" ON swarm_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN users u ON p.user_id = u.id 
            WHERE u.id = auth.uid() AND u.is_admin = true
        )
    );

-- Keep master_events public for now (performance reasons)
-- but ensure no PII is stored there

-- ========================================
-- 10. HELPER FUNCTIONS & TRIGGERS
-- ========================================

-- Function to auto-generate dedup hash on insert/update
CREATE OR REPLACE FUNCTION auto_generate_dedup_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dedup_hash := generate_dedup_hash(
        NEW.title,
        NEW.venue_name,
        NEW.event_date,
        NEW.city,
        COALESCE(NEW.timezone, 'America/Toronto')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate dedup hash
DROP TRIGGER IF EXISTS trigger_auto_dedup_hash ON master_events;
CREATE TRIGGER trigger_auto_dedup_hash
    BEFORE INSERT OR UPDATE ON master_events
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_dedup_hash();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_master_events_updated_at 
    BEFORE UPDATE ON master_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_swarm_jobs_updated_at 
    BEFORE UPDATE ON swarm_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_source_policies_updated_at 
    BEFORE UPDATE ON source_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 11. MONITORING & HEALTH VIEWS
-- ========================================

-- Swarm health dashboard view
CREATE OR REPLACE VIEW swarm_health_dashboard AS
SELECT 
    COUNT(DISTINCT city) as active_cities,
    COUNT(*) as total_events,
    AVG(quality_score_generated) as avg_quality,
    COUNT(*) FILTER (WHERE event_date > CURRENT_DATE) as upcoming_events,
    COUNT(*) FILTER (WHERE last_verified > NOW() - INTERVAL '24 hours') as fresh_events,
    COUNT(DISTINCT source_name) as active_sources,
    AVG(EXTRACT(epoch FROM (NOW() - last_verified))/3600) as avg_freshness_hours
FROM master_events;

-- Source performance view
CREATE OR REPLACE VIEW source_performance_view AS
SELECT 
    me.source_name,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE me.event_date > CURRENT_DATE) as upcoming_events,
    AVG(me.quality_score_generated) as avg_quality,
    MAX(me.last_verified) as last_scrape,
    sp.cache_ttl_minutes,
    sp.max_requests_per_hour,
    CASE 
        WHEN MAX(me.last_verified) < NOW() - INTERVAL '24 hours' THEN 'stale'
        WHEN AVG(me.quality_score_generated) < sp.min_quality_score THEN 'low_quality'
        ELSE 'healthy'
    END as health_status
FROM master_events me
JOIN source_policies sp ON me.source_name = sp.source_name
GROUP BY me.source_name, sp.cache_ttl_minutes, sp.max_requests_per_hour, sp.min_quality_score;

-- ========================================
-- 12. MIGRATION HELPERS
-- ========================================

-- Function to migrate existing events to master_events
CREATE OR REPLACE FUNCTION migrate_events_to_master()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    event_record RECORD;
BEGIN
    -- Migrate events from existing events table
    FOR event_record IN 
        SELECT 
            e.id,
            e.name as title,
            e.description,
            e.short_description,
            COALESCE(v.name, e.location_name) as venue_name,
            COALESCE(v.address, e.address) as address,
            c.name as city,
            c.state_code,
            c.country_code,
            c.timezone,
            ST_SetSRID(ST_MakePoint(
                COALESCE(e.longitude, v.longitude, c.longitude), 
                COALESCE(e.latitude, v.latitude, c.latitude)
            ), 4326)::geography as coordinates,
            e.event_date,
            e.start_time,
            e.end_time,
            COALESCE(e.categories->0, 'other') as category,
            e.ticket_price_min as price_min,
            e.ticket_price_max as price_max,
            CASE 
                WHEN e.ticket_price_max = 0 OR e.ticket_price_max IS NULL THEN 'free'
                WHEN e.ticket_price_max < 25 THEN 'budget'
                WHEN e.ticket_price_max < 75 THEN 'moderate'
                WHEN e.ticket_price_max < 150 THEN 'premium'
                ELSE 'luxury'
            END as price_tier,
            e.currency,
            COALESCE(e.source, 'legacy') as source_name,
            COALESCE(e.external_id, e.id::text) as source_event_id,
            e.featured_image_url as hero_image_url,
            e.ticket_url,
            e.venue_id,
            e.created_at,
            e.updated_at
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN cities c ON e.city_id = c.id
        WHERE c.name IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM master_events me 
            WHERE me.source_name = COALESCE(e.source, 'legacy')
            AND me.source_event_id = COALESCE(e.external_id, e.id::text)
        )
    LOOP
        BEGIN
            INSERT INTO master_events (
                title, description, short_description, venue_name, address,
                city, state_code, country_code, timezone, coordinates,
                event_date, start_time, end_time, category, price_min, price_max,
                price_tier, currency, source_name, source_event_id,
                hero_image_url, ticket_url, venue_id, created_at, updated_at
            ) VALUES (
                event_record.title, event_record.description, event_record.short_description,
                event_record.venue_name, event_record.address, event_record.city,
                event_record.state_code, event_record.country_code, event_record.timezone,
                event_record.coordinates, event_record.event_date, event_record.start_time,
                event_record.end_time, event_record.category, event_record.price_min,
                event_record.price_max, event_record.price_tier, event_record.currency,
                event_record.source_name, event_record.source_event_id,
                event_record.hero_image_url, event_record.ticket_url, event_record.venue_id,
                event_record.created_at, event_record.updated_at
            );
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION 
            WHEN unique_violation THEN
                -- Skip duplicates
                CONTINUE;
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to migrate event %: %', event_record.title, SQLERRM;
                CONTINUE;
        END;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SUCCESS MESSAGE & STATS
-- ========================================

DO $$
DECLARE
    partition_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count partitions
    SELECT COUNT(*) INTO partition_count
    FROM pg_tables 
    WHERE tablename LIKE 'master_events_%';
    
    -- Count indexes on master_events
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'master_events';
    
    RAISE NOTICE '✅ Database scaling improvements successfully applied!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Created % monthly partitions', partition_count;
    RAISE NOTICE '   - Created % indexes for performance', index_count;
    RAISE NOTICE '   - Added PostGIS geography columns with GIST indexes';
    RAISE NOTICE '   - Implemented deterministic dedup with timezone normalization';
    RAISE NOTICE '   - Created materialized views with concurrency support';
    RAISE NOTICE '   - Added generated quality score column';
    RAISE NOTICE '   - Set up swarm jobs persistence with idempotency';
    RAISE NOTICE '   - Configured source policies for compliance';
    RAISE NOTICE '   - Added RRULE support for recurring events';
    RAISE NOTICE '   - Implemented RLS boundaries for security';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next steps:';
    RAISE NOTICE '   1. Run: SELECT migrate_events_to_master(); to migrate existing data';
    RAISE NOTICE '   2. Set up cron job for: REFRESH MATERIALIZED VIEW CONCURRENTLY user_preference_vectors';
    RAISE NOTICE '   3. Create monthly partition management cron job';
    RAISE NOTICE '   4. Configure swarm job workers to use the new persistence layer';
END $$;