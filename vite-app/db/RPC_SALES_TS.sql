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