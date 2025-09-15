-- Quick database setup for SceneScout
-- Essential tables only to get the app running

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timezone VARCHAR(50),
    population INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    city_id UUID REFERENCES cities(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity INTEGER,
    venue_type VARCHAR(100),
    phone VARCHAR(50),
    website VARCHAR(500),
    amenities TEXT[],
    images TEXT[],
    operating_hours JSONB,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    external_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event categories enum
CREATE TYPE event_category AS ENUM ('music', 'arts', 'sports', 'food', 'tech', 'social', 'business', 'other');

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    end_date DATE,
    end_time TIME,
    timezone VARCHAR(50),
    venue_id UUID REFERENCES venues(id),
    venue_name VARCHAR(255),
    address VARCHAR(500),
    city_id UUID REFERENCES cities(id),
    category event_category NOT NULL DEFAULT 'other',
    subcategory VARCHAR(100),
    tags TEXT[],
    is_free BOOLEAN DEFAULT false,
    price_min DECIMAL(10, 2),
    price_max DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    capacity INTEGER,
    attendance_estimate INTEGER,
    image_url VARCHAR(1000),
    video_url VARCHAR(1000),
    external_url VARCHAR(1000),
    external_id VARCHAR(255),
    source VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_featured BOOLEAN DEFAULT false,
    popularity_score DECIMAL(5, 2),
    hotness_score DECIMAL(5, 2),
    rating DECIMAL(3, 2),
    reviews_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    provider VARCHAR(100),
    url VARCHAR(1000),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential RPC functions
CREATE OR REPLACE FUNCTION get_featured_events(limit_count INTEGER DEFAULT 10)
RETURNS SETOF events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM events
    WHERE is_featured = true
    AND date >= CURRENT_DATE
    ORDER BY date ASC, created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DECIMAL DEFAULT NULL,
    user_lng DECIMAL DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 20
)
RETURNS SETOF events AS $$
BEGIN
    IF user_lat IS NULL OR user_lng IS NULL THEN
        RETURN QUERY
        SELECT * FROM events
        WHERE date >= CURRENT_DATE
        ORDER BY date ASC, created_at DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT * FROM events
        WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND date >= CURRENT_DATE
        ORDER BY date ASC, created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert sample city
INSERT INTO cities (id, slug, name, state, country, latitude, longitude, timezone) 
VALUES (
    uuid_generate_v4(),
    'toronto-on',
    'Toronto',
    'Ontario',
    'Canada',
    43.6532,
    -79.3832,
    'America/Toronto'
) ON CONFLICT (slug) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create public read policies
CREATE POLICY "Public read access" ON cities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read access" ON events FOR SELECT USING (true);

-- Grant access to anon and authenticated users
GRANT SELECT ON cities TO anon, authenticated;
GRANT SELECT ON venues TO anon, authenticated;
GRANT SELECT ON events TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_featured_events TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_events TO anon, authenticated;