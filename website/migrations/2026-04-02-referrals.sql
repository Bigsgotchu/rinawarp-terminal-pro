-- Referral identity + attribution
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

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
