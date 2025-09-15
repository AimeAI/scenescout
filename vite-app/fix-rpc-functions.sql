-- Fix missing RPC functions for SceneScout

-- Create get_nearby_events function
CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DECIMAL DEFAULT NULL,
    user_lng DECIMAL DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 20
)
RETURNS SETOF events AS $$
BEGIN
    IF user_lat IS NULL OR user_lng IS NULL THEN
        -- Return all recent events if no location provided
        RETURN QUERY
        SELECT * FROM events
        WHERE date >= CURRENT_DATE
        ORDER BY date ASC, created_at DESC
        LIMIT limit_count;
    ELSE
        -- Return events with coordinates (simplified - no actual distance calculation)
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

-- Create get_featured_events function  
CREATE OR REPLACE FUNCTION get_featured_events(limit_count INTEGER DEFAULT 10)
RETURNS SETOF events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM events
    WHERE date >= CURRENT_DATE
    ORDER BY date ASC, created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_events TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_featured_events TO anon, authenticated;