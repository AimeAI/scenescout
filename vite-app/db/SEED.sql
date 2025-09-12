-- SceneScout v14 Development Seed Data
-- *** DEV ONLY - DO NOT RUN IN PRODUCTION ***
-- This file contains sample data for development and testing

-- WARNING: This will insert test data into the database
-- Only run this in development environments

-- Insert seed cities
INSERT INTO cities (id, name, state_code, country_code, latitude, longitude, timezone, slug, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'New York', 'NY', 'US', 40.7128, -74.0060, 'America/New_York', 'new-york', true),
('550e8400-e29b-41d4-a716-446655440002', 'Los Angeles', 'CA', 'US', 34.0522, -118.2437, 'America/Los_Angeles', 'los-angeles', true),
('550e8400-e29b-41d4-a716-446655440003', 'Chicago', 'IL', 'US', 41.8781, -87.6298, 'America/Chicago', 'chicago', true),
('550e8400-e29b-41d4-a716-446655440004', 'Miami', 'FL', 'US', 25.7617, -80.1918, 'America/New_York', 'miami', true),
('550e8400-e29b-41d4-a716-446655440005', 'San Francisco', 'CA', 'US', 37.7749, -122.4194, 'America/Los_Angeles', 'san-francisco', true),
('550e8400-e29b-41d4-a716-446655440006', 'Austin', 'TX', 'US', 30.2672, -97.7431, 'America/Chicago', 'austin', true);

-- Insert seed users
INSERT INTO users (id, email, created_at, is_admin) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'admin@scenescout.com', CURRENT_TIMESTAMP - INTERVAL '30 days', true),
('550e8400-e29b-41d4-a716-446655440101', 'john.doe@example.com', CURRENT_TIMESTAMP - INTERVAL '25 days', false),
('550e8400-e29b-41d4-a716-446655440102', 'jane.smith@example.com', CURRENT_TIMESTAMP - INTERVAL '20 days', false),
('550e8400-e29b-41d4-a716-446655440103', 'mike.wilson@example.com', CURRENT_TIMESTAMP - INTERVAL '15 days', false),
('550e8400-e29b-41d4-a716-446655440104', 'sarah.johnson@example.com', CURRENT_TIMESTAMP - INTERVAL '10 days', false);

-- Insert seed profiles
INSERT INTO profiles (id, user_id, username, display_name, bio, location, preferences) VALUES
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440100', 'admin', 'SceneScout Admin', 'Administrator of SceneScout', 'New York, NY', '{"notifications": true, "theme": "dark"}'),
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', 'johndoe', 'John Doe', 'Music lover and event enthusiast', 'Brooklyn, NY', '{"categories": ["music", "nightlife"], "notifications": true}'),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440102', 'janesmith', 'Jane Smith', 'Art curator and culture explorer', 'Manhattan, NY', '{"categories": ["art", "culture", "food"], "notifications": false}'),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440103', 'mikewilson', 'Mike Wilson', 'Sports fan and concert goer', 'Chicago, IL', '{"categories": ["sports", "music"], "notifications": true}'),
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440104', 'sarahjohnson', 'Sarah Johnson', 'Foodie and social butterfly', 'Miami, FL', '{"categories": ["food", "nightlife", "social"], "notifications": true}');

