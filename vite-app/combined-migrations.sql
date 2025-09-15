-- SceneScout Combined Migrations
-- Run this in your Supabase SQL Editor

-- ========================================
-- Migration: 20250914T090000_schema.sql
-- ========================================

-- SceneScout v14 Core Database Schema
-- This file contains the main tables for the SceneScout application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table - stores user authentication and basic info
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- User profiles - extended user information
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    location VARCHAR(255),
    preferences JSONB DEFAULT '{}', -- User preferences as flexible JSON
    social_links JSONB DEFAULT '{}', -- Social media links
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Cities table - predefined cities for events
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    state_code VARCHAR(2),
    country_code VARCHAR(2) NOT NULL DEFAULT 'US',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timezone VARCHAR(50),
    population INTEGER,
    metro_area VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly name
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Venues table - locations where events are held
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    address VARCHAR(255),
    city_id UUID REFERENCES cities(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(Point, 4326), -- PostGIS point for spatial queries
    capacity INTEGER,
    venue_type VARCHAR(50), -- bar, club, theater, outdoor, etc.
    amenities JSONB DEFAULT '[]', -- Array of amenities
    images JSONB DEFAULT '[]', -- Array of image URLs
    contact_info JSONB DEFAULT '{}', -- Phone, email, website, etc.
    hours JSONB DEFAULT '{}', -- Operating hours by day
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Events table - main events data
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue_id UUID REFERENCES venues(id),
    city_id UUID REFERENCES cities(id),
    location_name VARCHAR(255), -- For events without a venue
    address VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(Point, 4326), -- PostGIS point
    categories JSONB DEFAULT '[]', -- Array of categories
    tags JSONB DEFAULT '[]', -- Array of tags
    images JSONB DEFAULT '[]', -- Array of image URLs
    featured_image_url TEXT,
    ticket_url TEXT,
    ticket_price_min DECIMAL(10, 2),
    ticket_price_max DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    organizer_info JSONB DEFAULT '{}', -- Organizer details
    social_links JSONB DEFAULT '{}', -- Event social media
    is_featured BOOLEAN DEFAULT false,
    is_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    view_count INTEGER DEFAULT 0,
    attendee_count INTEGER DEFAULT 0,
    source VARCHAR(50), -- manual, import, submission, etc.
    external_id VARCHAR(255), -- ID from external source
    metadata JSONB DEFAULT '{}', -- Additional flexible data
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User saved/favorited events
CREATE TABLE user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT false,
    is_attending BOOLEAN DEFAULT false,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- Plans - user-created event collections
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE,
    city_id UUID REFERENCES cities(id),
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    share_token VARCHAR(50) UNIQUE,
    view_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Events within plans
CREATE TABLE plan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    order_position INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, event_id)
);

-- User submissions for new events/venues
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('event', 'venue')),
    submission_data JSONB NOT NULL, -- All submitted data
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info')),
    reviewer_id UUID REFERENCES users(id),
    review_notes TEXT,
    approved_entity_id UUID, -- ID of created event/venue if approved
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Promotions and featured content
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('event', 'venue', 'banner')),
    entity_id UUID, -- References event or venue ID
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    position INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    city_id UUID REFERENCES cities(id),
    target_audience JSONB DEFAULT '{}', -- Targeting criteria
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    categories JSONB DEFAULT '[]', -- Notification categories user wants
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics - Event views tracking
CREATE TABLE event_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_duration INTEGER, -- Seconds spent on page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics - General metrics
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    dimensions JSONB DEFAULT '{}', -- Flexible dimensions for grouping
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metrics_type_period (metric_type, period_start, period_end)
);

-- User activity log
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- login, view_event, save_event, etc.
    entity_type VARCHAR(50), -- event, venue, plan, etc.
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_events_updated_at BEFORE UPDATE ON user_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Migration: 20250914T091000_stripe_extras.sql
-- ========================================

-- SceneScout v14 Stripe Integration Tables
-- This file contains all tables related to Stripe payment processing

-- Customer subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, past_due, canceled, incomplete, etc.
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment history
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- succeeded, pending, failed, refunded
    description TEXT,
    payment_method_type VARCHAR(50), -- card, bank_transfer, etc.
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),
    failure_code VARCHAR(50),
    failure_message TEXT,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stripe webhook events for idempotency
CREATE TABLE stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    api_version VARCHAR(50),
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer information
CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    shipping JSONB,
    balance INTEGER DEFAULT 0, -- Customer balance in cents
    currency VARCHAR(3) DEFAULT 'USD',
    default_payment_method_id VARCHAR(255),
    invoice_settings JSONB DEFAULT '{}',
    tax_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- card, bank_account, etc.
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_funding VARCHAR(20), -- credit, debit, prepaid, unknown
    billing_details JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_invoice_number VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
    amount_paid DECIMAL(10, 2),
    amount_due DECIMAL(10, 2),
    amount_remaining DECIMAL(10, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    invoice_pdf TEXT,
    hosted_invoice_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Promotional codes and discounts
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    stripe_coupon_id VARCHAR(255),
    stripe_promotion_code_id VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3), -- For fixed_amount discounts
    duration VARCHAR(20) CHECK (duration IN ('once', 'forever', 'repeating')),
    duration_in_months INTEGER, -- For repeating discounts
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track discount usage
CREATE TABLE discount_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discount_code_id, user_id)
);

-- Subscription plans configuration
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id VARCHAR(255) NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('day', 'week', 'month', 'year')),
    interval_count INTEGER NOT NULL DEFAULT 1,
    trial_period_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]', -- Array of feature strings
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Stripe tables
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

CREATE INDEX idx_stripe_webhook_events_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed) WHERE processed = false;

CREATE INDEX idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE INDEX idx_discount_codes_code ON discount_codes(code) WHERE is_active = true;
CREATE INDEX idx_discount_codes_valid ON discount_codes(valid_from, valid_until) WHERE is_active = true;

-- Triggers for Stripe tables
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for Stripe tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment data
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY payments_select ON payments FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY stripe_customers_select ON stripe_customers FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY payment_methods_select ON payment_methods FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY invoices_select ON invoices FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY discount_usage_select ON discount_usage FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Public can see active subscription plans and discount codes
CREATE POLICY subscription_plans_select ON subscription_plans FOR SELECT USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY discount_codes_select ON discount_codes FOR SELECT USING (is_active = true OR is_admin(auth.uid()));

-- Only admins can modify Stripe data (webhooks handle updates)
CREATE POLICY stripe_admin_all ON subscriptions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY payments_admin_all ON payments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY stripe_webhook_events_admin_all ON stripe_webhook_events FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY stripe_customers_admin_all ON stripe_customers FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY payment_methods_admin_all ON payment_methods FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY invoices_admin_all ON invoices FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY discount_codes_admin_all ON discount_codes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY discount_usage_admin_all ON discount_usage FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY subscription_plans_admin_all ON subscription_plans FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- Migration: 20250914T092000_submissions.sql
-- ========================================

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

-- ========================================
-- Migration: 20250914T093000_rls.sql
-- ========================================

-- SceneScout v14 Row Level Security (RLS) Policies
-- This file contains security policies for data access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY users_select ON users FOR SELECT
    USING (true); -- Public can see basic user info

