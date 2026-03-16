/**
 * Marketplace Database Module
 *
 * Handles all database operations for the agent marketplace.
 * Uses SQLite with better-sqlite3, falls back to in-memory for serverless.
 */

import fs from 'fs'
import path from 'path'

// Try to use better-sqlite3, fall back to in-memory if not available
let db: any = null
let useDatabase = false

// In-memory fallback
const memoryStore: {
  agents: Map<string, any>
  ratings: Map<string, number[]>
  purchases: Map<string, any[]>
} = {
  agents: new Map(),
  ratings: new Map(),
  purchases: new Map(),
}

interface AgentData {
  name: string
  description: string
  author: string
  version: string
  commands: string
  downloads: number
  price: number
  created_at?: string
  updated_at?: string
}

async function initDatabase() {
  try {
    // Try to dynamically import better-sqlite3
    const Database = (await import('better-sqlite3')).default
    const dbPath = process.env.RINAWARP_DB_PATH || path.join(process.cwd(), 'rinawarp.db')

    // Ensure directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')

    // Initialize schema
    db.exec(`
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
      
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        user_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        stripe_session_id TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    useDatabase = true
    console.log('[Marketplace] Using SQLite database')
  } catch (error) {
    console.log('[Marketplace] Using in-memory store (SQLite not available)')
    useDatabase = false
  }
}

// Initialize on module load
initDatabase()

/**
 * Get all agents from marketplace
 */
export function getAgents(): any[] {
  if (useDatabase && db) {
    const rows = db.prepare('SELECT * FROM agents ORDER BY downloads DESC').all()
    return rows.map((row: any) => ({
      ...row,
      commands: JSON.parse(row.commands),
    }))
  }

  return Array.from(memoryStore.agents.values()).map((agent) => ({
    ...agent,
    commands: JSON.parse(agent.commands),
  }))
}

/**
 * Get single agent by name
 */
export function getAgent(name: string): any | null {
  if (useDatabase && db) {
    const row = db.prepare('SELECT * FROM agents WHERE name = ?').get(name)
    if (!row) return null
    return {
      ...row,
      commands: JSON.parse(row.commands),
    }
  }

  const agent = memoryStore.agents.get(name)
  if (!agent) return null
  return {
    ...agent,
    commands: JSON.parse(agent.commands),
  }
}

/**
 * Publish or update an agent
 */
export function publishAgent(agent: {
  name: string
  description: string
  author: string
  version: string
  commands: any[]
  price?: number
}): void {
  const commands = JSON.stringify(agent.commands)

  if (useDatabase && db) {
    db.prepare(
      `
      INSERT INTO agents (name, description, author, version, commands, price, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        author = excluded.author,
        version = excluded.version,
        commands = excluded.commands,
        price = excluded.price,
        updated_at = datetime('now')
    `
    ).run(agent.name, agent.description, agent.author, agent.version, commands, agent.price || 0)
  } else {
    memoryStore.agents.set(agent.name, {
      ...agent,
      commands,
      downloads: memoryStore.agents.get(agent.name)?.downloads || 0,
      price: agent.price || 0,
    })
  }
}

/**
 * Increment download count for an agent
 */
export function incrementDownloads(name: string): void {
  if (useDatabase && db) {
    db.prepare('UPDATE agents SET downloads = downloads + 1 WHERE name = ?').run(name)
  } else {
    const agent = memoryStore.agents.get(name)
    if (agent) {
      agent.downloads = (agent.downloads || 0) + 1
    }
  }
}

/**
 * Rate an agent
 */
export function rateAgent(agentName: string, rating: number, userId?: string): void {
  if (rating < 1 || rating > 5) return

  if (useDatabase && db) {
    db.prepare('INSERT INTO ratings (agent, rating, user_id) VALUES (?, ?, ?)').run(agentName, rating, userId || null)
  } else {
    if (!memoryStore.ratings.has(agentName)) {
      memoryStore.ratings.set(agentName, [])
    }
    memoryStore.ratings.get(agentName)!.push(rating)
  }
}

/**
 * Get average rating for an agent
 */
export function getAgentRating(agentName: string): number | null {
  if (useDatabase && db) {
    const row = db.prepare('SELECT AVG(rating) as avg FROM ratings WHERE agent = ?').get(agentName) as any
    return row?.avg || null
  }

  const ratings = memoryStore.ratings.get(agentName)
  if (!ratings || ratings.length === 0) return null
  return ratings.reduce((a, b) => a + b, 0) / ratings.length
}

/**
 * Record a purchase
 */
export function recordPurchase(agentName: string, email: string, amount: number, sessionId?: string): number {
  if (useDatabase && db) {
    const result = db
      .prepare(
        `
      INSERT INTO purchases (agent, customer_email, stripe_session_id, amount, status)
      VALUES (?, ?, ?, ?, 'completed')
    `
      )
      .run(agentName, email, sessionId || null, amount)
    return result.lastInsertRowid as number
  }

  if (!memoryStore.purchases.has(agentName)) {
    memoryStore.purchases.set(agentName, [])
  }
  const purchase = {
    id: memoryStore.purchases.get(agentName)!.length + 1,
    agent: agentName,
    customer_email: email,
    stripe_session_id: sessionId,
    amount,
    status: 'completed',
    created_at: new Date().toISOString(),
  }
  memoryStore.purchases.get(agentName)!.push(purchase)
  return purchase.id
}

/**
 * Check if user has purchased an agent
 */
export function hasPurchased(agentName: string, email: string): boolean {
  if (useDatabase && db) {
    const row = db
      .prepare("SELECT id FROM purchases WHERE agent = ? AND customer_email = ? AND status = 'completed'")
      .get(agentName, email)
    return !!row
  }

  const purchases = memoryStore.purchases.get(agentName)
  return purchases?.some((p) => p.customer_email === email && p.status === 'completed') || false
}

/**
 * Get purchase history for a user
 */
export function getUserPurchases(email: string): any[] {
  if (useDatabase && db) {
    return db
      .prepare("SELECT * FROM purchases WHERE customer_email = ? AND status = 'completed' ORDER BY created_at DESC")
      .all(email)
  }

  const allPurchases = Array.from(memoryStore.purchases.values()).flat()
  return allPurchases.filter((p) => p.customer_email === email && p.status === 'completed')
}

export default {
  getAgents,
  getAgent,
  publishAgent,
  incrementDownloads,
  rateAgent,
  getAgentRating,
  recordPurchase,
  hasPurchased,
  getUserPurchases,
}
