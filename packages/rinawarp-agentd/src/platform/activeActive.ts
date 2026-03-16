import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type RegionId = 'us-east-1' | 'eu-west-1'
type VersionVector = Partial<Record<RegionId, number>>

type ActiveActiveEvent = {
  event_id: string
  workspace_id: string
  region: RegionId
  ts: string
  vector: VersionVector
  base_vector: VersionVector
  mutations: Array<{ type: string; entity?: string; payload?: Record<string, unknown> }>
  event_hash: string
}

type WorkspaceState = {
  vector: VersionVector
  events: ActiveActiveEvent[]
}

type ActiveActiveState = {
  version: 1
  enabled: boolean
  strict_conflicts: boolean
  workspaces: Record<string, WorkspaceState>
  updated_at: string
}

function filePath(): string {
  return path.join(paths().baseDir, 'active-active-state.json')
}

function nowIso(): string {
  return new Date().toISOString()
}

function cloneVector(input?: VersionVector): VersionVector {
  return {
    'us-east-1': Math.max(0, Number(input?.['us-east-1'] || 0)),
    'eu-west-1': Math.max(0, Number(input?.['eu-west-1'] || 0)),
  }
}

function normalizeRegion(region: string): RegionId | null {
  const r = String(region || '')
    .trim()
    .toLowerCase()
  if (r === 'us-east-1') return 'us-east-1'
  if (r === 'eu-west-1') return 'eu-west-1'
  return null
}

function loadState(): ActiveActiveState {
  const fp = filePath()
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      enabled: true,
      strict_conflicts: true,
      workspaces: {},
      updated_at: nowIso(),
    }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as ActiveActiveState
    if (!parsed || parsed.version !== 1) throw new Error('invalid')
    return {
      version: 1,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      strict_conflicts: typeof parsed.strict_conflicts === 'boolean' ? parsed.strict_conflicts : true,
      workspaces: parsed.workspaces || {},
      updated_at: parsed.updated_at || nowIso(),
    }
  } catch {
    return {
      version: 1,
      enabled: true,
      strict_conflicts: true,
      workspaces: {},
      updated_at: nowIso(),
    }
  }
}

