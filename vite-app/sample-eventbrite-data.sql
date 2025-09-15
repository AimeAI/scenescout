-- Sample Eventbrite events for testing
-- Run this in Supabase SQL editor to see Eventbrite integration

-- First, get the Toronto city ID
DO $$
DECLARE
    toronto_city_id UUID;
BEGIN
    -- Get Toronto city ID
    SELECT id INTO toronto_city_id FROM cities WHERE slug = 'toronto-on' LIMIT 1;
    
    -- Insert sample Eventbrite events if Toronto exists
    IF toronto_city_id IS NOT NULL THEN
        INSERT INTO events (
            id, title, description, date, time, end_date, end_time,
            venue_name, address, city_id, category, is_free,
            price_min, price_max, currency, image_url, external_url,
            external_id, source, latitude, longitude, is_featured,
            view_count, created_at, updated_at
        ) VALUES 
        (
            uuid_generate_v4(),
            'Toronto Startup Showcase 2025',
            'Join us for an exciting evening of innovation as Toronto''s hottest startups pitch their groundbreaking ideas. Network with entrepreneurs, investors, and industry leaders.',
            '2025-09-20',
            '18:00',
            '2025-09-20', 
            '22:00',
            'MaRS Discovery District',
            '101 College St, Toronto, ON M5G 1L7',
            toronto_city_id,
            'business',
            false,
            25.00,
            75.00,
            'CAD',
            'https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://www.eventbrite.com/e/toronto-startup-showcase-2025',
            'eb_startup_2025_001',
            'eventbrite',
            43.6596,
            -79.3896,
            true,
            0,
            NOW(),
            NOW()
        ),
        (
            uuid_generate_v4(),
            'Digital Marketing Summit Toronto',
            'Learn the latest digital marketing strategies from industry experts. Sessions cover SEO, social media, content marketing, and AI-powered marketing tools.',
            '2025-09-25',
            '09:00',
            '2025-09-25',
            '17:00',
            'Toronto Convention Centre', 
            '255 Front St W, Toronto, ON M5V 2W6',
            toronto_city_id,
            'business',
            false,
            150.00,
            300.00,
            'CAD',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80',
            'https://www.eventbrite.com/e/digital-marketing-summit-toronto',
            'eb_marketing_2025_002',
            'eventbrite',
            43.6426,
            -79.3871,
            false,
            0,
            NOW(),
            NOW()
        ),
        (
            uuid_generate_v4(),
            'Toronto Food & Wine Festival',
            'Celebrate Toronto''s culinary scene with tastings from top restaurants, wine pairings, cooking demonstrations, and live music.',
            '2025-09-28',
            '12:00',
            '2025-09-29',
            '23:00',
            'Harbourfront Centre',
            '235 Queens Quay W, Toronto, ON M5J 2G8',
            toronto_city_id,
            'food',
            false,
            45.00,
            125.00,
            'CAD',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://www.eventbrite.com/e/toronto-food-wine-festival',
            'eb_food_2025_003',
            'eventbrite',
            43.6393,
            -79.3789,
            true,
            0,
            NOW(),
            NOW()
        ),
        (
            uuid_generate_v4(),
            'AI & Machine Learning Conference',
            'Explore the future of artificial intelligence with leading researchers and practitioners. Workshops, demos, and networking opportunities.',
            '2025-10-05',
            '08:30',
            '2025-10-06',
            '18:00',
            'University of Toronto - Bahen Centre',
            '40 St George St, Toronto, ON M5S 2E4',
            toronto_city_id,
            'tech',
            false,
            200.00,
            500.00,
            'CAD',
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://www.eventbrite.com/e/ai-machine-learning-conference',
            'eb_ai_2025_004',
            'eventbrite',
            43.6596,
            -79.3957,
            false,
            0,
            NOW(),
            NOW()
        ),
        (
            uuid_generate_v4(),
            'Toronto Indie Music Showcase',
            'Discover emerging indie artists from Toronto and beyond. Three stages, food trucks, and art installations in a vibrant outdoor setting.',
            '2025-10-12',
            '16:00',
            '2025-10-12',
            '23:30',
            'Trinity Bellwoods Park',
            '790 Queen St W, Toronto, ON M6J 1G1',
            toronto_city_id,
            'music',
            true,
            NULL,
            NULL,
            'CAD',
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://www.eventbrite.com/e/toronto-indie-music-showcase',
            'eb_music_2025_005',
            'eventbrite',
            43.6532,
            -79.4123,
            true,
            0,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully inserted 5 sample Eventbrite events for Toronto';
    ELSE
        RAISE NOTICE 'Toronto city not found - please run the essential database setup first';
    END IF;
END $$;