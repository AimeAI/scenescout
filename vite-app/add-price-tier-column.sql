-- Add price tier categorization to events table
-- This enables the swarm intelligence pricing system

-- Create price tier enum
CREATE TYPE pricing_tier AS ENUM ('free', 'budget', 'moderate', 'premium', 'luxury');

-- Add price_tier column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS price_tier pricing_tier;

-- Update existing events to have appropriate price tiers
UPDATE events 
SET price_tier = CASE 
    WHEN is_free = true OR price_min = 0 THEN 'free'::pricing_tier
    WHEN price_min <= 25 THEN 'budget'::pricing_tier
    WHEN price_min <= 75 THEN 'moderate'::pricing_tier
    WHEN price_min <= 200 THEN 'premium'::pricing_tier
    ELSE 'luxury'::pricing_tier
END
WHERE price_tier IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_events_price_tier ON events(price_tier);
CREATE INDEX IF NOT EXISTS idx_events_category_price_tier ON events(category, price_tier);

-- Add constraint to ensure price_tier is always set for new events
ALTER TABLE events 
ADD CONSTRAINT check_price_tier_not_null 
CHECK (price_tier IS NOT NULL);