function saveState(state: ActiveActiveState): void {
  state.updated_at = nowIso()
  const fp = filePath()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function getWorkspaceState(state: ActiveActiveState, workspaceId: string): WorkspaceState {
  if (!state.workspaces[workspaceId]) {
    state.workspaces[workspaceId] = {
      vector: cloneVector({}),
      events: [],
    }
  }
  return state.workspaces[workspaceId]
}

function computeEventHash(input: {
  workspace_id: string
  region: RegionId
  ts: string
  vector: VersionVector
  base_vector: VersionVector
  mutations: Array<{ type: string; entity?: string; payload?: Record<string, unknown> }>
}): string {
  return crypto.createHash('sha256').update(JSON.stringify(input), 'utf8').digest('hex')
}

function detectConflict(
  base: VersionVector,
  current: VersionVector,
  writer: RegionId
): Array<{ region: RegionId; base: number; current: number }> {
  const conflicts: Array<{ region: RegionId; base: number; current: number }> = []
  const regions: RegionId[] = ['us-east-1', 'eu-west-1']
  for (const region of regions) {
    if (region === writer) continue
    const b = Number(base?.[region] || 0)
    const c = Number(current?.[region] || 0)
    if (b < c) {
      conflicts.push({ region, base: b, current: c })
    }
  }
  return conflicts
}

export function configureActiveActive(args: { enabled?: boolean; strict_conflicts?: boolean }): {
  enabled: boolean
  strict_conflicts: boolean
  updated_at: string
} {
  const state = loadState()
  if (typeof args.enabled === 'boolean') state.enabled = args.enabled
  if (typeof args.strict_conflicts === 'boolean') state.strict_conflicts = args.strict_conflicts
  saveState(state)
  return {
    enabled: state.enabled,
    strict_conflicts: state.strict_conflicts,
    updated_at: state.updated_at,
  }
}

export function getActiveActiveState(): {
  enabled: boolean
  strict_conflicts: boolean
  updated_at: string
  workspaces: number
} {
  const state = loadState()
  return {
    enabled: state.enabled,
    strict_conflicts: state.strict_conflicts,
    updated_at: state.updated_at,
    workspaces: Object.keys(state.workspaces).length,
  }
}

export function activeActiveWrite(args: {
  workspace_id: string
  region: string
  base_vector?: VersionVector
  event_id?: string
  mutations?: Array<{ type: string; entity?: string; payload?: Record<string, unknown> }>
}):
  | { ok: true; event: ActiveActiveEvent; conflicts: [] }
  | {
      ok: false
      error: 'invalid_region' | 'disabled' | 'conflict'
      conflicts?: Array<{ region: RegionId; base: number; current: number }>
      current_vector?: VersionVector
      replay_from?: VersionVector
    } {
  const state = loadState()
  const normalized = normalizeRegion(args.region)
  if (!normalized) return { ok: false, error: 'invalid_region' }
  if (!state.enabled) return { ok: false, error: 'disabled' }
  const ws = getWorkspaceState(state, args.workspace_id)
  const base = cloneVector(args.base_vector)
  const current = cloneVector(ws.vector)
  const conflicts = detectConflict(base, current, normalized)
  if (conflicts.length > 0 && state.strict_conflicts) {
    return {
      ok: false,
      error: 'conflict',
      conflicts,
      current_vector: current,
      replay_from: current,
    }
  }
  const requestedEventId = String(args.event_id || '').trim()
  if (requestedEventId) {
    const existing = ws.events.find((evt) => evt.event_id === requestedEventId)
    if (existing) return { ok: true, event: existing, conflicts: [] }
  }
  const nextVector = cloneVector(current)
  nextVector[normalized] = Number(nextVector[normalized] || 0) + 1
  const ts = nowIso()
  const eventId = requestedEventId || `aaevt_${crypto.randomBytes(8).toString('hex')}`
  const mutations = (args.mutations || []).map((m) => ({
    type: String(m?.type || 'mutation').trim() || 'mutation',
    ...(m?.entity ? { entity: String(m.entity) } : {}),
    ...(m?.payload ? { payload: m.payload } : {}),
  }))
  const eventBase = cloneVector(base)
  const eventHash = computeEventHash({
    workspace_id: args.workspace_id,
    region: normalized,
    ts,
    vector: nextVector,
    base_vector: eventBase,
    mutations,
  })
  const event: ActiveActiveEvent = {
    event_id: eventId,
    workspace_id: args.workspace_id,
    region: normalized,
    ts,
    vector: nextVector,
    base_vector: eventBase,
    mutations,
    event_hash: eventHash,
  }
  ws.vector = nextVector
  ws.events.push(event)
  ws.events = ws.events.slice(-10_000)
  saveState(state)
  return { ok: true, event, conflicts: [] }
}

function replayVector(events: ActiveActiveEvent[]): VersionVector {
  const replay: VersionVector = { 'us-east-1': 0, 'eu-west-1': 0 }
  for (const evt of events) {
    replay[evt.region] = Number(replay[evt.region] || 0) + 1
  }
  return replay
}

export function runReplicationDrill(args?: { workspace_id?: string }): {
  ok: boolean
  checked: number
  drifted: number
  details: Array<{ workspace_id: string; stored_vector: VersionVector; replay_vector: VersionVector; drift: boolean }>
} {
  const state = loadState()
  const ids = args?.workspace_id ? [args.workspace_id] : Object.keys(state.workspaces)
  const details = ids.map((workspaceId) => {
    const ws = getWorkspaceState(state, workspaceId)
    const replay = replayVector(ws.events || [])
    const stored = cloneVector(ws.vector)
    const drift =
      Number(stored['us-east-1'] || 0) !== Number(replay['us-east-1'] || 0) ||
      Number(stored['eu-west-1'] || 0) !== Number(replay['eu-west-1'] || 0)
    return {
      workspace_id: workspaceId,
      stored_vector: stored,
      replay_vector: replay,
      drift,
    }
  })
  return {
    ok: details.every((d) => !d.drift),
    checked: details.length,
    drifted: details.filter((d) => d.drift).length,
    details,
  }
}

export function replayWorkspaceEvents(args: { workspace_id: string; from_event_id?: string }): {
  ok: boolean
  workspace_id: string
  replayed_events: number
  vector: VersionVector
} {
  const state = loadState()
  const ws = getWorkspaceState(state, args.workspace_id)
  const events = ws.events || []
  const startIdx = args.from_event_id
    ? Math.max(
        0,
        events.findIndex((e) => e.event_id === args.from_event_id)
      )
    : 0
  const subset = events.slice(startIdx)
  const vector = replayVector(subset)
  return {
    ok: true,
    workspace_id: args.workspace_id,
    replayed_events: subset.length,
    vector,
  }
}
