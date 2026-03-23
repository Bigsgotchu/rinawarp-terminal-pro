import type { RinaRendererWindow } from '../types/rendererWindow.js'
import type { WorkbenchState } from '../workbench/store.js'
import { lastRelevantRun } from '../workbench/renderers/selectors.js'

declare const window: RinaRendererWindow

type DebugEventRecord = {
  ts: string
  category: 'ui' | 'ipc' | 'error' | 'system'
  name: string
  detail?: Record<string, unknown>
}

type DebugSnapshot = {
  appVersion: string | null
  generatedAt: string
  workspaceRoot: string
  activeView: {
    primary: 'agent' | 'settings' | 'diagnostics'
    centerDrawer: string | null
    rightPanel: string | null
    settingsOpen: boolean
  }
  mode: string
  lastRun: {
    id: string | null
    status: string | null
    exitCode: number | null
    receiptId: string | null
  }
  receiptId: string | null
  featureFlags: {
    licenseTier: string
    autonomyEnabled: boolean
    autonomyLevel: string
    ipcCanonicalReady: boolean
    rendererCanonicalReady: boolean
  }
  recentEvents: DebugEventRecord[]
  recentIpcCalls: DebugEventRecord[]
  recentErrors: DebugEventRecord[]
  recentRuns: Array<{
    id: string
    title: string
    status: string
    command: string
    updatedAt: string
    exitCode: number | null
    receiptId: string | null
  }>
  bugReceipt: {
    issueType: string
    summary: string
    appVersion: string | null
    workspaceRoot: string
    activeView: {
      primary: 'agent' | 'settings' | 'diagnostics'
      centerDrawer: string | null
      rightPanel: string | null
      settingsOpen: boolean
    }
    lastRunId: string | null
    recentEvents: string[]
    suspectedArea: string[]
  }
}

const MAX_DEBUG_EVENTS = 250
const recentEvents: DebugEventRecord[] = []
const recentIpcCalls: DebugEventRecord[] = []
const recentErrors: DebugEventRecord[] = []
let appVersion: string | null = null
let cleanupFns: Array<() => void> = []
let getStateSnapshot: (() => WorkbenchState) | null = null

function clip(text: string, max = 180): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value
  if (typeof value === 'string') return clip(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 8).map((entry) => sanitizeValue(entry, depth + 1))
  if (typeof value === 'object') {
    if (depth > 1) return '[object]'
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
      result[key] = sanitizeValue(entry, depth + 1)
    }
    return result
  }
  return String(value)
}

function pushBounded(target: DebugEventRecord[], event: DebugEventRecord): void {
  target.push(event)
  if (target.length > MAX_DEBUG_EVENTS) target.splice(0, target.length - MAX_DEBUG_EVENTS)
}

export function recordDebugEvent(
  category: DebugEventRecord['category'],
  name: string,
  detail?: Record<string, unknown>
): void {
  const event: DebugEventRecord = {
    ts: new Date().toISOString(),
    category,
    name,
    detail: detail ? (sanitizeValue(detail) as Record<string, unknown>) : undefined,
  }
  pushBounded(recentEvents, event)
  if (category === 'ipc') pushBounded(recentIpcCalls, event)
  if (category === 'error') pushBounded(recentErrors, event)
}

function deriveBugReceipt(state: WorkbenchState): DebugSnapshot['bugReceipt'] {
  const lastRun = lastRelevantRun(state)
  const lastError = [...recentErrors].reverse()[0]
  const recentWindow = recentEvents.slice(-12)
  const submitEvents = recentWindow.filter((event) => event.name === 'composer.submit')
  const blockedDuplicateEvents = recentWindow.filter((event) => event.name === 'composer.submit_blocked_duplicate')
  const hasRapidDuplicateSubmit =
    blockedDuplicateEvents.length > 0 ||
    submitEvents.some((event, index) => {
      const currentTs = Date.parse(event.ts)
      const next = submitEvents[index + 1]
      if (!next) return false
      const nextTs = Date.parse(next.ts)
      return Number.isFinite(currentTs) && Number.isFinite(nextTs) && nextTs - currentTs < 1000
    })
  const settingsOpen = Boolean(window.__rinaSettings?.isOpen?.())
  const activeView = {
    primary: settingsOpen ? 'settings' : state.ui.openDrawer === 'diagnostics' ? 'diagnostics' : 'agent',
    centerDrawer: state.ui.openDrawer,
    rightPanel: settingsOpen ? null : state.activeRightView,
    settingsOpen,
  } as const
  const issueType = lastError ? 'runtime_error' : lastRun?.status === 'failed' ? 'run_failure' : 'ui_behavior'
  const summary =
    (typeof lastError?.detail?.message === 'string' && lastError.detail.message) ||
    (hasRapidDuplicateSubmit
      ? 'Composer submit fired more than once in a short window. Inspect submit ownership and duplicate event handlers.'
      : lastRun?.status === 'failed'
      ? `Latest run "${lastRun.title || lastRun.command || lastRun.id}" failed and needs inspection.`
      : 'Customer reported a product issue. Use the recent events and IPC trail to inspect the path.')
  const recentNames = recentWindow.slice(-6).map((event) => `${event.category}:${event.name}`)
  const suspectedArea = new Set<string>()
  if (recentNames.some((entry) => entry.includes('settings'))) {
    suspectedArea.add('bindNavigationActions.ts')
    suspectedArea.add('settings/bootstrap.ts')
  }
  if (recentNames.some((entry) => entry.includes('workspace'))) {
    suspectedArea.add('bindNavigationActions.ts')
    suspectedArea.add('secondaryPanels.ts')
  }
  if (recentNames.some((entry) => entry.includes('receipt') || entry.includes('run'))) {
    suspectedArea.add('bindRunActions.ts')
    suspectedArea.add('receiptPanel.ts')
  }
  if (recentNames.some((entry) => entry.includes('composer.submit'))) {
    suspectedArea.add('actionController.ts')
  }
  if (suspectedArea.size === 0) suspectedArea.add('renderer.prod.ts')

  return {
    issueType,
    summary,
    appVersion,
    workspaceRoot: state.workspaceKey,
    activeView,
    lastRunId: lastRun?.id || null,
    recentEvents: recentNames,
    suspectedArea: Array.from(suspectedArea),
  }
}

