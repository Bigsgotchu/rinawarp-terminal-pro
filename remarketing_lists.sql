-- Remarketing Lists and Custom Audience Combinations
-- SQL queries for creating targeted marketing segments

-- ============================================================================
-- GOOGLE ADS REMARKETING LISTS
-- ============================================================================

-- 1. Trial-Ready Users: Power users who haven't started a trial
CREATE VIEW google_ads_trial_ready_users AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.power_user_score,
    us.engagement_score
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
LEFT JOIN trials t ON u.user_id = t.user_id
WHERE us.is_power_user = TRUE
    AND t.trial_id IS NULL  -- No trial record
    AND u.status = 'active'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '30 days';

-- 2. Win-Back Campaign: Churned power users (no activity >14 days)
CREATE VIEW google_ads_winback_campaign AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.power_user_score,
    us.last_activity_date,
    CURRENT_DATE - us.last_activity_date AS days_inactive
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE us.is_power_user = TRUE
    AND us.last_activity_date < CURRENT_DATE - INTERVAL '14 days'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '90 days'  -- Not completely dormant
    AND u.status = 'active';

-- 3. Feature Adoption: Users who haven't used AI or voice features
CREATE VIEW google_ads_feature_adoption AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.engagement_score,
    CASE 
        WHEN NOT us.has_used_ai_features AND NOT us.has_used_voice_features THEN 'both_features'
        WHEN NOT us.has_used_ai_features THEN 'ai_features'
        WHEN NOT us.has_used_voice_features THEN 'voice_features'
    END AS missing_features
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE (us.has_used_ai_features = FALSE OR us.has_used_voice_features = FALSE)
    AND us.engagement_score >= 3  -- Engaged enough to potentially adopt new features
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '30 days'
    AND u.status = 'active';

-- 4. Conversion Optimization: High-intent users with >3 pricing page views
CREATE VIEW google_ads_conversion_optimization AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.is_high_intent,
    pp.pricing_page_views,
    pp.last_pricing_view_date,
    us.engagement_score
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
JOIN pricing_page_views pp ON u.user_id = pp.user_id
LEFT JOIN purchases p ON u.user_id = p.user_id
WHERE us.is_high_intent = TRUE
    AND pp.pricing_page_views > 3
    AND pp.last_pricing_view_date >= CURRENT_DATE - INTERVAL '30 days'
    AND p.purchase_id IS NULL  -- Haven't purchased yet
    AND u.status = 'active';

-- ============================================================================
-- EMAIL MARKETING SEGMENTS
-- ============================================================================

-- 1. Weekly Power User Digest
CREATE VIEW email_weekly_power_digest AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.timezone,
    us.power_user_score,
    us.engagement_score,
    us.last_activity_date
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE us.is_power_user = TRUE
    AND u.email_preferences ->> 'weekly_digest' = 'true'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '7 days'
    AND u.status = 'active'
    AND u.email_verified = TRUE;

-- 2. Feature Announcement List (Feature Explorers)
CREATE VIEW email_feature_announcements AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.timezone,
    us.is_feature_explorer,
    us.feature_adoption_rate,
    us.engagement_score
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE us.is_feature_explorer = TRUE
    AND u.email_preferences ->> 'feature_updates' = 'true'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '30 days'
    AND u.status = 'active'
    AND u.email_verified = TRUE;

-- 3. Re-engagement Campaigns (At-risk users)
CREATE VIEW email_reengagement_campaign AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.timezone,
    us.is_at_risk,
    us.engagement_score,
    us.last_activity_date,
    us.risk_score,
    CURRENT_DATE - us.last_activity_date AS days_inactive
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE us.is_at_risk = TRUE
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '21 days'  -- Not completely dormant
    AND us.last_activity_date < CURRENT_DATE - INTERVAL '7 days'   -- But inactive recently
    AND u.email_preferences ->> 'reengagement' != 'false'
    AND u.status = 'active'
    AND u.email_verified = TRUE;

-- 4. Conversion Nurture Sequence (High-intent non-purchasers)
CREATE VIEW email_conversion_nurture AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.timezone,
    us.is_high_intent,
    us.engagement_score,
    pp.pricing_page_views,
    pp.last_pricing_view_date,
    COALESCE(t.trial_status, 'no_trial') AS trial_status
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
LEFT JOIN pricing_page_views pp ON u.user_id = pp.user_id
LEFT JOIN trials t ON u.user_id = t.user_id
LEFT JOIN purchases p ON u.user_id = p.user_id
WHERE us.is_high_intent = TRUE
    AND p.purchase_id IS NULL  -- No purchases
    AND u.email_preferences ->> 'promotional' = 'true'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '30 days'
    AND u.status = 'active'
    AND u.email_verified = TRUE;

