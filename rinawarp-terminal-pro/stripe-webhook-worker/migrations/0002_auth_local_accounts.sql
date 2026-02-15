-- Migration: add local email/password auth accounts
-- Safe to run multiple times
CREATE TABLE IF NOT EXISTS auth_local_accounts (
  email TEXT PRIMARY KEY,
  name TEXT,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  customer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_local_accounts_customer_id
  ON auth_local_accounts(customer_id);
