CREATE TABLE IF NOT EXISTS funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  path TEXT,
  href TEXT,
  referrer TEXT,
  anon_id TEXT,
  session_id TEXT,
  user_id TEXT,
  ip TEXT,
  ua TEXT,
  country TEXT,
  properties_json TEXT,
  utm_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_created_at
  ON funnel_events(event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at
  ON funnel_events(created_at DESC);