-- Insert seed venues
INSERT INTO venues (id, name, slug, description, address, city_id, latitude, longitude, location, capacity, venue_type, amenities, is_verified, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440300', 'Madison Square Garden', 'madison-square-garden', 'Famous arena in the heart of Manhattan', '4 Pennsylvania Plaza, New York, NY 10001', '550e8400-e29b-41d4-a716-446655440001', 40.7505, -73.9934, ST_MakePoint(-73.9934, 40.7505)::geography, 20789, 'arena', '["parking", "food_court", "merchandise", "accessible"]', true, true),
('550e8400-e29b-41d4-a716-446655440301', 'Brooklyn Bowl', 'brooklyn-bowl', 'Music venue and bowling alley in Williamsburg', '61 Wythe Ave, Brooklyn, NY 11249', '550e8400-e29b-41d4-a716-446655440001', 40.7218, -73.9570, ST_MakePoint(-73.9570, 40.7218)::geography, 600, 'club', '["bowling", "restaurant", "bar", "live_music"]', true, true),
('550e8400-e29b-41d4-a716-446655440302', 'The Hollywood Bowl', 'hollywood-bowl', 'Iconic outdoor amphitheater in Hollywood', '2301 Highland Ave, Hollywood, CA 90068', '550e8400-e29b-41d4-a716-446655440002', 34.1122, -118.3395, ST_MakePoint(-118.3395, 34.1122)::geography, 17500, 'amphitheater', '["outdoor", "picnic_areas", "parking", "accessible"]', true, true),
('550e8400-e29b-41d4-a716-446655440303', 'House of Blues Chicago', 'house-of-blues-chicago', 'Live music venue in downtown Chicago', '329 N Dearborn St, Chicago, IL 60654', '550e8400-e29b-41d4-a716-446655440003', 41.8881, -87.6298, ST_MakePoint(-87.6298, 41.8881)::geography, 1500, 'theater', '["restaurant", "bar", "vip_areas", "merchandise"]', true, true),
('550e8400-e29b-41d4-a716-446655440304', 'LIV Miami', 'liv-miami', 'Ultra-exclusive nightclub in South Beach', '4441 Collins Ave, Miami Beach, FL 33140', '550e8400-e29b-41d4-a716-446655440004', 25.8197, -80.1295, ST_MakePoint(-80.1295, 25.8197)::geography, 2000, 'nightclub', '["vip_tables", "bottle_service", "dance_floor", "rooftop"]', true, true);

-- Insert seed events
INSERT INTO events (id, name, slug, description, event_date, start_time, end_time, venue_id, city_id, categories, tags, featured_image_url, ticket_url, ticket_price_min, ticket_price_max, is_featured, source, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440400', 'Taylor Swift - Eras Tour', 'taylor-swift-eras-tour-msg', 'Taylor Swift brings her record-breaking Eras Tour to Madison Square Garden for three spectacular nights.', CURRENT_DATE + INTERVAL '30 days', '20:00', '23:30', '550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440001', '["music", "pop", "concert"]', '["taylor_swift", "eras_tour", "pop_music", "sold_out"]', 'https://example.com/taylor-swift.jpg', 'https://ticketmaster.com/taylor-swift', 125.00, 500.00, true, 'manual', '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440401', 'Indie Rock Night', 'indie-rock-night-brooklyn-bowl', 'Local indie bands showcase at Brooklyn Bowl with bowling and drinks.', CURRENT_DATE + INTERVAL '7 days', '19:00', '02:00', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', '["music", "indie", "rock"]', '["local_bands", "bowling", "nightlife"]', 'https://example.com/indie-rock.jpg', 'https://brooklynbowl.com/tickets', 25.00, 45.00, false, 'manual', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440402', 'LA Philharmonic Summer Concert', 'la-phil-summer-concert', 'Experience classical music under the stars at the Hollywood Bowl.', CURRENT_DATE + INTERVAL '21 days', '20:00', '22:30', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440002', '["music", "classical", "outdoor"]', '["philharmonic", "classical_music", "outdoor", "summer"]', 'https://example.com/la-phil.jpg', 'https://hollywoodbowl.com/tickets', 35.00, 150.00, true, 'manual', '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440403', 'Jazz & Blues Festival', 'jazz-blues-festival-chicago', 'Three-day festival featuring the best jazz and blues artists in Chicago.', CURRENT_DATE + INTERVAL '14 days', '18:00', '23:00', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440003', '["music", "jazz", "blues", "festival"]', '["jazz_festival", "blues", "multi_day", "live_music"]', 'https://example.com/jazz-blues.jpg', 'https://hob.com/chicago/tickets', 65.00, 200.00, true, 'manual', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440404', 'Miami Music Week Kickoff', 'miami-music-week-kickoff', 'Electronic dance music event kicking off Miami Music Week.', CURRENT_DATE + INTERVAL '45 days', '22:00', '05:00', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440004', '["music", "electronic", "dance", "nightlife"]', '["edm", "miami_music_week", "club", "late_night"]', 'https://example.com/miami-music-week.jpg', 'https://livmiami.com/tickets', 80.00, 300.00, true, 'manual', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440405', 'Art Gallery Opening', 'art-gallery-opening-soho', 'Contemporary art exhibition opening in SoHo gallery.', CURRENT_DATE + INTERVAL '3 days', '18:00', '21:00', NULL, '550e8400-e29b-41d4-a716-446655440001', '["art", "culture", "exhibition"]', '["contemporary_art", "gallery", "opening", "wine"]', 'https://example.com/art-gallery.jpg', NULL, 0.00, 0.00, false, 'submission', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440406', 'Food Truck Festival', 'food-truck-festival-austin', 'Dozens of food trucks gather for a weekend festival in Austin.', CURRENT_DATE + INTERVAL '12 days', '11:00', '22:00', NULL, '550e8400-e29b-41d4-a716-446655440006', '["food", "festival", "outdoor"]', '["food_trucks", "family_friendly", "weekend", "local"]', 'https://example.com/food-trucks.jpg', 'https://austinfoodfest.com', 10.00, 10.00, false, 'submission', '550e8400-e29b-41d4-a716-446655440104');

-- Insert some user events (favorites/saved)
INSERT INTO user_events (user_id, event_id, is_favorite, is_attending, reminder_time, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440400', true, true, CURRENT_TIMESTAMP + INTERVAL '29 days 18:00:00', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', true, true, CURRENT_TIMESTAMP + INTERVAL '6 days 17:00:00', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440402', true, false, CURRENT_TIMESTAMP + INTERVAL '20 days 18:00:00', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440405', true, true, CURRENT_TIMESTAMP + INTERVAL '2 days 16:00:00', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440403', true, true, CURRENT_TIMESTAMP + INTERVAL '13 days 16:00:00', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440404', true, true, CURRENT_TIMESTAMP + INTERVAL '44 days 20:00:00', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440406', true, false, NULL, CURRENT_TIMESTAMP);

-- Insert seed plans
INSERT INTO plans (id, user_id, name, description, date, city_id, is_public, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440101', 'NYC Music Weekend', 'Perfect weekend of live music in New York City', CURRENT_DATE + INTERVAL '7 days', '550e8400-e29b-41d4-a716-446655440001', true, CURRENT_TIMESTAMP - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440102', 'Art & Culture Tour', 'Exploring NYC''s best art galleries and cultural events', CURRENT_DATE + INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440001', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440104', 'Miami Nightlife Experience', 'Ultimate Miami party weekend', CURRENT_DATE + INTERVAL '45 days', '550e8400-e29b-41d4-a716-446655440004', false, CURRENT_TIMESTAMP);

-- Insert plan events
INSERT INTO plan_events (plan_id, event_id, order_position, notes) VALUES
('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440401', 1, 'Start the weekend with indie rock and bowling'),
('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440400', 2, 'Main event - Taylor Swift concert!'),
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440405', 1, 'Contemporary art gallery opening'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440404', 1, 'Miami Music Week kickoff party');

-- Insert subscription plans
INSERT INTO subscription_plans (id, stripe_product_id, stripe_price_id, name, description, price, currency, interval, interval_count, trial_period_days, features, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440600', 'prod_test_basic', 'price_test_basic_monthly', 'Basic Plan', 'Access to basic features and event discovery', 9.99, 'USD', 'month', 1, 7, '["event_discovery", "save_events", "basic_recommendations"]', true),
('550e8400-e29b-41d4-a716-446655440601', 'prod_test_pro', 'price_test_pro_monthly', 'Pro Plan', 'Advanced features including unlimited plans and priority support', 19.99, 'USD', 'month', 1, 7, '["unlimited_plans", "advanced_recommendations", "priority_support", "early_access"]', true),
('550e8400-e29b-41d4-a716-446655440602', 'prod_test_pro_annual', 'price_test_pro_annual', 'Pro Plan (Annual)', 'Pro plan billed annually with 2 months free', 199.99, 'USD', 'year', 1, 14, '["unlimited_plans", "advanced_recommendations", "priority_support", "early_access", "annual_discount"]', true);

-- Insert some sample submissions
INSERT INTO submissions (id, user_id, submission_type, submission_data, status, submitted_at) VALUES
('550e8400-e29b-41d4-a716-446655440700', '550e8400-e29b-41d4-a716-446655440103', 'event', '{"name": "Rooftop Jazz Night", "description": "Intimate jazz performance on Manhattan rooftop", "event_date": "2024-07-15", "start_time": "19:00", "categories": ["music", "jazz"], "location_name": "Rooftop Terrace Manhattan", "ticket_price_min": 35.00, "ticket_price_max": 65.00}', 'pending', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440104', 'venue', '{"name": "The Underground", "description": "Intimate music venue in basement of historic building", "address": "123 Secret St, New York, NY", "venue_type": "club", "capacity": 200, "amenities": ["bar", "live_music", "intimate_setting"]}', 'approved', CURRENT_TIMESTAMP - INTERVAL '5 days');

-- Insert some analytics data
INSERT INTO event_views (event_id, user_id, session_id, viewed_at, view_duration) VALUES
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440101', 'session_001', CURRENT_TIMESTAMP - INTERVAL '1 day', 45),
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440102', 'session_002', CURRENT_TIMESTAMP - INTERVAL '1 day', 32),
('550e8400-e29b-41d4-a716-446655440400', NULL, 'session_003', CURRENT_TIMESTAMP - INTERVAL '2 hours', 28),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440101', 'session_001', CURRENT_TIMESTAMP - INTERVAL '3 hours', 67),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440102', 'session_004', CURRENT_TIMESTAMP - INTERVAL '1 hour', 41);

-- Insert user interests
INSERT INTO user_interests (user_id, category, subcategory, interest_level) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'music', 'rock', 5),
('550e8400-e29b-41d4-a716-446655440101', 'music', 'indie', 4),
('550e8400-e29b-41d4-a716-446655440101', 'nightlife', 'concerts', 5),
('550e8400-e29b-41d4-a716-446655440102', 'art', 'contemporary', 5),
('550e8400-e29b-41d4-a716-446655440102', 'culture', 'exhibitions', 4),
('550e8400-e29b-41d4-a716-446655440102', 'food', 'fine_dining', 3),
('550e8400-e29b-41d4-a716-446655440103', 'music', 'jazz', 5),
('550e8400-e29b-41d4-a716-446655440103', 'music', 'blues', 4),
('550e8400-e29b-41d4-a716-446655440104', 'nightlife', 'clubs', 5),
('550e8400-e29b-41d4-a716-446655440104', 'food', 'street_food', 4);

-- Insert user follows
INSERT INTO user_follows (follower_id, following_id) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440102');

-- Initialize user stats
INSERT INTO user_stats (user_id, events_attended, events_saved, plans_created, followers_count, following_count, points_total) VALUES
('550e8400-e29b-41d4-a716-446655440101', 8, 2, 1, 3, 1, 150),
('550e8400-e29b-41d4-a716-446655440102', 12, 2, 1, 2, 1, 200),
('550e8400-e29b-41d4-a716-446655440103', 5, 1, 0, 0, 1, 75),
('550e8400-e29b-41d4-a716-446655440104', 15, 2, 1, 0, 2, 300);

-- Initialize user levels
INSERT INTO user_levels (user_id, level, level_name, points_current, tier) VALUES
('550e8400-e29b-41d4-a716-446655440101', 2, 'Regular', 150, 'bronze'),
('550e8400-e29b-41d4-a716-446655440102', 3, 'Regular', 200, 'bronze'),
('550e8400-e29b-41d4-a716-446655440103', 1, 'Newbie', 75, 'bronze'),
('550e8400-e29b-41d4-a716-446655440104', 4, 'Regular', 300, 'bronze');

-- Insert notification templates
INSERT INTO push_notification_templates (name, notification_type, title_template, body_template, variables, is_active) VALUES
('event_reminder', 'event_reminder', 'Event Reminder: {{event_name}}', 'Your saved event "{{event_name}}" is happening {{when}} at {{venue_name}}!', '["event_name", "when", "venue_name"]', true),
('new_events_weekly', 'new_events', 'New Events This Week', 'Check out {{event_count}} new events added in {{city_name}} this week!', '["event_count", "city_name"]', true),
('plan_shared', 'plan_invite', '{{sender_name}} shared a plan with you', 'Check out the plan "{{plan_name}}" shared by {{sender_name}}', '["sender_name", "plan_name"]', true);

-- Insert some achievements
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, points, rarity) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'early_adopter', 'Early Adopter', 'Joined SceneScout in the first month', 100, 'rare'),
('550e8400-e29b-41d4-a716-446655440102', 'plan_creator', 'Plan Creator', 'Created your first event plan', 50, 'common'),
('550e8400-e29b-41d4-a716-446655440104', 'social_butterfly', 'Social Butterfly', 'Followed 5+ users', 75, 'uncommon');

