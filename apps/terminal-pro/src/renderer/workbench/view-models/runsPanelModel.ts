import type { RunArtifactSummary, RunModel, WorkbenchState } from '../store.js'
import { formatInspectorRunStatus, formatRunDate, formatRunDuration } from '../renderers/format.js'
import { getRunsView } from '../renderers/selectors.js'
import { analyzeFailure, formatFailureNarrative, formatRecoveryNarrative, getRecoveryGuidance } from '../renderers/runIntelligence.js'
import { isRunSuccessWithProof } from '../proof.js'

export type RunsToolbarModel = {
  scopeLabel: string
  visibilityLabel: string
}

export type RunsSummaryModel = {
  visibleCount: number
  hiddenWorkspaceCount: number
  hiddenNoiseCount: number
  hiddenOverflowCount: number
  toolbar: RunsToolbarModel
}

export type RunsDeploymentModel = {
  summary: string
  rows: Array<{ label: string; value: string }>
  actions: Array<{ label: string; dataset: Record<string, string | undefined> }>
} | null

export type RunsRunModel = {
  id: string
  sessionId: string
  title: string
  statusLabel: string
  status: RunModel['status']
  locationLabel: string
  commandLabel: string
  receiptLabel: string
  summaryBits: string[]
  restored: boolean
  originMessageId?: string
  alert?: { tone: 'attention' | 'subtle'; text: string }
  outputText?: string
  outputPlaceholder: string
  artifactSummary: RunArtifactSummary | null
  timings: Array<{ label: string; value: string }>
  actions: Array<{ label: string; className: string; disabled?: boolean; dataset: Record<string, string | undefined> }>
}

function actionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  return 'rw-inline-action is-subtle'
}

export function buildRunsToolbarModel(state: WorkbenchState): RunsToolbarModel {
  return {
    scopeLabel: state.ui.scopeRunsToWorkspace ? 'Current workspace only' : 'All workspaces',
    visibilityLabel: state.ui.showAllRuns ? 'Show only meaningful runs' : 'Show all run activity',
  }
}

export function buildRunsSummaryModel(state: WorkbenchState): RunsSummaryModel {
  const { visibleRuns, hiddenWorkspaceCount, hiddenNoiseCount, hiddenOverflowCount } = getRunsView(state)
  return {
    visibleCount: visibleRuns.length,
    hiddenWorkspaceCount,
    hiddenNoiseCount,
    hiddenOverflowCount,
    toolbar: buildRunsToolbarModel(state),
  }
}

export function buildRunsDeploymentModel(state: WorkbenchState): RunsDeploymentModel {
  if (state.deployment.status === 'idle' && !state.deployment.detectedTarget) return null
  return {
    summary: state.deployment.summary,
    rows: [
      { label: 'Target', value: state.deployment.target || 'unknown' },
      { label: 'Verification', value: state.deployment.verification },
      { label: 'Rollback', value: state.deployment.rollback },
      { label: 'Identity', value: state.deployment.targetIdentity || 'none' },
      { label: 'Identity source', value: state.deployment.targetIdentitySource },
      { label: 'URL', value: state.deployment.targetUrl || 'none' },
      { label: 'Artifact', value: state.deployment.artifact || 'none' },
      { label: 'Build ID', value: state.deployment.buildId || 'none' },
    ],
    actions: [
      ...(state.deployment.recommendedPackKey && state.deployment.status === 'idle'
        ? [{ label: 'Plan deploy', dataset: { capabilityRun: state.deployment.recommendedPackKey, capabilityActionId: 'plan' } }]
        : []),
      ...(state.deployment.latestRunId ? [{ label: 'Inspect deploy run', dataset: { openRun: state.deployment.latestRunId } }] : []),
      ...(state.deployment.latestRunId ? [{ label: 'Inspect output', dataset: { runArtifacts: state.deployment.latestRunId } }] : []),
      ...(state.deployment.latestReceiptId ? [{ label: 'Open receipt', dataset: { runReveal: state.deployment.latestReceiptId } }] : []),
    ],
  }
}

