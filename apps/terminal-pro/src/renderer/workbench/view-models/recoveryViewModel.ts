import type { AgentEmptyCardViewModel, RecoveryStripViewModel } from './agentThreadModel.js'
import type { WorkbenchState } from '../store.js'
import { formatExitState, formatProofBadge, formatRunDate, formatRunDuration, formatRunStatus } from '../renderers/format.js'
import { formatRecoveryNarrative, getRecoveryGuidance } from '../renderers/runIntelligence.js'
import { lastRelevantRun } from '../renderers/selectors.js'
import { isRunSuccessWithProof } from '../proof.js'

function actionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  return 'rw-inline-action is-subtle'
}

export function buildRecentProofCardModel(state: WorkbenchState): AgentEmptyCardViewModel {
  const workspaceState = state.workspaceKey
  const run = lastRelevantRun(state)
  if (!run) {
    return {
      sectionKey: 'recent-proof',
      label: 'Recent proof',
      title: workspaceState === '__none__' ? 'No verified work yet in the selected folder.' : 'No verified work yet in this workspace.',
      copy: 'The first real run will land here with its status, receipt trail, and the quickest way back into the inspector.',
      className: 'rw-agent-empty-proof',
    }
  }

  const receiptId = run.latestReceiptId || run.sessionId || run.id
  const summary = isRunSuccessWithProof(run)
    ? 'The last run finished with verified proof.'
    : run.status === 'running'
      ? 'The last run is still live and the proof is still moving.'
      : run.status === 'failed' || run.status === 'interrupted'
        ? 'The last run needs attention, and the receipt trail is ready to inspect.'
        : 'The last run returned, but the proof is still settling.'

  return {
    sectionKey: 'recent-proof',
    label: 'Recent proof',
    title: run.title || 'Latest run',
    copy: summary,
    className: 'rw-agent-empty-proof',
    stats: [
      { label: 'Status', value: formatRunStatus(run) },
      { label: 'Proof', value: formatProofBadge(run) },
      { label: 'Updated', value: formatRunDate(run.updatedAt) },
      { label: 'Duration', value: formatRunDuration(run) || formatExitState(run) },
    ],
    actions: [
      { label: 'Rerun', className: actionClass('primary'), dataset: { runRerun: run.id } },
      { label: 'Receipt', className: actionClass('secondary'), dataset: { runReveal: receiptId } },
      { label: 'Inspect run', className: actionClass('quiet'), dataset: { openRun: run.id } },
    ],
  }
}

export function buildRecoverySummaryCardModel(state: WorkbenchState): AgentEmptyCardViewModel | null {
  const restoredRuns = state.runs
    .filter((run) => run.restored)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  const latest = restoredRuns[0]
  if (!latest) return null
  const recovery = getRecoveryGuidance(latest)
  return {
    sectionKey: 'recovery-summary',
    label: 'Recovered work',
    title: 'We recovered your last work.',
    copy: 'Your project is safe and ready to continue.',
    className: 'rw-agent-empty-recovery',
    stats: [
      { label: 'Trust', value: 'Nothing was lost' },
      { label: 'Recovered', value: `${restoredRuns.length} item${restoredRuns.length === 1 ? '' : 's'}` },
      { label: 'Latest', value: formatRunStatus(latest) },
      { label: 'Updated', value: formatRunDate(latest.updatedAt) },
    ],
    actions: [
      ...(recovery.resumeSafe
        ? [{ label: 'Resume where you left off', className: actionClass('primary'), dataset: { runResume: latest.id } }]
        : []),
      {
        label: 'View details',
        className: actionClass(recovery.resumeSafe ? 'secondary' : 'primary'),
        dataset: { runReveal: latest.latestReceiptId || latest.id },
      },
    ],
  }
}

export function buildRecoveryStripViewModel(state: WorkbenchState, compact: boolean): RecoveryStripViewModel | null {
  const restoredRuns = state.runs
    .filter((run) => run.restored)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  const latestRun = restoredRuns[0]
  if (!latestRun) return null
  const latestRecovery = getRecoveryGuidance(latestRun)
  return {
    restoredCount: restoredRuns.length,
    title: latestRecovery?.resumeSafe ? 'Resume your last fix' : 'Review your last fix',
    badge: 'Nothing was lost',
    meta: undefined,
    expanded: state.ui.recoveryExpanded,
    compact,
    summary: latestRecovery?.resumeSafe
      ? 'Your project is safe and ready to continue.'
      : 'Your project is safe. Review the latest run before continuing.',
    actions: [
      ...(latestRecovery?.resumeSafe
        ? [{ label: 'Resume fix', className: actionClass('primary'), dataset: { runResume: latestRun.id } }]
        : []),
      ...(!latestRecovery?.resumeSafe
        ? [
            {
              label: 'View details',
              className: actionClass('primary'),
              dataset: { runReveal: latestRun.latestReceiptId || latestRun.id },
            },
          ]
        : []),
    ],
  }
}
