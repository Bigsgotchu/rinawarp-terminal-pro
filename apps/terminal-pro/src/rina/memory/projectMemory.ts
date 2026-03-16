/**
 * Project Memory
 *
 * Remembers project-specific context and settings.
 * Each workspace gets persistent memory for better assistance.
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electron = require('electron')
const { app } = electron

export interface ProjectContext {
  name: string
  root: string
  type: string // "node", "python", "rust", "go", "unknown"
  buildCommand?: string
  testCommand?: string
  startCommand?: string
  dependencies?: string[]
  lastOpened: string
  visitCount: number
  notes: string
  customCommands: Record<string, string>
}

export interface ProjectMemoryData {
  projects: Record<string, ProjectContext>
  lastUpdated: string
}

class ProjectMemory {
  private data: Map<string, ProjectContext> = new Map()
  private dataPath: string
  private _loaded = false

  constructor() {
    // Use process.cwd() as fallback if app isn't ready
    const userDataPath = typeof app !== 'undefined' && app?.getPath ? app.getPath('userData') : process.cwd()
    this.dataPath = path.join(userDataPath, 'project-memory.json')
  }

  private ensureLoaded() {
    if (!this._loaded) {
      this.load()
    }
  }

  save(data: Partial<ProjectContext> & { root: string }) {
    this.ensureLoaded()

    const key = this.getKey(data.root)
    const existing = this.data.get(key)
    const now = new Date().toISOString()

    this.data.set(key, {
      name: data.name || existing?.name || path.basename(data.root),
      root: data.root,
      type: data.type || existing?.type || 'unknown',
      buildCommand: data.buildCommand || existing?.buildCommand,
      testCommand: data.testCommand || existing?.testCommand,
      startCommand: data.startCommand || existing?.startCommand,
      dependencies: data.dependencies || existing?.dependencies,
      lastOpened: now,
      visitCount: (existing?.visitCount || 0) + 1,
      notes: data.notes || existing?.notes || '',
      customCommands: data.customCommands || existing?.customCommands || {},
    })

    this.persist()
  }

  loadProject(projectRoot: string): ProjectContext | null {
    this.ensureLoaded()
    const key = this.getKey(projectRoot)
    return this.data.get(key) || null
  }

  getAllProjects(): ProjectContext[] {
    this.ensureLoaded()
    return [...this.data.values()].sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())
  }

  recentProjects(limit: number = 5): ProjectContext[] {
    this.ensureLoaded()
    return [...this.data.values()]
      .sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())
      .slice(0, limit)
  }

  updateNotes(projectRoot: string, notes: string) {
    this.ensureLoaded()
    const key = this.getKey(projectRoot)
    const existing = this.data.get(key)
    if (existing) {
      existing.notes = notes
      this.persist()
    }
  }

  addCustomCommand(projectRoot: string, name: string, command: string) {
    this.ensureLoaded()
    const key = this.getKey(projectRoot)
    const existing = this.data.get(key)
    if (existing) {
      existing.customCommands[name] = command
      this.persist()
    }
  }

  getCustomCommands(projectRoot: string): Record<string, string> {
    this.ensureLoaded()
    const key = this.getKey(projectRoot)
    return this.data.get(key)?.customCommands || {}
  }

  deleteProject(projectRoot: string) {
    this.ensureLoaded()
    const key = this.getKey(projectRoot)
    this.data.delete(key)
    this.persist()
  }

  detectProjectType(projectRoot: string): string {
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      return 'node'
    }
    if (
      fs.existsSync(path.join(projectRoot, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectRoot, 'requirements.txt'))
    ) {
      return 'python'
    }
    if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) {
      return 'rust'
    }
    if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
      return 'go'
    }
    return 'unknown'
  }

  private getKey(projectRoot: string): string {
    return path.resolve(projectRoot)
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data: ProjectMemoryData = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'))
        if (data.projects) {
          for (const [key, context] of Object.entries(data.projects)) {
            this.data.set(key, context as ProjectContext)
          }
        }
      }
    } catch (err) {
      console.warn('[ProjectMemory] Failed to load:', err)
    }
    this._loaded = true
  }

  private persist() {
    try {
      const data: ProjectMemoryData = {
        projects: Object.fromEntries(this.data),
        lastUpdated: new Date().toISOString(),
      }

      const dir = path.dirname(this.dataPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2))
    } catch (err) {
      console.warn('[ProjectMemory] Failed to save:', err)
    }
  }
}

export const projectMemory = new ProjectMemory()
