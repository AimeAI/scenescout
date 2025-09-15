-- Add sample events to test the app functionality
-- Run this in Supabase SQL editor to populate the database

DO $$
DECLARE
    toronto_city_id UUID;
BEGIN
    -- Get Toronto city ID (should exist from essential setup)
    SELECT id INTO toronto_city_id FROM cities WHERE slug = 'toronto-on' LIMIT 1;
    
    IF toronto_city_id IS NOT NULL THEN
        -- Insert sample events for immediate testing
        INSERT INTO events (
            title, description, date, time, end_time, 
            venue_name, address, city_id, category, 
            is_free, price_min, price_max, currency,
            image_url, external_url, source, latitude, longitude,
            view_count, created_at, updated_at
        ) VALUES 
        -- Music Events
        (
            'Toronto Jazz Festival 2025',
            'Experience the best jazz musicians from around the world in downtown Toronto. Multiple stages, food vendors, and amazing atmosphere.',
            '2025-09-22',
            '19:00',
            '23:00',
            'Harbourfront Centre',
            '235 Queens Quay W, Toronto, ON M5J 2G8',
            toronto_city_id,
            'music',
            false,
            45.00,
            85.00,
            'CAD',
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/jazz-festival',
            'manual',
            43.6393,
            -79.3789,
            0,
            NOW(),
            NOW()
        ),
        -- Tech Events  
        (
            'AI & Machine Learning Summit',
            'Join leading researchers and practitioners exploring the future of artificial intelligence. Workshops, demos, and networking.',
            '2025-09-25',
            '09:00',
            '17:00',
            'MaRS Discovery District',
            '101 College St, Toronto, ON M5G 1L7',
            toronto_city_id,
            'tech',
            false,
            150.00,
            300.00,
            'CAD',
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/ai-summit',
            'manual',
            43.6596,
            -79.3896,
            0,
            NOW(),
            NOW()
        ),
        -- Food Events
        (
            'Toronto Food & Wine Experience',
            'Celebrate culinary excellence with tastings from top restaurants, wine pairings, and cooking demonstrations.',
            '2025-09-28',
            '12:00',
            '22:00',
            'Exhibition Place',
            '100 Princes Blvd, Toronto, ON M6K 3C3',
            toronto_city_id,
            'food',
            false,
            65.00,
            125.00,
            'CAD',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/food-wine',
            'manual',
            43.6279,
            -79.4194,
            0,
            NOW(),
            NOW()
        ),
        -- Arts Events
        (
            'Contemporary Art Gallery Opening',
            'Exclusive opening of new contemporary art exhibition featuring local and international artists.',
            '2025-10-02',
            '18:00',
            '21:00',
            'Art Gallery of Ontario',
            '317 Dundas St W, Toronto, ON M5T 1G4',
            toronto_city_id,
            'arts',
            true,
            NULL,
            NULL,
            'CAD',
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/art-opening',
            'manual',
            43.6536,
            -79.3925,
            0,
            NOW(),
            NOW()
        ),
        -- Sports Events
        (
            'Toronto Marathon 2025',
            'Annual marathon through the streets of Toronto. Full marathon, half marathon, and 10K options available.',
            '2025-10-05',
            '07:00',
            '15:00',
            'Nathan Phillips Square',
            '100 Queen St W, Toronto, ON M5H 2N2',
            toronto_city_id,
            'sports',
            false,
            75.00,
            150.00,
            'CAD',
            'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/marathon',
            'manual',
            43.6534,
            -79.3839,
            0,
            NOW(),
            NOW()
        ),
        -- Social Events
        (
            'Startup Networking Night',
            'Connect with entrepreneurs, investors, and innovators in Toronto''s thriving startup ecosystem.',
            '2025-10-08',
            '18:30',
            '22:00',
            'The Drake Hotel',
            '1150 Queen St W, Toronto, ON M6J 1J3',
            toronto_city_id,
            'social',
            false,
            25.00,
            50.00,
            'CAD',
            'https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            'https://example.com/startup-night',
            'manual',
            43.6465,
            -79.4260,
            0,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully inserted 6 sample events for testing';
    ELSE
        RAISE NOTICE 'Toronto city not found - run setup-essential-db.sql first';
    END IF;
END $$;