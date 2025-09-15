-- Test queries to verify the schema and RPC functions are working correctly
-- Run these after applying the migrations to verify functionality

-- Test basic table creation
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cities', 'venues', 'events', 'profiles', 'user_events', 'plans', 'signals')
ORDER BY table_name;

-- Test RPC functions exist
SELECT 'RPC functions created successfully' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN ('get_events_by_category', 'search_events', 'record_signal', 'get_user_saved_events')
ORDER BY routine_name;

-- Insert sample data for testing
INSERT INTO cities (name, slug, country, latitude, longitude, is_active) 
VALUES ('San Francisco', 'san-francisco', 'US', 37.7749, -122.4194, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO venues (name, city_id, latitude, longitude)
SELECT 'Test Venue', id, 37.7849, -122.4329
FROM cities WHERE slug = 'san-francisco'
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (title, description, date, category, city_id, is_featured, hotness_score)
SELECT 
  'Test Event', 
  'A sample event for testing', 
  CURRENT_DATE + INTERVAL '7 days',
  'music',
  c.id,
  true,
  5.0
FROM cities c 
WHERE c.slug = 'san-francisco'
ON CONFLICT (id) DO NOTHING;

-- Test the RPC functions
SELECT 'Testing get_events_by_category function:' as test;
SELECT id, title, category FROM get_events_by_category(ARRAY['music'], 5);

SELECT 'Testing search_events function:' as test;
SELECT id, title, city_name FROM search_events('san-francisco', ARRAY['music'], null, null, null, null, null, 10, 0);

SELECT 'Testing get_featured_events function:' as test;
SELECT id, title, hotness_score FROM get_featured_events(5);

-- Clean up test data
DELETE FROM events WHERE title = 'Test Event';
DELETE FROM venues WHERE name = 'Test Venue';
-- Keep cities as they might be useful

SELECT 'Migration test completed successfully!' as result;