export function buildDebugSnapshot(state?: WorkbenchState | null): DebugSnapshot | null {
  const snapshot = state || getStateSnapshot?.()
  if (!snapshot) return null
  const lastRun = lastRelevantRun(snapshot)
  const settingsOpen = Boolean(window.__rinaSettings?.isOpen?.())
  const activeView = {
    primary: settingsOpen ? 'settings' : snapshot.ui.openDrawer === 'diagnostics' ? 'diagnostics' : 'agent',
    centerDrawer: snapshot.ui.openDrawer,
    rightPanel: settingsOpen ? null : snapshot.activeRightView,
    settingsOpen,
  } as const
  return {
    appVersion,
    generatedAt: new Date().toISOString(),
    workspaceRoot: snapshot.workspaceKey,
    activeView,
    mode: snapshot.runtime.mode,
    lastRun: {
      id: lastRun?.id || null,
      status: lastRun?.status || null,
      exitCode: typeof lastRun?.exitCode === 'number' ? lastRun.exitCode : null,
      receiptId: lastRun?.latestReceiptId || lastRun?.sessionId || null,
    },
    receiptId: String(snapshot.receipt?.id || '') || null,
    featureFlags: {
      licenseTier: snapshot.license.tier,
      autonomyEnabled: Boolean(snapshot.runtime.autonomyEnabled),
      autonomyLevel: snapshot.runtime.autonomyLevel,
      ipcCanonicalReady: Boolean(snapshot.runtime.ipcCanonicalReady),
      rendererCanonicalReady: Boolean(snapshot.runtime.rendererCanonicalReady),
    },
    recentEvents: recentEvents.slice(-100),
    recentIpcCalls: recentIpcCalls.slice(-100),
    recentErrors: recentErrors.slice(-50),
    recentRuns: snapshot.runs.slice(-10).map((run) => ({
      id: run.id,
      title: run.title,
      status: run.status,
      command: clip(run.command || '', 120),
      updatedAt: run.updatedAt,
      exitCode: typeof run.exitCode === 'number' ? run.exitCode : null,
      receiptId: run.latestReceiptId || run.sessionId || null,
    })),
    bugReceipt: deriveBugReceipt(snapshot),
  }
}

export async function installDebugEvidenceBridge(args: { getState: () => WorkbenchState }): Promise<() => void> {
  getStateSnapshot = args.getState
  cleanupFns.forEach((cleanup) => cleanup())
  cleanupFns = []

  try {
    const version = await window.rina.invoke('app:version')
    appVersion = typeof version === 'string' ? version : null
  } catch {
    appVersion = null
  }

  const onError = (event: ErrorEvent) => {
    recordDebugEvent('error', 'renderer.error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    recordDebugEvent('error', 'renderer.unhandledrejection', {
      message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    })
  }
  const onIpcTrace = (event: Event) => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail || {}
    recordDebugEvent('ipc', 'invoke', detail)
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('rina:ipc-trace', onIpcTrace as EventListener)

  cleanupFns.push(() => window.removeEventListener('error', onError))
  cleanupFns.push(() => window.removeEventListener('unhandledrejection', onRejection))
  cleanupFns.push(() => window.removeEventListener('rina:ipc-trace', onIpcTrace as EventListener))

  return () => {
    cleanupFns.forEach((cleanup) => cleanup())
    cleanupFns = []
  }
}
