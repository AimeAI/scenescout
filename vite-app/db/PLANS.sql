-- SceneScout v14 Event Planning Features
-- This file contains advanced tables for event planning and collaboration

-- Plan collaborators
CREATE TABLE plan_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '{}', -- Specific permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, user_id)
);

-- Plan invitations (for non-users)
CREATE TABLE plan_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plan templates library
CREATE TABLE plan_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- date_night, weekend_trip, bar_crawl, etc.
    city_id UUID REFERENCES cities(id),
    tags JSONB DEFAULT '[]',
    event_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    rating NUMERIC(3,2),
    is_featured BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    template_data JSONB NOT NULL, -- Stores event criteria, not specific events
    preview_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plan template usage
CREATE TABLE plan_template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID REFERENCES plans(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plan activities (audit log)
CREATE TABLE plan_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- created, updated, event_added, event_removed, shared, etc.
    entity_type VARCHAR(50), -- event, collaborator, etc.
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plan comments
CREATE TABLE plan_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    plan_event_id UUID REFERENCES plan_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES plan_comments(id),
    comment_text TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Plan votes (for group decision making)
CREATE TABLE plan_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    plan_event_id UUID NOT NULL REFERENCES plan_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('yes', 'no', 'maybe')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_event_id, user_id)
);

-- Plan check-ins
CREATE TABLE plan_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    plan_event_id UUID NOT NULL REFERENCES plan_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location GEOGRAPHY(Point, 4326),
    photo_url TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plan routes (optimized paths between events)
CREATE TABLE plan_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    route_data JSONB NOT NULL, -- GeoJSON or routing data
    total_distance_km NUMERIC(10, 2),
    total_duration_minutes INTEGER,
    transport_mode VARCHAR(20) DEFAULT 'driving', -- driving, walking, transit, cycling
    waypoint_order JSONB DEFAULT '[]', -- Ordered array of plan_event_ids
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id)
);

-- Plan exports (calendar, PDF, etc.)
CREATE TABLE plan_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('ics', 'pdf', 'image', 'link')),
    export_url TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggested events for plans
CREATE TABLE plan_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    suggested_by UUID REFERENCES users(id), -- NULL for system suggestions
    suggestion_reason TEXT,
    score NUMERIC(5, 2), -- Relevance score
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Functions for plan management
CREATE OR REPLACE FUNCTION get_plan_summary(plan_id_param UUID)
RETURNS TABLE (
    plan_name VARCHAR,
    event_count BIGINT,
    collaborator_count BIGINT,
    total_duration_hours NUMERIC,
    date_range JSONB,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as plan_name,
        COUNT(DISTINCT pe.id) as event_count,
        COUNT(DISTINCT pc.user_id) + 1 as collaborator_count, -- +1 for owner
        SUM(EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)::NUMERIC as total_duration_hours,
        jsonb_build_object(
            'start_date', MIN(e.event_date),
            'end_date', MAX(e.event_date)
        ) as date_range,
        CASE 
            WHEN MIN(e.event_date) < CURRENT_DATE THEN 'past'
            WHEN MIN(e.event_date) = CURRENT_DATE THEN 'today'
            ELSE 'upcoming'
        END as status
    FROM plans p
    LEFT JOIN plan_events pe ON p.id = pe.plan_id
    LEFT JOIN events e ON pe.event_id = e.id
    LEFT JOIN plan_collaborators pc ON p.id = pc.plan_id
    WHERE p.id = plan_id_param
    GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Generate plan from template
CREATE OR REPLACE FUNCTION generate_plan_from_template(
    template_id_param UUID,
    user_id_param UUID,
    plan_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_plan_id UUID;
    template_record RECORD;
BEGIN
    -- Get template details
    SELECT * INTO template_record FROM plan_templates WHERE id = template_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Create new plan
    INSERT INTO plans (user_id, name, description, date, city_id, metadata)
    VALUES (
        user_id_param,
        template_record.name || ' - ' || COALESCE(TO_CHAR(plan_date, 'Mon DD'), 'Custom'),
        template_record.description,
        plan_date,
        template_record.city_id,
        jsonb_build_object('template_id', template_id_param)
    )
    RETURNING id INTO new_plan_id;
    
    -- Update template usage count
    UPDATE plan_templates SET use_count = use_count + 1 WHERE id = template_id_param;
    
    -- Record usage
    INSERT INTO plan_template_usage (template_id, user_id, plan_id)
    VALUES (template_id_param, user_id_param, new_plan_id);
    
    RETURN new_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_plan_collaborators_plan ON plan_collaborators(plan_id);
CREATE INDEX idx_plan_collaborators_user ON plan_collaborators(user_id);
CREATE INDEX idx_plan_invitations_plan ON plan_invitations(plan_id);
CREATE INDEX idx_plan_invitations_token ON plan_invitations(invitation_token) WHERE accepted_at IS NULL;
CREATE INDEX idx_plan_templates_category ON plan_templates(category) WHERE is_public = true;
CREATE INDEX idx_plan_templates_featured ON plan_templates(is_featured) WHERE is_featured = true;
CREATE INDEX idx_plan_template_usage_template ON plan_template_usage(template_id);
CREATE INDEX idx_plan_activities_plan ON plan_activities(plan_id, created_at DESC);
CREATE INDEX idx_plan_comments_plan ON plan_comments(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plan_votes_event ON plan_votes(plan_event_id);
CREATE INDEX idx_plan_checkins_plan ON plan_checkins(plan_id);
CREATE INDEX idx_plan_checkins_user ON plan_checkins(user_id);
CREATE INDEX idx_plan_suggestions_plan ON plan_suggestions(plan_id) WHERE status = 'pending';
CREATE INDEX idx_plan_exports_plan ON plan_exports(plan_id);

-- Triggers
CREATE TRIGGER update_plan_collaborators_updated_at BEFORE UPDATE ON plan_collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_templates_updated_at BEFORE UPDATE ON plan_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_comments_updated_at BEFORE UPDATE ON plan_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_routes_updated_at BEFORE UPDATE ON plan_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE plan_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_suggestions ENABLE ROW LEVEL SECURITY;

-- Plan collaborators can view plan data
CREATE POLICY plan_collaborators_view ON plan_collaborators FOR SELECT
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM plan_collaborators pc2 
            WHERE pc2.plan_id = plan_collaborators.plan_id 
            AND pc2.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        )
    );

CREATE POLICY plan_collaborators_manage ON plan_collaborators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        ) OR is_admin(auth.uid())
    );

-- Templates policies
CREATE POLICY plan_templates_select ON plan_templates FOR SELECT
    USING (is_public = true OR created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY plan_templates_insert ON plan_templates FOR INSERT
    WITH CHECK (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY plan_templates_update ON plan_templates FOR UPDATE
    USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Comments policies
CREATE POLICY plan_comments_select ON plan_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plans p
            LEFT JOIN plan_collaborators pc ON p.id = pc.plan_id
            WHERE p.id = plan_comments.plan_id
            AND (p.user_id = auth.uid() OR pc.user_id = auth.uid() OR p.is_public = true)
        )
    );

CREATE POLICY plan_comments_insert ON plan_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM plans p
            LEFT JOIN plan_collaborators pc ON p.id = pc.plan_id
            WHERE p.id = plan_id
            AND (p.user_id = auth.uid() OR pc.user_id = auth.uid())
        ) AND user_id = auth.uid()
    );

CREATE POLICY plan_comments_update ON plan_comments FOR UPDATE
    USING (user_id = auth.uid());

-- Similar patterns for other tables...