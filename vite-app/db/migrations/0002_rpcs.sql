-- SceneScout RPC Functions Migration
-- This migration creates the RPC functions expected by the application

-- Function to get events grouped by category with limit per category
CREATE OR REPLACE FUNCTION get_events_by_category(
    categories TEXT[] DEFAULT NULL,
    limit_per_category INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    hotness_score REAL,
    is_featured BOOLEAN,
    price_min DECIMAL,
    price_max DECIMAL,
    is_free BOOLEAN,
    date DATE,
    time TIME
) 
SECURITY DEFINER
AS $$
BEGIN
    -- If no categories specified, get events from all categories
    IF categories IS NULL OR array_length(categories, 1) IS NULL THEN
        categories := ARRAY['music', 'sports', 'arts', 'food', 'tech', 'social', 'business', 'education', 'family', 'other'];
    END IF;

    RETURN QUERY
    WITH ranked_events AS (
        SELECT 
            e.id,
            e.title,
            e.description,
            e.image_url,
            e.category,
            e.starts_at,
            e.venue_id,
            COALESCE(e.venue_name, v.name) as venue_name,
            e.city_id,
            e.hotness_score,
            e.is_featured,
            e.price_min,
            e.price_max,
            e.is_free,
            e.date,
            e.time,
            ROW_NUMBER() OVER (
                PARTITION BY e.category 
                ORDER BY e.is_featured DESC, e.hotness_score DESC, e.starts_at ASC
            ) as rn
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        WHERE e.category = ANY(categories)
          AND e.date >= CURRENT_DATE
          AND (e.starts_at IS NULL OR e.starts_at >= NOW())
    )
    SELECT 
        re.id,
        re.title,
        re.description,
        re.image_url,
        re.category,
        re.starts_at,
        re.venue_id,
        re.venue_name,
        re.city_id,
        re.hotness_score,
        re.is_featured,
        re.price_min,
        re.price_max,
        re.is_free,
        re.date,
        re.time
    FROM ranked_events re
    WHERE re.rn <= limit_per_category
    ORDER BY re.category, re.is_featured DESC, re.hotness_score DESC, re.starts_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to search events with comprehensive filters
CREATE OR REPLACE FUNCTION search_events(
    p_city_slug TEXT DEFAULT NULL,
    p_cats TEXT[] DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL,
    p_price_min INT DEFAULT NULL,
    p_price_max INT DEFAULT NULL,
    p_bbox FLOAT8[] DEFAULT NULL, -- [minLng, minLat, maxLng, maxLat]
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    city_name TEXT,
    hotness_score REAL,
    is_featured BOOLEAN,
    price_min DECIMAL,
    price_max DECIMAL,
    is_free BOOLEAN,
    date DATE,
    time TIME,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    total_count BIGINT
)
SECURITY DEFINER
AS $$
DECLARE
    total_records BIGINT;
BEGIN
    -- First get the total count for pagination
    SELECT COUNT(*)
    INTO total_records
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE (p_city_slug IS NULL OR c.slug = p_city_slug)
      AND (p_cats IS NULL OR e.category = ANY(p_cats))
      AND (p_start IS NULL OR e.starts_at >= p_start OR (e.starts_at IS NULL AND e.date >= p_start::date))
      AND (p_end IS NULL OR e.starts_at <= p_end OR (e.starts_at IS NULL AND e.date <= p_end::date))
      AND (p_price_min IS NULL OR e.price_min >= p_price_min OR e.is_free = true)
      AND (p_price_max IS NULL OR e.price_max <= p_price_max OR e.is_free = true)
      AND (p_bbox IS NULL OR 
           (COALESCE(e.latitude, v.latitude) BETWEEN p_bbox[2] AND p_bbox[4] AND
            COALESCE(e.longitude, v.longitude) BETWEEN p_bbox[1] AND p_bbox[3]))
      AND e.date >= CURRENT_DATE;

    -- Return the paginated results with total count
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.category,
        e.starts_at,
        e.venue_id,
        COALESCE(e.venue_name, v.name) as venue_name,
        e.city_id,
        c.name as city_name,
        e.hotness_score,
        e.is_featured,
        e.price_min,
        e.price_max,
        e.is_free,
        e.date,
        e.time,
        COALESCE(e.latitude, v.latitude) as latitude,
        COALESCE(e.longitude, v.longitude) as longitude,
        total_records as total_count
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE (p_city_slug IS NULL OR c.slug = p_city_slug)
      AND (p_cats IS NULL OR e.category = ANY(p_cats))
      AND (p_start IS NULL OR e.starts_at >= p_start OR (e.starts_at IS NULL AND e.date >= p_start::date))
      AND (p_end IS NULL OR e.starts_at <= p_end OR (e.starts_at IS NULL AND e.date <= p_end::date))
      AND (p_price_min IS NULL OR e.price_min >= p_price_min OR e.is_free = true)
      AND (p_price_max IS NULL OR e.price_max <= p_price_max OR e.is_free = true)
      AND (p_bbox IS NULL OR 
           (COALESCE(e.latitude, v.latitude) BETWEEN p_bbox[2] AND p_bbox[4] AND
            COALESCE(e.longitude, v.longitude) BETWEEN p_bbox[1] AND p_bbox[3]))
      AND e.date >= CURRENT_DATE
    ORDER BY e.is_featured DESC, e.hotness_score DESC, e.starts_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to record user signals for ML/recommendations
