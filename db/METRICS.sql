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