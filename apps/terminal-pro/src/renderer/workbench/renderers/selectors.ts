import type { RunModel, WorkbenchState } from '../store.js'
import { hasRunProof, isRunSuccessWithProof } from '../proof.js'

const STALE_RUNNING_MS = 5 * 60 * 1000
const STALE_RECOVERY_MS = 24 * 60 * 60 * 1000

const ROOT_MARKERS = new Set([
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'tsconfig.json',
  'wrangler.toml',
  'netlify.toml',
  'vercel.json',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
  '.gitignore',
  'README.md',
])

const GENERIC_WORKSPACE_NAMES = new Set(['downloads', 'desktop', 'documents', 'home'])

export type WorkspaceContextState = {
  workspaceRoot: string | null
  displayValue: string
  title: string
  status: 'missing' | 'weak' | 'project'
  reason: string
  rootMarkers: string[]
}

export function isDisplayableRun(run: RunModel): boolean {
  return Boolean(
    (run.commandCount ?? 0) > 0 ||
      run.latestReceiptId ||
      (run.failedCount ?? 0) > 0 ||
      run.status === 'failed' ||
      run.status === 'interrupted'
  )
}

export function matchesWorkspace(run: RunModel, workspaceKey: string): boolean {
  if (!workspaceKey || workspaceKey === '__none__') return true
  const projectRoot = String(run.projectRoot || '').trim()
  const cwd = String(run.cwd || '').trim()
  return projectRoot === workspaceKey || cwd === workspaceKey || cwd.startsWith(`${workspaceKey}/`) || cwd.startsWith(`${workspaceKey}\\`)
}

export function lastRelevantRun(state: WorkbenchState): RunModel | null {
  const candidates = state.runs.filter((run) => matchesWorkspace(run, state.workspaceKey))
  if (candidates.length === 0) return null
  const now = Date.now()
  return (
    [...candidates].sort((left, right) => {
      const leftUpdated = new Date(left.updatedAt).getTime()
      const rightUpdated = new Date(right.updatedAt).getTime()
      const leftAge = Number.isFinite(leftUpdated) ? now - leftUpdated : Number.MAX_SAFE_INTEGER
      const rightAge = Number.isFinite(rightUpdated) ? now - rightUpdated : Number.MAX_SAFE_INTEGER
      const leftWrapperPenalty = !String(left.command || '').trim() ? 1 : 0
      const rightWrapperPenalty = !String(right.command || '').trim() ? 1 : 0
      const leftStaleRecoveryPenalty = left.restored && leftAge > STALE_RECOVERY_MS ? 1 : 0
      const rightStaleRecoveryPenalty = right.restored && rightAge > STALE_RECOVERY_MS ? 1 : 0

      if (leftStaleRecoveryPenalty !== rightStaleRecoveryPenalty) {
        return leftStaleRecoveryPenalty - rightStaleRecoveryPenalty
      }
      if (leftWrapperPenalty !== rightWrapperPenalty) {
        return leftWrapperPenalty - rightWrapperPenalty
      }
      return rightUpdated - leftUpdated
    })[0] || null
  )
}

export function getRunsView(state: WorkbenchState): {
  visibleRuns: RunModel[]
  hiddenWorkspaceCount: number
  hiddenNoiseCount: number
  hiddenOverflowCount: number
} {
  const workspaceScopedRuns = state.ui.scopeRunsToWorkspace
    ? state.runs.filter((run) => matchesWorkspace(run, state.workspaceKey) || run.restored)
    : state.runs
  const visibleRunsRaw = state.ui.showAllRuns ? workspaceScopedRuns : workspaceScopedRuns.filter(isDisplayableRun)
  return {
    visibleRuns: visibleRunsRaw.slice(0, 30),
    hiddenWorkspaceCount: state.ui.scopeRunsToWorkspace ? state.runs.length - workspaceScopedRuns.length : 0,
    hiddenNoiseCount: state.ui.showAllRuns ? 0 : workspaceScopedRuns.length - visibleRunsRaw.length,
    hiddenOverflowCount: visibleRunsRaw.length - Math.min(visibleRunsRaw.length, 30),
  }
}

function uniqueRootMarkers(files: string[]): string[] {
  const markers = new Set<string>()
  for (const file of files) {
    const normalized = String(file || '').trim().replace(/\\/g, '/')
    if (!normalized || normalized.includes('/')) continue
    if (ROOT_MARKERS.has(normalized)) markers.add(normalized)
  }
  return Array.from(markers).sort()
}

