-- SceneScout v14 Analytics and Metrics Tables
-- This file contains tables for tracking application metrics and analytics

-- Daily active users
CREATE TABLE daily_active_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    user_count INTEGER NOT NULL DEFAULT 0,
    new_user_count INTEGER NOT NULL DEFAULT 0,
    returning_user_count INTEGER NOT NULL DEFAULT 0,
    city_breakdown JSONB DEFAULT '{}', -- User counts by city
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Event engagement metrics
CREATE TABLE event_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_viewer_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    attendee_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    click_through_count INTEGER DEFAULT 0, -- Clicks to external ticket link
    avg_view_duration NUMERIC, -- Average seconds spent viewing
    source_breakdown JSONB DEFAULT '{}', -- Views by traffic source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, date)
);

-- Venue performance metrics
CREATE TABLE venue_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of month
    total_events INTEGER DEFAULT 0,
    total_event_views INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    avg_event_rating NUMERIC,
    popular_event_types JSONB DEFAULT '[]', -- Array of popular categories
    peak_days JSONB DEFAULT '[]', -- Days of week with most events
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, month)
);

-- Search analytics
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    city_id UUID REFERENCES cities(id),
    result_count INTEGER DEFAULT 0,
    clicked_result_position INTEGER, -- Which result they clicked (1-based)
    clicked_event_id UUID REFERENCES events(id),
    search_filters JSONB DEFAULT '{}', -- Applied filters
    search_type VARCHAR(50), -- text, category, date_range, etc.
    device_type VARCHAR(20), -- mobile, tablet, desktop
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User behavior funnel
CREATE TABLE user_behavior_funnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    funnel_step VARCHAR(50) NOT NULL, -- landing, browse, view_event, save_event, click_ticket
    event_id UUID REFERENCES events(id),
    city_id UUID REFERENCES cities(id),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_funnel_session (session_id, timestamp)
);

-- City activity metrics
CREATE TABLE city_activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID NOT NULL REFERENCES cities(id),
    week_start DATE NOT NULL,
    total_events INTEGER DEFAULT 0,
    total_venues INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    popular_categories JSONB DEFAULT '[]',
    trending_venues JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_id, week_start)
);

-- Feature usage tracking
CREATE TABLE feature_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    feature_name VARCHAR(100) NOT NULL, -- search, filter, save_event, create_plan, etc.
    feature_category VARCHAR(50), -- discovery, planning, social, etc.
    usage_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feature_name, date)
);

-- Page performance metrics
CREATE TABLE page_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_visitor_count INTEGER DEFAULT 0,
    avg_load_time_ms INTEGER,
    avg_time_on_page_seconds INTEGER,
    bounce_rate NUMERIC(5,2), -- Percentage
    exit_rate NUMERIC(5,2), -- Percentage
    device_breakdown JSONB DEFAULT '{}', -- Views by device type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_path, date)
);

-- Revenue metrics
CREATE TABLE revenue_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    subscription_revenue DECIMAL(10, 2) DEFAULT 0,
    promotion_revenue DECIMAL(10, 2) DEFAULT 0,
    new_subscriber_count INTEGER DEFAULT 0,
    churned_subscriber_count INTEGER DEFAULT 0,
    total_active_subscribers INTEGER DEFAULT 0,
    avg_revenue_per_user DECIMAL(10, 2),
    revenue_by_plan JSONB DEFAULT '{}', -- Revenue breakdown by subscription plan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Notification metrics
CREATE TABLE notification_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(50) NOT NULL, -- event_reminder, new_events, plan_shared, etc.
    date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    delivery_rate NUMERIC(5,2), -- Percentage
    open_rate NUMERIC(5,2), -- Percentage  
    click_rate NUMERIC(5,2), -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_type, date)
);

-- A/B test results
CREATE TABLE ab_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL, -- control, variant_a, variant_b, etc.
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    metric_name VARCHAR(100) NOT NULL, -- conversion, engagement, retention, etc.
    metric_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error tracking
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    page_path VARCHAR(255),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for metrics tables
CREATE INDEX idx_daily_active_users_date ON daily_active_users(date DESC);
CREATE INDEX idx_event_engagement_date ON event_engagement_metrics(date DESC);
CREATE INDEX idx_event_engagement_event ON event_engagement_metrics(event_id);
CREATE INDEX idx_venue_performance_venue ON venue_performance_metrics(venue_id);
CREATE INDEX idx_venue_performance_month ON venue_performance_metrics(month DESC);
CREATE INDEX idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX idx_search_analytics_date ON search_analytics(searched_at DESC);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_behavior_funnel_user ON user_behavior_funnel(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_city_activity_city ON city_activity_metrics(city_id);
CREATE INDEX idx_feature_usage_user_date ON feature_usage(user_id, date) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_name, date);
CREATE INDEX idx_page_performance_path_date ON page_performance_metrics(page_path, date DESC);
CREATE INDEX idx_revenue_metrics_date ON revenue_metrics(date DESC);
CREATE INDEX idx_notification_metrics_type_date ON notification_metrics(notification_type, date DESC);
CREATE INDEX idx_ab_test_results_test ON ab_test_results(test_name, variant);
CREATE INDEX idx_error_logs_type ON error_logs(error_type, occurred_at DESC) WHERE resolved = false;

