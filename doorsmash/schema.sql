-- doorsmash Dating Site Database Schema
-- Ultimate Dating Platform combining best features from top apps
-- Copyright (c) 2024 rinawarp Technologies, LLC
-- All rights reserved.

-- Users table - Enhanced with all dating app features
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(50) NOT NULL,
    sexual_orientation VARCHAR(50),
    pronouns VARCHAR(50),
    phone_number VARCHAR(20),
    bio TEXT,
    occupation VARCHAR(100),
    company VARCHAR(100),
    education VARCHAR(100),
    location VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Verification fields
    verification_status VARCHAR(20) DEFAULT 'pending',
    id_verified BOOLEAN DEFAULT FALSE,
    photo_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    income_verified BOOLEAN DEFAULT FALSE,
    background_check_status VARCHAR(20) DEFAULT 'pending',
    
    -- Profile media
    profile_photo_url VARCHAR(500),
    profile_video_url VARCHAR(500),
    
    -- Subscription and premium features
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_type VARCHAR(20) DEFAULT 'basic', -- basic, premium, elite
    subscription_expires_at TIMESTAMP,
    
    -- Dating preferences
    looking_for VARCHAR(50), -- dating, relationship, marriage, friendship, networking
    relationship_type VARCHAR(50), -- monogamous, polyamorous, open
    has_children BOOLEAN,
    wants_children VARCHAR(20), -- yes, no, maybe, have_and_want_more
    smoking VARCHAR(20), -- never, socially, regularly, trying_to_quit
    drinking VARCHAR(20), -- never, socially, regularly
    drugs VARCHAR(20), -- never, socially, regularly
    religion VARCHAR(50),
    political_views VARCHAR(50),
    
    -- Physical attributes
    height INTEGER, -- in centimeters
    body_type VARCHAR(30),
    ethnicity VARCHAR(50),
    
    -- Personality and lifestyle
    personality_type VARCHAR(10), -- MBTI type
    lifestyle JSONB, -- array of lifestyle choices
    interests JSONB, -- array of interests
    languages JSONB, -- array of languages spoken
    
    -- App settings
    women_first_message BOOLEAN DEFAULT FALSE,
    show_me_in_discovery BOOLEAN DEFAULT TRUE,
    show_distance BOOLEAN DEFAULT TRUE,
    show_age BOOLEAN DEFAULT TRUE,
    incognito_mode BOOLEAN DEFAULT FALSE,
    
    -- Location and discovery
    max_distance INTEGER DEFAULT 50, -- in kilometers
    location_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Social features
    instagram_username VARCHAR(100),
    spotify_connected BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification table
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL, -- 'id', 'photo', 'phone', 'social', 'background'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    document_url VARCHAR(500),
    verification_data JSONB,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User photos table
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    caption TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 99,
    preferred_gender VARCHAR(50),
    max_distance INTEGER DEFAULT 50,
    location_preference VARCHAR(100),
    interests TEXT[],
    deal_breakers TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'matched', 'unmatched'
    matched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'emoji'
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Likes/Swipes table
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID REFERENCES users(id) ON DELETE CASCADE,
    swiped_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL, -- 'like', 'pass', 'super_like'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(swiper_id, swiped_id)
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_verifications_user_id ON verifications(user_id);
