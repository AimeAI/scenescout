-- SceneScout v14 Extended User Profiles
-- This file contains tables for enhanced user profiles and social features

-- User interests and preferences
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- music, food, art, sports, etc.
    subcategory VARCHAR(100), -- rock, jazz, italian, etc.
    interest_level INTEGER DEFAULT 3 CHECK (interest_level BETWEEN 1 AND 5), -- 1=low, 5=high
    source VARCHAR(50) DEFAULT 'manual', -- manual, inferred, imported
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, subcategory)
);

-- User following relationships
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- User achievements/badges
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- early_adopter, event_explorer, super_planner, etc.
    achievement_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_color VARCHAR(20),
    points INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- User reviews/ratings
CREATE TABLE user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('event', 'venue', 'plan')),
    entity_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    photos JSONB DEFAULT '[]', -- Array of photo URLs
    helpful_count INTEGER DEFAULT 0,
    is_verified_attendance BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, entity_type, entity_id)
);

-- Review helpfulness votes
CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES user_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

-- User privacy settings
CREATE TABLE user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    show_activity BOOLEAN DEFAULT true,
    show_events BOOLEAN DEFAULT true,
    show_plans BOOLEAN DEFAULT false,
    show_followers BOOLEAN DEFAULT true,
    show_location BOOLEAN DEFAULT false,
    allow_messages BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    newsletter_subscribed BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    event_recommendations BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User statistics
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    events_attended INTEGER DEFAULT 0,
    events_saved INTEGER DEFAULT 0,
    plans_created INTEGER DEFAULT 0,
    reviews_written INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    points_total INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0, -- Consecutive days using app
    last_activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User levels/tiers
CREATE TABLE user_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    level_name VARCHAR(50) DEFAULT 'Newbie',
    points_required INTEGER DEFAULT 0,
    points_current INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    perks JSONB DEFAULT '[]', -- Array of perks/benefits
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Friend requests
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id),
    CHECK (sender_id != receiver_id)
);

-- User device/session tracking
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(20), -- mobile, tablet, desktop
    device_name VARCHAR(255),
    os VARCHAR(50),
    browser VARCHAR(50),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- User blocked/hidden content
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_entity_type VARCHAR(20) NOT NULL CHECK (blocked_entity_type IN ('user', 'venue', 'event', 'category')),
    blocked_entity_id UUID NOT NULL,
    reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_entity_type, blocked_entity_id)
);

-- Functions for profile management
CREATE OR REPLACE FUNCTION update_user_stats_on_event_save()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_favorite = true THEN
        INSERT INTO user_stats (user_id, events_saved)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            events_saved = user_stats.events_saved + 1,
            updated_at = CURRENT_TIMESTAMP;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Favorite status changed
        IF OLD.is_favorite != NEW.is_favorite THEN
            INSERT INTO user_stats (user_id, events_saved)
            VALUES (
                NEW.user_id, 
                CASE WHEN NEW.is_favorite THEN 1 ELSE -1 END
            )
            ON CONFLICT (user_id)
            DO UPDATE SET 
                events_saved = GREATEST(0, user_stats.events_saved + 
                    CASE WHEN NEW.is_favorite THEN 1 ELSE -1 END
                ),
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_event_save_trigger
    AFTER INSERT OR UPDATE ON user_events
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_event_save();

