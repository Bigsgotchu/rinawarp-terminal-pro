-- RinaWarp Authentication Database Schema
-- Run with: wrangler d1 execute rinawarp-users --remote --config website/wrangler.toml --file=website/schema.sql

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  email_verified INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expires INTEGER,
  last_login_at INTEGER
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Sessions table for active sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);

-- Referral codes for authenticated users
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- Referral attribution events tied to checkout flow
CREATE TABLE IF NOT EXISTS referral_events (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_user_id TEXT,
  referred_email TEXT,
  event_type TEXT NOT NULL,
  checkout_session_id TEXT,
  source TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  converted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_referral_events_code ON referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_checkout_session ON referral_events(checkout_session_id);

-- Organizations for multi-product accounts
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Plans across products
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  interval TEXT,
  seats_included INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Subscription records keyed to a user or organization
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  user_id TEXT,
  organization_id TEXT,
  plan_code TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  current_period_end INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_product ON subscriptions(user_id, product);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_product ON subscriptions(organization_id, product);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub ON subscriptions(provider_subscription_id);

-- Effective entitlements used by apps and website surfaces
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  user_id TEXT,
  organization_id TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  plan_code TEXT,
  source_subscription_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_product ON entitlements(user_id, product);
CREATE INDEX IF NOT EXISTS idx_entitlements_org_product ON entitlements(organization_id, product);

-- Workspace access for Matter Intelligence
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  organization_id TEXT,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_product ON workspace_members(user_id, product);

-- Product-specific limits, starting with Matter Intelligence matter caps
CREATE TABLE IF NOT EXISTS matter_limits (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT,
  active_limit INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matter_limits_user ON matter_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_matter_limits_org ON matter_limits(organization_id);

-- Lead capture for Matter Intelligence demo/contact flows
CREATE TABLE IF NOT EXISTS matter_intelligence_leads (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  team_size TEXT,
  plan_interest TEXT,
  message TEXT,
  source_path TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mi_leads_email ON matter_intelligence_leads(email);
CREATE INDEX IF NOT EXISTS idx_mi_leads_type ON matter_intelligence_leads(request_type);

-- Matter Intelligence runtime workspace data
CREATE TABLE IF NOT EXISTS matter_intelligence_matters (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mi_matters_owner ON matter_intelligence_matters(owner_email);
CREATE INDEX IF NOT EXISTS idx_mi_matters_owner_status ON matter_intelligence_matters(owner_email, status);

CREATE TABLE IF NOT EXISTS matter_intelligence_connector_state (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  config_json TEXT,
  started_at INTEGER NOT NULL,
  last_synced_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mi_connector_owner_provider ON matter_intelligence_connector_state(owner_email, provider);

CREATE TABLE IF NOT EXISTS matter_intelligence_events (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  citation TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (matter_id) REFERENCES matter_intelligence_matters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mi_events_matter ON matter_intelligence_events(matter_id);
CREATE INDEX IF NOT EXISTS idx_mi_events_owner ON matter_intelligence_events(owner_email);
