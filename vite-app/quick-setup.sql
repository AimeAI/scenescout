-- SceneScout Quick Setup - Clean Migration
-- Copy and paste this into Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Core tables for SceneScout
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    state VARCHAR(50),
    country VARCHAR(2) DEFAULT 'CA',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    city_id UUID REFERENCES cities(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    venue_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table - main events data
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue_id UUID REFERENCES venues(id),
    city_id UUID REFERENCES cities(id),
    category VARCHAR(50) NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    price_min DECIMAL(8,2),
    price_max DECIMAL(8,2),
    image_url TEXT,
    external_url TEXT,
    provider VARCHAR(50), -- eventbrite, ticketmaster, yelp, etc.
    external_id VARCHAR(255),
    is_approved BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active',
    hotness_score INTEGER DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, external_id)
);

-- Create Toronto city
INSERT INTO cities (name, slug, state, country, latitude, longitude) 
VALUES ('Toronto', 'toronto', 'ON', 'CA', 43.6532, -79.3832)
ON CONFLICT (slug) DO NOTHING;

-- Create sample venues
INSERT INTO venues (name, address, city_id, latitude, longitude, venue_type)
SELECT 
    'Roy Thomson Hall',
    '60 Simcoe St, Toronto, ON',
    cities.id,
    43.6532,
    -79.3832,
    'theater'
FROM cities WHERE slug = 'toronto'
ON CONFLICT DO NOTHING;

INSERT INTO venues (name, address, city_id, latitude, longitude, venue_type)
SELECT 
    'Scotiabank Arena',
    '40 Bay St, Toronto, ON',
    cities.id,
    43.6434,
    -79.3791,
    'arena'
FROM cities WHERE slug = 'toronto'
ON CONFLICT DO NOTHING;

-- Create category enum
CREATE TYPE event_category AS ENUM (
    'music',
    'sports', 
    'arts',
    'food',
    'tech',
    'social',
    'business',
    'education',
    'family',
    'other'
);

-- Add category constraint
ALTER TABLE events ALTER COLUMN category TYPE event_category USING category::event_category;

-- Create some sample events
INSERT INTO events (title, description, date, category, is_featured, is_free, price_min, price_max, provider, external_id, latitude, longitude, city_id)
SELECT 
    'Toronto Tech Meetup',
    'Monthly technology networking event',
    CURRENT_DATE + INTERVAL '3 days',
    'tech',
    true,
    true,
    0,
    0,
    'meetup',
    'sample-tech-1',
    43.6532,
    -79.3832,
    cities.id
FROM cities WHERE slug = 'toronto'
ON CONFLICT (provider, external_id) DO NOTHING;

INSERT INTO events (title, description, date, category, is_featured, is_free, price_min, price_max, provider, external_id, latitude, longitude, city_id)
SELECT 
    'Jazz at Roy Thomson',
    'Evening of smooth jazz performances',
    CURRENT_DATE + INTERVAL '5 days',
    'music',
    true,
    false,
    25,
    85,
    'eventbrite',
    'sample-music-1',
    43.6532,
    -79.3832,
    cities.id
FROM cities WHERE slug = 'toronto'
ON CONFLICT (provider, external_id) DO NOTHING;

-- Basic RPC function for featured events
CREATE OR REPLACE FUNCTION get_featured_events(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    venue_id UUID,
    city_id UUID,
    category event_category,
    is_featured BOOLEAN,
    is_free BOOLEAN,
    price_min DECIMAL,
    price_max DECIMAL,
    image_url TEXT,
    external_url TEXT,
    provider VARCHAR,
    external_id VARCHAR,
    is_approved BOOLEAN,
    status VARCHAR,
    hotness_score INTEGER,
    latitude DECIMAL,
    longitude DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    venue JSONB,
    city JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.*,
        CASE WHEN v.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v.id,
                'name', v.name,
                'address', v.address,
                'latitude', v.latitude,
                'longitude', v.longitude
            )
        ELSE NULL END as venue,
        CASE WHEN c.id IS NOT NULL THEN
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug
            )
        ELSE NULL END as city
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE e.is_featured = true
      AND e.is_approved = true
      AND e.date >= CURRENT_DATE
    ORDER BY e.date ASC
    LIMIT limit_count;
END;
$$;

-- Basic RPC function for nearby events
CREATE OR REPLACE FUNCTION get_nearby_events(
    latitude DECIMAL, 
    longitude DECIMAL, 
    radius_miles INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    venue_id UUID,
    city_id UUID,
    category event_category,
    is_featured BOOLEAN,
    is_free BOOLEAN,
    price_min DECIMAL,
    price_max DECIMAL,
    image_url TEXT,
    external_url TEXT,
    provider VARCHAR,
    external_id VARCHAR,
    is_approved BOOLEAN,
    status VARCHAR,
    hotness_score INTEGER,
    latitude DECIMAL,
    longitude DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    venue JSONB,
    city JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.*,
        CASE WHEN v.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v.id,
                'name', v.name,
                'address', v.address,
                'latitude', v.latitude,
                'longitude', v.longitude
            )
        ELSE NULL END as venue,
        CASE WHEN c.id IS NOT NULL THEN
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug
            )
        ELSE NULL END as city
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE e.is_approved = true
      AND e.date >= CURRENT_DATE
      AND e.latitude IS NOT NULL
      AND e.longitude IS NOT NULL
    ORDER BY e.date ASC
    LIMIT limit_count;
END;
$$;