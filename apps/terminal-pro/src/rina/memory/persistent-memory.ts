/**
 * Rina OS Control Layer - Persistent Memory
 *
 * Persistent storage that survives across terminal sessions.
 * Stores conversation history to a JSON file for recall between runs.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import fs from 'fs'
import path from 'path'
import { cloudSync } from './cloud-sync.js'
import { resolveRinaDataDir } from './dataRoot.js'

export interface PersistentEntry {
  timestamp: number
  userInput: string
  agentResponse: string
  metadata?: Record<string, unknown>
}

/**
 * PersistentMemory - Stores conversation history to disk
 *
 * Features:
 * - Persists across terminal sessions
 * - Recalls last n messages
 * - Keyword search capability
 * - Optional cloud sync (upload/load JSON)
 */
export class PersistentMemory {
  private memory: PersistentEntry[] = []
  private filePath: string
  private maxEntries: number = 1000

  constructor(fileName: string = 'rina-memory.json') {
    this.filePath = path.resolve(resolveRinaDataDir(), fileName)
    this.load()
  }

  /**
   * Store a conversation entry
   */
  store(userInput: string, agentResponse: string, metadata?: Record<string, unknown>): void {
    const entry: PersistentEntry = {
      timestamp: Date.now(),
      userInput,
      agentResponse,
      metadata,
    }
    this.memory.push(entry)

    // Maintain maximum size
    while (this.memory.length > this.maxEntries) {
      this.memory.shift()
    }

    this.save()
  }

  /**
   * Recall the last n entries
   */
  recall(limit: number = 50): PersistentEntry[] {
    return this.memory.slice(-limit)
  }

  /**
   * Search memory for keyword
   */
  search(keyword: string): PersistentEntry[] {
    const lower = keyword.toLowerCase()
    return this.memory.filter(
      (entry) => entry.userInput.toLowerCase().includes(lower) || entry.agentResponse.toLowerCase().includes(lower)
    )
  }

  /**
   * Get total entry count
   */
  count(): number {
    return this.memory.length
  }

  /**
   * Clear all persistent memory
   */
  clear(): void {
    this.memory = []
    this.save()
  }

  /**
   * Get all memory entries (full export)
   */
  getAll(): PersistentEntry[] {
    return [...this.memory]
  }

  /**
   * Export memory as JSON string (for cloud sync)
   */
  exportToJSON(): string {
    return JSON.stringify(this.memory, null, 2)
  }

  /**
   * Import memory from JSON string (for cloud sync)
   */
  importFromJSON(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString)
      if (Array.isArray(imported)) {
        this.memory = imported
        this.save()
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to import memory:', e)
      return false
    }
  }

  /**
   * Get memory within a time range
   */
  getByTimeRange(startTime: number, endTime: number = Date.now()): PersistentEntry[] {
    return this.memory.filter((entry) => entry.timestamp >= startTime && entry.timestamp <= endTime)
  }

  /**
   * Sync memory to cloud (encrypted)
   */
  async syncToCloud(): Promise<boolean> {
    return cloudSync.push(this.memory)
  }

  /**
   * Sync memory from cloud and merge
   * Uses last-write-wins conflict resolution
   */
  async syncFromCloud(): Promise<number> {
    const cloudEntries = await cloudSync.pull()
    if (cloudEntries.length === 0) {
      return 0
    }

    // Merge strategy: add any new cloud entries (by timestamp)
    let mergedCount = 0
    cloudEntries.forEach((entry) => {
      const exists = this.memory.some((e) => e.timestamp === entry.timestamp)
      if (!exists) {
        this.memory.push(entry)
        mergedCount++
      }
    })

    // Sort by timestamp and maintain max size
    this.memory.sort((a, b) => a.timestamp - b.timestamp)
    while (this.memory.length > this.maxEntries) {
      this.memory.shift()
    }

    this.save()
    console.log(`🌩️ Merged ${mergedCount} new entries from cloud`)
    return mergedCount
  }

  /**
   * Check if cloud data exists
   */
  hasCloudData(): boolean {
    return cloudSync.hasCloudData()
  }

  /**
   * Save memory to disk
   */
  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.memory, null, 2))
    } catch (e) {
      console.error('Failed to save memory:', e)
    }
  }

  /**
   * Load memory from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          this.memory = parsed
        }
      }
    } catch (e) {
      console.error('Failed to load memory:', e)
      this.memory = []
    }
  }
}

// Singleton instance for easy access
export const rinaMemory = new PersistentMemory()