export function getWorkspaceContextState(state: WorkbenchState): WorkspaceContextState {
  const workspaceRoot = state.workspaceKey && state.workspaceKey !== '__none__' ? state.workspaceKey : null
  if (!workspaceRoot) {
    return {
      workspaceRoot: null,
      displayValue: 'No project selected',
      title: 'No project selected',
      status: 'missing',
      reason: 'Choose the project or folder you want Rina to work in before you ask her to build, test, or fix anything.',
      rootMarkers: [],
    }
  }

  const normalized = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  const folderName = segments[segments.length - 1] || normalized
  const rootMarkers = uniqueRootMarkers(state.code.files || [])
  const genericFolder = GENERIC_WORKSPACE_NAMES.has(folderName.toLowerCase())
  const hasProjectMarkers = rootMarkers.length > 0

  if (genericFolder && !hasProjectMarkers) {
    return {
      workspaceRoot,
      displayValue: folderName,
      title: workspaceRoot,
      status: 'weak',
      reason: `${folderName} is a generic folder, so Rina may be looking in the wrong place. Choose the actual project root for stronger context.`,
      rootMarkers,
    }
  }

  if (!hasProjectMarkers) {
    return {
      workspaceRoot,
      displayValue: folderName,
      title: workspaceRoot,
      status: 'weak',
      reason: 'This folder does not look like a project root yet. Choose a project folder or keep going only if this is really where the work lives.',
      rootMarkers,
    }
  }

  return {
    workspaceRoot,
    displayValue: folderName,
    title: workspaceRoot,
    status: 'project',
    reason: `Project root markers found: ${rootMarkers.slice(0, 4).join(', ')}`,
    rootMarkers,
  }
}

/**
 * Unified HUD state selector - returns a single source of truth for the HUD display.
 * Fixes redundant "RUNNING · running" issue by consolidating status logic.
 */
export function getTruthHudState(state: WorkbenchState): {
  workspaceRoot: string
  mode: string
  lastRunId: string | null
  lastRunStatus: string | null
  lastExitCode: number | null
  recoveryReadyCount: number
  ipcState: string
  rendererState: string
} {
  const lastRun = lastRelevantRun(state)
  const restoredRuns = state.runs.filter((run) => {
    if (!run.restored) return false
    const updatedAt = new Date(run.updatedAt).getTime()
    const isStale = Number.isFinite(updatedAt) ? Date.now() - updatedAt > STALE_RECOVERY_MS : true
    return !isStale
  })

  // Build unified last run info
  let lastRunId: string | null = null
  let lastRunStatus: string | null = null
  let lastExitCode: number | null = null

  if (lastRun) {
    lastRunId = lastRun.id || null

    // Canonical status display - no redundancy
    if (lastRun.status === 'running') {
      const updatedAt = new Date(lastRun.updatedAt).getTime()
      const isStale = Number.isFinite(updatedAt) ? Date.now() - updatedAt > STALE_RUNNING_MS : true
      lastRunStatus = isStale ? 'needs review' : 'running'
    } else if (lastRun.status === 'interrupted') {
      lastRunStatus = 'interrupted'
    } else if (lastRun.status === 'failed') {
      lastRunStatus = 'failed'
    } else if (lastRun.status === 'ok') {
      if (isRunSuccessWithProof(lastRun)) {
        lastRunStatus = 'verified'
      } else if (hasRunProof(lastRun)) {
        lastRunStatus = 'completed'
      } else {
        lastRunStatus = 'verifying'
      }
    } else {
      lastRunStatus = 'unknown'
    }

    lastExitCode = typeof lastRun.exitCode === 'number' ? lastRun.exitCode : null
  }

  // IPC and renderer state
  const ipcState = state.runtime.ipcCanonicalReady ? 'consolidated' : 'unknown'
  const rendererState = state.runtime.rendererCanonicalReady ? 'canonical' : 'unknown'

  return {
    workspaceRoot: state.workspaceKey || '__none__',
    mode: state.runtime.mode || 'assist',
    lastRunId,
    lastRunStatus,
    lastExitCode,
    recoveryReadyCount: restoredRuns.length,
    ipcState,
    rendererState,
  }
}
