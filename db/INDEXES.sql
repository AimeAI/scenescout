-- SceneScout v14 Performance Indexes
-- This file contains all performance indexes for optimized queries

-- Event indexes for common queries
CREATE INDEX idx_events_date ON events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_city_date ON events(city_id, event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_venue ON events(venue_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_events_slug ON events(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_created_by ON events(created_by) WHERE deleted_at IS NULL;

-- Geospatial indexes for location-based queries
CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- JSONB indexes for array searches
CREATE INDEX idx_events_categories ON events USING GIN(categories);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_venues_amenities ON venues USING GIN(amenities);

-- Text search indexes
CREATE INDEX idx_events_name_trgm ON events USING GIN(name gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING GIN(description gin_trgm_ops);
CREATE INDEX idx_venues_name_trgm ON venues USING GIN(name gin_trgm_ops);
CREATE INDEX idx_cities_name_trgm ON cities USING GIN(name gin_trgm_ops);

-- Full text search indexes
CREATE INDEX idx_events_search ON events USING GIN(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);
CREATE INDEX idx_venues_search ON venues USING GIN(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- User-related indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- User events (favorites/saved)
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_event_id ON user_events(event_id);
CREATE INDEX idx_user_events_favorites ON user_events(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_events_attending ON user_events(user_id, is_attending) WHERE is_attending = true;
CREATE INDEX idx_user_events_reminder ON user_events(reminder_time) WHERE reminder_sent = false AND reminder_time IS NOT NULL;

-- Plans indexes
CREATE INDEX idx_plans_user_id ON plans(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_public ON plans(is_public) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX idx_plans_city ON plans(city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_share_token ON plans(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_plan_events_plan_id ON plan_events(plan_id);
CREATE INDEX idx_plan_events_event_id ON plan_events(event_id);

-- Venue indexes
CREATE INDEX idx_venues_city ON venues(city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_type ON venues(venue_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_slug ON venues(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_verified ON venues(is_verified) WHERE is_verified = true AND deleted_at IS NULL;

-- City indexes
CREATE INDEX idx_cities_slug ON cities(slug) WHERE is_active = true;
CREATE INDEX idx_cities_state ON cities(state_code) WHERE is_active = true;
CREATE INDEX idx_cities_country ON cities(country_code) WHERE is_active = true;

-- Submission indexes
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_type_status ON submissions(submission_type, status);
CREATE INDEX idx_submissions_pending ON submissions(submitted_at) WHERE status = 'pending';

-- Promotion indexes
CREATE INDEX idx_promotions_active ON promotions(start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_promotions_type ON promotions(promotion_type) WHERE is_active = true;
CREATE INDEX idx_promotions_city ON promotions(city_id) WHERE is_active = true;
CREATE INDEX idx_promotions_entity ON promotions(entity_id) WHERE entity_id IS NOT NULL;

-- Push subscription indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Analytics indexes
CREATE INDEX idx_event_views_event ON event_views(event_id);
CREATE INDEX idx_event_views_user ON event_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_views_date ON event_views(viewed_at);
CREATE INDEX idx_event_views_event_date ON event_views(event_id, viewed_at);

CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_date ON user_activities(created_at);
CREATE INDEX idx_user_activities_entity ON user_activities(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX idx_events_upcoming ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE;

CREATE INDEX idx_events_past ON events(city_id, event_date DESC, start_time DESC) 
    WHERE deleted_at IS NULL AND event_date < CURRENT_DATE;

-- Partial indexes for performance
CREATE INDEX idx_events_today ON events(city_id, start_time) 
    WHERE deleted_at IS NULL AND event_date = CURRENT_DATE;

CREATE INDEX idx_events_this_week ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE AND event_date < CURRENT_DATE + INTERVAL '7 days';

CREATE INDEX idx_events_this_weekend ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND EXTRACT(DOW FROM event_date) IN (0, 5, 6);

-- Index for finding nearby events efficiently
CREATE INDEX idx_events_location_date ON events USING GIST(location, event_date) WHERE deleted_at IS NULL;