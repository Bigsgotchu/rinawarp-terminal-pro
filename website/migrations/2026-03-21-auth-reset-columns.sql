-- Remote migration applied to rinawarp-users on 2026-03-21.
-- Keeps the older production auth schema compatible with the current password-reset flow.

ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires INTEGER;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