-- ============================================================================
-- CUSTOM AUDIENCE COMBINATIONS
-- ============================================================================

-- 1. Premium Prospects: Power Users AND Non-Purchasers
CREATE VIEW custom_premium_prospects AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.power_user_score,
    us.engagement_score,
    us.is_high_intent,
    pp.pricing_page_views,
    'premium_prospect' AS audience_type
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
LEFT JOIN pricing_page_views pp ON u.user_id = pp.user_id
LEFT JOIN purchases p ON u.user_id = p.user_id
WHERE us.is_power_user = TRUE
    AND p.purchase_id IS NULL  -- Non-purchasers
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '30 days'
    AND u.status = 'active';

-- 2. Growth Opportunity: New Users AND High Engagement Score
CREATE VIEW custom_growth_opportunity AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    us.engagement_score,
    us.is_new_user,
    us.onboarding_completion_rate,
    CURRENT_DATE - u.signup_date AS days_since_signup,
    'growth_opportunity' AS audience_type
FROM users u
JOIN user_segments us ON u.user_id = us.user_id
WHERE us.is_new_user = TRUE
    AND us.engagement_score >= 4  -- High engagement
    AND u.signup_date >= CURRENT_DATE - INTERVAL '30 days'
    AND us.last_activity_date >= CURRENT_DATE - INTERVAL '7 days'
    AND u.status = 'active';

-- 3. Retention Risk: Previous Purchasers AND Decreasing Activity
CREATE VIEW custom_retention_risk AS
SELECT DISTINCT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.signup_date,
    p.purchase_date,
    p.subscription_status,
    us.engagement_score,
    us.activity_trend,
    us.last_activity_date,
    CURRENT_DATE - us.last_activity_date AS days_inactive,
    'retention_risk' AS audience_type
FROM users u
JOIN purchases p ON u.user_id = p.user_id
JOIN user_segments us ON u.user_id = us.user_id
WHERE p.purchase_id IS NOT NULL  -- Has purchased
    AND p.subscription_status IN ('active', 'past_due')
    AND us.activity_trend = 'decreasing'
    AND us.engagement_score < us.previous_engagement_score
    AND us.last_activity_date < CURRENT_DATE - INTERVAL '7 days'
    AND u.status = 'active';

-- ============================================================================
-- AUDIENCE SIZE MONITORING
-- ============================================================================

-- View to monitor audience sizes for campaign planning
CREATE VIEW audience_size_summary AS
SELECT 
    'Google Ads - Trial Ready' AS audience_name,
    COUNT(*) AS audience_size,
    CURRENT_DATE AS snapshot_date
FROM google_ads_trial_ready_users

UNION ALL

SELECT 
    'Google Ads - Win-Back Campaign',
    COUNT(*),
    CURRENT_DATE
FROM google_ads_winback_campaign

UNION ALL

SELECT 
    'Google Ads - Feature Adoption',
    COUNT(*),
    CURRENT_DATE
FROM google_ads_feature_adoption

UNION ALL

SELECT 
    'Google Ads - Conversion Optimization',
    COUNT(*),
    CURRENT_DATE
FROM google_ads_conversion_optimization

UNION ALL

SELECT 
    'Email - Weekly Power Digest',
    COUNT(*),
    CURRENT_DATE
FROM email_weekly_power_digest

UNION ALL

SELECT 
    'Email - Feature Announcements',
    COUNT(*),
    CURRENT_DATE
FROM email_feature_announcements

UNION ALL

SELECT 
    'Email - Re-engagement',
    COUNT(*),
    CURRENT_DATE
FROM email_reengagement_campaign

UNION ALL

SELECT 
    'Email - Conversion Nurture',
    COUNT(*),
    CURRENT_DATE
FROM email_conversion_nurture

UNION ALL

SELECT 
    'Custom - Premium Prospects',
    COUNT(*),
    CURRENT_DATE
FROM custom_premium_prospects

UNION ALL

SELECT 
    'Custom - Growth Opportunity',
    COUNT(*),
    CURRENT_DATE
FROM custom_growth_opportunity

UNION ALL

SELECT 
    'Custom - Retention Risk',
    COUNT(*),
    CURRENT_DATE
FROM custom_retention_risk

ORDER BY audience_size DESC;
