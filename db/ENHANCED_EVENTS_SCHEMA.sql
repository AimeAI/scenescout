-- Enhanced events table for Netflix-style discovery
ALTER TABLE events ADD COLUMN IF NOT EXISTS trending_score DECIMAL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotness_score DECIMAL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_trending ON events(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_events_date_location ON events(event_date, location);
CREATE INDEX IF NOT EXISTS idx_events_free ON events(ticket_price_min) WHERE ticket_price_min = 0;

-- Function to get nearby events with enhanced filtering
CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km INT DEFAULT 25
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    categories JSONB,
    event_date DATE,
    venue_name TEXT,
    distance_km DECIMAL,
    ticket_price_min DECIMAL,
    trending_score DECIMAL,
    featured_image_url TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.categories,
        e.event_date,
        e.venue_name,
        ST_Distance(
            e.location,
            ST_MakePoint(user_lng, user_lat)::geography
        ) / 1000 AS distance_km,
        e.ticket_price_min,
        e.trending_score,
        e.featured_image_url,
        e.description
    FROM events e
    WHERE 
        e.deleted_at IS NULL
        AND e.is_cancelled = false
        AND e.event_date >= CURRENT_DATE
        AND ST_DWithin(
            e.location,
            ST_MakePoint(user_lng, user_lat)::geography,
            radius_km * 1000
        )
    ORDER BY e.trending_score DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Create scraping jobs table for orchestration
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'city', 'venue', 'category'
    target TEXT NOT NULL, -- city name, venue id, etc.
    priority INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scraping metrics table
CREATE TABLE IF NOT EXISTS scraping_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    jobs_processed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    events_scraped INTEGER DEFAULT 0,
    active_scrapers INTEGER DEFAULT 0,
    avg_processing_time DECIMAL
);

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(event_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
    days_until_event INTEGER;
    view_count INTEGER;
    attendee_count INTEGER;
BEGIN
    SELECT 
        EXTRACT(DAY FROM (e.event_date - CURRENT_DATE)),
        e.view_count,
        e.attendee_count
    INTO days_until_event, view_count, attendee_count
    FROM events e WHERE e.id = event_id;
    
    -- Base score from views and attendees
    score := (view_count * 0.1) + (attendee_count * 0.5);
    
    -- Time decay factor (events happening soon get higher scores)
    IF days_until_event <= 1 THEN
        score := score * 2.0;
    ELSIF days_until_event <= 7 THEN
        score := score * 1.5;
    ELSIF days_until_event <= 30 THEN
        score := score * 1.2;
    END IF;
    
    -- Free events get a boost
    IF (SELECT ticket_price_min FROM events WHERE id = event_id) = 0 THEN
        score := score * 1.3;
    END IF;
    
    RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trending scores
CREATE OR REPLACE FUNCTION update_trending_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trending_score := calculate_trending_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trending_score
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_trending_score();