export function buildRunsRunModel(state: WorkbenchState, run: RunModel): RunsRunModel {
  const locationLabel = run.cwd || run.projectRoot || 'No workspace path recorded'
  const commandLabel = run.command || 'No command captured'
  const receiptLabel = run.latestReceiptId || run.sessionId
  const hasCommand = Boolean(run.command)
  const isInterrupted = run.status === 'interrupted'
  const outputTail = state.runOutputTailByRunId[run.id]?.trim() || ''
  const artifactSummary = state.runArtifactSummaryByRunId[run.id] || null
  const durationLabel = formatRunDuration(run)
  const successProof = isRunSuccessWithProof(run)
  const recovery = getRecoveryGuidance(run)
  const failureAnalysis =
    run.status === 'failed' || run.status === 'interrupted'
      ? analyzeFailure({
          command: run.command || '',
          exitCode: run.exitCode,
          outputText: outputTail,
          interrupted: isInterrupted,
          changedFiles: artifactSummary?.changedFiles || [],
          diffHints: artifactSummary?.diffHints || [],
          metaText: artifactSummary?.metaPreview || '',
        })
      : null

  const alert =
    isInterrupted
      ? { tone: 'attention' as const, text: formatRecoveryNarrative(recovery, { prefix: 'Interrupted during the last session.', includeWhatInterrupted: false }) }
      : run.status === 'failed' && failureAnalysis
        ? { tone: 'attention' as const, text: formatFailureNarrative(failureAnalysis) }
        : !successProof && run.status === 'ok'
          ? { tone: 'subtle' as const, text: 'Run completed but proof is incomplete. Treat this as proof pending until receipt and exit are both present.' }
          : run.restored
            ? { tone: 'subtle' as const, text: 'Restored from your previous session history.' }
            : undefined

  return {
    id: run.id,
    sessionId: run.sessionId,
    title: run.title || 'Session activity',
    statusLabel: formatInspectorRunStatus(run),
    status: run.status,
    locationLabel,
    commandLabel,
    receiptLabel,
    summaryBits: [
      `Updated ${formatRunDate(run.updatedAt)}`,
      `${run.commandCount} command${run.commandCount === 1 ? '' : 's'}`,
      durationLabel ? `Duration ${durationLabel}` : '',
      run.exitCode !== null && run.exitCode !== undefined ? `Exit ${String(run.exitCode)}` : run.status === 'running' ? 'Exit pending' : '',
    ].filter(Boolean),
    restored: Boolean(run.restored),
    originMessageId: run.originMessageId,
    alert,
    outputText: outputTail || undefined,
    outputPlaceholder: run.status === 'running' ? 'Live output is still arriving.' : 'No saved output has been attached to this run yet.',
    artifactSummary,
    timings: [
      { label: 'Started', value: formatRunDate(run.startedAt) },
      { label: 'Updated', value: formatRunDate(run.updatedAt) },
      { label: 'Ended', value: run.endedAt ? formatRunDate(run.endedAt) : 'not finished' },
      { label: 'Duration', value: durationLabel || 'unknown' },
    ],
    actions: [
      ...(isInterrupted ? [{ label: recovery.resumeLabel, className: actionClass('primary'), dataset: { runResume: run.id } }] : []),
      { label: recovery.rerunLabel, className: actionClass(isInterrupted ? 'secondary' : 'primary'), disabled: !hasCommand, dataset: { runRerun: run.id } },
      ...(run.status === 'failed' || run.status === 'interrupted'
        ? [{ label: 'Fix & retry', className: actionClass('attention'), disabled: !hasCommand, dataset: { runFix: run.id } }]
        : []),
      { label: recovery.receiptLabel, className: actionClass('secondary'), dataset: { runReveal: receiptLabel } },
      { label: artifactSummary ? 'Refresh artifacts' : 'Load artifacts', className: actionClass('secondary'), dataset: { runArtifacts: run.id } },
      { label: 'Show diff', className: actionClass('secondary'), dataset: { runDiff: run.id } },
      { label: 'Inspect run', className: actionClass('quiet'), dataset: { openRun: run.id } },
      { label: 'Copy command', className: actionClass('quiet'), disabled: !hasCommand, dataset: { runCopy: run.id } },
      { label: 'Open runs folder', className: actionClass('quiet'), dataset: { runFolder: '' } },
      ...(run.restored ? [{ label: 'Back to thread', className: actionClass('quiet'), dataset: { tab: 'agent' } }] : []),
    ],
  }
}

export function buildRunsPanelModel(state: WorkbenchState): {
  hasRuns: boolean
  visibleRuns: RunsRunModel[]
  summary: RunsSummaryModel
  deployment: RunsDeploymentModel
} {
  const { visibleRuns } = getRunsView(state)
  return {
    hasRuns: state.runs.length > 0,
    visibleRuns: visibleRuns.map((run) => buildRunsRunModel(state, run)),
    summary: buildRunsSummaryModel(state),
    deployment: buildRunsDeploymentModel(state),
  }
}
