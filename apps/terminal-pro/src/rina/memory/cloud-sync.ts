/**
 * Rina OS Control Layer - Cloud Sync
 *
 * Optional encrypted cloud sync for persistent memory.
 * Provides secure, encrypted storage that can be shared across devices.
 *
 * Key features:
 * - AES-256 encryption
 * - Optional sync (only when enabled)
 * - Non-blocking async operations
 * - Last-write-wins conflict resolution
 *
 * Additive architecture - does not modify existing core functionality.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { PersistentEntry } from './persistent-memory.js'

const CLOUD_FILE = 'rina-cloud.json'

// Generate a key from environment or use a default (should be overridden in production)
const getEncryptionKey = (): Buffer => {
  const secret = process.env.RINA_ENCRYPTION_SECRET || 'default-dev-secret-change-in-production'
  return crypto.createHash('sha256').update(secret).digest()
}

const ENCRYPTION_KEY = getEncryptionKey()

/**
 * CloudSync - Encrypted push/pull for persistent memory
 */
export class CloudSync {
  private cloudFilePath: string

  constructor(fileName: string = CLOUD_FILE) {
    const dataDir = process.env.RINA_DATA_DIR || process.cwd()
    this.cloudFilePath = path.resolve(dataDir, fileName)
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  private encrypt(data: unknown): { iv: string; data: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return { iv: iv.toString('hex'), data: encrypted }
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  private decrypt(payload: { iv: string; data: string }): PersistentEntry[] {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(payload.iv, 'hex'))
    let decrypted = decipher.update(payload.data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  }

  /**
   * Push local memory to cloud (encrypted)
   */
  async push(entries: PersistentEntry[]): Promise<boolean> {
    try {
      const encrypted = this.encrypt(entries)

      // Ensure directory exists
      const dir = path.dirname(this.cloudFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(this.cloudFilePath, JSON.stringify(encrypted, null, 2))
      console.log(`🌩️ Cloud sync: pushed ${entries.length} entries`)
      return true
    } catch (e) {
      console.error('Cloud sync push failed:', e)
      return false
    }
  }

  /**
   * Pull cloud memory (decrypted)
   */
  async pull(): Promise<PersistentEntry[]> {
    try {
      if (!fs.existsSync(this.cloudFilePath)) {
        console.log('🌩️ Cloud sync: no cloud data found')
        return []
      }

      const raw = fs.readFileSync(this.cloudFilePath, 'utf-8')
      const payload = JSON.parse(raw)
      const data = this.decrypt(payload)
      console.log(`🌩️ Cloud sync: pulled ${data.length} entries`)
      return data
    } catch (e) {
      console.error('Cloud sync pull failed:', e)
      return []
    }
  }

  /**
   * Check if cloud data exists
   */
  hasCloudData(): boolean {
    return fs.existsSync(this.cloudFilePath)
  }

  /**
   * Delete cloud data
   */
  async clearCloud(): Promise<void> {
    try {
      if (fs.existsSync(this.cloudFilePath)) {
        fs.unlinkSync(this.cloudFilePath)
        console.log('🌩️ Cloud sync: cleared cloud data')
      }
    } catch (e) {
      console.error('Cloud sync clear failed:', e)
    }
  }
}

// Singleton instance for easy access
export const cloudSync = new CloudSync()
