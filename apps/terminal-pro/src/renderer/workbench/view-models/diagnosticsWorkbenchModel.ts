import type { WorkbenchState } from '../store.js'
import { formatAnalyticsDate } from '../renderers/format.js'

export function buildDiagnosticsWorkbenchViewModel(state: WorkbenchState) {
  const row = (label: string, value: string) => ({ label, value })
  return {
    rows: [
      row('Mode', state.diagnostics.mode || 'unknown'),
      row('Tools', String(state.diagnostics.toolsCount)),
      row('Agent Running', state.diagnostics.agentRunning ? 'Yes' : 'No'),
      row('Conversations', String(state.diagnostics.conversationCount)),
      row('Learned Commands', String(state.diagnostics.learnedCommandsCount)),
      row('Starter intents', String(state.analytics.starterIntentCount)),
      row('Inspector opens', String(state.analytics.inspectorOpenCount)),
      row('Output expands', String(state.analytics.runOutputExpandCount)),
      row('Proof-backed runs', String(state.analytics.proofBackedRunCount)),
      row('Last starter', state.analytics.lastStarterIntent || 'none'),
      row('First starter at', formatAnalyticsDate(state.analytics.firstStarterIntentAt)),
      row('Last inspector', state.analytics.lastInspector || 'none'),
      row('First proof at', formatAnalyticsDate(state.analytics.firstProofBackedRunAt)),
      row('Deploy target', state.deployment.target || 'none'),
      row('Detected target', state.deployment.detectedTarget || 'none'),
      row('Detected signals', state.deployment.detectedSignals.join(', ') || 'none'),
      row('Recommended pack', state.deployment.recommendedPackKey || 'none'),
      row('Target identity', state.deployment.targetIdentity || 'none'),
      row('Identity source', state.deployment.targetIdentitySource),
      row('Deploy status', state.deployment.status),
      row('Verification', state.deployment.verification),
      row('Rollback', state.deployment.rollback),
      row('Deploy source', state.deployment.source),
      row('Latest deploy run', state.deployment.latestRunId || 'none'),
      row('Latest receipt', state.deployment.latestReceiptId || 'none'),
    ],
  }
}
