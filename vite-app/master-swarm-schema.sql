-- Master Swarm Intelligence Database Schema
-- Implements the comprehensive event discovery system

-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Pricing tier enum (if not exists)
DO $$ BEGIN
    CREATE TYPE pricing_tier AS ENUM ('free', 'budget', 'moderate', 'premium', 'luxury');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Event category enum (if not exists) 
DO $$ BEGIN
    CREATE TYPE event_category AS ENUM ('music', 'arts', 'sports', 'food', 'tech', 'social', 'business', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add price_tier to events table if not exists
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS price_tier pricing_tier;

-- Category Distribution Targets Table
CREATE TABLE IF NOT EXISTS category_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category event_category NOT NULL,
    price_tier pricing_tier NOT NULL,
    city_id UUID REFERENCES cities(id),
    target_count INTEGER NOT NULL DEFAULT 25,
    current_count INTEGER DEFAULT 0,
    last_balanced TIMESTAMPTZ DEFAULT NOW(),
    priority_score DECIMAL(3,2) DEFAULT 1.0,
    
    UNIQUE(category, price_tier, city_id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swarm Intelligence Metrics Table
CREATE TABLE IF NOT EXISTS swarm_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'user_click', 'user_save', 'user_attend', 'source_quality'
    metric_value DECIMAL(10,4) NOT NULL,
    user_location GEOGRAPHY(POINT),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for common queries
    INDEX idx_swarm_metrics_event_id (event_id),
    INDEX idx_swarm_metrics_type (metric_type),
    INDEX idx_swarm_metrics_timestamp (timestamp)
);

-- Global Source Health Table
CREATE TABLE IF NOT EXISTS source_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) UNIQUE NOT NULL,
    last_successful_scrape TIMESTAMPTZ,
    success_rate DECIMAL(5,4) DEFAULT 1.0,
    avg_events_per_scrape INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(3,2) DEFAULT 0.0,
    total_events_scraped INTEGER DEFAULT 0,
    total_scrape_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    priority_level INTEGER DEFAULT 1, -- 1=highest, 5=lowest
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Netflix-style categories for enhanced discovery
CREATE TABLE IF NOT EXISTS netflix_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event to Netflix category mapping (many-to-many)
CREATE TABLE IF NOT EXISTS event_netflix_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    netflix_category_id UUID REFERENCES netflix_categories(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    
    UNIQUE(event_id, netflix_category_id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Event Interactions for swarm intelligence
CREATE TABLE IF NOT EXISTS user_event_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'save', 'share', 'attend'
    interaction_value DECIMAL(5,2) DEFAULT 1.0,
    device_type VARCHAR(50),
    user_agent TEXT,
    referrer TEXT,
    session_duration INTEGER, -- seconds
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for analytics
    INDEX idx_user_interactions_user_id (user_id),
    INDEX idx_user_interactions_event_id (event_id),
    INDEX idx_user_interactions_type (interaction_type),
    INDEX idx_user_interactions_created_at (created_at)
);

-- Enhanced events table with swarm intelligence fields
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS netflix_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience TEXT[],
ADD COLUMN IF NOT EXISTS mood_tags TEXT[],
ADD COLUMN IF NOT EXISTS dedup_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS similar_event_ids UUID[],
ADD COLUMN IF NOT EXISTS swarm_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_interactions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ DEFAULT NOW();

-- Update existing events with appropriate price tiers
UPDATE events 
SET price_tier = CASE 
    WHEN is_free = true OR price_min = 0 OR price_min IS NULL THEN 'free'::pricing_tier
    WHEN price_min <= 25 THEN 'budget'::pricing_tier
    WHEN price_min <= 75 THEN 'moderate'::pricing_tier
    WHEN price_min <= 200 THEN 'premium'::pricing_tier
    ELSE 'luxury'::pricing_tier
END
WHERE price_tier IS NULL;

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_price_tier ON events(price_tier);
CREATE INDEX IF NOT EXISTS idx_events_category_price_tier ON events(category, price_tier);
CREATE INDEX IF NOT EXISTS idx_events_city_category ON events(city_id, category);
CREATE INDEX IF NOT EXISTS idx_events_date_category ON events(date, category);
CREATE INDEX IF NOT EXISTS idx_events_swarm_votes ON events(swarm_votes DESC);
CREATE INDEX IF NOT EXISTS idx_events_hotness_score ON events(hotness_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST(ST_Point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_events_external_url ON events(external_url) WHERE external_url IS NOT NULL;

-- Seed initial category targets for Toronto
INSERT INTO category_targets (category, price_tier, city_id, target_count)
SELECT 
    category_enum.category,
    tier_enum.tier,
    (SELECT id FROM cities WHERE slug = 'toronto-on' LIMIT 1),
    CASE 
        WHEN tier_enum.tier = 'free' THEN 25
        WHEN tier_enum.tier = 'budget' THEN 30
        WHEN tier_enum.tier = 'moderate' THEN 35
        WHEN tier_enum.tier = 'premium' THEN 25
        WHEN tier_enum.tier = 'luxury' THEN 15
    END as target_count
FROM 
    (SELECT unnest(enum_range(NULL::event_category)) as category) category_enum
CROSS JOIN 
    (SELECT unnest(enum_range(NULL::pricing_tier)) as tier) tier_enum
ON CONFLICT (category, price_tier, city_id) DO NOTHING;

-- Seed Netflix-style categories
INSERT INTO netflix_categories (category_name, display_name, description, icon_name, sort_order) VALUES 
('trending_now', 'Trending Now', 'Events that are popular right now', 'trending-up', 1),
('tonight', 'Tonight', 'Events happening tonight', 'moon', 2),
('this_weekend', 'This Weekend', 'Perfect for weekend plans', 'calendar', 3),
('free_events', 'Free Events', 'Amazing events that won\'t cost you anything', 'gift', 4),
('date_night', 'Date Night', 'Perfect for romantic evenings', 'heart', 5),
('family_friendly', 'Family Friendly', 'Great events for the whole family', 'users', 6),
('food_lovers', 'Food Lovers', 'For the culinary enthusiasts', 'utensils', 7),
('music_lovers', 'Music Lovers', 'Live music and concerts', 'music', 8),
('art_culture', 'Art & Culture', 'Museums, galleries, and cultural events', 'palette', 9),
('outdoor_adventures', 'Outdoor Adventures', 'Events in the great outdoors', 'mountain', 10),
('nightlife', 'Nightlife', 'Evening entertainment and parties', 'moon', 11),
('sports_fitness', 'Sports & Fitness', 'Active and competitive events', 'activity', 12)
ON CONFLICT (category_name) DO NOTHING;

-- Seed initial source health records
INSERT INTO source_health (source_name, is_active, priority_level) VALUES 
('ticketmaster', true, 1),
('eventbrite', true, 1),
('facebook_events', true, 2),
('meetup', true, 2),
('city_toronto', true, 1),
('harbourfront', true, 3),
('ago', true, 3),
('second_city', true, 4),
('evergreen', true, 4)
ON CONFLICT (source_name) DO NOTHING;

-- Function to calculate event quality score based on swarm intelligence
CREATE OR REPLACE FUNCTION calculate_event_quality_score(event_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    quality_score DECIMAL(3,2) := 0.0;
    view_count INTEGER := 0;
    save_count INTEGER := 0;
    share_count INTEGER := 0;
    attend_count INTEGER := 0;
    total_interactions INTEGER := 0;
BEGIN
    -- Get interaction counts
    SELECT 
        COALESCE(SUM(CASE WHEN interaction_type = 'view' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN interaction_type = 'save' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN interaction_type = 'share' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN interaction_type = 'attend' THEN 1 ELSE 0 END), 0),
        COALESCE(COUNT(*), 0)
    INTO view_count, save_count, share_count, attend_count, total_interactions
    FROM user_event_interactions 
    WHERE event_id = calculate_event_quality_score.event_id;
    
    -- Calculate weighted score (0.0 to 5.0)
    quality_score := LEAST(5.0, 
        (view_count * 0.1) + 
        (save_count * 0.5) + 
        (share_count * 0.8) + 
        (attend_count * 1.0) +
        (total_interactions * 0.1)
    );
    
    RETURN quality_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update category target counts
CREATE OR REPLACE FUNCTION update_category_counts()
RETURNS void AS $$
BEGIN
    UPDATE category_targets ct
    SET 
        current_count = (
            SELECT COUNT(*)
            FROM events e
            WHERE e.category = ct.category 
            AND e.price_tier = ct.price_tier
            AND e.city_id = ct.city_id
            AND e.date >= CURRENT_DATE
        ),
        last_balanced = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update quality scores when interactions change
CREATE OR REPLACE FUNCTION update_event_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events 
    SET 
        quality_score = calculate_event_quality_score(COALESCE(NEW.event_id, OLD.event_id)),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_quality_score ON user_event_interactions;
CREATE TRIGGER trigger_update_quality_score
    AFTER INSERT OR UPDATE OR DELETE ON user_event_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_event_quality_score();

-- Views for analytics and reporting
CREATE OR REPLACE VIEW category_distribution_view AS
SELECT 
    c.name as city_name,
    ct.category,
    ct.price_tier,
    ct.target_count,
    ct.current_count,
    CASE 
        WHEN ct.current_count < (ct.target_count * 0.8) THEN 'deficit'
        WHEN ct.current_count > (ct.target_count * 1.2) THEN 'excess'
        ELSE 'optimal'
    END as status,
    ct.priority_score,
    ct.last_balanced
FROM category_targets ct
JOIN cities c ON ct.city_id = c.id
ORDER BY c.name, ct.category, ct.price_tier;

CREATE OR REPLACE VIEW popular_events_view AS
SELECT 
    e.*,
    c.name as city_name,
    COALESCE(e.quality_score, 0) as calculated_quality_score,
    (
        SELECT COUNT(*)
        FROM user_event_interactions uei
        WHERE uei.event_id = e.id
    ) as total_interactions
FROM events e
JOIN cities c ON e.city_id = c.id
WHERE e.date >= CURRENT_DATE
ORDER BY e.quality_score DESC NULLS LAST, e.hotness_score DESC NULLS LAST;

-- Initial update of category counts
SELECT update_category_counts();

-- Grant permissions (adjust as needed for your RLS setup)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON user_event_interactions TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON swarm_metrics TO authenticated;

COMMENT ON TABLE category_targets IS 'Defines target event counts per category/price tier for swarm intelligence balancing';
COMMENT ON TABLE swarm_metrics IS 'Collects user interaction data for swarm intelligence algorithms';
COMMENT ON TABLE source_health IS 'Monitors the health and performance of event data sources';
COMMENT ON TABLE netflix_categories IS 'Netflix-style category system for enhanced event discovery';
COMMENT ON TABLE user_event_interactions IS 'Tracks user interactions with events for personalization and quality scoring';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Master Swarm Intelligence Database Schema successfully applied!';
    RAISE NOTICE 'Total events in database: %', (SELECT COUNT(*) FROM events);
    RAISE NOTICE 'Active categories: %', (SELECT COUNT(DISTINCT category) FROM events);
    RAISE NOTICE 'Price tiers configured: %', (SELECT COUNT(DISTINCT price_tier) FROM events WHERE price_tier IS NOT NULL);
END $$;