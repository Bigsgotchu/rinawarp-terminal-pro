-- Matter Intelligence runtime API tables for production worker endpoints
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
