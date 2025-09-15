-- Script to create test events from ingested venues
-- This will make Google Places and Yelp venues visible on the map

-- First, check what venues we have
SELECT 
  COUNT(*) as total_venues,
  COUNT(CASE WHEN external_id LIKE 'ChIJ%' THEN 1 END) as google_venues,
  COUNT(CASE WHEN external_id NOT LIKE 'ChIJ%' AND external_id IS NOT NULL THEN 1 END) as yelp_venues
FROM venues;

-- Create sample events from recent venues to make them visible on the map
-- This creates one event per venue for testing
INSERT INTO events (
  title,
  description,
  venue_id,
  venue_name,
  address,
  city_id,
  latitude,
  longitude,
  start_date,
  end_date,
  source,
  external_id,
  category,
  price_min,
  price_max,
  status
)
SELECT 
  v.name || ' - Test Event' as title,
  'Test event to visualize ' || v.name || ' on the map. This is a sample event created from venue data.' as description,
  v.id as venue_id,
  v.name as venue_name,
  v.address,
  v.city_id,
  v.latitude,
  v.longitude,
  NOW() + INTERVAL '1 day' as start_date,
  NOW() + INTERVAL '1 day' + INTERVAL '2 hours' as end_date,
  CASE 
    WHEN v.external_id LIKE 'ChIJ%' THEN 'google_places'
    ELSE 'yelp'
  END as source,
  'test_' || v.id as external_id,
  CASE v.venue_type
    WHEN 'restaurant' THEN 'Food & Drink'
    WHEN 'bar' THEN 'Food & Drink'
    WHEN 'nightclub' THEN 'Nightlife'
    WHEN 'museum' THEN 'Arts & Culture'
    WHEN 'art_gallery' THEN 'Arts & Culture'
    WHEN 'movie_theater' THEN 'Entertainment'
    WHEN 'park' THEN 'Recreation'
    WHEN 'fitness' THEN 'Recreation'
    ELSE 'Entertainment'
  END as category,
  0 as price_min,
  0 as price_max,
  'published' as status
FROM venues v
WHERE v.created_at > NOW() - INTERVAL '1 hour'
  AND v.latitude IS NOT NULL
  AND v.longitude IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM events e 
    WHERE e.external_id = 'test_' || v.id
  )
LIMIT 50;

-- Check the results
SELECT 
  e.title,
  e.venue_name,
  e.source,
  e.category,
  e.latitude,
  e.longitude
FROM events e
WHERE e.external_id LIKE 'test_%'
ORDER BY e.created_at DESC
LIMIT 10;