CREATE OR REPLACE FUNCTION record_signal(
    p_user UUID,
    p_event UUID,
    p_kind TEXT,
    p_weight REAL DEFAULT 1.0
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the signal
    INSERT INTO signals (user_id, event_id, kind, weight, created_at)
    VALUES (p_user, p_event, p_kind, p_weight, NOW());
    
    -- Update event hotness score based on recent signals
    -- Simple algorithm: increment hotness by weight, with decay over time
    UPDATE events 
    SET hotness_score = COALESCE(hotness_score, 0) + (p_weight * 0.1)
    WHERE id = p_event;
    
    -- Also increment view count if it's a view signal
    IF p_kind = 'view' THEN
        UPDATE events 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_event;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's saved events (used by hooks)
CREATE OR REPLACE FUNCTION get_user_saved_events(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    date DATE,
    time TIME,
    saved_at TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.category,
        e.starts_at,
        e.venue_id,
        COALESCE(e.venue_name, v.name) as venue_name,
        e.city_id,
        e.date,
        e.time,
        ues.created_at as saved_at
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    INNER JOIN user_event_saves ues ON e.id = ues.event_id
    WHERE ues.user_id = p_user_id
      AND e.date >= CURRENT_DATE
    ORDER BY ues.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get featured events (used by home page)
CREATE OR REPLACE FUNCTION get_featured_events(
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    hotness_score REAL,
    date DATE,
    time TIME
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.category,
        e.starts_at,
        e.venue_id,
        COALESCE(e.venue_name, v.name) as venue_name,
        e.city_id,
        e.hotness_score,
        e.date,
        e.time
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.is_featured = true
      AND e.date >= CURRENT_DATE
      AND (e.starts_at IS NULL OR e.starts_at >= NOW())
    ORDER BY e.hotness_score DESC, e.starts_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get events by city (used by category rows)
CREATE OR REPLACE FUNCTION get_events_by_city(
    p_city_slug TEXT,
    p_limit_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    hotness_score REAL,
    date DATE,
    time TIME
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.category,
        e.starts_at,
        e.venue_id,
        COALESCE(e.venue_name, v.name) as venue_name,
        e.city_id,
        e.hotness_score,
        e.date,
        e.time
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE c.slug = p_city_slug
      AND e.date >= CURRENT_DATE
      AND (e.starts_at IS NULL OR e.starts_at >= NOW())
    ORDER BY e.is_featured DESC, e.hotness_score DESC, e.starts_at ASC
    LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby events (used by map page)
CREATE OR REPLACE FUNCTION get_nearby_events(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    venue_id UUID,
    venue_name TEXT,
    city_id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    date DATE,
    time TIME
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.image_url,
        e.category,
        e.starts_at,
        e.venue_id,
        COALESCE(e.venue_name, v.name) as venue_name,
        e.city_id,
        COALESCE(e.latitude, v.latitude) as latitude,
        COALESCE(e.longitude, v.longitude) as longitude,
        -- Calculate distance using Haversine formula
        (6371 * acos(
            cos(radians(p_lat)) * 
            cos(radians(COALESCE(e.latitude, v.latitude))) * 
            cos(radians(COALESCE(e.longitude, v.longitude)) - radians(p_lng)) + 
            sin(radians(p_lat)) * 
            sin(radians(COALESCE(e.latitude, v.latitude)))
        )) as distance_km,
        e.date,
        e.time
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE COALESCE(e.latitude, v.latitude) IS NOT NULL
      AND COALESCE(e.longitude, v.longitude) IS NOT NULL
      AND e.date >= CURRENT_DATE
      AND (e.starts_at IS NULL OR e.starts_at >= NOW())
      -- Pre-filter with a bounding box for performance
      AND COALESCE(e.latitude, v.latitude) BETWEEN p_lat - (p_radius_km/111.32) AND p_lat + (p_radius_km/111.32)
      AND COALESCE(e.longitude, v.longitude) BETWEEN p_lng - (p_radius_km/(111.32 * cos(radians(p_lat)))) AND p_lng + (p_radius_km/(111.32 * cos(radians(p_lat))))
    HAVING (6371 * acos(
        cos(radians(p_lat)) * 
        cos(radians(COALESCE(e.latitude, v.latitude))) * 
        cos(radians(COALESCE(e.longitude, v.longitude)) - radians(p_lng)) + 
        sin(radians(p_lat)) * 
        sin(radians(COALESCE(e.latitude, v.latitude)))
    )) <= p_radius_km
    ORDER BY distance_km ASC, e.starts_at ASC;
END;
$$ LANGUAGE plpgsql;