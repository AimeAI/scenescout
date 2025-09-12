-- SceneScout v14 Seed Data Purge Script
-- This script removes all development seed data from the database
-- *** USE WITH CAUTION - THIS WILL DELETE DATA ***

-- Confirmation check - uncomment the line below to enable purging
-- SET session_replication_role = replica; -- Disable triggers temporarily if needed

DO $$
DECLARE
    rec RECORD;
    table_count INTEGER := 0;
BEGIN
    -- Check if this looks like seed data (look for our known seed IDs)
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id IN (
            '550e8400-e29b-41d4-a716-446655440100',
            '550e8400-e29b-41d4-a716-446655440101'
        )
    ) THEN
        RAISE EXCEPTION 'No seed data detected. This script only removes seed data with known UUIDs starting with 550e8400.';
    END IF;

    RAISE NOTICE 'Starting seed data purge...';
    
    -- Delete in reverse dependency order to avoid foreign key violations
    
    -- Analytics and tracking data
    DELETE FROM event_views WHERE event_id IN (
        SELECT id FROM events WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % event_views records', table_count;
    
    DELETE FROM user_activities WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_activities records', table_count;
    
    DELETE FROM search_analytics WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % search_analytics records', table_count;
    
    -- Reviews and social features
    DELETE FROM review_votes WHERE review_id IN (
        SELECT id FROM user_reviews WHERE user_id IN (
            SELECT id FROM users WHERE id::text LIKE '550e8400%'
        )
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % review_votes records', table_count;
    
    DELETE FROM user_reviews WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_reviews records', table_count;
    
    DELETE FROM user_follows WHERE follower_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    ) OR following_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_follows records', table_count;
    
    -- User profile data
    DELETE FROM user_achievements WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_achievements records', table_count;
    
    DELETE FROM user_interests WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_interests records', table_count;
    
    DELETE FROM user_stats WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_stats records', table_count;
    
    DELETE FROM user_levels WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_levels records', table_count;
    
    DELETE FROM user_privacy_settings WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_privacy_settings records', table_count;
    
    -- Notification data
    DELETE FROM push_notification_interactions WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % push_notification_interactions records', table_count;
    
    DELETE FROM push_notification_queue WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % push_notification_queue records', table_count;
    
    DELETE FROM push_subscriptions WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % push_subscriptions records', table_count;
    
    -- Submission data
    DELETE FROM submission_rewards WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % submission_rewards records', table_count;
    
    DELETE FROM submission_attachments WHERE submission_id IN (
        SELECT id FROM submissions WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % submission_attachments records', table_count;
    
    DELETE FROM submission_comments WHERE submission_id IN (
        SELECT id FROM submissions WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % submission_comments records', table_count;
    
    DELETE FROM submission_status_history WHERE submission_id IN (
        SELECT id FROM submissions WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % submission_status_history records', table_count;
    
    DELETE FROM submissions WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % submissions records', table_count;
    
    -- Plan data
    DELETE FROM plan_exports WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_exports records', table_count;
    
    DELETE FROM plan_suggestions WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_suggestions records', table_count;
    
    DELETE FROM plan_checkins WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_checkins records', table_count;
    
    DELETE FROM plan_votes WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_votes records', table_count;
    
    DELETE FROM plan_comments WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_comments records', table_count;
    
    DELETE FROM plan_activities WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_activities records', table_count;
    
    DELETE FROM plan_template_usage WHERE template_id IN (
        SELECT id FROM plan_templates WHERE id::text LIKE '550e8400%'
    ) OR user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_template_usage records', table_count;
    
    DELETE FROM plan_templates WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_templates records', table_count;
    
    DELETE FROM plan_invitations WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_invitations records', table_count;
    
    DELETE FROM plan_collaborators WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_collaborators records', table_count;
    
    DELETE FROM plan_events WHERE plan_id IN (
        SELECT id FROM plans WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plan_events records', table_count;
    
    DELETE FROM plans WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % plans records', table_count;
    
    -- User events (favorites/saved)
    DELETE FROM user_events WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_events records', table_count;
    
    -- Events
    DELETE FROM events WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % events records', table_count;
    
    -- Venues
    DELETE FROM venues WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % venues records', table_count;
    
    -- Payment/subscription data (if any seed data exists)
    DELETE FROM payments WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % payments records', table_count;
    
    DELETE FROM subscriptions WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % subscriptions records', table_count;
    
    DELETE FROM subscription_plans WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % subscription_plans records', table_count;
    
    -- Notification templates (if they are seed data)
    DELETE FROM push_notification_templates WHERE created_by IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    ) OR name IN ('event_reminder', 'new_events_weekly', 'plan_shared');
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % push_notification_templates records', table_count;
    
    -- User profiles and users
    DELETE FROM profiles WHERE user_id IN (
        SELECT id FROM users WHERE id::text LIKE '550e8400%'
    );
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profiles records', table_count;
    
    DELETE FROM users WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % users records', table_count;
    
    -- Cities (careful - only delete seed cities)
    DELETE FROM cities WHERE id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % cities records', table_count;
    
    -- Clean up any orphaned records that might reference deleted data
    DELETE FROM promotions WHERE entity_id::text LIKE '550e8400%';
    GET DIAGNOSTICS table_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % promotions records', table_count;
    
    -- Remove table comments that indicate seed data
    COMMENT ON TABLE cities IS NULL;
    COMMENT ON TABLE users IS NULL;
    COMMENT ON TABLE events IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Seed data purge completed successfully!';
    RAISE NOTICE 'All development seed data has been removed from the database.';
    RAISE NOTICE 'The database is now clean and ready for production use.';
    
END $$;

-- Reset any sequences if needed (uncomment if you want to reset auto-incrementing values)
-- ALTER SEQUENCE IF EXISTS some_sequence_name RESTART WITH 1;

-- Re-enable triggers if they were disabled
-- SET session_replication_role = DEFAULT;