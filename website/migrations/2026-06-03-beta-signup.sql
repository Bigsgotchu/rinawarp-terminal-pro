-- Beta signup table for Terminal Pro early access
-- Run with: wrangler d1 execute rinawarp-users --remote --config website/wrangler.toml --file=website/migrations/2026-06-03-beta-signup.sql

CREATE TABLE IF NOT EXISTS beta_signups (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  os TEXT,
  developer_stack TEXT,
  project_available TEXT,
  unsigned_comfort TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created ON beta_signups(created_at);