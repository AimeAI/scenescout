-- SceneScout Advanced Features & Optimization
-- Migration: 20250915T100100_advanced_features.sql

-- ========================================
-- 1. DIVERSITY CAPS & SERIES MANAGEMENT
-- ========================================

-- Table to track venue/team series and enforce diversity
CREATE TABLE IF NOT EXISTS event_series_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_key TEXT NOT NULL, -- team name, venue name, or event title pattern
    series_type VARCHAR(20) NOT NULL CHECK (series_type IN ('venue', 'team', 'recurring', 'franchise')),
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    
    -- Diversity controls
    max_per_week INTEGER DEFAULT 2,
    max_per_month INTEGER DEFAULT 8,
    current_week_count INTEGER DEFAULT 0,
    current_month_count INTEGER DEFAULT 0,
    
    -- Series metadata
    base_title TEXT,
    venue_name TEXT,
    team_name TEXT,
    
    -- Tracking
    week_start_date DATE,
    month_start_date DATE,
    last_event_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(series_key, city, category)
);

-- Function to detect and manage event series
CREATE OR REPLACE FUNCTION manage_event_series()
RETURNS TRIGGER AS $$
DECLARE
    series_key TEXT;
    series_type VARCHAR(20);
    current_week DATE;
    current_month DATE;
BEGIN
    -- Calculate current week and month start dates
    current_week := date_trunc('week', NEW.event_date)::date;
    current_month := date_trunc('month', NEW.event_date)::date;
    
    -- Determine series key and type
    IF NEW.venue_name IS NOT NULL AND NEW.venue_name ILIKE '%stadium%' OR NEW.venue_name ILIKE '%arena%' THEN
        -- Sports venue series
        series_key := NEW.venue_name;
        series_type := 'venue';
    ELSIF NEW.title ~* '(vs\.|versus|@|\b\w+\s+(game|match|tournament)|\b\w+\s+team)' THEN
        -- Sports team series
        series_key := regexp_replace(NEW.title, '\s+(vs\.?|versus|@).*$', '', 'i');
        series_type := 'team';
    ELSIF NEW.title ~* '(every|weekly|daily|monthly|\b\w+\s+(series|show|class))' THEN
        -- Recurring series
        series_key := regexp_replace(NEW.title, '\s+\d{1,2}(/\d{1,2})?(/\d{2,4})?', '');
        series_type := 'recurring';
    ELSE
        -- No series detected
        RETURN NEW;
    END IF;
    
    -- Update or insert series tracking
    INSERT INTO event_series_tracking (
        series_key, series_type, city, category,
        base_title, venue_name, team_name,
        week_start_date, month_start_date,
        current_week_count, current_month_count,
        last_event_date
    ) VALUES (
        series_key, series_type, NEW.city, NEW.category,
        NEW.title, NEW.venue_name, 
        CASE WHEN series_type = 'team' THEN series_key ELSE NULL END,
        current_week, current_month,
        1, 1, NEW.event_date
    )
    ON CONFLICT (series_key, city, category) DO UPDATE SET
        current_week_count = CASE 
            WHEN event_series_tracking.week_start_date = current_week 
            THEN event_series_tracking.current_week_count + 1
            ELSE 1
        END,
        current_month_count = CASE 
            WHEN event_series_tracking.month_start_date = current_month 
            THEN event_series_tracking.current_month_count + 1
            ELSE 1
        END,
        week_start_date = current_week,
        month_start_date = current_month,
        last_event_date = NEW.event_date,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for series management
DROP TRIGGER IF EXISTS trigger_manage_series ON master_events;
CREATE TRIGGER trigger_manage_series
    AFTER INSERT ON master_events
    FOR EACH ROW
    EXECUTE FUNCTION manage_event_series();

-- ========================================
-- 2. API COST TRACKING & OPTIMIZATION
-- ========================================

-- Table to track API usage and costs
CREATE TABLE IF NOT EXISTS api_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT NOT NULL,
    endpoint TEXT,
    
    -- Usage metrics
    api_call_count INTEGER DEFAULT 0,
    events_retrieved INTEGER DEFAULT 0,
    unique_events_count INTEGER DEFAULT 0,
    
    -- Cost metrics
    cost_estimate NUMERIC DEFAULT 0.00,
    cost_per_call NUMERIC DEFAULT 0.01,
    
    -- Efficiency metrics
    efficiency_ratio NUMERIC GENERATED ALWAYS AS (
        CASE WHEN api_call_count > 0 
        THEN events_retrieved::numeric / api_call_count 
        ELSE 0 END
    ) STORED,
    
    -- Quality metrics
    avg_quality_score NUMERIC DEFAULT 0.0,
    high_quality_events INTEGER DEFAULT 0,
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_name, endpoint, period_start)
);

