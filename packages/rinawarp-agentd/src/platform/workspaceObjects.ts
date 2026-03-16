import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

export type WorkspaceObjectType = 'prompt' | 'workflow' | 'snippet'

export type WorkspaceObjectRecord = {
  id: string
  workspace_id: string
  type: WorkspaceObjectType
  name: string
  content: Record<string, unknown>
  archived: boolean
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

type WorkspaceObjectRegistry = {
  version: 1
  objects: WorkspaceObjectRecord[]
  updated_at: string
}

function stateFile(): string {
  return path.join(paths().baseDir, 'workspace-objects.json')
}

function defaultRegistry(): WorkspaceObjectRegistry {
  return { version: 1, objects: [], updated_at: new Date().toISOString() }
}

function readRegistry(): WorkspaceObjectRegistry {
  const fp = stateFile()
  if (!fs.existsSync(fp)) return defaultRegistry()
  try {
    const raw = fs.readFileSync(fp, 'utf8')
    const parsed = JSON.parse(raw) as WorkspaceObjectRegistry
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.objects)) return defaultRegistry()
    return parsed
  } catch {
    return defaultRegistry()
  }
}

function writeRegistry(next: WorkspaceObjectRegistry): void {
  const fp = stateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

function normalizeType(value: string): WorkspaceObjectType {
  const v = String(value || '')
    .trim()
    .toLowerCase()
  if (v === 'workflow') return 'workflow'
  if (v === 'snippet') return 'snippet'
  return 'prompt'
}

export function createWorkspaceObject(input: {
  workspace_id: string
  type?: string
  name: string
  content?: Record<string, unknown>
  actor_id: string
}): WorkspaceObjectRecord {
  const now = new Date().toISOString()
  const registry = readRegistry()
  const next: WorkspaceObjectRecord = {
    id: `wo_${randomUUID()}`,
    workspace_id: String(input.workspace_id || '').trim(),
    type: normalizeType(input.type || 'prompt'),
    name: String(input.name || '').trim() || 'untitled',
    content: input.content || {},
    archived: false,
    version: 1,
    created_by: input.actor_id,
    updated_by: input.actor_id,
    created_at: now,
    updated_at: now,
  }
  registry.objects.push(next)
  registry.updated_at = now
  writeRegistry(registry)
  return next
}

export function listWorkspaceObjects(args: {
  workspace_id: string
  type?: string
  archived?: boolean
  limit?: number
}): WorkspaceObjectRecord[] {
  const registry = readRegistry()
  const type = String(args.type || '')
    .trim()
    .toLowerCase()
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(500, Number(args.limit))) : 200
  return registry.objects
    .filter((obj) => obj.workspace_id === args.workspace_id)
    .filter((obj) => (type ? obj.type === normalizeType(type) : true))
    .filter((obj) => (typeof args.archived === 'boolean' ? obj.archived === args.archived : true))
    .slice(-limit)
    .reverse()
}

export function getWorkspaceObject(id: string): WorkspaceObjectRecord | null {
  const key = String(id || '').trim()
  if (!key) return null
  const registry = readRegistry()
  return registry.objects.find((obj) => obj.id === key) || null
}

export function updateWorkspaceObject(input: {
  id: string
  actor_id: string
  name?: string
  content?: Record<string, unknown>
  archived?: boolean
}): WorkspaceObjectRecord | null {
  const key = String(input.id || '').trim()
  if (!key) return null
  const registry = readRegistry()
  const idx = registry.objects.findIndex((obj) => obj.id === key)
  if (idx < 0) return null
  const curr = registry.objects[idx]
  const now = new Date().toISOString()
  const next: WorkspaceObjectRecord = {
    ...curr,
    ...(input.name ? { name: String(input.name).trim() || curr.name } : {}),
    ...(input.content ? { content: input.content } : {}),
    ...(typeof input.archived === 'boolean' ? { archived: input.archived } : {}),
    version: curr.version + 1,
    updated_by: input.actor_id,
    updated_at: now,
  }
  registry.objects[idx] = next
  registry.updated_at = now
  writeRegistry(registry)
  return next
}