-- Update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following count for follower
        UPDATE user_stats SET 
            following_count = following_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.follower_id;
        
        -- Increment followers count for followed user
        UPDATE user_stats SET 
            followers_count = followers_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.following_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement counts
        UPDATE user_stats SET 
            following_count = GREATEST(0, following_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.follower_id;
        
        UPDATE user_stats SET 
            followers_count = GREATEST(0, followers_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.following_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follower_counts_trigger
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follower_counts();

-- Calculate user level based on points
CREATE OR REPLACE FUNCTION update_user_level(user_id_param UUID)
RETURNS void AS $$
DECLARE
    total_points INTEGER;
    new_level INTEGER;
    new_level_name VARCHAR(50);
    new_tier VARCHAR(20);
BEGIN
    -- Get total points from achievements and other sources
    SELECT COALESCE(SUM(points), 0) INTO total_points
    FROM user_achievements
    WHERE user_id = user_id_param;
    
    -- Calculate level (every 100 points = 1 level)
    new_level := GREATEST(1, total_points / 100 + 1);
    
    -- Determine level name and tier
    new_level_name := CASE 
        WHEN new_level >= 50 THEN 'Legend'
        WHEN new_level >= 25 THEN 'Expert'
        WHEN new_level >= 10 THEN 'Explorer'
        WHEN new_level >= 5 THEN 'Regular'
        ELSE 'Newbie'
    END;
    
    new_tier := CASE 
        WHEN new_level >= 50 THEN 'platinum'
        WHEN new_level >= 25 THEN 'gold'
        WHEN new_level >= 10 THEN 'silver'
        ELSE 'bronze'
    END;
    
    -- Update user level
    INSERT INTO user_levels (user_id, level, level_name, points_current, tier)
    VALUES (user_id_param, new_level, new_level_name, total_points, new_tier)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        level = new_level,
        level_name = new_level_name,
        points_current = total_points,
        tier = new_tier,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_interests_category ON user_interests(category, subcategory);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX idx_user_reviews_user ON user_reviews(user_id);
CREATE INDEX idx_user_reviews_entity ON user_reviews(entity_type, entity_id);
CREATE INDEX idx_user_reviews_rating ON user_reviews(rating, created_at DESC);
CREATE INDEX idx_review_votes_review ON review_votes(review_id);
CREATE INDEX idx_user_privacy_user ON user_privacy_settings(user_id);
CREATE INDEX idx_user_stats_user ON user_stats(user_id);
CREATE INDEX idx_user_levels_user ON user_levels(user_id);
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_user_devices_user ON user_devices(user_id) WHERE is_active = true;
CREATE INDEX idx_user_blocks_user ON user_blocks(user_id);

-- Triggers
CREATE TRIGGER update_user_interests_updated_at BEFORE UPDATE ON user_interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON user_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_privacy_updated_at BEFORE UPDATE ON user_privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON user_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- User interests - private to user
CREATE POLICY user_interests_select ON user_interests FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY user_interests_all ON user_interests FOR ALL USING (user_id = auth.uid());

-- User follows - public read
CREATE POLICY user_follows_select ON user_follows FOR SELECT USING (true);
CREATE POLICY user_follows_manage ON user_follows FOR ALL USING (follower_id = auth.uid());

-- Achievements - public read based on privacy settings
CREATE POLICY user_achievements_select ON user_achievements FOR SELECT USING (
    user_id = auth.uid() 
    OR is_admin(auth.uid())
    OR EXISTS (
        SELECT 1 FROM user_privacy_settings ups 
        WHERE ups.user_id = user_achievements.user_id 
        AND ups.profile_visibility IN ('public', 'friends')
    )
);

-- Reviews - public read
CREATE POLICY user_reviews_select ON user_reviews FOR SELECT USING (true);
CREATE POLICY user_reviews_manage ON user_reviews FOR ALL USING (user_id = auth.uid());

-- Review votes
CREATE POLICY review_votes_select ON review_votes FOR SELECT USING (true);
CREATE POLICY review_votes_manage ON review_votes FOR ALL USING (user_id = auth.uid());

-- Privacy settings - private to user
CREATE POLICY user_privacy_select ON user_privacy_settings FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY user_privacy_manage ON user_privacy_settings FOR ALL USING (user_id = auth.uid());

-- Stats - public read based on privacy
CREATE POLICY user_stats_select ON user_stats FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
    OR EXISTS (
        SELECT 1 FROM user_privacy_settings ups 
        WHERE ups.user_id = user_stats.user_id 
        AND ups.show_activity = true
        AND ups.profile_visibility IN ('public', 'friends')
    )
);

-- Levels - public read
CREATE POLICY user_levels_select ON user_levels FOR SELECT USING (true);

-- Friend requests
CREATE POLICY friend_requests_select ON friend_requests FOR SELECT 
    USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY friend_requests_manage ON friend_requests FOR ALL 
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Devices - private to user
CREATE POLICY user_devices_select ON user_devices FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY user_devices_manage ON user_devices FOR ALL USING (user_id = auth.uid());

-- Blocks - private to user
CREATE POLICY user_blocks_select ON user_blocks FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY user_blocks_manage ON user_blocks FOR ALL USING (user_id = auth.uid());