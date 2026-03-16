/**
 * Rina OS Control Layer - Long-Term Memory (Persistent Learning)
 *
 * Persistent storage that survives across terminal sessions.
 * Learns user preferences, preferred commands, and known projects
 * to make Rina feel more intelligent over time.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import fs from 'fs'
import path from 'path'

const MEMORY_FILENAME = '.rina-memory.json'

export interface LongTermMemoryData {
  preferredCommands: Record<string, string>
  userPreferences: Record<string, unknown>
  knownProjects: string[]
  learnedPatterns: Record<string, string[]>
  lastActive?: number
  sessionCount: number
}

const defaultData: LongTermMemoryData = {
  preferredCommands: {},
  userPreferences: {},
  knownProjects: [],
  learnedPatterns: {},
  sessionCount: 0,
}

/**
 * LongTermMemory - Persistent learning memory
 *
 * Features:
 * - Stores preferred commands (learns from user behavior)
 * - Remembers user preferences
 * - Tracks known projects
 * - Learns patterns from repeated actions
 * - Persists across sessions
 */
export class LongTermMemory {
  private data: LongTermMemoryData = { ...defaultData }
  private filePath: string
  private dirty: boolean = false
  private saveDebounceTimer?: NodeJS.Timeout

  constructor(customPath?: string) {
    // Use custom path or default to current working directory
    this.filePath = customPath || path.join(process.cwd(), MEMORY_FILENAME)
    this.load()
  }

  /**
   * Load memory from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(rawData)

        // Merge with defaults to ensure all fields exist
        this.data = {
          ...defaultData,
          ...parsed,
          // Ensure nested objects are merged properly
          preferredCommands: {
            ...defaultData.preferredCommands,
            ...(parsed.preferredCommands || {}),
          },
          userPreferences: {
            ...defaultData.userPreferences,
            ...(parsed.userPreferences || {}),
          },
          learnedPatterns: {
            ...defaultData.learnedPatterns,
            ...(parsed.learnedPatterns || {}),
          },
        }
      }
    } catch (error) {
      console.error('Failed to load long-term memory:', error)
      this.data = { ...defaultData }
    }
  }

  /**
   * Save memory to disk (debounced)
   */
  private save(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.dirty = true

    this.saveDebounceTimer = setTimeout(() => {
      this.flush()
    }, 1000)
  }

  /**
   * Force immediate save
   */
  flush(): void {
    if (!this.dirty) return

    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
      this.dirty = false
    } catch (error) {
      console.error('Failed to save long-term memory:', error)
    }
  }

  /**
   * Remember a preferred command (maps intent to command)
   */
  rememberCommand(intent: string, command: string): void {
    this.data.preferredCommands[intent.toLowerCase()] = command
    this.save()
  }

  /**
   * Get preferred command for an intent
   */
  getPreferredCommand(intent: string): string | null {
    return this.data.preferredCommands[intent.toLowerCase()] || null
  }

  /**
   * Get all preferred commands
   */
  getAllPreferredCommands(): Record<string, string> {
    return { ...this.data.preferredCommands }
  }

  /**
   * Remember a user preference
   */
  rememberPreference(key: string, value: unknown): void {
    this.data.userPreferences[key] = value
    this.save()
  }

  /**
   * Get a user preference
   */
  getPreference<T = unknown>(key: string): T | null {
    return (this.data.userPreferences[key] as T) ?? null
  }

  /**
   * Get all user preferences
   */
  getAllPreferences(): Record<string, unknown> {
    return { ...this.data.userPreferences }
  }

  /**
   * Remember a known project
   */
  rememberProject(projectPath: string): void {
    const normalizedPath = path.normalize(projectPath)
    if (!this.data.knownProjects.includes(normalizedPath)) {
      this.data.knownProjects.push(normalizedPath)
      this.save()
    }
  }

  /**
   * Check if a project is known
   */
  isKnownProject(projectPath: string): boolean {
    const normalizedPath = path.normalize(projectPath)
    return this.data.knownProjects.includes(normalizedPath)
  }

  /**
   * Get all known projects
   */
  getKnownProjects(): string[] {
    return [...this.data.knownProjects]
  }

  /**
   * Learn a pattern (multiple commands for an intent)
   */
  learnPattern(key: string, value: string): void {
    if (!this.data.learnedPatterns[key]) {
      this.data.learnedPatterns[key] = []
    }
    if (!this.data.learnedPatterns[key].includes(value)) {
      this.data.learnedPatterns[key].push(value)
      this.save()
    }
  }

  /**
   * Get learned patterns
   */
  getLearnedPatterns(key: string): string[] {
    return this.data.learnedPatterns[key] || []
  }

  /**
   * Get all learned patterns
   */
  getAllLearnedPatterns(): Record<string, string[]> {
    return { ...this.data.learnedPatterns }
  }

  /**
   * Record session activity
   */
  recordSession(): void {
    this.data.lastActive = Date.now()
    this.data.sessionCount++
    this.save()
  }

  /**
   * Get last active timestamp
   */
  getLastActive(): number | undefined {
    return this.data.lastActive
  }

  /**
   * Get total session count
   */
  getSessionCount(): number {
    return this.data.sessionCount
  }

  /**
   * Get all memory data
   */
  get(): LongTermMemoryData {
    return { ...this.data }
  }

  /**
   * Get memory context as string for AI
   */
  getContextString(): string {
    const parts: string[] = []

    if (this.data.knownProjects.length > 0) {
      parts.push(`Known Projects: ${this.data.knownProjects.join(', ')}`)
    }

    if (Object.keys(this.data.preferredCommands).length > 0) {
      const prefs = Object.entries(this.data.preferredCommands)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      parts.push(`Preferred Commands: ${prefs}`)
    }

    if (this.data.sessionCount > 0) {
      parts.push(`Total Sessions: ${this.data.sessionCount}`)
    }

    return parts.join('\n')
  }

  /**
   * Clear all learned data (reset)
   */
  clear(): void {
    this.data = { ...defaultData }
    this.save()
  }

  /**
   * Clear only learned commands
   */
  clearLearnedCommands(): void {
    this.data.preferredCommands = {}
    this.save()
  }

  /**
   * Clear only preferences
   */
  clearPreferences(): void {
    this.data.userPreferences = {}
    this.save()
  }
}

// Singleton instance for easy access
export const longtermMemory = new LongTermMemory()