-- Triggers for metrics tables
CREATE TRIGGER update_event_engagement_metrics_updated_at BEFORE UPDATE ON event_engagement_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venue_performance_metrics_updated_at BEFORE UPDATE ON venue_performance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized views for performance
CREATE MATERIALIZED VIEW popular_events_last_7_days AS
SELECT 
    e.id,
    e.name,
    e.event_date,
    e.city_id,
    SUM(eem.view_count) as total_views,
    SUM(eem.favorite_count) as total_favorites,
    AVG(eem.avg_view_duration) as avg_duration
FROM events e
JOIN event_engagement_metrics eem ON e.id = eem.event_id
WHERE eem.date >= CURRENT_DATE - INTERVAL '7 days'
    AND e.deleted_at IS NULL
GROUP BY e.id
ORDER BY total_views DESC;

CREATE INDEX idx_popular_events_city ON popular_events_last_7_days(city_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_metric_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_events_last_7_days;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for metrics (admin only)
ALTER TABLE daily_active_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Scraping system monitoring tables
CREATE TABLE scraping_job_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL, -- eventbrite, facebook, yelp, etc.
    status VARCHAR(20) NOT NULL, -- running, completed, failed, cancelled
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    events_discovered INTEGER DEFAULT 0,
    events_processed INTEGER DEFAULT 0,
    events_saved INTEGER DEFAULT 0,
    duplicates_found INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    memory_usage_mb NUMERIC,
    cpu_usage_percent NUMERIC,
    success_rate NUMERIC(5,2),
    error_details JSONB DEFAULT '{}',
    performance_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Edge function execution metrics
CREATE TABLE edge_function_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    function_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(100),
    invocation_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms NUMERIC,
    max_duration_ms INTEGER,
    min_duration_ms INTEGER,
    memory_used_mb NUMERIC,
    timeout_count INTEGER DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(function_name, date, hour)
);

-- Data quality monitoring
CREATE TABLE data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- completeness, accuracy, consistency, validity
    score NUMERIC(5,2) NOT NULL, -- 0-100
    total_records INTEGER NOT NULL,
    passed_records INTEGER NOT NULL,
    failed_records INTEGER NOT NULL,
    failure_reasons JSONB DEFAULT '{}',
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real-time system monitoring
CREATE TABLE realtime_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20), -- ms, percent, count, bytes
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System health checks
CREATE TABLE health_check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(50) NOT NULL, -- database, api, scraper, pipeline
    status VARCHAR(20) NOT NULL, -- healthy, degraded, unhealthy
    response_time_ms INTEGER,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    check_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert history
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source_metric VARCHAR(100),
    threshold_value NUMERIC,
    actual_value NUMERIC,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    notification_channels JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Cache performance metrics
CREATE TABLE cache_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_type VARCHAR(50) NOT NULL, -- redis, memory, database
    operation VARCHAR(20) NOT NULL, -- get, set, delete, hit, miss
    count INTEGER DEFAULT 0,
    avg_response_time_ms NUMERIC,
    hit_rate NUMERIC(5,2),
    memory_usage_mb NUMERIC,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cache_type, operation, date, hour)
);

-- API endpoint monitoring
CREATE TABLE api_endpoint_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_agent TEXT,
    ip_address INET,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Database query performance
CREATE TABLE query_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT,
    execution_time_ms NUMERIC NOT NULL,
    rows_returned INTEGER,
    rows_examined INTEGER,
    connection_id VARCHAR(100),
    database_name VARCHAR(50),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for monitoring tables
CREATE INDEX idx_scraping_job_metrics_source_status ON scraping_job_metrics(source, status);
CREATE INDEX idx_scraping_job_metrics_start_time ON scraping_job_metrics(start_time DESC);
CREATE INDEX idx_edge_function_metrics_function_date ON edge_function_metrics(function_name, date DESC);
CREATE INDEX idx_data_quality_metrics_source_type ON data_quality_metrics(source, metric_type);
CREATE INDEX idx_realtime_metrics_name_timestamp ON realtime_metrics(metric_name, timestamp DESC);
CREATE INDEX idx_health_check_component_time ON health_check_results(component, check_time DESC);
CREATE INDEX idx_alert_history_type_triggered ON alert_history(alert_type, triggered_at DESC);
CREATE INDEX idx_cache_metrics_type_date ON cache_metrics(cache_type, date DESC);
CREATE INDEX idx_api_endpoint_metrics_endpoint_timestamp ON api_endpoint_metrics(endpoint, timestamp DESC);
CREATE INDEX idx_query_performance_hash_time ON query_performance_metrics(query_hash, executed_at DESC);