CREATE POLICY users_update ON users FOR UPDATE
    USING (id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY users_delete ON users FOR DELETE
    USING (is_admin(auth.uid()));

-- Profiles table policies
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (true); -- Public profiles

CREATE POLICY profiles_insert ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update ON profiles FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY profiles_delete ON profiles FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Cities table policies (read-only for non-admins)
CREATE POLICY cities_select ON cities FOR SELECT
    USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY cities_insert ON cities FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY cities_update ON cities FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY cities_delete ON cities FOR DELETE
    USING (is_admin(auth.uid()));

-- Venues table policies
CREATE POLICY venues_select ON venues FOR SELECT
    USING (deleted_at IS NULL AND (is_active = true OR is_admin(auth.uid())));

CREATE POLICY venues_insert ON venues FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Authenticated users can submit

CREATE POLICY venues_update ON venues FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY venues_delete ON venues FOR DELETE
    USING (is_admin(auth.uid()));

-- Events table policies
CREATE POLICY events_select ON events FOR SELECT
    USING (deleted_at IS NULL OR is_admin(auth.uid()));

CREATE POLICY events_insert ON events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Authenticated users can submit

CREATE POLICY events_update ON events FOR UPDATE
    USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY events_delete ON events FOR DELETE
    USING (is_admin(auth.uid()));

-- User events policies (private to user)
CREATE POLICY user_events_select ON user_events FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY user_events_insert ON user_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_events_update ON user_events FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY user_events_delete ON user_events FOR DELETE
    USING (user_id = auth.uid());

-- Plans policies
CREATE POLICY plans_select ON plans FOR SELECT
    USING (
        deleted_at IS NULL AND (
            is_public = true OR 
            user_id = auth.uid() OR 
            is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM plans WHERE id = plans.id AND share_token IS NOT NULL
            )
        )
    );

CREATE POLICY plans_insert ON plans FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY plans_update ON plans FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY plans_delete ON plans FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Plan events policies (inherit from plan)
CREATE POLICY plan_events_select ON plan_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plans p 
            WHERE p.id = plan_id 
            AND (p.is_public = true OR p.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY plan_events_insert ON plan_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        )
    );

CREATE POLICY plan_events_update ON plan_events FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        ) OR is_admin(auth.uid())
    );

CREATE POLICY plan_events_delete ON plan_events FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM plans WHERE id = plan_id AND user_id = auth.uid()
        ) OR is_admin(auth.uid())
    );

-- Submissions policies
CREATE POLICY submissions_select ON submissions FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY submissions_insert ON submissions FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL); -- Allow anonymous submissions

CREATE POLICY submissions_update ON submissions FOR UPDATE
    USING (is_admin(auth.uid())); -- Only admins can review

CREATE POLICY submissions_delete ON submissions FOR DELETE
    USING (is_admin(auth.uid()));

-- Promotions policies
CREATE POLICY promotions_select ON promotions FOR SELECT
    USING (
        is_active = true AND 
        start_date <= CURRENT_TIMESTAMP AND 
        end_date >= CURRENT_TIMESTAMP
        OR is_admin(auth.uid())
    );

CREATE POLICY promotions_insert ON promotions FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY promotions_update ON promotions FOR UPDATE
    USING (is_admin(auth.uid()));

CREATE POLICY promotions_delete ON promotions FOR DELETE
    USING (is_admin(auth.uid()));

-- Push subscriptions policies (private to user)
CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update ON push_subscriptions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE
    USING (user_id = auth.uid());

-- Event views policies
CREATE POLICY event_views_select ON event_views FOR SELECT
    USING (is_admin(auth.uid())); -- Only admins can view analytics

CREATE POLICY event_views_insert ON event_views FOR INSERT
    WITH CHECK (true); -- Anyone can create view records

-- Metrics policies
CREATE POLICY metrics_select ON metrics FOR SELECT
    USING (is_admin(auth.uid())); -- Only admins can view metrics

CREATE POLICY metrics_insert ON metrics FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- User activities policies
CREATE POLICY user_activities_select ON user_activities FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY user_activities_insert ON user_activities FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL); -- Allow anonymous activity

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users for public content
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON cities, venues, events, promotions TO anon;
GRANT INSERT ON event_views, user_activities TO anon;
GRANT EXECUTE ON FUNCTION find_nearby_events TO anon;
GRANT EXECUTE ON FUNCTION get_trending_events TO anon;
GRANT EXECUTE ON FUNCTION search_events TO anon;
GRANT EXECUTE ON FUNCTION get_city_calendar TO anon;

-- Create service role for backend operations
CREATE ROLE service_role NOINHERIT;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================
-- Migration: 20250914T094000_indexes.sql
-- ========================================

-- SceneScout v14 Performance Indexes
-- This file contains all performance indexes for optimized queries

