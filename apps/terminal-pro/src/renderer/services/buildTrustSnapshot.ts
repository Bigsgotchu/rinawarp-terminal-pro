import type { WorkbenchState } from '../workbench/store.js'

function formatAnalyticsTimestamp(value?: number): string {
  if (!value) return 'none'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'none'
  return date.toLocaleString()
}

export function buildTrustSnapshotFromState(state: WorkbenchState): string {
  const lastRun = [...state.runs].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0]
  return [
    `Workspace: ${state.workspaceKey || 'unknown'}`,
    'Trust scope: current workspace',
    `Mode: ${state.runtime.mode || 'unknown'}`,
    `Starter intents: ${state.analytics.starterIntentCount}`,
    `Inspector opens: ${state.analytics.inspectorOpenCount}`,
    `Output expands: ${state.analytics.runOutputExpandCount}`,
    `Proof-backed runs: ${state.analytics.proofBackedRunCount}`,
    `Last starter: ${state.analytics.lastStarterIntent || 'none'}`,
    `First starter at: ${formatAnalyticsTimestamp(state.analytics.firstStarterIntentAt)}`,
    `Last inspector: ${state.analytics.lastInspector || 'none'}`,
    `First proof at: ${formatAnalyticsTimestamp(state.analytics.firstProofBackedRunAt)}`,
    `Last run: ${lastRun ? `${lastRun.id} ${lastRun.status} exit=${lastRun.exitCode ?? 'unknown'}` : 'none'}`,
    `IPC: ${state.runtime.ipcCanonicalReady ? 'consolidated' : 'unknown'}`,
    `Renderer: ${state.runtime.rendererCanonicalReady ? 'canonical' : 'unknown'}`,
  ].join('\n')
}
