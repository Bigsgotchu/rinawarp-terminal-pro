export const MEMORY_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('session', 'user', 'workspace', 'episode')),
  kind TEXT NOT NULL CHECK(kind IN ('preference', 'constraint', 'project_fact', 'task_outcome', 'conversation_fact')),
  status TEXT NOT NULL CHECK(status IN ('approved', 'suggested', 'rejected')),
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  session_id TEXT,
  content TEXT NOT NULL,
  normalized_key TEXT,
  salience REAL NOT NULL DEFAULT 0.5,
  confidence REAL NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL CHECK(source IN ('user_explicit', 'assistant_inferred', 'task_outcome', 'system_derived')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id
  ON memory_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_workspace_id
  ON memory_entries(workspace_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_session_id
  ON memory_entries(session_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_scope_kind_status
  ON memory_entries(scope, kind, status);

CREATE INDEX IF NOT EXISTS idx_memory_entries_normalized_key
  ON memory_entries(normalized_key);

CREATE INDEX IF NOT EXISTS idx_memory_entries_updated_at
  ON memory_entries(updated_at);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_session_id
  ON conversation_turns(session_id);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_workspace_id
  ON conversation_turns(workspace_id);

CREATE TABLE IF NOT EXISTS memory_reviews (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  reviewer_user_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved', 'rejected')),
  created_at TEXT NOT NULL,
  FOREIGN KEY(memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_reviews_memory_id
  ON memory_reviews(memory_id);
`
