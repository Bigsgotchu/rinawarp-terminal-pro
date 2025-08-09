-- RinaWarp Terminal Testimonials Database Schema
-- Optimized for 1000+ concurrent users

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Users table for tracking feedback submitters
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    team_size VARCHAR(50),
    first_submission_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_submission_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submission_count INTEGER DEFAULT 1,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Testimonials table (main feedback storage)
CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'beta_feedback', -- 'beta_feedback', 'feature_request', 'bug_report'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'spam'
    
    -- Content fields
    title VARCHAR(500),
    content TEXT NOT NULL,
    priority VARCHAR(20), -- For feature requests
    
    -- User consent and display preferences
    testimonial_approved BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(255),
    display_company VARCHAR(255),
    show_company BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    -- Moderation
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    review_notes TEXT,
    
    -- Performance indexes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table for tracking engagement
CREATE TABLE testimonial_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    testimonial_id UUID REFERENCES testimonials(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'share', 'conversion'
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    page_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'moderator', -- 'admin', 'moderator', 'viewer'
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_testimonials_created_at ON testimonials(created_at DESC);
CREATE INDEX idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX idx_testimonials_type ON testimonials(type);
CREATE INDEX idx_testimonials_approved ON testimonials(testimonial_approved, status);

-- Full-text search index
CREATE INDEX idx_testimonials_content_search ON testimonials USING gin(to_tsvector('english', content));
CREATE INDEX idx_testimonials_title_search ON testimonials USING gin(to_tsvector('english', title));

-- User performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_testimonial_id ON testimonial_analytics(testimonial_id);
CREATE INDEX idx_analytics_created_at ON testimonial_analytics(created_at DESC);
CREATE INDEX idx_analytics_event_type ON testimonial_analytics(event_type);

-- Rate limiting indexes
CREATE INDEX idx_rate_limits_ip_endpoint ON rate_limits(ip_address, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW approved_testimonials AS
SELECT 
    t.id,
    t.title,
    t.content,
    t.display_name,
    t.display_company,
    t.show_company,
    t.type,
    t.approved_at,
    u.team_size,
    COUNT(ta.id) as view_count
FROM testimonials t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN testimonial_analytics ta ON t.id = ta.testimonial_id AND ta.event_type = 'view'
WHERE t.status = 'approved' AND t.testimonial_approved = TRUE
GROUP BY t.id, u.team_size
ORDER BY t.approved_at DESC;

-- Function to clean old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() 
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Sample admin user (password: 'admin123' - CHANGE IN PRODUCTION!)
-- Generated with bcrypt hash
INSERT INTO admin_users (email, password_hash, role) 
VALUES ('admin@rinawarptech.com', '$2b$12$LQv3c1yqBTVHG9sYGNSPO.fy5GmLM8xTiPSYKV.ZJLVXm4EJE6/he', 'admin')
ON CONFLICT (email) DO NOTHING;
