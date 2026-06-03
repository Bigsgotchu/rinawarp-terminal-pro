-- Beta feedback table for Terminal Pro beta intake
-- Run with: wrangler d1 execute rinawarp-users --remote --config website/wrangler.toml --file=website/migrations/2026-06-03-beta-feedback.sql

CREATE TABLE IF NOT EXISTS beta_feedback (
  id TEXT PRIMARY KEY,
  signup_email TEXT,
  name TEXT,
  email TEXT NOT NULL,
  os TEXT,
  artifact_used TEXT,
  install_success TEXT,
  security_warning_experience TEXT,
  workspace_selected TEXT,
  first_proof_generated TEXT,
  time_to_first_proof TEXT,
  proof_exported TEXT,
  restart_persistence TEXT,
  safe_fix_approval_understood TEXT,
  confusing_ui_moments TEXT,
  crashes_or_errors TEXT,
  would_use_again TEXT,
  would_pay TEXT,
  notes TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_email ON beta_feedback(email);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_severity ON beta_feedback(severity);
