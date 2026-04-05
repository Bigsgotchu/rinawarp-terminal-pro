import type { WorkbenchStore } from '../workbench/store.js'
import type { FixBlockModel } from '../workbench/types.js'

const RETENTION_STORAGE_KEY = 'rinawarp.retention.v1'
const MINUTES_SAVED_PER_SUCCESSFUL_FIX = 45

export type RetentionProjectStatus = 'healthy' | 'issues-detected' | 'needs-repair'

type RetentionProjectRecord = {
  root: string
  name: string
  lastOpenedAt: number
  visitCount: number
  lastStatus?: RetentionProjectStatus
  fixCount: number
  successfulFixCount: number
  lastFixAt?: number
}

type RetentionSnapshot = {
  totals: {
    successfulFixes: number
    minutesSaved: number
  }
  projects: Record<string, RetentionProjectRecord>
}

export type RetentionProjectSummary = {
  root: string
  name: string
  statusLabel: string
  statusTone: 'success' | 'warning' | 'default'
  active: boolean
}

export type RetentionSummary = {
  totalSuccessfulFixes: number
  totalMinutesSaved: number
  recentProjects: RetentionProjectSummary[]
  trackedProjects: number
}

function toStatusSummary(project: RetentionProjectRecord, active: string): RetentionProjectSummary {
  const statusLabel =
    project.lastStatus === 'healthy'
      ? 'Healthy'
      : project.lastStatus === 'needs-repair'
        ? 'Needs repair'
        : project.lastStatus === 'issues-detected'
          ? 'Issues detected'
          : 'Recently opened'
  const statusTone: RetentionProjectSummary['statusTone'] =
    project.lastStatus === 'healthy'
      ? 'success'
      : project.lastStatus === 'needs-repair' || project.lastStatus === 'issues-detected'
        ? 'warning'
        : 'default'

  return {
    root: project.root,
    name: project.name,
    statusLabel,
    statusTone,
    active: project.root === active,
  }
}

function normalizeWorkspaceKey(root?: string | null): string {
  return (root || '').trim()
}

function basename(root: string): string {
  const normalized = root.replace(/\\/g, '/').replace(/\/+$/, '')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || root
}

function emptySnapshot(): RetentionSnapshot {
  return {
    totals: {
      successfulFixes: 0,
      minutesSaved: 0,
    },
    projects: {},
  }
}

function loadSnapshot(): RetentionSnapshot {
  try {
    const raw = window.localStorage.getItem(RETENTION_STORAGE_KEY)
    if (!raw) return emptySnapshot()
    const parsed = JSON.parse(raw) as RetentionSnapshot
    if (!parsed || typeof parsed !== 'object') return emptySnapshot()
    return {
      totals: {
        successfulFixes: Number(parsed.totals?.successfulFixes || 0),
        minutesSaved: Number(parsed.totals?.minutesSaved || 0),
      },
      projects: parsed.projects && typeof parsed.projects === 'object' ? parsed.projects : {},
    }
  } catch {
    return emptySnapshot()
  }
}

function saveSnapshot(snapshot: RetentionSnapshot): void {
  try {
    window.localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore persistence failures
  }
}

function upsertProject(snapshot: RetentionSnapshot, root: string): RetentionProjectRecord {
  const key = normalizeWorkspaceKey(root)
  const existing = snapshot.projects[key]
  const next: RetentionProjectRecord = existing || {
    root: key,
    name: basename(key),
    lastOpenedAt: Date.now(),
    visitCount: 0,
    fixCount: 0,
    successfulFixCount: 0,
  }
  snapshot.projects[key] = next
  return next
}

export function recordWorkspaceVisit(root?: string | null): void {
  const workspaceKey = normalizeWorkspaceKey(root)
  if (!workspaceKey || workspaceKey === '__none__') return
  const snapshot = loadSnapshot()
  const record = upsertProject(snapshot, workspaceKey)
  record.name = basename(workspaceKey)
  record.lastOpenedAt = Date.now()
  record.visitCount += 1
  saveSnapshot(snapshot)
}

export function recordProjectHealthCheck(root?: string | null): void {
  const workspaceKey = normalizeWorkspaceKey(root)
  if (!workspaceKey || workspaceKey === '__none__') return
  const snapshot = loadSnapshot()
  const record = upsertProject(snapshot, workspaceKey)
  record.lastOpenedAt = Date.now()
  if (!record.lastStatus) record.lastStatus = 'issues-detected'
  saveSnapshot(snapshot)
}

function recordFixOutcome(fix: FixBlockModel): void {
  const workspaceKey = normalizeWorkspaceKey(fix.cwd)
  if (!workspaceKey || workspaceKey === '__none__') return
  const snapshot = loadSnapshot()
  const record = upsertProject(snapshot, workspaceKey)
  record.lastOpenedAt = Date.now()
  record.lastFixAt = Date.now()
  record.fixCount += 1

  const successful = fix.phase === 'done' && fix.verificationStatus === 'passed'
  if (successful) {
    record.successfulFixCount += 1
    record.lastStatus = 'healthy'
    snapshot.totals.successfulFixes += 1
    snapshot.totals.minutesSaved += MINUTES_SAVED_PER_SUCCESSFUL_FIX
  } else {
    record.lastStatus = fix.phase === 'error' ? 'needs-repair' : 'issues-detected'
  }

  saveSnapshot(snapshot)
}

export function getRetentionSummary(activeWorkspaceKey?: string | null): RetentionSummary {
  const snapshot = loadSnapshot()
  const active = normalizeWorkspaceKey(activeWorkspaceKey)
  const recentProjects = Object.values(snapshot.projects)
    .sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
    .slice(0, 4)
    .map((project) => toStatusSummary(project, active))

  return {
    totalSuccessfulFixes: snapshot.totals.successfulFixes,
    totalMinutesSaved: snapshot.totals.minutesSaved,
    recentProjects,
    trackedProjects: Object.keys(snapshot.projects).length,
  }
}

export function initRetentionLoop(store: WorkbenchStore): () => void {
  let previousWorkspaceKey = normalizeWorkspaceKey(store.getState().workspaceKey)
  if (previousWorkspaceKey && previousWorkspaceKey !== '__none__') {
    recordWorkspaceVisit(previousWorkspaceKey)
  }

  const completedFixIds = new Set<string>()

  return store.subscribe((state) => {
    const workspaceKey = normalizeWorkspaceKey(state.workspaceKey)
    if (workspaceKey && workspaceKey !== '__none__' && workspaceKey !== previousWorkspaceKey) {
      recordWorkspaceVisit(workspaceKey)
      previousWorkspaceKey = workspaceKey
    }

    for (const fix of state.fixBlocks) {
      if (completedFixIds.has(fix.id)) continue
      if (fix.phase !== 'done' && fix.phase !== 'error') continue
      completedFixIds.add(fix.id)
      recordFixOutcome(fix)
    }
  })
}
