-- SceneScout v14 Push Notification Tables
-- This file contains tables for managing push notifications

-- Push notification queue
CREATE TABLE push_notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- event_reminder, new_events, plan_invite, etc.
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url TEXT,
    badge_url TEXT,
    image_url TEXT,
    action_url TEXT,
    data JSONB DEFAULT '{}', -- Additional notification data
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    ttl INTEGER DEFAULT 86400, -- Time to live in seconds
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'expired', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification templates
CREATE TABLE push_notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title_template TEXT NOT NULL, -- Supports variables like {{event_name}}
    body_template TEXT NOT NULL,
    icon_url TEXT,
    badge_url TEXT,
    action_url_template TEXT,
    default_data JSONB DEFAULT '{}',
    variables JSONB DEFAULT '[]', -- Expected variables for template
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Batch notification jobs
CREATE TABLE push_notification_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    description TEXT,
    notification_type VARCHAR(50) NOT NULL,
    template_id UUID REFERENCES push_notification_templates(id),
    target_criteria JSONB NOT NULL, -- Criteria for selecting users
    total_recipients INTEGER DEFAULT 0,
    notifications_created INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    notifications_failed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'cancelled')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification delivery logs
CREATE TABLE push_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES push_notification_queue(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES push_subscriptions(id),
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    response_headers JSONB,
    delivery_attempt INTEGER DEFAULT 1,
    delivered BOOLEAN DEFAULT false,
    delivery_time_ms INTEGER, -- Time taken to deliver in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification interactions
CREATE TABLE push_notification_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES push_notification_queue(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('delivered', 'opened', 'clicked', 'dismissed', 'action')),
    action_name VARCHAR(50), -- For custom actions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email', 'sms', 'in_app')),
    enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type, channel)
);

-- Topic subscriptions for broadcast notifications
CREATE TABLE push_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'city:nyc', 'category:music'
    topic_name VARCHAR(255) NOT NULL,
    description TEXT,
    subscriber_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE push_topic_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES push_topics(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id)
);

-- Scheduled notification rules
CREATE TABLE push_notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- event_reminder, weekly_digest, etc.
    trigger_conditions JSONB NOT NULL, -- Conditions that trigger the notification
    template_id UUID REFERENCES push_notification_templates(id),
    target_criteria JSONB DEFAULT '{}', -- Who receives the notification
    schedule_config JSONB DEFAULT '{}', -- Cron expression or time-based config
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Functions for push notifications
CREATE OR REPLACE FUNCTION schedule_event_reminders()
RETURNS INTEGER AS $$
DECLARE
    notifications_created INTEGER := 0;
BEGIN
    -- Create reminder notifications for events happening soon
    INSERT INTO push_notification_queue (
        user_id,
        subscription_id,
        notification_type,
        title,
        body,
        action_url,
        data,
        scheduled_for,
        priority
    )
    SELECT 
        ps.user_id,
        ps.id as subscription_id,
        'event_reminder' as notification_type,
        'Event Reminder: ' || e.name as title,
        'Your saved event "' || e.name || '" is happening ' || 
        CASE 
            WHEN e.event_date = CURRENT_DATE THEN 'today'
            WHEN e.event_date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
            ELSE 'on ' || TO_CHAR(e.event_date, 'Mon DD')
        END || 
        COALESCE(' at ' || TO_CHAR(e.start_time, 'HH12:MI AM'), ''),
        '/events/' || e.slug as action_url,
        jsonb_build_object(
            'event_id', e.id,
            'event_name', e.name,
            'event_date', e.event_date,
            'venue_name', v.name
        ) as data,
        ue.reminder_time as scheduled_for,
        'high' as priority
    FROM user_events ue
    JOIN events e ON ue.event_id = e.id
    LEFT JOIN venues v ON e.venue_id = v.id
    JOIN push_subscriptions ps ON ps.user_id = ue.user_id AND ps.is_active = true
    WHERE ue.reminder_time IS NOT NULL
        AND ue.reminder_sent = false
        AND ue.reminder_time <= CURRENT_TIMESTAMP + INTERVAL '1 hour'
        AND e.deleted_at IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM push_notification_queue pnq
            WHERE pnq.user_id = ue.user_id
                AND pnq.data->>'event_id' = e.id::text
                AND pnq.notification_type = 'event_reminder'
                AND pnq.status IN ('pending', 'sent')
        );
    
    GET DIAGNOSTICS notifications_created = ROW_COUNT;
    
    -- Mark reminders as sent
    UPDATE user_events
    SET reminder_sent = true
    WHERE reminder_time <= CURRENT_TIMESTAMP + INTERVAL '1 hour'
        AND reminder_sent = false;
    
    RETURN notifications_created;
END;
$$ LANGUAGE plpgsql;

-- Indexes for push notification tables
CREATE INDEX idx_push_queue_status ON push_notification_queue(status) WHERE status IN ('pending', 'sending');
CREATE INDEX idx_push_queue_scheduled ON push_notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_push_queue_user ON push_notification_queue(user_id);
CREATE INDEX idx_push_queue_type ON push_notification_queue(notification_type);
CREATE INDEX idx_push_queue_batch ON push_notification_queue(data->>'batch_id') WHERE data->>'batch_id' IS NOT NULL;

CREATE INDEX idx_push_delivery_notification ON push_delivery_logs(notification_id);
CREATE INDEX idx_push_delivery_subscription ON push_delivery_logs(subscription_id);

CREATE INDEX idx_push_interactions_notification ON push_notification_interactions(notification_id);
CREATE INDEX idx_push_interactions_user ON push_notification_interactions(user_id);
CREATE INDEX idx_push_interactions_type ON push_notification_interactions(interaction_type);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notif_prefs_type ON user_notification_preferences(notification_type, channel) WHERE enabled = true;

CREATE INDEX idx_push_topics_key ON push_topics(topic_key) WHERE is_active = true;
CREATE INDEX idx_push_topic_subs_user ON push_topic_subscriptions(user_id);
CREATE INDEX idx_push_topic_subs_topic ON push_topic_subscriptions(topic_id);

CREATE INDEX idx_push_rules_active ON push_notification_rules(next_run_at) WHERE is_active = true;

-- Triggers
CREATE TRIGGER update_push_queue_updated_at BEFORE UPDATE ON push_notification_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_templates_updated_at BEFORE UPDATE ON push_notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_batches_updated_at BEFORE UPDATE ON push_notification_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notif_prefs_updated_at BEFORE UPDATE ON user_notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_topics_updated_at BEFORE UPDATE ON push_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_rules_updated_at BEFORE UPDATE ON push_notification_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_topic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_rules ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY push_queue_user_select ON push_notification_queue FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY push_interactions_user_select ON push_notification_interactions FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Users can manage their preferences
CREATE POLICY user_notif_prefs_select ON user_notification_preferences FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY user_notif_prefs_insert ON user_notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_notif_prefs_update ON user_notification_preferences FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_notif_prefs_delete ON user_notification_preferences FOR DELETE USING (user_id = auth.uid());

-- Users can manage their topic subscriptions
CREATE POLICY push_topics_select ON push_topics FOR SELECT USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY push_topic_subs_select ON push_topic_subscriptions FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY push_topic_subs_insert ON push_topic_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY push_topic_subs_delete ON push_topic_subscriptions FOR DELETE USING (user_id = auth.uid());

-- Admin only policies
CREATE POLICY push_templates_admin ON push_notification_templates FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY push_batches_admin ON push_notification_batches FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY push_delivery_admin ON push_delivery_logs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY push_rules_admin ON push_notification_rules FOR ALL USING (is_admin(auth.uid()));