import { buildTrustSnapshotFromState } from './buildTrustSnapshot.js'
import { WorkbenchStore, type WorkbenchState } from '../workbench/store.js'

let statusSummaryResetTimer: number | null = null

export function normalizeWorkspaceKey(root?: string | null): string {
  return (root || '').trim() || '__none__'
}

export function getWorkspaceKeyFromStore(store: WorkbenchStore): string {
  return normalizeWorkspaceKey(store.getState().workspaceKey)
}

export function getAgentWorkspaceRootFromStore(store: WorkbenchStore): string | null {
  const key = getWorkspaceKeyFromStore(store)
  return key === '__none__' ? null : key
}

export function setTransientStatusSummary(store: WorkbenchStore, message: string, durationMs = 1800): void {
  store.dispatch({ type: 'ui/setStatusSummary', text: message })
  if (statusSummaryResetTimer !== null) window.clearTimeout(statusSummaryResetTimer)
  statusSummaryResetTimer = window.setTimeout(() => {
    store.dispatch({ type: 'ui/setStatusSummary', text: null })
    statusSummaryResetTimer = null
  }, durationMs)
}

export function buildInterruptedRunRecoveryPrompt(run: WorkbenchState['runs'][number]): string {
  return `Resume the interrupted task. The last command was "${run.command}" in "${run.cwd || run.projectRoot || 'the workspace'}". Explain what likely happened, decide the safest next step, and continue if appropriate.`
}

export function buildTrustSnapshot(store: WorkbenchStore): string {
  return buildTrustSnapshotFromState(store.getState())
}
