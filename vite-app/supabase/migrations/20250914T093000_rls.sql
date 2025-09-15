-- SceneScout v14 Row Level Security (RLS) Policies
-- This file contains security policies for data access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY users_select ON users FOR SELECT
    USING (true); -- Public can see basic user info

CREATE POLICY users_update ON users FOR UPDATE
    USING (id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY users_delete ON users FOR DELETE
    USING (is_admin(auth.uid()));

-- Profiles table policies
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (true); -- Public profiles

CREATE POLICY profiles_insert ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update ON profiles FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY profiles_delete ON profiles FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Cities table policies (read-only for non-admins)
CREATE POLICY cities_select ON cities FOR SELECT
    USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY cities_insert ON cities FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY cities_update ON cities FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY cities_delete ON cities FOR DELETE
    USING (is_admin(auth.uid()));

-- Venues table policies
CREATE POLICY venues_select ON venues FOR SELECT
    USING (deleted_at IS NULL AND (is_active = true OR is_admin(auth.uid())));

CREATE POLICY venues_insert ON venues FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Authenticated users can submit

CREATE POLICY venues_update ON venues FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY venues_delete ON venues FOR DELETE
    USING (is_admin(auth.uid()));

-- Events table policies
CREATE POLICY events_select ON events FOR SELECT
    USING (deleted_at IS NULL OR is_admin(auth.uid()));

CREATE POLICY events_insert ON events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Authenticated users can submit

CREATE POLICY events_update ON events FOR UPDATE
    USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY events_delete ON events FOR DELETE
    USING (is_admin(auth.uid()));

-- User events policies (private to user)
CREATE POLICY user_events_select ON user_events FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY user_events_insert ON user_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_events_update ON user_events FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY user_events_delete ON user_events FOR DELETE
    USING (user_id = auth.uid());

-- Plans policies
CREATE POLICY plans_select ON plans FOR SELECT
    USING (
        deleted_at IS NULL AND (
            is_public = true OR 
            user_id = auth.uid() OR 
            is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM plans WHERE id = plans.id AND share_token IS NOT NULL
            )
        )
    );

CREATE POLICY plans_insert ON plans FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY plans_update ON plans FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY plans_delete ON plans FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Plan events policies (inherit from plan)
CREATE POLICY plan_events_select ON plan_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plans p 
            WHERE p.id = plan_id 
            AND (p.is_public = true OR p.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY plan_events_insert ON plan_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        )
    );

CREATE POLICY plan_events_update ON plan_events FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        ) OR is_admin(auth.uid())
    );

CREATE POLICY plan_events_delete ON plan_events FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        ) OR is_admin(auth.uid())
    );

-- Submissions policies
CREATE POLICY submissions_select ON submissions FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY submissions_insert ON submissions FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL); -- Allow anonymous submissions

CREATE POLICY submissions_update ON submissions FOR UPDATE
    USING (is_admin(auth.uid())); -- Only admins can review

CREATE POLICY submissions_delete ON submissions FOR DELETE
    USING (is_admin(auth.uid()));

-- Promotions policies
CREATE POLICY promotions_select ON promotions FOR SELECT
    USING (
        is_active = true AND 
        start_date <= CURRENT_TIMESTAMP AND 
        end_date >= CURRENT_TIMESTAMP
        OR is_admin(auth.uid())
    );

CREATE POLICY promotions_insert ON promotions FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY promotions_update ON promotions FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY promotions_delete ON promotions FOR DELETE
    USING (is_admin(auth.uid()));

-- Push subscriptions policies (private to user)
CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update ON push_subscriptions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE
    USING (user_id = auth.uid());

-- Event views policies
CREATE POLICY event_views_select ON event_views FOR SELECT
    USING (is_admin(auth.uid())); -- Only admins can view analytics

CREATE POLICY event_views_insert ON event_views FOR INSERT
    WITH CHECK (true); -- Anyone can create view records

-- Metrics policies
CREATE POLICY metrics_select ON metrics FOR SELECT
    USING (is_admin(auth.uid())); -- Only admins can view metrics

CREATE POLICY metrics_insert ON metrics FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- User activities policies
CREATE POLICY user_activities_select ON user_activities FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY user_activities_insert ON user_activities FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL); -- Allow anonymous activity

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users for public content
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON cities, venues, events, promotions TO anon;
GRANT INSERT ON event_views, user_activities TO anon;
GRANT EXECUTE ON FUNCTION find_nearby_events TO anon;
GRANT EXECUTE ON FUNCTION get_trending_events TO anon;
GRANT EXECUTE ON FUNCTION search_events TO anon;
GRANT EXECUTE ON FUNCTION get_city_calendar TO anon;

-- Create service role for backend operations
CREATE ROLE service_role NOINHERIT;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;