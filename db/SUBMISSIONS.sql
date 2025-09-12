-- SceneScout v14 User Submission Workflow
-- This file contains tables for managing user-submitted content

-- Submission status history
CREATE TABLE submission_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submission comments (internal notes)
CREATE TABLE submission_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true, -- Internal vs visible to submitter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submission attachments
CREATE TABLE submission_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- Size in bytes
    file_type VARCHAR(50),
    upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'failed')),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submission validation rules
CREATE TABLE submission_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('event', 'venue')),
    field_name VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL, -- required, min_length, max_length, regex, etc.
    validation_value TEXT,
    error_message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Duplicate detection
CREATE TABLE submission_duplicates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    existing_entity_type VARCHAR(20) NOT NULL CHECK (existing_entity_type IN ('event', 'venue')),
    existing_entity_id UUID NOT NULL,
    similarity_score NUMERIC(5, 2), -- 0-100 similarity percentage
    match_fields JSONB DEFAULT '[]', -- Which fields matched
    is_confirmed_duplicate BOOLEAN,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submission queue for moderation
CREATE TABLE submission_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    queue_type VARCHAR(50) DEFAULT 'standard', -- standard, priority, spam, etc.
    priority INTEGER DEFAULT 0,
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id)
);

-- Submission templates
CREATE TABLE submission_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('event', 'venue')),
    template_data JSONB NOT NULL, -- Pre-filled fields
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User submission limits
CREATE TABLE user_submission_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('event', 'venue')),
    daily_limit INTEGER DEFAULT 10,
    monthly_limit INTEGER DEFAULT 100,
    current_daily_count INTEGER DEFAULT 0,
    current_monthly_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    is_trusted BOOLEAN DEFAULT false, -- Trusted users have higher limits
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, submission_type)
);

-- Submission rewards/points
CREATE TABLE submission_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL, -- points, badge, privilege, etc.
    reward_value INTEGER,
    reward_data JSONB DEFAULT '{}',
    reason TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Banned/flagged content patterns
CREATE TABLE content_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filter_type VARCHAR(50) NOT NULL, -- spam, profanity, blacklist, etc.
    pattern TEXT NOT NULL, -- Regex or keywords
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action VARCHAR(50) NOT NULL, -- reject, flag, quarantine
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Functions for submission processing
CREATE OR REPLACE FUNCTION check_submission_duplicates(
    submission_id_param UUID
)
RETURNS TABLE (
    entity_type VARCHAR,
    entity_id UUID,
    entity_name VARCHAR,
    similarity_score NUMERIC
) AS $$
DECLARE
    submission_record RECORD;
BEGIN
    -- Get submission data
    SELECT * INTO submission_record FROM submissions WHERE id = submission_id_param;
    
    IF submission_record.submission_type = 'event' THEN
        RETURN QUERY
        SELECT 
            'event'::VARCHAR as entity_type,
            e.id as entity_id,
            e.name as entity_name,
            similarity(
                LOWER(submission_record.submission_data->>'name'), 
                LOWER(e.name)
            )::NUMERIC * 100 as similarity_score
        FROM events e
        WHERE e.deleted_at IS NULL
            AND (
                similarity(LOWER(submission_record.submission_data->>'name'), LOWER(e.name)) > 0.3
                OR (
                    submission_record.submission_data->>'event_date' = e.event_date::text
                    AND submission_record.submission_data->>'venue_id' = e.venue_id::text
                )
            )
        ORDER BY similarity_score DESC
        LIMIT 10;
    ELSIF submission_record.submission_type = 'venue' THEN
        RETURN QUERY
        SELECT 
            'venue'::VARCHAR as entity_type,
            v.id as entity_id,
            v.name as entity_name,
            GREATEST(
                similarity(LOWER(submission_record.submission_data->>'name'), LOWER(v.name)),
                similarity(LOWER(submission_record.submission_data->>'address'), LOWER(v.address))
            )::NUMERIC * 100 as similarity_score
        FROM venues v
        WHERE v.deleted_at IS NULL
            AND (
                similarity(LOWER(submission_record.submission_data->>'name'), LOWER(v.name)) > 0.3
                OR similarity(LOWER(submission_record.submission_data->>'address'), LOWER(v.address)) > 0.5
            )
        ORDER BY similarity_score DESC
        LIMIT 10;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Process approved submission
CREATE OR REPLACE FUNCTION process_approved_submission(
    submission_id_param UUID,
    reviewer_id_param UUID
)
RETURNS UUID AS $$
DECLARE
    submission_record RECORD;
    created_entity_id UUID;
