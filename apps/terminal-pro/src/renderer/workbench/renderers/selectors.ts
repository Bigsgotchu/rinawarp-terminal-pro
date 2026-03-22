import type { RunModel, WorkbenchState } from '../store.js'

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
  return [...candidates].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] || null
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
