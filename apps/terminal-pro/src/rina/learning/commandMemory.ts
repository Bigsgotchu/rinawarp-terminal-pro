/**
 * Command Learning System
 *
 * Learns user's workflow by tracking command usage.
 * Enables Rina to understand recurring patterns and suggest optimizations.
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electron = require('electron')
const { app } = electron

export type CommandStat = {
  command: string
  count: number
  lastUsed: string
  avgDuration?: number
  successRate: number
  totalRuns: number
  successfulRuns: number
}

export interface CommandMemoryData {
  stats: Record<string, CommandStat>
  lastUpdated: string
}

class CommandMemory {
  private stats: Map<string, CommandStat> = new Map()
  private dataPath: string
  private _loaded = false

  constructor() {
    const userDataPath = app?.getPath?.('userData') || process.cwd()
    this.dataPath = path.join(userDataPath, 'command-memory.json')
  }

  private ensureLoaded() {
    if (!this._loaded) {
      this.load()
    }
  }

  record(command: string, success: boolean = true, durationMs?: number) {
    this.ensureLoaded()

    const existing = this.stats.get(command)
    const now = new Date().toISOString()

    if (existing) {
      existing.count++
      existing.totalRuns++
      if (success) {
        existing.successfulRuns++
      }
      existing.lastUsed = now
      if (durationMs !== undefined && existing.avgDuration) {
        // Running average
        existing.avgDuration = (existing.avgDuration * (existing.count - 1) + durationMs) / existing.count
      } else if (durationMs !== undefined) {
        existing.avgDuration = durationMs
      }
      existing.successRate = existing.successfulRuns / existing.totalRuns
    } else {
      this.stats.set(command, {
        command,
        count: 1,
        lastUsed: now,
        successRate: success ? 1 : 0,
        totalRuns: success ? 1 : 0,
        successfulRuns: success ? 1 : 0,
        avgDuration: durationMs,
      })
    }

    this.save()
  }

  topCommands(limit: number = 10): CommandStat[] {
    this.ensureLoaded()
    return [...this.stats.values()].sort((a, b) => b.count - a.count).slice(0, limit)
  }

  recentCommands(limit: number = 10): CommandStat[] {
    this.ensureLoaded()
    return [...this.stats.values()]
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, limit)
  }

  failedCommands(limit: number = 10): CommandStat[] {
    this.ensureLoaded()
    return [...this.stats.values()]
      .filter((s) => s.successRate < 0.5)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, limit)
  }

  getCommand(command: string): CommandStat | undefined {
    this.ensureLoaded()
    return this.stats.get(command)
  }

  getStats(): {
    totalCommands: number
    totalRuns: number
    avgSuccessRate: number
    mostUsed: string | null
  } {
    this.ensureLoaded()
    const values = [...this.stats.values()]

    if (values.length === 0) {
      return {
        totalCommands: 0,
        totalRuns: 0,
        avgSuccessRate: 0,
        mostUsed: null,
      }
    }

    const totalRuns = values.reduce((sum, s) => sum + s.totalRuns, 0)
    const avgSuccessRate = values.reduce((sum, s) => sum + s.successRate, 0) / values.length
    const mostUsed = values.sort((a, b) => b.count - a.count)[0]?.command || null

    return {
      totalCommands: values.length,
      totalRuns,
      avgSuccessRate,
      mostUsed,
    }
  }

  suggestCommands(input: string, limit: number = 5): CommandStat[] {
    this.ensureLoaded()
    const lower = input.toLowerCase()

    return [...this.stats.values()]
      .filter((s) => s.command.toLowerCase().includes(lower) || lower.includes(s.command.split(' ')[0].toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  clear() {
    this.stats.clear()
    this.save()
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data: CommandMemoryData = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'))
        if (data.stats) {
          for (const [cmd, stat] of Object.entries(data.stats)) {
            this.stats.set(cmd, stat as CommandStat)
          }
        }
        this._loaded = true
      }
    } catch (err) {
      console.warn('[CommandMemory] Failed to load:', err)
    }
    this._loaded = true
  }

  private save() {
    try {
      const data: CommandMemoryData = {
        stats: Object.fromEntries(this.stats),
        lastUpdated: new Date().toISOString(),
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2))
    } catch (err) {
      console.warn('[CommandMemory] Failed to save:', err)
    }
  }
}

export const commandMemory = new CommandMemory()
