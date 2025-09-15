-- SceneScout Core Database Schema Migration
-- This migration creates the essential tables and indexes needed by the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Cities table - predefined cities for events
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'US',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timezone TEXT,
    population INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Venues table - locations where events are held
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    capacity INTEGER,
    venue_type TEXT,
    phone TEXT,
    website TEXT,
    amenities TEXT[],
    images TEXT[],
    operating_hours JSONB,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events table - main events data  
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    end_date DATE,
    end_time TIME,
    timezone TEXT,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    venue_name TEXT, -- For events without venue record
    address TEXT,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    category TEXT CHECK (category IN ('music', 'sports', 'arts', 'food', 'tech', 'social', 'business', 'education', 'family', 'other')) DEFAULT 'other',
    subcategory TEXT,
    tags TEXT[],
    is_free BOOLEAN DEFAULT false,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    capacity INTEGER,
    attendance_estimate INTEGER,
    image_url TEXT,
    video_url TEXT,
    external_url TEXT,
    external_id TEXT,
    source TEXT, -- 'eventbrite', 'manual', etc.
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_featured BOOLEAN DEFAULT false,
    popularity_score REAL DEFAULT 0,
    hotness_score REAL DEFAULT 0,
    rating REAL,
    reviews_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    provider TEXT, -- alias for source for compatibility
    url TEXT, -- alias for external_url for compatibility
    starts_at TIMESTAMPTZ GENERATED ALWAYS AS (
        CASE 
            WHEN time IS NOT NULL THEN (date::text || ' ' || time::text)::timestamptz
            ELSE date::timestamptz
        END
    ) STORED,
    ends_at TIMESTAMPTZ GENERATED ALWAYS AS (
        CASE 
            WHEN end_date IS NOT NULL AND end_time IS NOT NULL THEN (end_date::text || ' ' || end_time::text)::timestamptz
            WHEN end_date IS NOT NULL THEN end_date::timestamptz
            ELSE NULL
        END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table - user profiles with subscription info
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE, -- References auth.users but no FK constraint for Supabase compatibility
    email TEXT UNIQUE,
    display_name TEXT,
    full_name TEXT, -- Alias for display_name for compatibility
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    subscription_expires_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User event saves/interactions
CREATE TABLE IF NOT EXISTS user_event_saves (
    user_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

-- Alternative name for user_events table for compatibility
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    type TEXT CHECK (type IN ('saved', 'attended', 'interested')) DEFAULT 'saved',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    UNIQUE(user_id, event_id)
);

-- Plans - user-created event collections
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    is_public BOOLEAN DEFAULT false,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plan events - events within a plan
CREATE TABLE IF NOT EXISTS plan_events (
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0, -- Order within plan
    order_index INTEGER NOT NULL DEFAULT 0, -- Alias for position for compatibility
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (plan_id, event_id)
);

-- Signals - user interaction tracking for ML/recommendations
CREATE TABLE IF NOT EXISTS signals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- 'view', 'save', 'click', 'share', etc.
    weight REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON events(city_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_provider_external_id ON events(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_events_source_external_id ON events(source, external_id);
CREATE INDEX IF NOT EXISTS idx_events_hotness_score ON events(hotness_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_city_id ON venues(city_id);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON cities(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(type);
CREATE INDEX IF NOT EXISTS idx_user_event_saves_user_id ON user_event_saves(user_id);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_public ON plans(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_signals_user_id ON signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_event_id ON signals(event_id);
CREATE INDEX IF NOT EXISTS idx_signals_kind ON signals(kind);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Public read access for core data
CREATE POLICY "Cities are viewable by everyone" ON cities FOR SELECT USING (true);
CREATE POLICY "Venues are viewable by everyone" ON venues FOR SELECT USING (true);
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);

-- User-scoped policies  
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own event saves" ON user_event_saves FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own user events" ON user_events FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plans" ON plans FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can manage own plans" ON plans FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own plan events" ON plan_events 
    FOR ALL USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_events.plan_id AND plans.user_id = auth.uid()));

CREATE POLICY "Users can manage own signals" ON signals FOR ALL USING (auth.uid() = user_id);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();