BEGIN
    -- Get submission
    SELECT * INTO submission_record FROM submissions WHERE id = submission_id_param;
    
    IF submission_record.status != 'approved' THEN
        RAISE EXCEPTION 'Submission must be approved before processing';
    END IF;
    
    -- Create entity based on type
    IF submission_record.submission_type = 'event' THEN
        INSERT INTO events (
            name, slug, description, event_date, start_time, end_time,
            venue_id, city_id, location_name, address,
            categories, tags, images, featured_image_url,
            ticket_url, ticket_price_min, ticket_price_max,
            created_by, source, metadata
        )
        SELECT 
            (submission_data->>'name')::VARCHAR(255),
            (submission_data->>'slug')::VARCHAR(255),
            submission_data->>'description',
            (submission_data->>'event_date')::DATE,
            (submission_data->>'start_time')::TIME,
            (submission_data->>'end_time')::TIME,
            (submission_data->>'venue_id')::UUID,
            (submission_data->>'city_id')::UUID,
            submission_data->>'location_name',
            submission_data->>'address',
            COALESCE(submission_data->'categories', '[]'::JSONB),
            COALESCE(submission_data->'tags', '[]'::JSONB),
            COALESCE(submission_data->'images', '[]'::JSONB),
            submission_data->>'featured_image_url',
            submission_data->>'ticket_url',
            (submission_data->>'ticket_price_min')::DECIMAL(10,2),
            (submission_data->>'ticket_price_max')::DECIMAL(10,2),
            submission_record.user_id,
            'submission',
            jsonb_build_object('submission_id', submission_id_param)
        FROM submissions
        WHERE id = submission_id_param
        RETURNING id INTO created_entity_id;
        
    ELSIF submission_record.submission_type = 'venue' THEN
        INSERT INTO venues (
            name, slug, description, address, city_id,
            latitude, longitude, location,
            capacity, venue_type, amenities, images,
            contact_info, hours, created_at
        )
        SELECT 
            (submission_data->>'name')::VARCHAR(255),
            (submission_data->>'slug')::VARCHAR(255),
            submission_data->>'description',
            submission_data->>'address',
            (submission_data->>'city_id')::UUID,
            (submission_data->>'latitude')::DECIMAL(10,8),
            (submission_data->>'longitude')::DECIMAL(11,8),
            ST_MakePoint(
                (submission_data->>'longitude')::FLOAT,
                (submission_data->>'latitude')::FLOAT
            )::GEOGRAPHY,
            (submission_data->>'capacity')::INTEGER,
            submission_data->>'venue_type',
            COALESCE(submission_data->'amenities', '[]'::JSONB),
            COALESCE(submission_data->'images', '[]'::JSONB),
            COALESCE(submission_data->'contact_info', '{}'::JSONB),
            COALESCE(submission_data->'hours', '{}'::JSONB),
            CURRENT_TIMESTAMP
        FROM submissions
        WHERE id = submission_id_param
        RETURNING id INTO created_entity_id;
    END IF;
    
    -- Update submission with created entity
    UPDATE submissions
    SET approved_entity_id = created_entity_id,
        reviewer_id = reviewer_id_param,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = submission_id_param;
    
    -- Award points to submitter
    IF submission_record.user_id IS NOT NULL THEN
        INSERT INTO submission_rewards (user_id, submission_id, reward_type, reward_value, reason)
        VALUES (
            submission_record.user_id,
            submission_id_param,
            'points',
            100, -- Base points for approved submission
            'Submission approved: ' || submission_record.submission_type
        );
    END IF;
    
    RETURN created_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_submission_status_history_submission ON submission_status_history(submission_id);
CREATE INDEX idx_submission_comments_submission ON submission_comments(submission_id);
CREATE INDEX idx_submission_attachments_submission ON submission_attachments(submission_id);
CREATE INDEX idx_submission_validation_rules_type ON submission_validation_rules(submission_type) WHERE is_active = true;
CREATE INDEX idx_submission_duplicates_submission ON submission_duplicates(submission_id);
CREATE INDEX idx_submission_queue_assigned ON submission_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_submission_queue_priority ON submission_queue(priority DESC, created_at);
CREATE INDEX idx_user_submission_limits_user ON user_submission_limits(user_id);
CREATE INDEX idx_submission_rewards_user ON submission_rewards(user_id);
CREATE INDEX idx_content_filters_active ON content_filters(filter_type) WHERE is_active = true;

-- Triggers
CREATE TRIGGER update_submission_comments_updated_at BEFORE UPDATE ON submission_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_validation_rules_updated_at BEFORE UPDATE ON submission_validation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_templates_updated_at BEFORE UPDATE ON submission_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_submission_limits_updated_at BEFORE UPDATE ON user_submission_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_filters_updated_at BEFORE UPDATE ON content_filters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION track_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO submission_status_history (
            submission_id,
            previous_status,
            new_status,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submission_status_change_trigger
    AFTER UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION track_submission_status_change();

-- RLS Policies
ALTER TABLE submission_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_submission_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_filters ENABLE ROW LEVEL SECURITY;

-- Submission history/comments visible to submitter and admins
CREATE POLICY submission_history_select ON submission_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.id = submission_id 
            AND (s.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY submission_comments_select ON submission_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.id = submission_id 
            AND (
                (s.user_id = auth.uid() AND is_internal = false) 
                OR is_admin(auth.uid())
            )
        )
    );

-- Templates public read
CREATE POLICY submission_templates_select ON submission_templates FOR SELECT
    USING (is_active = true OR created_by = auth.uid() OR is_admin(auth.uid()));

-- User limits
CREATE POLICY user_submission_limits_select ON user_submission_limits FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Rewards visible to user
CREATE POLICY submission_rewards_select ON submission_rewards FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Admin only policies
CREATE POLICY submission_validation_admin ON submission_validation_rules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY submission_duplicates_admin ON submission_duplicates FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY submission_queue_admin ON submission_queue FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY content_filters_admin ON content_filters FOR ALL USING (is_admin(auth.uid()));