-- Update event view counts based on views
UPDATE events SET view_count = (
    SELECT COUNT(*) FROM event_views WHERE event_views.event_id = events.id
);

-- Add some fake reviews
INSERT INTO user_reviews (user_id, entity_type, entity_id, rating, review_text) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'venue', '550e8400-e29b-41d4-a716-446655440301', 5, 'Amazing venue! The combination of live music and bowling is perfect. Great atmosphere and drinks.'),
('550e8400-e29b-41d4-a716-446655440102', 'venue', '550e8400-e29b-41d4-a716-446655440300', 4, 'Classic venue with great acoustics. Can get crowded but that''s part of the experience.'),
('550e8400-e29b-41d4-a716-446655440103', 'venue', '550e8400-e29b-41d4-a716-446655440303', 5, 'Perfect venue for jazz and blues. Intimate setting with excellent sound quality.');

-- Add some plan templates
INSERT INTO plan_templates (id, created_by, name, description, category, city_id, tags, is_featured, is_public, template_data) VALUES
('550e8400-e29b-41d4-a716-446655440800', '550e8400-e29b-41d4-a716-446655440100', 'Perfect Date Night', 'Romantic evening out with dinner and entertainment', 'date_night', '550e8400-e29b-41d4-a716-446655440001', '["romantic", "dinner", "entertainment"]', true, true, '{"event_criteria": [{"category": "food", "time": "early_evening"}, {"category": "music", "time": "evening"}], "duration_hours": 4}'),
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440101', 'Music Lover''s Weekend', 'Two days of the best live music in the city', 'weekend_trip', '550e8400-e29b-41d4-a716-446655440001', '["music", "weekend", "concerts"]', true, true, '{"event_criteria": [{"category": "music", "day": "friday"}, {"category": "music", "day": "saturday"}], "duration_hours": 12}');

COMMENT ON TABLE cities IS 'This is seed data for development - safe to delete';
COMMENT ON TABLE users IS 'Contains seed users for development - prefix with 550e8400 indicates test data';
COMMENT ON TABLE events IS 'Seed events for development and testing';

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'SceneScout v14 seed data inserted successfully!';
    RAISE NOTICE 'This includes:';
    RAISE NOTICE '- 6 cities (NYC, LA, Chicago, Miami, SF, Austin)';
    RAISE NOTICE '- 5 users with profiles';
    RAISE NOTICE '- 5 venues';
    RAISE NOTICE '- 7 events';
    RAISE NOTICE '- 3 plans with events';
    RAISE NOTICE '- Sample analytics, reviews, and user interactions';
    RAISE NOTICE '';
    RAISE NOTICE '*** Remember: This is DEV DATA ONLY ***';
    RAISE NOTICE 'Run PURGE_SEED.sql to remove all seed data before production deployment';
END $$;