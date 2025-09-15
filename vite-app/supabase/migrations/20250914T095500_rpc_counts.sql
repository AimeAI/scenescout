-- SceneScout v14 Count Functions for Pagination
-- This file contains RPC functions that return counts for efficient pagination

-- Get total count of events with filters
CREATE OR REPLACE FUNCTION count_events(
    city_id_filter UUID DEFAULT NULL,
    category_filter TEXT[] DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    venue_id_filter UUID DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    is_featured_only BOOLEAN DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        WHERE e.deleted_at IS NULL
            AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
            AND (category_filter IS NULL OR e.categories ?| category_filter)
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
            AND (venue_id_filter IS NULL OR e.venue_id = venue_id_filter)
            AND (is_featured_only IS NULL OR e.is_featured = is_featured_only)
            AND (
                search_query IS NULL OR
                to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')) 
                @@ plainto_tsquery('english', search_query)
                OR e.name ILIKE '%' || search_query || '%'
            )
    );
END;
$$ LANGUAGE plpgsql;

-- Get total count of venues with filters
CREATE OR REPLACE FUNCTION count_venues(
    city_id_filter UUID DEFAULT NULL,
    venue_type_filter VARCHAR DEFAULT NULL,
    is_verified_only BOOLEAN DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM venues v
        WHERE v.deleted_at IS NULL
            AND v.is_active = true
            AND (city_id_filter IS NULL OR v.city_id = city_id_filter)
            AND (venue_type_filter IS NULL OR v.venue_type = venue_type_filter)
            AND (is_verified_only IS NULL OR v.is_verified = is_verified_only)
            AND (
                search_query IS NULL OR
                to_tsvector('english', coalesce(v.name, '') || ' ' || coalesce(v.description, '')) 
                @@ plainto_tsquery('english', search_query)
                OR v.name ILIKE '%' || search_query || '%'
            )
    );
END;
$$ LANGUAGE plpgsql;

-- Count user's events (favorites/saved)
CREATE OR REPLACE FUNCTION count_user_events(
    user_id_param UUID,
    is_favorite_filter BOOLEAN DEFAULT NULL,
    is_attending_filter BOOLEAN DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_events ue
        JOIN events e ON ue.event_id = e.id
        WHERE ue.user_id = user_id_param
            AND e.deleted_at IS NULL
            AND (is_favorite_filter IS NULL OR ue.is_favorite = is_favorite_filter)
            AND (is_attending_filter IS NULL OR ue.is_attending = is_attending_filter)
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user's plans
CREATE OR REPLACE FUNCTION count_user_plans(
    user_id_param UUID,
    is_public_filter BOOLEAN DEFAULT NULL,
    city_id_filter UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plans p
        WHERE p.user_id = user_id_param
            AND p.deleted_at IS NULL
            AND (is_public_filter IS NULL OR p.is_public = is_public_filter)
            AND (city_id_filter IS NULL OR p.city_id = city_id_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count public plans
CREATE OR REPLACE FUNCTION count_public_plans(
    city_id_filter UUID DEFAULT NULL,
    date_filter DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plans p
        WHERE p.is_public = true
            AND p.deleted_at IS NULL
            AND (city_id_filter IS NULL OR p.city_id = city_id_filter)
            AND (date_filter IS NULL OR p.date = date_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count submissions by status
CREATE OR REPLACE FUNCTION count_submissions(
    status_filter VARCHAR DEFAULT NULL,
    submission_type_filter VARCHAR DEFAULT NULL,
    user_id_filter UUID DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM submissions s
        WHERE (status_filter IS NULL OR s.status = status_filter)
            AND (submission_type_filter IS NULL OR s.submission_type = submission_type_filter)
            AND (user_id_filter IS NULL OR s.user_id = user_id_filter)
            AND (date_from IS NULL OR s.submitted_at >= date_from)
            AND (date_to IS NULL OR s.submitted_at <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user reviews
CREATE OR REPLACE FUNCTION count_user_reviews(
    user_id_param UUID,
    entity_type_filter VARCHAR DEFAULT NULL,
    rating_filter INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_reviews ur
        WHERE ur.user_id = user_id_param
            AND (entity_type_filter IS NULL OR ur.entity_type = entity_type_filter)
            AND (rating_filter IS NULL OR ur.rating = rating_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count reviews for entity
CREATE OR REPLACE FUNCTION count_entity_reviews(
    entity_type_param VARCHAR,
    entity_id_param UUID,
    rating_filter INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_reviews ur
        WHERE ur.entity_type = entity_type_param
            AND ur.entity_id = entity_id_param
            AND (rating_filter IS NULL OR ur.rating = rating_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count nearby events
CREATE OR REPLACE FUNCTION count_nearby_events(
    lat DECIMAL,
    lon DECIMAL,
    radius_km INTEGER DEFAULT 10,
    event_date_filter DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.deleted_at IS NULL
            AND e.location IS NOT NULL
            AND ST_DWithin(e.location, ST_MakePoint(lon, lat)::geography, radius_km * 1000)
            AND (event_date_filter IS NULL OR e.event_date >= event_date_filter)
            AND e.event_date >= CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Count events by venue
CREATE OR REPLACE FUNCTION count_venue_events(
    venue_id_param UUID,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    include_past BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.venue_id = venue_id_param
            AND e.deleted_at IS NULL
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
            AND (include_past OR e.event_date >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user followers
CREATE OR REPLACE FUNCTION count_user_followers(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_follows uf
        WHERE uf.following_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count user following
CREATE OR REPLACE FUNCTION count_user_following(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_follows uf
        WHERE uf.follower_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count notifications
CREATE OR REPLACE FUNCTION count_user_notifications(
    user_id_param UUID,
    status_filter VARCHAR DEFAULT NULL,
    notification_type_filter VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM push_notification_queue pnq
        WHERE pnq.user_id = user_id_param
            AND (status_filter IS NULL OR pnq.status = status_filter)
            AND (notification_type_filter IS NULL OR pnq.notification_type = notification_type_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count plan collaborators
CREATE OR REPLACE FUNCTION count_plan_collaborators(
    plan_id_param UUID,
    role_filter VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plan_collaborators pc
        WHERE pc.plan_id = plan_id_param
            AND pc.accepted_at IS NOT NULL
            AND (role_filter IS NULL OR pc.role = role_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count events in date range for city
CREATE OR REPLACE FUNCTION count_city_events_by_date_range(
    city_id_param UUID,
    start_date DATE,
    end_date DATE
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.event_date BETWEEN start_date AND end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Count template usage
CREATE OR REPLACE FUNCTION count_template_usage(template_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plan_template_usage ptu
        WHERE ptu.template_id = template_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count active subscriptions
CREATE OR REPLACE FUNCTION count_active_subscriptions()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM subscriptions s
        WHERE s.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Count events by category in city
CREATE OR REPLACE FUNCTION count_events_by_category(
    city_id_param UUID,
    category TEXT,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.categories ? category
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count unique visitors for analytics
CREATE OR REPLACE FUNCTION count_unique_event_viewers(
    event_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, session_id))::INTEGER
        FROM event_views ev
        WHERE ev.event_id = event_id_param
            AND ev.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    );
END;
$$ LANGUAGE plpgsql;