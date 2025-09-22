-- Create tables for scheduled scraping system
-- Migration: 20241221000004_create_scraping_tables.sql

-- Scraping jobs queue table
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('city', 'venue')),
    target TEXT NOT NULL, -- city name or venue ID
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraping metrics table
CREATE TABLE IF NOT EXISTS scraping_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    jobs_processed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    active_scrapers INTEGER DEFAULT 0,
    status TEXT
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook errors table
CREATE TABLE IF NOT EXISTS webhook_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    error_message TEXT NOT NULL,
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health check results table
CREATE TABLE IF NOT EXISTS health_check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    services JSONB NOT NULL DEFAULT '[]',
    metrics JSONB NOT NULL DEFAULT '{}',
    alerts JSONB DEFAULT '[]'
);

-- System health table
CREATE TABLE IF NOT EXISTS system_health (
    component TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metrics JSONB DEFAULT '{}'
);

-- Function invocations tracking table
CREATE TABLE IF NOT EXISTS function_invocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL,
    duration INTEGER, -- milliseconds
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User event interactions table (enhanced)
CREATE TABLE IF NOT EXISTS user_event_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'save', 'share', 'ticket_click', 'review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    categories TEXT[] DEFAULT '{}',
    location_radius INTEGER DEFAULT 25,
    price_range JSONB DEFAULT '{"min": 0, "max": 200}',
    time_preferences TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search index updates table
CREATE TABLE IF NOT EXISTS search_index_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Event analytics table
CREATE TABLE IF NOT EXISTS event_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User acquisition metrics table
CREATE TABLE IF NOT EXISTS user_acquisition_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    source TEXT DEFAULT 'direct',
    campaign TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preference learning table
CREATE TABLE IF NOT EXISTS user_preference_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event recommendations table
CREATE TABLE IF NOT EXISTS event_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scheduled_for ON scraping_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type ON scraping_jobs(type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_priority ON scraping_jobs(priority DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_health_check_results_timestamp ON health_check_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_check_results_status ON health_check_results(status);

CREATE INDEX IF NOT EXISTS idx_function_invocations_function_name ON function_invocations(function_name);
CREATE INDEX IF NOT EXISTS idx_function_invocations_created_at ON function_invocations(created_at);

CREATE INDEX IF NOT EXISTS idx_user_event_interactions_user_id ON user_event_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_interactions_event_id ON user_event_interactions(event_id);
CREATE INDEX IF NOT EXISTS idx_user_event_interactions_type ON user_event_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON user_notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_timestamp ON event_analytics(timestamp);

CREATE INDEX IF NOT EXISTS idx_event_recommendations_user_id ON event_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_score ON event_recommendations(score DESC);

-- Create RPC functions for complex queries

-- Function to get trending events
CREATE OR REPLACE FUNCTION get_trending_events(
    window_start TIMESTAMP WITH TIME ZONE,
    event_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    interaction_count BIGINT,
    unique_users BIGINT,
    trend_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        COUNT(uei.id) as interaction_count,
        COUNT(DISTINCT uei.user_id) as unique_users,
        (COUNT(uei.id) * 0.7 + COUNT(DISTINCT uei.user_id) * 0.3)::DECIMAL as trend_score
    FROM events e
    LEFT JOIN user_event_interactions uei ON e.id = uei.event_id
    WHERE uei.created_at >= window_start
        AND e.start_time > NOW()
    GROUP BY e.id, e.title
    HAVING COUNT(uei.id) > 0
    ORDER BY trend_score DESC
    LIMIT event_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get database metrics
CREATE OR REPLACE FUNCTION get_database_metrics()
RETURNS TABLE (
    connections INTEGER,
    avg_query_time DECIMAL,
    storage_usage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT count(*) FROM pg_stat_activity)::INTEGER as connections,
        0.0::DECIMAL as avg_query_time, -- Simplified, would need actual query tracking
        0.0::DECIMAL as storage_usage   -- Simplified, would need actual storage calculation
    ;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old health checks
CREATE OR REPLACE FUNCTION cleanup_old_health_checks(keep_count INTEGER DEFAULT 1000)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH ranked_checks AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
        FROM health_check_results
    )
    DELETE FROM health_check_results 
    WHERE id IN (
        SELECT id FROM ranked_checks WHERE rn > keep_count
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on sensitive tables
ALTER TABLE user_event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic examples - customize as needed)
CREATE POLICY "Users can view their own interactions" ON user_event_interactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications" ON user_notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recommendations" ON event_recommendations
    FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraping_jobs_updated_at
    BEFORE UPDATE ON scraping_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO system_health (component, status) VALUES 
('database', 'healthy'),
('edge-functions', 'healthy'),
('scraping-system', 'healthy'),
('external-apis', 'healthy')
ON CONFLICT (component) DO NOTHING;