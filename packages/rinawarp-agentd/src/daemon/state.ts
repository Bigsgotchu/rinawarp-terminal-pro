import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type AgentRuntimeState = {
  version: 1
  startedAt: string
  pid: number
  port: number
  mode: 'local'
  updatedAt: string
}

export type BackgroundTaskRecord = {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  maxAttempts: number
  nextRunAt?: string
  deadLetter?: boolean
  updatedAt?: string
  startedAt?: string
  completedAt?: string
  error?: string
  result?: Record<string, unknown>
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
}

type TaskRegistry = {
  version: 1
  tasks: BackgroundTaskRecord[]
  updatedAt: string
}

let resolvedBaseDir: string | null = null

function resolveBaseDir(): string {
  if (resolvedBaseDir) return resolvedBaseDir
  const explicit = process.env.RINAWARP_AGENT_HOME?.trim()
  if (explicit) {
    resolvedBaseDir = explicit
    return resolvedBaseDir
  }
  const preferred = path.join(os.homedir(), '.rinawarp', 'agent')
  try {
    fs.mkdirSync(preferred, { recursive: true })
    resolvedBaseDir = preferred
    return resolvedBaseDir
  } catch {
    const fallback = path.join(os.tmpdir(), 'rinawarp-agent')
    fs.mkdirSync(fallback, { recursive: true })
    resolvedBaseDir = fallback
    return resolvedBaseDir
  }
}

export function paths(): { baseDir: string; stateFile: string; tasksFile: string; pidFile: string } {
  const baseDir = resolveBaseDir()
  return {
    baseDir,
    stateFile: path.join(baseDir, 'daemon-state.json'),
    tasksFile: path.join(baseDir, 'tasks.json'),
    pidFile: path.join(baseDir, 'daemon.pid'),
  }
}

export function ensureStore(): void {
  const { baseDir } = paths()
  try {
    fs.mkdirSync(baseDir, { recursive: true })
  } catch {
    // If resolved directory becomes unavailable later, force fallback on next read.
    resolvedBaseDir = null
    const retry = paths().baseDir
    fs.mkdirSync(retry, { recursive: true })
  }
}

export function readState(): AgentRuntimeState | null {
  const { stateFile } = paths()
  if (!fs.existsSync(stateFile)) return null
  const raw = fs.readFileSync(stateFile, 'utf8')
  return JSON.parse(raw) as AgentRuntimeState
}

export function writeState(state: AgentRuntimeState): void {
  ensureStore()
  const { stateFile } = paths()
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function clearState(): void {
  const { stateFile } = paths()
  if (fs.existsSync(stateFile)) fs.rmSync(stateFile)
}

export function readPid(): number | null {
  const { pidFile } = paths()
  if (!fs.existsSync(pidFile)) return null
  const raw = fs.readFileSync(pidFile, 'utf8').trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function writePid(pid: number): void {
  ensureStore()
  const { pidFile } = paths()
  fs.writeFileSync(pidFile, `${pid}\n`, 'utf8')
}

export function clearPid(): void {
  const { pidFile } = paths()
  if (fs.existsSync(pidFile)) fs.rmSync(pidFile)
}

function defaultTaskRegistry(): TaskRegistry {
  return { version: 1, tasks: [], updatedAt: new Date().toISOString() }
}

function normalizeTaskRecord(raw: BackgroundTaskRecord): BackgroundTaskRecord {
  return {
    ...raw,
    attempts: Number.isFinite(raw.attempts) ? Math.max(0, Number(raw.attempts)) : 0,
    maxAttempts: Number.isFinite(raw.maxAttempts) ? Math.max(1, Number(raw.maxAttempts)) : 3,
  }
}

export function readTaskRegistry(): TaskRegistry {
  const { tasksFile } = paths()
  if (!fs.existsSync(tasksFile)) return defaultTaskRegistry()
  const raw = fs.readFileSync(tasksFile, 'utf8')
  const parsed = JSON.parse(raw) as TaskRegistry
  return {
    ...parsed,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((task) => normalizeTaskRecord(task)) : [],
  }
}

export function writeTaskRegistry(registry: TaskRegistry): void {
  ensureStore()
  const { tasksFile } = paths()
  fs.writeFileSync(tasksFile, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
}

export function addTask(input: {
  type: string
  payload: Record<string, unknown>
  maxAttempts?: number
}): BackgroundTaskRecord {
  const next: BackgroundTaskRecord = {
    id: `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: Math.max(1, Number(input.maxAttempts || 3)),
    status: 'queued',
  }
  const registry = readTaskRegistry()
  registry.tasks.unshift(next)
  registry.updatedAt = new Date().toISOString()
  writeTaskRegistry(registry)
  return next
}

export function updateTask(input: {
  id: string
  status?: BackgroundTaskRecord['status']
  error?: string
  result?: Record<string, unknown>
  attempts?: number
  nextRunAt?: string | null
  deadLetter?: boolean
}): BackgroundTaskRecord | null {
  const registry = readTaskRegistry()
  const idx = registry.tasks.findIndex((task) => task.id === input.id)
  if (idx < 0) return null
  const now = new Date().toISOString()
  const current = registry.tasks[idx]
  const next: BackgroundTaskRecord = {
    ...current,
    status: input.status ?? current.status,
    updatedAt: now,
    error: input.error ?? current.error,
    result: input.result ?? current.result,
    attempts: Number.isFinite(input.attempts) ? Math.max(0, Number(input.attempts)) : current.attempts,
    nextRunAt: input.nextRunAt === null ? undefined : (input.nextRunAt ?? current.nextRunAt),
    deadLetter: input.deadLetter ?? current.deadLetter,
  }
  if (next.status === 'running' && !next.startedAt) next.startedAt = now
  if ((next.status === 'completed' || next.status === 'failed' || next.status === 'canceled') && !next.completedAt) {
    next.completedAt = now
  }
  registry.tasks[idx] = next
  registry.updatedAt = now
  writeTaskRegistry(registry)
  return next
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