-- Event indexes for common queries
CREATE INDEX idx_events_date ON events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_city_date ON events(city_id, event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_venue ON events(venue_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_events_slug ON events(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_created_by ON events(created_by) WHERE deleted_at IS NULL;

-- Geospatial indexes for location-based queries
CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- JSONB indexes for array searches
CREATE INDEX idx_events_categories ON events USING GIN(categories);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_venues_amenities ON venues USING GIN(amenities);

-- Text search indexes
CREATE INDEX idx_events_name_trgm ON events USING GIN(name gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING GIN(description gin_trgm_ops);
CREATE INDEX idx_venues_name_trgm ON venues USING GIN(name gin_trgm_ops);
CREATE INDEX idx_cities_name_trgm ON cities USING GIN(name gin_trgm_ops);

-- Full text search indexes
CREATE INDEX idx_events_search ON events USING GIN(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);
CREATE INDEX idx_venues_search ON venues USING GIN(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- User-related indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- User events (favorites/saved)
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_event_id ON user_events(event_id);
CREATE INDEX idx_user_events_favorites ON user_events(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_events_attending ON user_events(user_id, is_attending) WHERE is_attending = true;
CREATE INDEX idx_user_events_reminder ON user_events(reminder_time) WHERE reminder_sent = false AND reminder_time IS NOT NULL;

-- Plans indexes
CREATE INDEX idx_plans_user_id ON plans(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_public ON plans(is_public) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX idx_plans_city ON plans(city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_share_token ON plans(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_plan_events_plan_id ON plan_events(plan_id);
CREATE INDEX idx_plan_events_event_id ON plan_events(event_id);

-- Venue indexes
CREATE INDEX idx_venues_city ON venues(city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_type ON venues(venue_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_slug ON venues(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_verified ON venues(is_verified) WHERE is_verified = true AND deleted_at IS NULL;

-- City indexes
CREATE INDEX idx_cities_slug ON cities(slug) WHERE is_active = true;
CREATE INDEX idx_cities_state ON cities(state_code) WHERE is_active = true;
CREATE INDEX idx_cities_country ON cities(country_code) WHERE is_active = true;

-- Submission indexes
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_type_status ON submissions(submission_type, status);
CREATE INDEX idx_submissions_pending ON submissions(submitted_at) WHERE status = 'pending';

-- Promotion indexes
CREATE INDEX idx_promotions_active ON promotions(start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_promotions_type ON promotions(promotion_type) WHERE is_active = true;
CREATE INDEX idx_promotions_city ON promotions(city_id) WHERE is_active = true;
CREATE INDEX idx_promotions_entity ON promotions(entity_id) WHERE entity_id IS NOT NULL;

-- Push subscription indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Analytics indexes
CREATE INDEX idx_event_views_event ON event_views(event_id);
CREATE INDEX idx_event_views_user ON event_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_views_date ON event_views(viewed_at);
CREATE INDEX idx_event_views_event_date ON event_views(event_id, viewed_at);

CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_date ON user_activities(created_at);
CREATE INDEX idx_user_activities_entity ON user_activities(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX idx_events_upcoming ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE;

CREATE INDEX idx_events_past ON events(city_id, event_date DESC, start_time DESC) 
    WHERE deleted_at IS NULL AND event_date < CURRENT_DATE;

-- Partial indexes for performance
CREATE INDEX idx_events_today ON events(city_id, start_time) 
    WHERE deleted_at IS NULL AND event_date = CURRENT_DATE;

CREATE INDEX idx_events_this_week ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE AND event_date < CURRENT_DATE + INTERVAL '7 days';

CREATE INDEX idx_events_this_weekend ON events(city_id, event_date, start_time) 
    WHERE deleted_at IS NULL AND EXTRACT(DOW FROM event_date) IN (0, 5, 6);

-- Index for finding nearby events efficiently
CREATE INDEX idx_events_location_date ON events USING GIST(location, event_date) WHERE deleted_at IS NULL;

-- ========================================
-- Migration: 20250914T095000_rpc.sql
-- ========================================

-- SceneScout v14 Remote Procedure Calls (RPC)
-- Complex queries and aggregations

-- Find events near a location
CREATE OR REPLACE FUNCTION find_nearby_events(
    lat DECIMAL,
    lon DECIMAL,
    radius_km INTEGER DEFAULT 10,
    limit_count INTEGER DEFAULT 50,
    event_date_filter DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    start_time TIME,
    venue_name VARCHAR,
    distance_km NUMERIC,
    location GEOGRAPHY,
    featured_image_url TEXT,
    categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.event_date,
        e.start_time,
        COALESCE(v.name, e.location_name) as venue_name,
        ST_Distance(e.location, ST_MakePoint(lon, lat)::geography) / 1000 as distance_km,
        e.location,
        e.featured_image_url,
        e.categories
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.deleted_at IS NULL
        AND e.location IS NOT NULL
        AND ST_DWithin(e.location, ST_MakePoint(lon, lat)::geography, radius_km * 1000)
        AND (event_date_filter IS NULL OR e.event_date >= event_date_filter)
        AND e.event_date >= CURRENT_DATE
    ORDER BY e.event_date, distance_km
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get trending events based on views and favorites
CREATE OR REPLACE FUNCTION get_trending_events(
    city_id_filter UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    venue_name VARCHAR,
    trending_score NUMERIC,
    view_count INTEGER,
    favorite_count BIGINT,
    featured_image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH event_stats AS (
        SELECT 
            e.id,
            COUNT(DISTINCT ev.id) as recent_views,
            COUNT(DISTINCT ue.id) FILTER (WHERE ue.is_favorite = true) as favorites
        FROM events e
        LEFT JOIN event_views ev ON e.id = ev.event_id 
            AND ev.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
        LEFT JOIN user_events ue ON e.id = ue.event_id
        WHERE e.deleted_at IS NULL
            AND e.event_date >= CURRENT_DATE
            AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
        GROUP BY e.id
    )
    SELECT 
        e.id,
        e.name,
        e.event_date,
        COALESCE(v.name, e.location_name) as venue_name,
        (es.recent_views * 2 + es.favorites * 5 + e.view_count * 0.1)::NUMERIC as trending_score,
        e.view_count,
        es.favorites as favorite_count,
        e.featured_image_url
    FROM events e
    JOIN event_stats es ON e.id = es.id
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE (es.recent_views > 0 OR es.favorites > 0 OR e.is_featured = true)
    ORDER BY trending_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search events by text
CREATE OR REPLACE FUNCTION search_events(
    search_query TEXT,
    city_id_filter UUID DEFAULT NULL,
    category_filter TEXT[] DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    event_date DATE,
    venue_name VARCHAR,
    city_name VARCHAR,
    categories JSONB,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.description,
        e.event_date,
        COALESCE(v.name, e.location_name) as venue_name,
        c.name as city_name,
        e.categories,
        ts_rank(
            to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')),
            plainto_tsquery('english', search_query)
        ) as relevance
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN cities c ON e.city_id = c.id
    WHERE e.deleted_at IS NULL
        AND (
            to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')) 
            @@ plainto_tsquery('english', search_query)
            OR e.name ILIKE '%' || search_query || '%'
        )
        AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
        AND (category_filter IS NULL OR e.categories ?| category_filter)
        AND (date_from IS NULL OR e.event_date >= date_from)
        AND (date_to IS NULL OR e.event_date <= date_to)
    ORDER BY relevance DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get user's upcoming events
CREATE OR REPLACE FUNCTION get_user_upcoming_events(
    user_id_param UUID,
    include_favorites BOOLEAN DEFAULT true,
    include_attending BOOLEAN DEFAULT true
)
RETURNS TABLE (
    event_id UUID,
    event_name VARCHAR,
    event_date DATE,
    start_time TIME,
    venue_name VARCHAR,
    is_favorite BOOLEAN,
    is_attending BOOLEAN,
    reminder_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.name as event_name,
        e.event_date,
        e.start_time,
        COALESCE(v.name, e.location_name) as venue_name,
        ue.is_favorite,
        ue.is_attending,
        ue.reminder_time
    FROM user_events ue
    JOIN events e ON ue.event_id = e.id
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE ue.user_id = user_id_param
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND (
            (include_favorites AND ue.is_favorite = true) OR
            (include_attending AND ue.is_attending = true)
        )
    ORDER BY e.event_date, e.start_time;
END;
$$ LANGUAGE plpgsql;

-- Get similar events
CREATE OR REPLACE FUNCTION get_similar_events(
    event_id_param UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    similarity_score NUMERIC
) AS $$
DECLARE
    source_event RECORD;
BEGIN
    -- Get source event details
    SELECT categories, tags, venue_id, city_id, event_date
    INTO source_event
    FROM events
    WHERE id = event_id_param AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.event_date,
        (
            -- Category similarity
            CASE WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(source_event.categories)) 
                THEN 5 ELSE 0 END +
            -- Tag similarity
            CASE WHEN e.tags ?| ARRAY(SELECT jsonb_array_elements_text(source_event.tags)) 
                THEN 3 ELSE 0 END +
            -- Same venue bonus
            CASE WHEN e.venue_id = source_event.venue_id THEN 4 ELSE 0 END +
            -- Same city bonus
            CASE WHEN e.city_id = source_event.city_id THEN 2 ELSE 0 END +
            -- Date proximity bonus (events close in time)
            CASE WHEN ABS(e.event_date - source_event.event_date) <= 7 THEN 1 ELSE 0 END
        )::NUMERIC as similarity_score
    FROM events e
    WHERE e.id != event_id_param
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND (
            e.categories ?| ARRAY(SELECT jsonb_array_elements_text(source_event.categories))
            OR e.tags ?| ARRAY(SELECT jsonb_array_elements_text(source_event.tags))
            OR e.venue_id = source_event.venue_id
        )
    ORDER BY similarity_score DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get event recommendations for user
CREATE OR REPLACE FUNCTION get_user_recommendations(
    user_id_param UUID,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    event_date DATE,
    recommendation_score NUMERIC,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        -- Get user's preferred categories and venues from their history
        SELECT 
            jsonb_agg(DISTINCT cat) as preferred_categories,
            array_agg(DISTINCT e.venue_id) FILTER (WHERE e.venue_id IS NOT NULL) as preferred_venues,
            array_agg(DISTINCT e.city_id) as preferred_cities
        FROM user_events ue
        JOIN events e ON ue.event_id = e.id
        CROSS JOIN jsonb_array_elements_text(e.categories) as cat
        WHERE ue.user_id = user_id_param
            AND (ue.is_favorite = true OR ue.is_attending = true)
    )
    SELECT 
        e.id,
        e.name,
        e.event_date,
        (
            -- Category match
            CASE WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(up.preferred_categories))
                THEN 5 ELSE 0 END +
            -- Venue match
            CASE WHEN e.venue_id = ANY(up.preferred_venues) THEN 4 ELSE 0 END +
            -- City match
            CASE WHEN e.city_id = ANY(up.preferred_cities) THEN 3 ELSE 0 END +
            -- Featured bonus
            CASE WHEN e.is_featured THEN 2 ELSE 0 END +
            -- Trending bonus
            CASE WHEN e.view_count > 100 THEN 1 ELSE 0 END
        )::NUMERIC as recommendation_score,
        CASE 
            WHEN e.categories ?| ARRAY(SELECT jsonb_array_elements_text(up.preferred_categories))
                THEN 'Based on your interests'
            WHEN e.venue_id = ANY(up.preferred_venues) 
                THEN 'At a venue you like'
            WHEN e.city_id = ANY(up.preferred_cities)
                THEN 'In your preferred city'
            ELSE 'Trending event'
        END as reason
    FROM events e
    CROSS JOIN user_preferences up
    WHERE e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE
        AND e.id NOT IN (
            SELECT event_id FROM user_events WHERE user_id = user_id_param
        )
    ORDER BY recommendation_score DESC, e.event_date
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Aggregate venue statistics
CREATE OR REPLACE FUNCTION get_venue_stats(venue_id_param UUID)
RETURNS TABLE (
    total_events BIGINT,
    upcoming_events BIGINT,
    total_views BIGINT,
    avg_event_attendance NUMERIC,
    popular_categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT e.id) FILTER (WHERE e.event_date >= CURRENT_DATE) as upcoming_events,
        SUM(e.view_count) as total_views,
        AVG(e.attendee_count)::NUMERIC as avg_event_attendance,
        jsonb_agg(DISTINCT cat ORDER BY cat) as popular_categories
    FROM events e
    CROSS JOIN LATERAL jsonb_array_elements_text(e.categories) as cat
    WHERE e.venue_id = venue_id_param
        AND e.deleted_at IS NULL
    GROUP BY e.venue_id;
END;
$$ LANGUAGE plpgsql;

-- Get city event calendar
CREATE OR REPLACE FUNCTION get_city_calendar(
    city_id_param UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    event_date DATE,
    event_count BIGINT,
    featured_event JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_events AS (
        SELECT 
            e.event_date,
            COUNT(*) as event_count,
            jsonb_build_object(
                'id', (ARRAY_AGG(e.id ORDER BY e.is_featured DESC, e.view_count DESC))[1],
                'name', (ARRAY_AGG(e.name ORDER BY e.is_featured DESC, e.view_count DESC))[1],
                'image', (ARRAY_AGG(e.featured_image_url ORDER BY e.is_featured DESC, e.view_count DESC))[1]
            ) as featured_event
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.event_date BETWEEN start_date AND end_date
        GROUP BY e.event_date
    )
    SELECT * FROM daily_events
    ORDER BY event_date;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250914T095500_rpc_counts.sql
-- ========================================

-- SceneScout v14 Count Functions for Pagination
-- This file contains RPC functions that return counts for efficient pagination

-- Get total count of events with filters
CREATE OR REPLACE FUNCTION count_events(
    city_id_filter UUID DEFAULT NULL,
    category_filter TEXT[] DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    venue_id_filter UUID DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    is_featured_only BOOLEAN DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        WHERE e.deleted_at IS NULL
            AND (city_id_filter IS NULL OR e.city_id = city_id_filter)
            AND (category_filter IS NULL OR e.categories ?| category_filter)
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
            AND (venue_id_filter IS NULL OR e.venue_id = venue_id_filter)
            AND (is_featured_only IS NULL OR e.is_featured = is_featured_only)
            AND (
                search_query IS NULL OR
                to_tsvector('english', coalesce(e.name, '') || ' ' || coalesce(e.description, '')) 
                @@ plainto_tsquery('english', search_query)
                OR e.name ILIKE '%' || search_query || '%'
            )
    );
END;
$$ LANGUAGE plpgsql;

-- Get total count of venues with filters
CREATE OR REPLACE FUNCTION count_venues(
    city_id_filter UUID DEFAULT NULL,
    venue_type_filter VARCHAR DEFAULT NULL,
    is_verified_only BOOLEAN DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM venues v
        WHERE v.deleted_at IS NULL
            AND v.is_active = true
            AND (city_id_filter IS NULL OR v.city_id = city_id_filter)
            AND (venue_type_filter IS NULL OR v.venue_type = venue_type_filter)
            AND (is_verified_only IS NULL OR v.is_verified = is_verified_only)
            AND (
                search_query IS NULL OR
                to_tsvector('english', coalesce(v.name, '') || ' ' || coalesce(v.description, '')) 
                @@ plainto_tsquery('english', search_query)
                OR v.name ILIKE '%' || search_query || '%'
            )
    );
END;
$$ LANGUAGE plpgsql;

-- Count user's events (favorites/saved)
CREATE OR REPLACE FUNCTION count_user_events(
    user_id_param UUID,
    is_favorite_filter BOOLEAN DEFAULT NULL,
    is_attending_filter BOOLEAN DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_events ue
        JOIN events e ON ue.event_id = e.id
        WHERE ue.user_id = user_id_param
            AND e.deleted_at IS NULL
            AND (is_favorite_filter IS NULL OR ue.is_favorite = is_favorite_filter)
            AND (is_attending_filter IS NULL OR ue.is_attending = is_attending_filter)
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user's plans
CREATE OR REPLACE FUNCTION count_user_plans(
    user_id_param UUID,
    is_public_filter BOOLEAN DEFAULT NULL,
    city_id_filter UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plans p
        WHERE p.user_id = user_id_param
            AND p.deleted_at IS NULL
            AND (is_public_filter IS NULL OR p.is_public = is_public_filter)
            AND (city_id_filter IS NULL OR p.city_id = city_id_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count public plans
CREATE OR REPLACE FUNCTION count_public_plans(
    city_id_filter UUID DEFAULT NULL,
    date_filter DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plans p
        WHERE p.is_public = true
            AND p.deleted_at IS NULL
            AND (city_id_filter IS NULL OR p.city_id = city_id_filter)
            AND (date_filter IS NULL OR p.date = date_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count submissions by status
CREATE OR REPLACE FUNCTION count_submissions(
    status_filter VARCHAR DEFAULT NULL,
    submission_type_filter VARCHAR DEFAULT NULL,
    user_id_filter UUID DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM submissions s
        WHERE (status_filter IS NULL OR s.status = status_filter)
            AND (submission_type_filter IS NULL OR s.submission_type = submission_type_filter)
            AND (user_id_filter IS NULL OR s.user_id = user_id_filter)
            AND (date_from IS NULL OR s.submitted_at >= date_from)
            AND (date_to IS NULL OR s.submitted_at <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user reviews
CREATE OR REPLACE FUNCTION count_user_reviews(
    user_id_param UUID,
    entity_type_filter VARCHAR DEFAULT NULL,
    rating_filter INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_reviews ur
        WHERE ur.user_id = user_id_param
            AND (entity_type_filter IS NULL OR ur.entity_type = entity_type_filter)
            AND (rating_filter IS NULL OR ur.rating = rating_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count reviews for entity
CREATE OR REPLACE FUNCTION count_entity_reviews(
    entity_type_param VARCHAR,
    entity_id_param UUID,
    rating_filter INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_reviews ur
        WHERE ur.entity_type = entity_type_param
            AND ur.entity_id = entity_id_param
            AND (rating_filter IS NULL OR ur.rating = rating_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count nearby events
CREATE OR REPLACE FUNCTION count_nearby_events(
    lat DECIMAL,
    lon DECIMAL,
    radius_km INTEGER DEFAULT 10,
    event_date_filter DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.deleted_at IS NULL
            AND e.location IS NOT NULL
            AND ST_DWithin(e.location, ST_MakePoint(lon, lat)::geography, radius_km * 1000)
            AND (event_date_filter IS NULL OR e.event_date >= event_date_filter)
            AND e.event_date >= CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Count events by venue
CREATE OR REPLACE FUNCTION count_venue_events(
    venue_id_param UUID,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    include_past BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.venue_id = venue_id_param
            AND e.deleted_at IS NULL
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
            AND (include_past OR e.event_date >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Count user followers
CREATE OR REPLACE FUNCTION count_user_followers(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_follows uf
        WHERE uf.following_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count user following
CREATE OR REPLACE FUNCTION count_user_following(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_follows uf
        WHERE uf.follower_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count notifications
CREATE OR REPLACE FUNCTION count_user_notifications(
    user_id_param UUID,
    status_filter VARCHAR DEFAULT NULL,
    notification_type_filter VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM push_notification_queue pnq
        WHERE pnq.user_id = user_id_param
            AND (status_filter IS NULL OR pnq.status = status_filter)
            AND (notification_type_filter IS NULL OR pnq.notification_type = notification_type_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count plan collaborators
CREATE OR REPLACE FUNCTION count_plan_collaborators(
    plan_id_param UUID,
    role_filter VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plan_collaborators pc
        WHERE pc.plan_id = plan_id_param
            AND pc.accepted_at IS NOT NULL
            AND (role_filter IS NULL OR pc.role = role_filter)
    );
END;
$$ LANGUAGE plpgsql;

-- Count events in date range for city
CREATE OR REPLACE FUNCTION count_city_events_by_date_range(
    city_id_param UUID,
    start_date DATE,
    end_date DATE
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.event_date BETWEEN start_date AND end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Count template usage
CREATE OR REPLACE FUNCTION count_template_usage(template_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM plan_template_usage ptu
        WHERE ptu.template_id = template_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Count active subscriptions
CREATE OR REPLACE FUNCTION count_active_subscriptions()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM subscriptions s
        WHERE s.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Count events by category in city
CREATE OR REPLACE FUNCTION count_events_by_category(
    city_id_param UUID,
    category TEXT,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM events e
        WHERE e.city_id = city_id_param
            AND e.deleted_at IS NULL
            AND e.categories ? category
            AND (date_from IS NULL OR e.event_date >= date_from)
            AND (date_to IS NULL OR e.event_date <= date_to)
    );
END;
$$ LANGUAGE plpgsql;

-- Count unique visitors for analytics
CREATE OR REPLACE FUNCTION count_unique_event_viewers(
    event_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, session_id))::INTEGER
        FROM event_views ev
        WHERE ev.event_id = event_id_param
            AND ev.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250914T095800_rpc_sales_ts.sql
-- ========================================

-- SceneScout v14 Sales/Revenue Analytics Time Series
-- This file contains time series functions for sales and revenue analytics

-- Revenue time series by period
CREATE OR REPLACE FUNCTION get_revenue_time_series(
    start_date DATE,
    end_date DATE,
    period_type VARCHAR DEFAULT 'day', -- day, week, month, quarter, year
    revenue_type VARCHAR DEFAULT 'all' -- all, subscription, promotion
)
RETURNS TABLE (
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    total_revenue DECIMAL(12, 2),
    subscription_revenue DECIMAL(12, 2),
    promotion_revenue DECIMAL(12, 2),
    transaction_count BIGINT,
    new_subscriptions INTEGER,
    cancelled_subscriptions INTEGER,
    active_subscriptions_end INTEGER
) AS $$
DECLARE
    period_interval INTERVAL;
    period_trunc_format TEXT;
BEGIN
    -- Set interval and truncation format based on period type
    CASE period_type
        WHEN 'day' THEN 
            period_interval := INTERVAL '1 day';
            period_trunc_format := 'day';
        WHEN 'week' THEN 
            period_interval := INTERVAL '1 week';
            period_trunc_format := 'week';
        WHEN 'month' THEN 
            period_interval := INTERVAL '1 month';
            period_trunc_format := 'month';
        WHEN 'quarter' THEN 
            period_interval := INTERVAL '3 months';
            period_trunc_format := 'quarter';
        WHEN 'year' THEN 
            period_interval := INTERVAL '1 year';
            period_trunc_format := 'year';
        ELSE 
            period_interval := INTERVAL '1 day';
            period_trunc_format := 'day';
    END CASE;

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            date_trunc(period_trunc_format, start_date::timestamp),
            date_trunc(period_trunc_format, end_date::timestamp),
            period_interval
        ) AS period_start
    ),
    period_bounds AS (
        SELECT 
            period_start,
            period_start + period_interval AS period_end
        FROM date_series
    ),
    revenue_data AS (
        SELECT 
            pb.period_start,
            pb.period_end,
            COALESCE(SUM(p.amount), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN p.subscription_id IS NOT NULL THEN p.amount ELSE 0 END), 0) AS subscription_revenue,
            COALESCE(SUM(CASE WHEN p.subscription_id IS NULL THEN p.amount ELSE 0 END), 0) AS promotion_revenue,
            COUNT(p.id) AS transaction_count
        FROM period_bounds pb
        LEFT JOIN payments p ON p.paid_at >= pb.period_start 
            AND p.paid_at < pb.period_end 
            AND p.status = 'succeeded'
        WHERE (revenue_type = 'all' OR 
               (revenue_type = 'subscription' AND p.subscription_id IS NOT NULL) OR
               (revenue_type = 'promotion' AND p.subscription_id IS NULL))
        GROUP BY pb.period_start, pb.period_end
    ),
    subscription_changes AS (
        SELECT 
            pb.period_start,
            pb.period_end,
            COUNT(CASE WHEN s.created_at >= pb.period_start AND s.created_at < pb.period_end THEN 1 END) AS new_subscriptions,
            COUNT(CASE WHEN s.canceled_at >= pb.period_start AND s.canceled_at < pb.period_end THEN 1 END) AS cancelled_subscriptions
        FROM period_bounds pb
        LEFT JOIN subscriptions s ON (
            (s.created_at >= pb.period_start AND s.created_at < pb.period_end) OR
            (s.canceled_at >= pb.period_start AND s.canceled_at < pb.period_end)
        )
        GROUP BY pb.period_start, pb.period_end
    ),
    active_subs_at_end AS (
        SELECT 
            pb.period_start,
            pb.period_end,
            COUNT(s.id) AS active_subscriptions_end
        FROM period_bounds pb
        LEFT JOIN subscriptions s ON s.created_at < pb.period_end 
            AND (s.canceled_at IS NULL OR s.canceled_at >= pb.period_end)
            AND s.status = 'active'
        GROUP BY pb.period_start, pb.period_end
    )
    SELECT 
        rd.period_start,
        rd.period_end,
        rd.total_revenue,
        rd.subscription_revenue,
        rd.promotion_revenue,
        rd.transaction_count,
        COALESCE(sc.new_subscriptions, 0)::INTEGER AS new_subscriptions,
        COALESCE(sc.cancelled_subscriptions, 0)::INTEGER AS cancelled_subscriptions,
        COALESCE(asae.active_subscriptions_end, 0)::INTEGER AS active_subscriptions_end
    FROM revenue_data rd
    LEFT JOIN subscription_changes sc ON rd.period_start = sc.period_start
    LEFT JOIN active_subs_at_end asae ON rd.period_start = asae.period_start
    ORDER BY rd.period_start;
END;
$$ LANGUAGE plpgsql;

-- Monthly Recurring Revenue (MRR) calculation
CREATE OR REPLACE FUNCTION get_mrr_time_series(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    month DATE,
    mrr DECIMAL(12, 2),
    new_mrr DECIMAL(12, 2),
    expansion_mrr DECIMAL(12, 2),
    contraction_mrr DECIMAL(12, 2),
    churned_mrr DECIMAL(12, 2),
    net_mrr_change DECIMAL(12, 2),
    active_subscriptions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(
            date_trunc('month', start_date),
            date_trunc('month', end_date),
            INTERVAL '1 month'
        )::DATE AS month
    ),
    subscription_mrr AS (
        SELECT 
            m.month,
            s.id,
            s.user_id,
            sp.price AS mrr_amount,
            s.created_at,
            s.canceled_at,
            LAG(sp.price) OVER (PARTITION BY s.user_id ORDER BY m.month) AS prev_mrr
        FROM months m
        CROSS JOIN subscriptions s
        JOIN subscription_plans sp ON s.stripe_price_id = sp.stripe_price_id
        WHERE s.created_at <= m.month + INTERVAL '1 month'
            AND (s.canceled_at IS NULL OR s.canceled_at > m.month)
            AND s.status = 'active'
    )
    SELECT 
        m.month,
        COALESCE(SUM(sm.mrr_amount), 0) AS mrr,
        COALESCE(SUM(CASE 
            WHEN date_trunc('month', sm.created_at) = m.month THEN sm.mrr_amount 
            ELSE 0 
        END), 0) AS new_mrr,
        COALESCE(SUM(CASE 
            WHEN sm.prev_mrr IS NOT NULL AND sm.mrr_amount > sm.prev_mrr THEN sm.mrr_amount - sm.prev_mrr
            ELSE 0 
        END), 0) AS expansion_mrr,
        COALESCE(SUM(CASE 
            WHEN sm.prev_mrr IS NOT NULL AND sm.mrr_amount < sm.prev_mrr THEN sm.prev_mrr - sm.mrr_amount
            ELSE 0 
        END), 0) AS contraction_mrr,
        COALESCE(SUM(CASE 
            WHEN date_trunc('month', sm.canceled_at) = m.month THEN sm.mrr_amount 
            ELSE 0 
        END), 0) AS churned_mrr,
        COALESCE(SUM(CASE 
            WHEN date_trunc('month', sm.created_at) = m.month THEN sm.mrr_amount 
            ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
            WHEN date_trunc('month', sm.canceled_at) = m.month THEN sm.mrr_amount 
            ELSE 0 
        END), 0) AS net_mrr_change,
        COUNT(sm.id)::INTEGER AS active_subscriptions
    FROM months m
    LEFT JOIN subscription_mrr sm ON m.month = sm.month
    GROUP BY m.month
    ORDER BY m.month;
END;
$$ LANGUAGE plpgsql;

-- Customer Lifetime Value (CLV) analysis
CREATE OR REPLACE FUNCTION get_clv_cohort_analysis(
    cohort_period VARCHAR DEFAULT 'month' -- month, quarter
)
RETURNS TABLE (
    cohort_period TEXT,
    cohort_size INTEGER,
    avg_clv DECIMAL(10, 2),
    avg_lifespan_days INTEGER,
    total_revenue DECIMAL(12, 2),
    churn_rate DECIMAL(5, 2)
) AS $$
DECLARE
    period_format TEXT;
BEGIN
    period_format := CASE 
        WHEN cohort_period = 'quarter' THEN 'YYYY-Q'
        ELSE 'YYYY-MM'
    END;

    RETURN QUERY
    WITH user_cohorts AS (
        SELECT 
            u.id AS user_id,
            TO_CHAR(u.created_at, period_format) AS cohort,
            u.created_at AS cohort_date
        FROM users u
    ),
    user_metrics AS (
        SELECT 
            uc.user_id,
            uc.cohort,
            uc.cohort_date,
            COALESCE(SUM(p.amount), 0) AS total_revenue,
            MIN(s.created_at) AS first_subscription,
            MAX(COALESCE(s.canceled_at, CURRENT_TIMESTAMP)) AS last_active,
            COUNT(DISTINCT s.id) AS subscription_count,
            CASE WHEN MAX(s.canceled_at) IS NOT NULL THEN true ELSE false END AS has_churned
        FROM user_cohorts uc
        LEFT JOIN subscriptions s ON uc.user_id = s.user_id
        LEFT JOIN payments p ON s.id = p.subscription_id AND p.status = 'succeeded'
        GROUP BY uc.user_id, uc.cohort, uc.cohort_date
    )
    SELECT 
        um.cohort AS cohort_period,
        COUNT(*)::INTEGER AS cohort_size,
        AVG(um.total_revenue)::DECIMAL(10, 2) AS avg_clv,
        AVG(EXTRACT(DAYS FROM um.last_active - um.cohort_date))::INTEGER AS avg_lifespan_days,
        SUM(um.total_revenue)::DECIMAL(12, 2) AS total_revenue,
        (COUNT(*) FILTER (WHERE um.has_churned) * 100.0 / COUNT(*))::DECIMAL(5, 2) AS churn_rate
    FROM user_metrics um
    GROUP BY um.cohort
    ORDER BY um.cohort;
END;
$$ LANGUAGE plpgsql;

-- Subscription churn analysis
CREATE OR REPLACE FUNCTION get_churn_analysis(
    start_date DATE,
    end_date DATE,
    period_type VARCHAR DEFAULT 'month'
)
RETURNS TABLE (
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    active_start INTEGER,
    new_subscriptions INTEGER,
    cancelled_subscriptions INTEGER,
    active_end INTEGER,
    gross_churn_rate DECIMAL(5, 2),
    net_churn_rate DECIMAL(5, 2),
    growth_rate DECIMAL(5, 2)
) AS $$
DECLARE
    period_interval INTERVAL;
    period_trunc_format TEXT;
BEGIN
    -- Set interval based on period type
    CASE period_type
        WHEN 'week' THEN 
            period_interval := INTERVAL '1 week';
            period_trunc_format := 'week';
        WHEN 'month' THEN 
            period_interval := INTERVAL '1 month';
            period_trunc_format := 'month';
        WHEN 'quarter' THEN 
            period_interval := INTERVAL '3 months';
            period_trunc_format := 'quarter';
        ELSE 
            period_interval := INTERVAL '1 month';
            period_trunc_format := 'month';
    END CASE;

    RETURN QUERY
    WITH periods AS (
        SELECT 
            date_trunc(period_trunc_format, generate_series(
                start_date::timestamp,
                end_date::timestamp,
                period_interval
            )) AS period_start
    ),
    period_bounds AS (
        SELECT 
            period_start,
            period_start + period_interval AS period_end
        FROM periods
    ),
    subscription_metrics AS (
        SELECT 
            pb.period_start,
            pb.period_end,
            -- Active at start of period
            COUNT(CASE WHEN s.created_at < pb.period_start 
                      AND (s.canceled_at IS NULL OR s.canceled_at >= pb.period_start)
                      AND s.status = 'active'
                  THEN 1 END) AS active_start,
            -- New subscriptions during period
            COUNT(CASE WHEN s.created_at >= pb.period_start 
                      AND s.created_at < pb.period_end
                  THEN 1 END) AS new_subscriptions,
            -- Cancelled during period
            COUNT(CASE WHEN s.canceled_at >= pb.period_start 
                      AND s.canceled_at < pb.period_end
                  THEN 1 END) AS cancelled_subscriptions,
            -- Active at end of period
            COUNT(CASE WHEN s.created_at < pb.period_end 
                      AND (s.canceled_at IS NULL OR s.canceled_at >= pb.period_end)
                      AND s.status = 'active'
                  THEN 1 END) AS active_end
        FROM period_bounds pb
        LEFT JOIN subscriptions s ON s.created_at < pb.period_end
        GROUP BY pb.period_start, pb.period_end
    )
    SELECT 
        sm.period_start,
        sm.period_end,
        sm.active_start::INTEGER,
        sm.new_subscriptions::INTEGER,
        sm.cancelled_subscriptions::INTEGER,
        sm.active_end::INTEGER,
        CASE WHEN sm.active_start > 0 
            THEN (sm.cancelled_subscriptions * 100.0 / sm.active_start)::DECIMAL(5, 2)
            ELSE 0::DECIMAL(5, 2)
        END AS gross_churn_rate,
        CASE WHEN sm.active_start > 0 
            THEN ((sm.cancelled_subscriptions - sm.new_subscriptions) * 100.0 / sm.active_start)::DECIMAL(5, 2)
            ELSE 0::DECIMAL(5, 2)
        END AS net_churn_rate,
        CASE WHEN sm.active_start > 0 
            THEN ((sm.active_end - sm.active_start) * 100.0 / sm.active_start)::DECIMAL(5, 2)
            ELSE 0::DECIMAL(5, 2)
        END AS growth_rate
    FROM subscription_metrics sm
    ORDER BY sm.period_start;
END;
$$ LANGUAGE plpgsql;

-- Revenue per user analysis
CREATE OR REPLACE FUNCTION get_arpu_analysis(
    start_date DATE,
    end_date DATE,
    period_type VARCHAR DEFAULT 'month'
)
RETURNS TABLE (
    period_start TIMESTAMP WITH TIME ZONE,
    total_revenue DECIMAL(12, 2),
    total_active_users INTEGER,
    arpu DECIMAL(10, 2), -- Average Revenue Per User
    arppu DECIMAL(10, 2) -- Average Revenue Per Paying User
) AS $$
DECLARE
    period_interval INTERVAL;
    period_trunc_format TEXT;
BEGIN
    CASE period_type
        WHEN 'week' THEN 
            period_interval := INTERVAL '1 week';
            period_trunc_format := 'week';
        WHEN 'month' THEN 
            period_interval := INTERVAL '1 month';
            period_trunc_format := 'month';
        WHEN 'quarter' THEN 
            period_interval := INTERVAL '3 months';
            period_trunc_format := 'quarter';
        ELSE 
            period_interval := INTERVAL '1 month';
            period_trunc_format := 'month';
    END CASE;

    RETURN QUERY
    WITH periods AS (
        SELECT 
            date_trunc(period_trunc_format, generate_series(
                start_date::timestamp,
                end_date::timestamp,
                period_interval
            )) AS period_start
    ),
    period_metrics AS (
        SELECT 
            p.period_start,
            p.period_start + period_interval AS period_end,
            COALESCE(SUM(pay.amount), 0) AS total_revenue,
            COUNT(DISTINCT ua.user_id) AS total_active_users,
            COUNT(DISTINCT pay.user_id) AS paying_users
        FROM periods p
        LEFT JOIN user_activities ua ON ua.created_at >= p.period_start 
            AND ua.created_at < p.period_start + period_interval
        LEFT JOIN payments pay ON pay.paid_at >= p.period_start 
            AND pay.paid_at < p.period_start + period_interval
            AND pay.status = 'succeeded'
        GROUP BY p.period_start
    )
    SELECT 
        pm.period_start,
        pm.total_revenue,
        pm.total_active_users::INTEGER,
        CASE WHEN pm.total_active_users > 0 
            THEN (pm.total_revenue / pm.total_active_users)::DECIMAL(10, 2)
            ELSE 0::DECIMAL(10, 2)
        END AS arpu,
        CASE WHEN pm.paying_users > 0 
            THEN (pm.total_revenue / pm.paying_users)::DECIMAL(10, 2)
            ELSE 0::DECIMAL(10, 2)
        END AS arppu
    FROM period_metrics pm
    ORDER BY pm.period_start;
END;
$$ LANGUAGE plpgsql;

-- Plan performance analysis
CREATE OR REPLACE FUNCTION get_plan_performance(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    plan_name VARCHAR,
    plan_price DECIMAL(10, 2),
    total_subscriptions BIGINT,
    active_subscriptions BIGINT,
    total_revenue DECIMAL(12, 2),
    avg_lifespan_days INTEGER,
    churn_rate DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.name AS plan_name,
        sp.price AS plan_price,
        COUNT(s.id) AS total_subscriptions,
        COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
        COALESCE(SUM(p.amount), 0) AS total_revenue,
        AVG(EXTRACT(DAYS FROM COALESCE(s.canceled_at, CURRENT_TIMESTAMP) - s.created_at))::INTEGER AS avg_lifespan_days,
        (COUNT(s.id) FILTER (WHERE s.canceled_at IS NOT NULL) * 100.0 / 
         NULLIF(COUNT(s.id), 0))::DECIMAL(5, 2) AS churn_rate
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON sp.stripe_price_id = s.stripe_price_id
        AND s.created_at BETWEEN start_date AND end_date
    LEFT JOIN payments p ON s.id = p.subscription_id AND p.status = 'succeeded'
    WHERE sp.is_active = true
    GROUP BY sp.name, sp.price, sp.id
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250914T096000_profiles.sql
-- ========================================

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

-- ========================================
-- Migration: 20250914T096500_plans.sql
-- ========================================

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

-- ========================================
-- Migration: 20250914T097000_metrics.sql
-- ========================================

-- SceneScout v14 Analytics and Metrics Tables
-- This file contains tables for tracking application metrics and analytics

-- Daily active users
CREATE TABLE daily_active_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    user_count INTEGER NOT NULL DEFAULT 0,
    new_user_count INTEGER NOT NULL DEFAULT 0,
    returning_user_count INTEGER NOT NULL DEFAULT 0,
    city_breakdown JSONB DEFAULT '{}', -- User counts by city
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Event engagement metrics
CREATE TABLE event_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_viewer_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    attendee_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    click_through_count INTEGER DEFAULT 0, -- Clicks to external ticket link
    avg_view_duration NUMERIC, -- Average seconds spent viewing
    source_breakdown JSONB DEFAULT '{}', -- Views by traffic source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, date)
);

-- Venue performance metrics
CREATE TABLE venue_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of month
    total_events INTEGER DEFAULT 0,
    total_event_views INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    avg_event_rating NUMERIC,
    popular_event_types JSONB DEFAULT '[]', -- Array of popular categories
    peak_days JSONB DEFAULT '[]', -- Days of week with most events
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, month)
);

-- Search analytics
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    city_id UUID REFERENCES cities(id),
    result_count INTEGER DEFAULT 0,
    clicked_result_position INTEGER, -- Which result they clicked (1-based)
    clicked_event_id UUID REFERENCES events(id),
    search_filters JSONB DEFAULT '{}', -- Applied filters
    search_type VARCHAR(50), -- text, category, date_range, etc.
    device_type VARCHAR(20), -- mobile, tablet, desktop
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User behavior funnel
CREATE TABLE user_behavior_funnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    funnel_step VARCHAR(50) NOT NULL, -- landing, browse, view_event, save_event, click_ticket
    event_id UUID REFERENCES events(id),
    city_id UUID REFERENCES cities(id),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_funnel_session (session_id, timestamp)
);

-- City activity metrics
CREATE TABLE city_activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID NOT NULL REFERENCES cities(id),
    week_start DATE NOT NULL,
    total_events INTEGER DEFAULT 0,
    total_venues INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    popular_categories JSONB DEFAULT '[]',
    trending_venues JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_id, week_start)
);

-- Feature usage tracking
CREATE TABLE feature_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    feature_name VARCHAR(100) NOT NULL, -- search, filter, save_event, create_plan, etc.
    feature_category VARCHAR(50), -- discovery, planning, social, etc.
    usage_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feature_name, date)
);

-- Page performance metrics
CREATE TABLE page_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_visitor_count INTEGER DEFAULT 0,
    avg_load_time_ms INTEGER,
    avg_time_on_page_seconds INTEGER,
    bounce_rate NUMERIC(5,2), -- Percentage
    exit_rate NUMERIC(5,2), -- Percentage
    device_breakdown JSONB DEFAULT '{}', -- Views by device type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_path, date)
);

-- Revenue metrics
CREATE TABLE revenue_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    subscription_revenue DECIMAL(10, 2) DEFAULT 0,
    promotion_revenue DECIMAL(10, 2) DEFAULT 0,
    new_subscriber_count INTEGER DEFAULT 0,
    churned_subscriber_count INTEGER DEFAULT 0,
    total_active_subscribers INTEGER DEFAULT 0,
    avg_revenue_per_user DECIMAL(10, 2),
    revenue_by_plan JSONB DEFAULT '{}', -- Revenue breakdown by subscription plan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Notification metrics
CREATE TABLE notification_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(50) NOT NULL, -- event_reminder, new_events, plan_shared, etc.
    date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    delivery_rate NUMERIC(5,2), -- Percentage
    open_rate NUMERIC(5,2), -- Percentage  
    click_rate NUMERIC(5,2), -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_type, date)
);

-- A/B test results
CREATE TABLE ab_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL, -- control, variant_a, variant_b, etc.
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    metric_name VARCHAR(100) NOT NULL, -- conversion, engagement, retention, etc.
    metric_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error tracking
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    page_path VARCHAR(255),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for metrics tables
CREATE INDEX idx_daily_active_users_date ON daily_active_users(date DESC);
CREATE INDEX idx_event_engagement_date ON event_engagement_metrics(date DESC);
CREATE INDEX idx_event_engagement_event ON event_engagement_metrics(event_id);
CREATE INDEX idx_venue_performance_venue ON venue_performance_metrics(venue_id);
CREATE INDEX idx_venue_performance_month ON venue_performance_metrics(month DESC);
CREATE INDEX idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX idx_search_analytics_date ON search_analytics(searched_at DESC);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_behavior_funnel_user ON user_behavior_funnel(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_city_activity_city ON city_activity_metrics(city_id);
CREATE INDEX idx_feature_usage_user_date ON feature_usage(user_id, date) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_name, date);
CREATE INDEX idx_page_performance_path_date ON page_performance_metrics(page_path, date DESC);
CREATE INDEX idx_revenue_metrics_date ON revenue_metrics(date DESC);
CREATE INDEX idx_notification_metrics_type_date ON notification_metrics(notification_type, date DESC);
CREATE INDEX idx_ab_test_results_test ON ab_test_results(test_name, variant);
CREATE INDEX idx_error_logs_type ON error_logs(error_type, occurred_at DESC) WHERE resolved = false;

-- Triggers for metrics tables
CREATE TRIGGER update_event_engagement_metrics_updated_at BEFORE UPDATE ON event_engagement_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venue_performance_metrics_updated_at BEFORE UPDATE ON venue_performance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized views for performance
CREATE MATERIALIZED VIEW popular_events_last_7_days AS
SELECT 
    e.id,
    e.name,
    e.event_date,
    e.city_id,
    SUM(eem.view_count) as total_views,
    SUM(eem.favorite_count) as total_favorites,
    AVG(eem.avg_view_duration) as avg_duration
FROM events e
JOIN event_engagement_metrics eem ON e.id = eem.event_id
WHERE eem.date >= CURRENT_DATE - INTERVAL '7 days'
    AND e.deleted_at IS NULL
GROUP BY e.id
ORDER BY total_views DESC;

CREATE INDEX idx_popular_events_city ON popular_events_last_7_days(city_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_metric_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_events_last_7_days;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for metrics (admin only)
ALTER TABLE daily_active_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view metrics
CREATE POLICY metrics_admin_only ON daily_active_users FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY event_engagement_admin_only ON event_engagement_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY venue_performance_admin_only ON venue_performance_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY search_analytics_admin_only ON search_analytics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY user_behavior_admin_only ON user_behavior_funnel FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY city_activity_admin_only ON city_activity_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY feature_usage_admin_only ON feature_usage FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY page_performance_admin_only ON page_performance_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY revenue_metrics_admin_only ON revenue_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY notification_metrics_admin_only ON notification_metrics FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY ab_test_admin_only ON ab_test_results FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY error_logs_admin_only ON error_logs FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- Migration: 20250914T097500_push.sql
-- ========================================

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

-- ========================================
-- Migration: 20250914T098000_storage_buckets.sql
-- ========================================

-- Create avatars bucket for user profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Public read avatars" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar files
CREATE POLICY "User can upload to avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar files
CREATE POLICY "User can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar files
CREATE POLICY "User can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- Migration: 20250914T099000_job_runs.sql
-- ========================================

-- Create job_runs table for tracking ingestion jobs
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_job_runs_job_name ON job_runs(job_name);
CREATE INDEX idx_job_runs_status ON job_runs(status);
CREATE INDEX idx_job_runs_started_at ON job_runs(started_at);

-- RLS policies for job_runs (admin only)
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage job_runs" ON job_runs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'admin'
  )
);

-- Function to start a job run
CREATE OR REPLACE FUNCTION start_job_run(
  p_job_name TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO job_runs (job_name, metadata)
  VALUES (p_job_name, p_metadata)
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;

-- Function to complete a job run
CREATE OR REPLACE FUNCTION complete_job_run(
  p_job_id UUID,
  p_status TEXT,
  p_records_processed INTEGER DEFAULT 0,
  p_records_inserted INTEGER DEFAULT 0,
  p_records_updated INTEGER DEFAULT 0,
  p_records_skipped INTEGER DEFAULT 0,
  p_errors_count INTEGER DEFAULT 0,
  p_error_details TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_runs 
  SET 
    status = p_status,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    records_processed = p_records_processed,
    records_inserted = p_records_inserted,
    records_updated = p_records_updated,
    records_skipped = p_records_skipped,
    errors_count = p_errors_count,
    error_details = p_error_details
  WHERE id = p_job_id;
END;
$$;

