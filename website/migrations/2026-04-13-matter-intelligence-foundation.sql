-- Matter Intelligence + shared entitlement foundation
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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

-- Upgrade the legacy subscriptions table in place. Fresh installs should use website/schema.sql.
ALTER TABLE subscriptions ADD COLUMN product TEXT;
ALTER TABLE subscriptions ADD COLUMN organization_id TEXT;
ALTER TABLE subscriptions ADD COLUMN plan_code TEXT;
ALTER TABLE subscriptions ADD COLUMN provider TEXT DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN provider_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN updated_at INTEGER;

UPDATE subscriptions
SET
  product = COALESCE(NULLIF(product, ''), 'terminal_pro'),
  plan_code = COALESCE(NULLIF(plan_code, ''), NULLIF(plan_id, '')),
  provider = COALESCE(NULLIF(provider, ''), 'stripe'),
  provider_subscription_id = COALESCE(NULLIF(provider_subscription_id, ''), NULLIF(stripe_subscription_id, '')),
  updated_at = COALESCE(updated_at, created_at, unixepoch())
WHERE
  product IS NULL
  OR product = ''
  OR plan_code IS NULL
  OR plan_code = ''
  OR provider IS NULL
  OR provider = ''
  OR provider_subscription_id IS NULL
  OR provider_subscription_id = ''
  OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_product ON subscriptions(user_id, product);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_product ON subscriptions(organization_id, product);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub ON subscriptions(provider_subscription_id);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  user_id TEXT,
  organization_id TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  plan_code TEXT,
  source_subscription_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_product ON entitlements(user_id, product);
CREATE INDEX IF NOT EXISTS idx_entitlements_org_product ON entitlements(organization_id, product);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  organization_id TEXT,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_product ON workspace_members(user_id, product);

CREATE TABLE IF NOT EXISTS matter_limits (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT,
  active_limit INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matter_limits_user ON matter_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_matter_limits_org ON matter_limits(organization_id);

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
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mi_events_matter ON matter_intelligence_events(matter_id);
CREATE INDEX IF NOT EXISTS idx_mi_events_owner ON matter_intelligence_events(owner_email);