-- Function to select optimal source based on efficiency and cost
CREATE OR REPLACE FUNCTION select_optimal_source(
    p_category TEXT,
    p_city TEXT,
    p_max_cost NUMERIC DEFAULT 1.00
) RETURNS TABLE(
    source_name TEXT,
    efficiency_score NUMERIC,
    cost_score NUMERIC,
    overall_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.source_name,
        -- Efficiency score (0-1, higher is better)
        LEAST(1.0, COALESCE(aum.efficiency_ratio / 10.0, 0.1)) as efficiency_score,
        -- Cost score (0-1, lower cost = higher score)
        CASE WHEN aum.cost_estimate <= p_max_cost 
        THEN 1.0 - (aum.cost_estimate / p_max_cost)
        ELSE 0.0 END as cost_score,
        -- Overall score
        (
            0.4 * LEAST(1.0, COALESCE(aum.efficiency_ratio / 10.0, 0.1)) +
            0.3 * sh.success_rate +
            0.2 * CASE WHEN aum.cost_estimate <= p_max_cost 
                  THEN 1.0 - (aum.cost_estimate / p_max_cost)
                  ELSE 0.0 END +
            0.1 * COALESCE(aum.avg_quality_score / 5.0, 0.5)
        ) as overall_score
    FROM source_health sh
    LEFT JOIN api_usage_metrics aum ON sh.source_name = aum.source_name
        AND aum.period_start >= NOW() - INTERVAL '7 days'
    WHERE sh.is_active = true
    AND sh.success_rate > 0.5
    ORDER BY overall_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. REAL-TIME EVENT UPDATES
-- ========================================

-- Table for real-time event updates
CREATE TABLE IF NOT EXISTS event_updates_stream (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES master_events(id) ON DELETE CASCADE,
    update_type VARCHAR(20) NOT NULL CHECK (update_type IN ('new', 'update', 'soldout', 'cancelled', 'rescheduled')),
    
    -- Change details
    field_changes JSONB DEFAULT '{}',
    previous_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    
    -- Notification targeting
    affected_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    notification_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    change_severity VARCHAR(10) DEFAULT 'low' CHECK (change_severity IN ('low', 'medium', 'high', 'critical')),
    automated_update BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for real-time queries
CREATE INDEX IF NOT EXISTS ix_event_updates_stream_event_id ON event_updates_stream (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_event_updates_stream_notification ON event_updates_stream (notification_sent, created_at) WHERE notification_sent = false;

-- Function to track event changes
CREATE OR REPLACE FUNCTION track_event_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_severity VARCHAR(10) := 'low';
    field_changes JSONB := '{}';
    previous_vals JSONB := '{}';
    new_vals JSONB := '{}';
BEGIN
    -- Only track actual changes
    IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
        RETURN NEW;
    END IF;
    
    -- Build change tracking for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Check for critical changes
        IF OLD.event_date != NEW.event_date THEN
            change_severity := 'critical';
            field_changes := field_changes || '{"event_date": true}';
            previous_vals := previous_vals || jsonb_build_object('event_date', OLD.event_date);
            new_vals := new_vals || jsonb_build_object('event_date', NEW.event_date);
        END IF;
        
        IF OLD.venue_name != NEW.venue_name OR OLD.address != NEW.address THEN
            change_severity := GREATEST(change_severity, 'high');
            field_changes := field_changes || '{"venue": true}';
            previous_vals := previous_vals || jsonb_build_object('venue_name', OLD.venue_name, 'address', OLD.address);
            new_vals := new_vals || jsonb_build_object('venue_name', NEW.venue_name, 'address', NEW.address);
        END IF;
        
        IF OLD.price_min != NEW.price_min OR OLD.price_max != NEW.price_max THEN
            change_severity := GREATEST(change_severity, 'medium');
            field_changes := field_changes || '{"pricing": true}';
            previous_vals := previous_vals || jsonb_build_object('price_min', OLD.price_min, 'price_max', OLD.price_max);
            new_vals := new_vals || jsonb_build_object('price_min', NEW.price_min, 'price_max', NEW.price_max);
        END IF;
        
        -- Insert update record
        INSERT INTO event_updates_stream (
            event_id, update_type, field_changes, previous_values, new_values, change_severity
        ) VALUES (
            NEW.id, 'update', field_changes, previous_vals, new_vals, change_severity
        );
        
    ELSIF TG_OP = 'INSERT' THEN
        -- New event
        INSERT INTO event_updates_stream (
            event_id, update_type, change_severity
        ) VALUES (
            NEW.id, 'new', 'low'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for change tracking
DROP TRIGGER IF EXISTS trigger_track_changes ON master_events;
CREATE TRIGGER trigger_track_changes
    AFTER INSERT OR UPDATE ON master_events
    FOR EACH ROW
    EXECUTE FUNCTION track_event_changes();

-- ========================================
-- 4. USER DEMAND PREDICTION
-- ========================================

-- Table for demand forecasting
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    price_tier TEXT,
    
    -- Time-based demand
    forecast_date DATE NOT NULL,
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    hour_of_day INTEGER, -- 0-23
    
    -- Demand metrics
    predicted_searches INTEGER DEFAULT 0,
    predicted_bookings INTEGER DEFAULT 0,
    confidence_score NUMERIC DEFAULT 0.5, -- 0-1
    
    -- Weather/external factors
    weather_impact NUMERIC DEFAULT 0.0,
    event_impact NUMERIC DEFAULT 0.0, -- Impact of major events
    seasonal_multiplier NUMERIC DEFAULT 1.0,
    
    -- Historical basis
    based_on_periods INTEGER DEFAULT 4, -- Number of historical periods used
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(city, category, price_tier, forecast_date, hour_of_day)
);

-- Function to calculate demand score for job prioritization
CREATE OR REPLACE FUNCTION calculate_demand_priority(
    p_city TEXT,
    p_category TEXT,
    p_price_tier TEXT DEFAULT NULL,
    p_time_window INTERVAL DEFAULT '24 hours'
) RETURNS TABLE(
    priority_level TEXT,
    demand_score NUMERIC,
    reason TEXT
) AS $$
DECLARE
    current_hour INTEGER := EXTRACT(hour FROM NOW());
    current_dow INTEGER := EXTRACT(dow FROM NOW());
    avg_demand NUMERIC := 0;
    peak_hours INTEGER[] := ARRAY[17, 18, 19, 20]; -- 5-8 PM
    weekend_boost NUMERIC := 1.0;
BEGIN
    -- Check if it's weekend
    IF current_dow IN (0, 6) THEN
        weekend_boost := 1.5;
    END IF;
    
    -- Get historical demand
    SELECT COALESCE(AVG(predicted_searches), 5) INTO avg_demand
    FROM demand_forecasts
    WHERE city = p_city 
    AND category = p_category
    AND (p_price_tier IS NULL OR price_tier = p_price_tier)
    AND forecast_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Calculate priority
    IF current_hour = ANY(peak_hours) THEN
        RETURN QUERY SELECT 
            'critical'::TEXT, 
            avg_demand * 2.0 * weekend_boost,
            'Peak browsing hours'::TEXT;
    ELSIF avg_demand < 2 THEN
        RETURN QUERY SELECT 
            'high'::TEXT, 
            avg_demand * 1.5 * weekend_boost,
            'Low historical supply'::TEXT;
    ELSIF weekend_boost > 1.0 THEN
        RETURN QUERY SELECT 
            'normal'::TEXT, 
            avg_demand * weekend_boost,
            'Weekend demand boost'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'low'::TEXT, 
            avg_demand,
            'Standard demand period'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. EVENT SIMILARITY & RECOMMENDATIONS
-- ========================================

-- Table for event similarity scoring
CREATE TABLE IF NOT EXISTS event_similarities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id_1 UUID NOT NULL REFERENCES master_events(id) ON DELETE CASCADE,
    event_id_2 UUID NOT NULL REFERENCES master_events(id) ON DELETE CASCADE,
    
    -- Similarity scores (0-1)
    category_similarity NUMERIC DEFAULT 0.0,
    venue_similarity NUMERIC DEFAULT 0.0,
    time_similarity NUMERIC DEFAULT 0.0,
    price_similarity NUMERIC DEFAULT 0.0,
    title_similarity NUMERIC DEFAULT 0.0,
    
    -- Overall similarity score
    overall_similarity NUMERIC GENERATED ALWAYS AS (
        (category_similarity * 0.3) +
        (venue_similarity * 0.2) +
        (time_similarity * 0.2) +
        (price_similarity * 0.15) +
        (title_similarity * 0.15)
    ) STORED,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id_1, event_id_2),
    CHECK(event_id_1 != event_id_2)
);

-- Function to calculate event similarity
CREATE OR REPLACE FUNCTION calculate_event_similarity(
    event1_id UUID,
    event2_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    e1 RECORD;
    e2 RECORD;
    cat_sim NUMERIC := 0;
    venue_sim NUMERIC := 0;
    time_sim NUMERIC := 0;
    price_sim NUMERIC := 0;
    title_sim NUMERIC := 0;
BEGIN
    -- Get event data
    SELECT * INTO e1 FROM master_events WHERE id = event1_id;
    SELECT * INTO e2 FROM master_events WHERE id = event2_id;
    
    IF e1.id IS NULL OR e2.id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Category similarity
    cat_sim := CASE WHEN e1.category = e2.category THEN 1.0 ELSE 0.0 END;
    
    -- Venue similarity
    IF e1.venue_name IS NOT NULL AND e2.venue_name IS NOT NULL THEN
        venue_sim := CASE WHEN e1.venue_name = e2.venue_name THEN 1.0 
                     ELSE similarity(e1.venue_name, e2.venue_name) END;
    END IF;
    
    -- Time similarity (closer dates = higher similarity)
    time_sim := GREATEST(0, 1.0 - (ABS(EXTRACT(epoch FROM (e1.event_date - e2.event_date))) / 86400.0 / 30.0));
    
    -- Price similarity
    IF e1.price_tier IS NOT NULL AND e2.price_tier IS NOT NULL THEN
        price_sim := CASE WHEN e1.price_tier = e2.price_tier THEN 1.0 ELSE 0.3 END;
    END IF;
    
    -- Title similarity using trigram
    title_sim := similarity(e1.title, e2.title);
    
    -- Store the similarity scores
    INSERT INTO event_similarities (
        event_id_1, event_id_2, category_similarity, venue_similarity,
        time_similarity, price_similarity, title_similarity
    ) VALUES (
        LEAST(event1_id, event2_id), GREATEST(event1_id, event2_id),
        cat_sim, venue_sim, time_sim, price_sim, title_sim
    ) ON CONFLICT (event_id_1, event_id_2) DO UPDATE SET
        category_similarity = cat_sim,
        venue_similarity = venue_sim,
        time_similarity = time_sim,
        price_similarity = price_sim,
        title_similarity = title_sim,
        calculated_at = NOW();
    
    -- Return overall similarity
    RETURN (cat_sim * 0.3) + (venue_sim * 0.2) + (time_sim * 0.2) + (price_sim * 0.15) + (title_sim * 0.15);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. CAROUSEL OPTIMIZATION VIEWS
-- ========================================

-- View for diversity-optimized event feeds
CREATE OR REPLACE VIEW diversified_events_feed AS
WITH ranked_events AS (
    SELECT 
        me.*,
        ROW_NUMBER() OVER (
            PARTITION BY 
                CASE 
                    WHEN est.series_type IS NOT NULL THEN est.series_key
                    ELSE me.id::text
                END,
                date_trunc('week', me.event_date)
            ORDER BY me.quality_score_generated DESC NULLS LAST
        ) as series_rank,
        est.series_type,
        est.series_key,
        est.current_week_count
    FROM master_events me
    LEFT JOIN event_series_tracking est ON 
        (est.series_key = me.venue_name AND est.series_type = 'venue') OR
        (est.series_key = me.title AND est.series_type = 'recurring') OR
        (est.series_key = regexp_replace(me.title, '\s+(vs\.?|versus|@).*$', '', 'i') AND est.series_type = 'team')
    WHERE me.event_date >= CURRENT_DATE
)
SELECT *
FROM ranked_events
WHERE series_rank <= 2 -- Max 2 events per series per week
AND (current_week_count IS NULL OR current_week_count <= 3) -- Global weekly cap
ORDER BY quality_score_generated DESC NULLS LAST;

-- View for cost-optimized source selection
CREATE OR REPLACE VIEW optimal_sources_view AS
SELECT 
    source_name,
    efficiency_ratio,
    avg_quality_score,
    cost_estimate,
    RANK() OVER (ORDER BY 
        (efficiency_ratio * 0.4) + 
        (avg_quality_score * 0.3) + 
        ((1.0 - LEAST(cost_estimate, 1.0)) * 0.3)
    DESC) as optimization_rank
FROM api_usage_metrics
WHERE period_start >= NOW() - INTERVAL '7 days'
AND efficiency_ratio > 0;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '🚀 Advanced features successfully implemented!';
    RAISE NOTICE '✅ Features added:';
    RAISE NOTICE '   - Event series tracking with diversity caps';
    RAISE NOTICE '   - API cost optimization with source selection';
    RAISE NOTICE '   - Real-time event update streaming';
    RAISE NOTICE '   - Demand forecasting and prioritization';
    RAISE NOTICE '   - Event similarity scoring for recommendations';
    RAISE NOTICE '   - Diversified carousel feeds';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Usage examples:';
    RAISE NOTICE '   - SELECT * FROM select_optimal_source(''music'', ''Toronto'');';
    RAISE NOTICE '   - SELECT * FROM calculate_demand_priority(''Toronto'', ''food'');';
    RAISE NOTICE '   - SELECT * FROM diversified_events_feed LIMIT 20;';
END $$;