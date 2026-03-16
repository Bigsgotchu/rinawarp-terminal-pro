/**
 * RinaWarp SQLite Database Module
 *
 * Provides persistent storage for agents, ratings, and purchases.
 */
import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Determine database path - use /tmp for serverless, local for standalone
const dbPath = process.env.RINAWARP_DB_PATH || path.join(process.cwd(), 'rinawarp.db')

// Ensure directory exists
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db: DatabaseType = new Database(dbPath)

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL')

// Initialize database schema
db.exec(`
  -- Agents table
  CREATE TABLE IF NOT EXISTS agents (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    version TEXT NOT NULL,
    commands TEXT NOT NULL,
    downloads INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Ratings table
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent) REFERENCES agents(name)
  );

  -- Purchases table for paid agents
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    stripe_session_id TEXT,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent) REFERENCES agents(name)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_ratings_agent ON ratings(agent);
  CREATE INDEX IF NOT EXISTS idx_purchases_agent ON purchases(agent);
  CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(customer_email);
`)

// Helper functions for type safety
export interface AgentRow {
  name: string
  description: string
  author: string
  version: string
  commands: string
  downloads: number
  price: number
  created_at: string
  updated_at: string
}

export interface RatingRow {
  id: number
  agent: string
  rating: number
  user_id: string | null
  created_at: string
}

export interface PurchaseRow {
  id: number
  agent: string
  customer_email: string
  stripe_session_id: string | null
  amount: number
  status: string
  created_at: string
}

export default db