-- Materialized views for dashboard queries
CREATE MATERIALIZED VIEW scraping_dashboard_summary AS
SELECT 
    source,
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    AVG(success_rate) as avg_success_rate,
    SUM(events_saved) as total_events_saved,
    AVG(processing_time_ms) as avg_processing_time_ms
FROM scraping_job_metrics 
WHERE start_time >= NOW() - INTERVAL '24 hours'
GROUP BY source;

CREATE MATERIALIZED VIEW system_health_summary AS
SELECT 
    component,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE status = 'healthy') as healthy_checks,
    COUNT(*) FILTER (WHERE status = 'degraded') as degraded_checks,
    COUNT(*) FILTER (WHERE status = 'unhealthy') as unhealthy_checks,
    AVG(response_time_ms) as avg_response_time,
    MAX(check_time) as last_check_time
FROM health_check_results 
WHERE check_time >= NOW() - INTERVAL '1 hour'
GROUP BY component;

-- Functions for monitoring automation
CREATE OR REPLACE FUNCTION record_scraping_job_metric(
    p_job_id VARCHAR(100),
    p_source VARCHAR(50),
    p_status VARCHAR(20),
    p_events_discovered INTEGER DEFAULT 0,
    p_events_processed INTEGER DEFAULT 0,
    p_events_saved INTEGER DEFAULT 0,
    p_duplicates_found INTEGER DEFAULT 0,
    p_errors_count INTEGER DEFAULT 0,
    p_processing_time_ms INTEGER DEFAULT NULL,
    p_performance_stats JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    success_rate NUMERIC;
BEGIN
    -- Calculate success rate
    IF p_events_processed > 0 THEN
        success_rate := (p_events_saved::NUMERIC / p_events_processed::NUMERIC) * 100;
    ELSE
        success_rate := 0;
    END IF;
    
    INSERT INTO scraping_job_metrics (
        job_id, source, status, start_time, end_time,
        events_discovered, events_processed, events_saved,
        duplicates_found, errors_count, processing_time_ms,
        success_rate, performance_stats
    ) VALUES (
        p_job_id, p_source, p_status, NOW(), 
        CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE NULL END,
        p_events_discovered, p_events_processed, p_events_saved,
        p_duplicates_found, p_errors_count, p_processing_time_ms,
        success_rate, p_performance_stats
    )
    ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        end_time = EXCLUDED.end_time,
        events_discovered = EXCLUDED.events_discovered,
        events_processed = EXCLUDED.events_processed,
        events_saved = EXCLUDED.events_saved,
        duplicates_found = EXCLUDED.duplicates_found,
        errors_count = EXCLUDED.errors_count,
        processing_time_ms = EXCLUDED.processing_time_ms,
        success_rate = EXCLUDED.success_rate,
        performance_stats = EXCLUDED.performance_stats
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_health_check(
    p_component VARCHAR(50),
    p_status VARCHAR(20),
    p_response_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    check_id UUID;
BEGIN
    INSERT INTO health_check_results (
        component, status, response_time_ms, error_message, details
    ) VALUES (
        p_component, p_status, p_response_time_ms, p_error_message, p_details
    )
    RETURNING id INTO check_id;
    
    RETURN check_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_monitoring_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY scraping_dashboard_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY system_health_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_events_last_7_days;
END;
$$ LANGUAGE plpgsql;

-- Only admins can view metrics
CREATE POLICY metrics_admin_only ON daily_active_users FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY event_engagement_admin_only ON event_engagement_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY venue_performance_admin_only ON venue_performance_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY search_analytics_admin_only ON search_analytics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY user_behavior_admin_only ON user_behavior_funnel FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY city_activity_admin_only ON city_activity_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY feature_usage_admin_only ON feature_usage FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY page_performance_admin_only ON page_performance_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY revenue_metrics_admin_only ON revenue_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY notification_metrics_admin_only ON notification_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY ab_test_admin_only ON ab_test_results FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY error_logs_admin_only ON error_logs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY scraping_job_metrics_admin_only ON scraping_job_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY edge_function_metrics_admin_only ON edge_function_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY data_quality_metrics_admin_only ON data_quality_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY realtime_metrics_admin_only ON realtime_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY health_check_results_admin_only ON health_check_results FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY alert_history_admin_only ON alert_history FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY cache_metrics_admin_only ON cache_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY api_endpoint_metrics_admin_only ON api_endpoint_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY query_performance_metrics_admin_only ON query_performance_metrics FOR ALL USING (is_admin(auth.uid()));