-- SceneScout v14 Remote Procedure Calls (RPC)
-- Complex queries and aggregations

-- Find events near a location
CREATE OR REPLACE FUNCTION find_nearby_events(
    lat DECIMAL,
    lon DECIMAL,
    radius_km INTEGER DEFAULT 10,
    limit_count INTEGER DEFAULT 50,
    event_date_filter DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    start_time TIME,
    venue_name VARCHAR,
    distance_km NUMERIC,
    location GEOGRAPHY,
    featured_image_url TEXT,
    categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.event_date,
        e.start_time,
        COALESCE(v.name, e.location_name) as venue_name,
        ST_Distance(e.location, ST_MakePoint(lon, lat)::geography) / 1000 as distance_km,
        e.location,
        e.featured_image_url,
        e.categories
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.deleted_at IS NULL
        AND e.location IS NOT NULL
        AND ST_DWithin(e.location, ST_MakePoint(lon, lat)::geography, radius_km * 1000)
        AND (event_date_filter IS NULL OR e.event_date >= event_date_filter)
        AND e.event_date >= CURRENT_DATE
    ORDER BY e.event_date, distance_km
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get trending events based on views and favorites
CREATE OR REPLACE FUNCTION get_trending_events(
    city_id_filter UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    venue_name VARCHAR,
    trending_score NUMERIC,
    view_count INTEGER,
    favorite_count BIGINT,
    featured_image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH event_stats AS (
        SELECT 
            e.id,
            COUNT(DISTINCT ev.id) as recent_views,
            COUNT(DISTINCT ue.id) FILTER (WHERE ue.is_favorite = true) as favorites
        FROM events e
        LEFT JOIN event_views ev ON e.id = ev.event_id 
            AND ev.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
        LEFT JOIN user_events ue ON e.id = ue.event_id
        WHERE e.deleted_at IS NULL
            AND e.event_date >= CURRENT_DATE
            AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
        GROUP BY e.id
    )
    SELECT 
        e.id,
        e.name,
        e.event_date,
        COALESCE(v.name, e.location_name) as venue_name,
        (es.recent_views * 2 + es.favorites * 5 + e.view_count * 0.1)::NUMERIC as trending_score,
        e.view_count,
        es.favorites as favorite_count,
        e.featured_image_url
    FROM events e
    JOIN event_stats es ON e.id = es.id
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE (es.recent_views > 0 OR es.favorites > 0 OR e.is_featured = true)
    ORDER BY trending_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search events by text
CREATE OR REPLACE FUNCTION search_events(
    search_query TEXT,
    city_id_filter UUID DEFAULT NULL,
    category_filter TEXT[] DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    event_date DATE,
    venue_name VARCHAR,
    city_name VARCHAR,
    categories JSONB,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.description,
        e.event_date,
        COALESCE(v.name, e.location_name) as venue_name,
        c.name as city_name,
        e.categories,
        ts_rank(
            to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')),
            plainto_tsquery('english', search_query)
        ) as relevance
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE e.deleted_at IS NULL
        AND (
            to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')) 
            @@ plainto_tsquery('english', search_query)
            OR e.name ILIKE '%' || search_query || '%'
        )
        AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
        AND (category_filter IS NULL OR e.categories ?| category_filter)
        AND (date_from IS NULL OR e.event_date >= date_from)
        AND (date_to IS NULL OR e.event_date <= date_to)
    ORDER BY relevance DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get user's upcoming events
CREATE OR REPLACE FUNCTION get_user_upcoming_events(
    user_id_param UUID,
    include_favorites BOOLEAN DEFAULT true,
    include_attending BOOLEAN DEFAULT true
)
RETURNS TABLE (
    event_id UUID,
    event_name VARCHAR,
    event_date DATE,
    start_time TIME,
    venue_name VARCHAR,
    is_favorite BOOLEAN,
    is_attending BOOLEAN,
    reminder_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.name as event_name,
        e.event_date,
        e.start_time,
        COALESCE(v.name, e.location_name) as venue_name,
        ue.is_favorite,
        ue.is_attending,
        ue.reminder_time
    FROM user_events ue
    JOIN events e ON ue.event_id = e.id
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE ue.user_id = user_id_param
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND (
            (include_favorites AND ue.is_favorite = true) OR
            (include_attending AND ue.is_attending = true)
        )
    ORDER BY e.event_date, e.start_time;
END;
$$ LANGUAGE plpgsql;

-- Get similar events
CREATE OR REPLACE FUNCTION get_similar_events(
    event_id_param UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    similarity_score NUMERIC
) AS $$
DECLARE
    source_event RECORD;
BEGIN
    -- Get source event details
    SELECT categories, tags, venue_id, city_id, event_date
    INTO source_event
    FROM events
    WHERE id = event_id_param AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.event_date,
        (
            -- Category similarity
            CASE WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(source_event.categories)) 
                THEN 5 ELSE 0 END +
            -- Tag similarity
            CASE WHEN e.tags ?| ARRAY(SELECT jsonb_array_elements_text(source_event.tags)) 
                THEN 3 ELSE 0 END +
            -- Same venue bonus
            CASE WHEN e.venue_id = source_event.venue_id THEN 4 ELSE 0 END +
            -- Same city bonus
            CASE WHEN e.city_id = source_event.city_id THEN 2 ELSE 0 END +
            -- Date proximity bonus (events close in time)
            CASE WHEN ABS(e.event_date - source_event.event_date) <= 7 THEN 1 ELSE 0 END
        )::NUMERIC as similarity_score
    FROM events e
    WHERE e.id != event_id_param
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND (
            e.categories ?| ARRAY(SELECT jsonb_array_elements_text(source_event.categories))
            OR e.tags ?| ARRAY(SELECT jsonb_array_elements_text(source_event.tags))
            OR e.venue_id = source_event.venue_id
        )
    ORDER BY similarity_score DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get event recommendations for user
CREATE OR REPLACE FUNCTION get_user_recommendations(
    user_id_param UUID,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    recommendation_score NUMERIC,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        -- Get user's preferred categories and venues from their history
        SELECT 
            jsonb_agg(DISTINCT cat) as preferred_categories,
            array_agg(DISTINCT e.venue_id) FILTER (WHERE e.venue_id IS NOT NULL) as preferred_venues,
            array_agg(DISTINCT e.city_id) as preferred_cities
        FROM user_events ue
        JOIN events e ON ue.event_id = e.id
        CROSS JOIN jsonb_array_elements_text(e.categories) as cat
        WHERE ue.user_id = user_id_param
            AND (ue.is_favorite = true OR ue.is_attending = true)
    )
    SELECT 
        e.id,
        e.name,
        e.event_date,
        (
            -- Category match
            CASE WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(up.preferred_categories))
                THEN 5 ELSE 0 END +
            -- Venue match
            CASE WHEN e.venue_id = ANY(up.preferred_venues) THEN 4 ELSE 0 END +
            -- City match
            CASE WHEN e.city_id = ANY(up.preferred_cities) THEN 3 ELSE 0 END +
            -- Featured bonus
            CASE WHEN e.is_featured THEN 2 ELSE 0 END +
            -- Trending bonus
            CASE WHEN e.view_count > 100 THEN 1 ELSE 0 END
        )::NUMERIC as recommendation_score,
        CASE 
            WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(up.preferred_categories))
                THEN 'Based on your interests'
            WHEN e.venue_id = ANY(up.preferred_venues) 
                THEN 'At a venue you like'
            WHEN e.city_id = ANY(up.preferred_cities)
                THEN 'In your preferred city'
            ELSE 'Trending event'
        END as reason
    FROM events e
    CROSS JOIN user_preferences up
    WHERE e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND e.id NOT IN (
            SELECT event_id FROM user_events WHERE user_id = user_id_param
        )
    ORDER BY recommendation_score DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Aggregate venue statistics
CREATE OR REPLACE FUNCTION get_venue_stats(venue_id_param UUID)
RETURNS TABLE (
    total_events BIGINT,
    upcoming_events BIGINT,
    total_views BIGINT,
    avg_event_attendance NUMERIC,
    popular_categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT e.id) FILTER (WHERE e.event_date >= CURRENT_DATE) as upcoming_events,
        SUM(e.view_count) as total_views,
        AVG(e.attendee_count)::NUMERIC as avg_event_attendance,
        jsonb_agg(DISTINCT cat ORDER BY cat) as popular_categories
    FROM events e
    CROSS JOIN LATERAL jsonb_array_elements_text(e.categories) as cat
    WHERE e.venue_id = venue_id_param
        AND e.deleted_at IS NULL
    GROUP BY e.venue_id;
END;
$$ LANGUAGE plpgsql;

-- Get city event calendar
CREATE OR REPLACE FUNCTION get_city_calendar(
    city_id_param UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    event_date DATE,
    event_count BIGINT,
    featured_event JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_events AS (
        SELECT 
            e.event_date,
            COUNT(*) as event_count,
            jsonb_build_object(
                'id', (ARRAY_AGG(e.id ORDER BY e.is_featured DESC, e.view_count DESC))[1],
                'name', (ARRAY_AGG(e.name ORDER BY e.is_featured DESC, e.view_count DESC))[1],
                'image', (ARRAY_AGG(e.featured_image_url ORDER BY e.is_featured DESC, e.view_count DESC))[1]
            ) as featured_event
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.event_date BETWEEN start_date AND end_date
        GROUP BY e.event_date
    )
    SELECT * FROM daily_events
    ORDER BY event_date;
END;
$$ LANGUAGE plpgsql;