-- RinaWarp Terminal Pro - D1 Database Schema
-- Tables for Stripe webhook idempotency and user entitlements

-- Stripe events table (for idempotency - prevent duplicate processing)
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);

-- Entitlements table (tracks user access to Pro features)
-- Tiers: pro ($699/$29.99) or team ($800/$49.99)
CREATE TABLE IF NOT EXISTS entitlements (
  customer_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'team')),
  status TEXT NOT NULL DEFAULT 'active',
  subscription_id TEXT,
  customer_email TEXT NOT NULL,
  amount_paid INTEGER,
  is_recurring INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements(customer_email);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_tier ON entitlements(tier);

-- License keys table (for one-time lifetime purchases)
CREATE TABLE IF NOT EXISTS license_keys (
  license_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  max_devices INTEGER DEFAULT 3,
  used_devices INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_license_keys_customer ON license_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_license_key ON license_keys(license_key);
