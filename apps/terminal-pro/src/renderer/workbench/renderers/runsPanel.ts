import { clear, el, mount } from '../dom.js'
import { formatInspectorRunStatus, formatRunDate, formatRunDuration } from './format.js'
import { getRunsView } from './selectors.js'
import { isRunSuccessWithProof } from '../proof.js'
import type { RunArtifactSummary, RunModel, WorkbenchState } from '../store.js'
import { analyzeFailure, formatFailureNarrative, formatRecoveryNarrative, getRecoveryGuidance } from './runIntelligence.js'

function runActionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  if (role === 'quiet') return 'rw-inline-action is-subtle'
  return 'rw-inline-action'
}

function buildEmptyState(title: string, copy: string, extra?: HTMLElement): HTMLElement {
  return el(
    'div',
    { class: 'rw-empty-state' },
    el('div', { class: 'rw-empty-title' }, title),
    el('div', { class: 'rw-empty-copy' }, copy),
    extra ?? null
  )
}

function buildRunsToolbar(state: WorkbenchState): HTMLElement {
  return el(
    'div',
    { class: 'rw-runs-toolbar' },
    el(
      'button',
      { class: 'rw-link-btn', dataset: { toggleRunsScope: '' } },
      state.ui.scopeRunsToWorkspace ? 'Current workspace only' : 'All workspaces'
    ),
    el(
      'button',
      { class: 'rw-link-btn', dataset: { toggleRunsVisibility: '' } },
      state.ui.showAllRuns ? 'Show only meaningful runs' : 'Show all run activity'
    )
  )
}

function buildRunsSummary(
  state: WorkbenchState,
  visibleCount: number,
  hiddenWorkspaceCount: number,
  hiddenNoiseCount: number,
  hiddenOverflowCount: number
): HTMLElement {
  const summary = el('div', { class: 'rw-runs-summary' }, buildRunsToolbar(state))
  summary.appendChild(
    el(
      'div',
      { class: 'rw-runs-summary-copy' },
      `Showing ${visibleCount} run${visibleCount === 1 ? '' : 's'} for ${state.ui.scopeRunsToWorkspace ? 'this workspace' : 'all workspaces'}.`
    )
  )
  if (hiddenWorkspaceCount) {
    summary.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Hidden ${hiddenWorkspaceCount} run${hiddenWorkspaceCount === 1 ? '' : 's'} from other workspaces.`
      )
    )
  }
  if (hiddenNoiseCount) {
    summary.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Hidden ${hiddenNoiseCount} session activity item${hiddenNoiseCount === 1 ? '' : 's'} with 0 commands.`
      )
    )
  }
  if (hiddenOverflowCount > 0) {
    summary.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Hidden ${hiddenOverflowCount} older run${hiddenOverflowCount === 1 ? '' : 's'} from the current view.`
      )
    )
  }
  return summary
}

function buildDeploymentSummary(state: WorkbenchState): HTMLElement | null {
  if (state.deployment.status === 'idle' && !state.deployment.detectedTarget) return null
  const rows = el('div', { class: 'rw-runs-summary-copy' })
  rows.appendChild(el('div', { class: 'rw-run-title' }, 'Canonical deploy state'))
  rows.appendChild(el('div', { class: 'rw-runs-summary-copy' }, state.deployment.summary))
  if (state.deployment.targetIdentity) {
    rows.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Identity ${state.deployment.targetIdentity} · source ${state.deployment.targetIdentitySource}`
      )
    )
  }
  if (state.deployment.detectedTarget && state.deployment.status === 'idle') {
    rows.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Workspace signals suggest ${state.deployment.detectedTarget}. ${state.deployment.detectedSignals.join(', ') || 'Deploy config detected'}.`
      )
    )
  }
  rows.appendChild(
    el(
      'div',
      { class: 'rw-runs-summary-copy' },
      `Target ${state.deployment.target || 'unknown'} · verification ${state.deployment.verification} · rollback ${state.deployment.rollback}`
    )
  )
  if (state.deployment.targetUrl) {
    rows.appendChild(el('div', { class: 'rw-runs-summary-copy' }, `URL ${state.deployment.targetUrl}`))
  }
  if (state.deployment.artifact || state.deployment.buildId) {
    rows.appendChild(
      el(
        'div',
        { class: 'rw-runs-summary-copy' },
        `Artifact ${state.deployment.artifact || 'unknown'} · build ${state.deployment.buildId || 'unknown'}`
      )
    )
  }
  rows.appendChild(el('div', { class: 'rw-runs-summary-copy' }, state.deployment.verificationSummary))
  rows.appendChild(el('div', { class: 'rw-runs-summary-copy' }, state.deployment.rollbackSummary))
  if (state.deployment.verificationEvidence.length > 0) {
    rows.appendChild(
      el('div', { class: 'rw-runs-summary-copy' }, `Verification evidence ${state.deployment.verificationEvidence.join(' · ')}`)
    )
  }
  if (state.deployment.rollbackEvidence.length > 0) {
    rows.appendChild(
      el('div', { class: 'rw-runs-summary-copy' }, `Rollback evidence ${state.deployment.rollbackEvidence.join(' · ')}`)
    )
  }
  const actions = el('div', { class: 'rw-run-actions' })
  if (state.deployment.recommendedPackKey && state.deployment.status === 'idle') {
    actions.appendChild(
      el(
        'button',
        {
          class: 'rw-link-btn rw-run-action',
          dataset: { capabilityRun: state.deployment.recommendedPackKey, capabilityActionId: 'plan' },
        },
        'Plan deploy'
      )
    )
  }
  if (state.deployment.latestRunId) {
    actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { openRun: state.deployment.latestRunId } }, 'Inspect deploy run'))
    actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runArtifacts: state.deployment.latestRunId } }, 'Inspect output'))
  }
  if (state.deployment.latestReceiptId) {
    actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runReveal: state.deployment.latestReceiptId } }, 'Open receipt'))
  }
  return el('section', { class: 'rw-runs-summary' }, rows, actions)
}

function buildRunSection(summary: string, body: HTMLElement, open = false): HTMLElement {
  const details = el('details', { class: 'rw-run-section' })
  if (open) details.open = true
  details.appendChild(el('summary', undefined, summary))
  details.appendChild(body)
  return details
}

function buildArtifactSummaryNode(summary: RunArtifactSummary | null): HTMLElement {
  if (!summary) {
    return el(
      'div',
      { class: 'rw-run-section-placeholder' },
      'No artifact summary loaded yet. Use the Artifacts action to inspect stored receipt data.'
    )
  }

  const root = el('div', { class: 'rw-run-section-grid' })
  const metricRow = (label: string, value: string) =>
    el('div', undefined, el('span', { class: 'rw-run-command-label' }, label), el('code', undefined, value))

  root.appendChild(metricRow('Stdout chunks', String(summary.stdoutChunks)))
  root.appendChild(metricRow('Stderr chunks', String(summary.stderrChunks)))
  root.appendChild(metricRow('Meta chunks', String(summary.metaChunks)))

  if (summary.changedFiles.length > 0) {
    root.appendChild(el('div', { class: 'rw-run-command-label' }, 'Changed files'))
    root.appendChild(el('pre', { class: 'rw-run-output-tail' }, summary.changedFiles.join('\n')))
  }
  if (summary.diffHints.length > 0) {
    root.appendChild(el('div', { class: 'rw-run-command-label' }, 'Diff hints'))
    root.appendChild(el('pre', { class: 'rw-run-output-tail' }, summary.diffHints.join('\n')))
  }
  if (summary.stdoutPreview) {
    root.appendChild(el('div', { class: 'rw-run-command-label' }, 'Stdout preview'))
    root.appendChild(el('pre', { class: 'rw-run-output-tail' }, summary.stdoutPreview))
  }
  if (summary.stderrPreview) {
    root.appendChild(el('div', { class: 'rw-run-command-label' }, 'Stderr preview'))
    root.appendChild(el('pre', { class: 'rw-run-output-tail' }, summary.stderrPreview))
  }
  if (summary.metaPreview) {
    root.appendChild(el('div', { class: 'rw-run-command-label' }, 'Meta preview'))
    root.appendChild(el('pre', { class: 'rw-run-output-tail' }, summary.metaPreview))
  }

  return root
}

function buildRunBlockNode(state: WorkbenchState, run: RunModel): HTMLElement {
  const statusLabel = formatInspectorRunStatus(run)
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
  const summaryBits = [
    `Updated ${formatRunDate(run.updatedAt)}`,
    `${run.commandCount} command${run.commandCount === 1 ? '' : 's'}`,
    durationLabel ? `Duration ${durationLabel}` : '',
    run.exitCode !== null && run.exitCode !== undefined ? `Exit ${String(run.exitCode)}` : run.status === 'running' ? 'Exit pending' : '',
  ].filter(Boolean)

  const article = el('article', {
    class: `rw-run-block ${run.status === 'running' ? 'is-running' : ''}`,
    dataset: { sessionId: run.sessionId, runId: run.id },
  })
  article.style.borderRadius = '0'
  article.style.boxShadow = 'none'

  const row = el('div', { class: 'rw-run-row' })
  const main = el('div', { class: 'rw-run-row-main' })
  const top = el('div', { class: 'rw-run-row-top' })
  top.appendChild(el('span', { class: `rw-run-status-dot rw-run-status-dot-${run.status}`, ariaLabel: `${statusLabel} status` }))
  top.appendChild(el('span', { class: `rw-status-pill rw-status-${run.status}` }, statusLabel))
  top.appendChild(el('div', { class: 'rw-run-title' }, run.title || 'Session activity'))
  if (run.restored) top.appendChild(el('span', { class: 'rw-run-note' }, 'RESTORED'))
  main.appendChild(top)

  main.appendChild(el('div', { class: 'rw-run-row-command', title: commandLabel }, el('code', undefined, commandLabel)))
  const meta = el('div', { class: 'rw-run-meta' })
  meta.appendChild(el('span', { class: 'rw-run-subtitle' }, locationLabel))
  for (const bit of summaryBits) meta.appendChild(el('span', undefined, bit))
  if (run.originMessageId) {
    meta.appendChild(el('button', { class: 'rw-run-origin-link', dataset: { openMessage: run.originMessageId } }, 'From thread'))
  }
  main.appendChild(meta)
  row.appendChild(main)

  const actions = el('div', { class: 'rw-run-actions' })
  if (isInterrupted) {
    actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runResume: run.id }, title: recovery.resumeLabel }, recovery.resumeLabel))
  }
  actions.appendChild(
    el(
      'button',
      { class: 'rw-link-btn rw-run-action', dataset: { runRerun: run.id }, disabled: !hasCommand, title: recovery.rerunLabel },
      recovery.rerunLabel
    )
  )
  if (run.status === 'failed' || run.status === 'interrupted') {
    actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runFix: run.id }, disabled: !hasCommand, title: 'Fix and retry' }, 'Fix & retry'))
  }
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runReveal: receiptLabel }, title: recovery.receiptLabel }, recovery.receiptLabel))
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runArtifacts: run.id }, title: 'Inspect artifacts' }, 'Artifacts'))
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runDiff: run.id }, title: 'Show diff or changed files' }, 'Show diff'))
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { openRun: run.id }, title: 'Inspect run' }, 'Inspect'))
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runCopy: run.id }, disabled: !hasCommand, title: 'Copy command' }, 'Copy command'))
  row.appendChild(actions)
  article.appendChild(row)

  if (isInterrupted) {
    article.appendChild(
      el(
        'div',
        { class: 'rw-run-alert' },
        formatRecoveryNarrative(recovery, { prefix: 'Interrupted during the last session.', includeWhatInterrupted: false })
      )
    )
  } else if (run.status === 'failed' && failureAnalysis) {
    article.appendChild(
      el(
        'div',
        { class: 'rw-run-alert' },
        formatFailureNarrative(failureAnalysis)
      )
    )
  } else if (!successProof && run.status === 'ok') {
    article.appendChild(
      el(
        'div',
        { class: 'rw-run-alert subtle' },
        'Run completed but proof is incomplete. Treat this as proof pending until receipt and exit are both present.'
      )
    )
  } else if (run.restored) {
    article.appendChild(el('div', { class: 'rw-run-alert subtle' }, 'Restored from your previous session history.'))
  }

  const sections = el('div', { class: 'rw-run-sections' })

  const outputBody = el('div', { class: 'rw-run-section-body' })
  if (outputTail) outputBody.appendChild(el('pre', { class: 'rw-run-output-tail' }, outputTail))
  else {
    outputBody.appendChild(
      el(
        'div',
        { class: 'rw-run-section-placeholder' },
        run.status === 'running' ? 'Live output is still arriving.' : 'No saved output has been attached to this run yet.'
      )
    )
  }
  sections.appendChild(buildRunSection('Output', outputBody, run.status === 'running'))

  const artifacts = el('div', { class: 'rw-run-section-body rw-run-section-grid' })
  const artifactRow = (label: string, value: string) =>
    el('div', undefined, el('span', { class: 'rw-run-command-label' }, label), el('code', undefined, value))
  artifacts.appendChild(artifactRow('Run', run.id))
  artifacts.appendChild(artifactRow('Session', run.sessionId))
  artifacts.appendChild(artifactRow('Receipt', receiptLabel))
  artifacts.appendChild(artifactRow('Workspace', locationLabel))
  artifacts.appendChild(
    el('button', { class: runActionClass('secondary'), dataset: { runArtifacts: run.id } }, artifactSummary ? 'Refresh artifacts' : 'Load artifacts')
  )
  artifacts.appendChild(buildArtifactSummaryNode(artifactSummary))
  sections.appendChild(buildRunSection('Artifacts', artifacts))

  const timings = el('div', { class: 'rw-run-section-body rw-run-section-grid' })
  timings.appendChild(artifactRow('Started', formatRunDate(run.startedAt)))
  timings.appendChild(artifactRow('Updated', formatRunDate(run.updatedAt)))
  timings.appendChild(artifactRow('Ended', run.endedAt ? formatRunDate(run.endedAt) : 'not finished'))
  timings.appendChild(artifactRow('Duration', durationLabel || 'unknown'))
  sections.appendChild(buildRunSection('Timings', timings))

  const actionBody = el('div', { class: 'rw-run-section-body rw-run-section-actions' })
  if (isInterrupted) {
    actionBody.appendChild(el('button', { class: runActionClass('primary'), dataset: { runResume: run.id } }, recovery.resumeLabel))
  }
  actionBody.appendChild(el('button', { class: runActionClass(isInterrupted ? 'secondary' : 'primary'), dataset: { runRerun: run.id } }, recovery.rerunLabel))
  if (run.status === 'failed' || run.status === 'interrupted') {
    actionBody.appendChild(el('button', { class: runActionClass('attention'), dataset: { runFix: run.id } }, 'Fix & retry'))
  }
  actionBody.appendChild(el('button', { class: runActionClass('secondary'), dataset: { runReveal: receiptLabel } }, recovery.receiptLabel))
  actionBody.appendChild(el('button', { class: runActionClass('secondary'), dataset: { runArtifacts: run.id } }, artifactSummary ? 'Refresh artifacts' : 'Load artifacts'))
  actionBody.appendChild(el('button', { class: runActionClass('secondary'), dataset: { runDiff: run.id } }, 'Show diff'))
  actionBody.appendChild(el('button', { class: runActionClass('quiet'), dataset: { openRun: run.id } }, 'Inspect run'))
  actionBody.appendChild(el('button', { class: runActionClass('quiet'), dataset: { runCopy: run.id } }, 'Copy command'))
  actionBody.appendChild(el('button', { class: runActionClass('quiet'), dataset: { runFolder: '' } }, 'Open runs folder'))
  if (run.restored) {
    actionBody.appendChild(el('button', { class: runActionClass('quiet'), dataset: { tab: 'agent' } }, 'Back to thread'))
  }
  sections.appendChild(buildRunSection('Actions', actionBody))

  article.appendChild(sections)
  return article
}

export function renderRuns(state: WorkbenchState): void {
  const root = document.getElementById('runs-output')
  if (!root) return

  if (state.runs.length === 0) {
    mount(root, buildEmptyState('No runs yet', 'Run a command and its session receipts will appear here.'))
    return
  }

  const { visibleRuns, hiddenWorkspaceCount, hiddenNoiseCount, hiddenOverflowCount } = getRunsView(state)
  const summary =
    hiddenNoiseCount || hiddenWorkspaceCount || hiddenOverflowCount
      ? buildRunsSummary(state, visibleRuns.length, hiddenWorkspaceCount, hiddenNoiseCount, hiddenOverflowCount)
      : buildRunsToolbar(state)

  if (visibleRuns.length === 0) {
    mount(
      root,
      buildEmptyState(
        'No meaningful runs to inspect',
        `Rina’s run history is quiet for ${state.ui.scopeRunsToWorkspace ? 'this workspace' : 'the current view'} right now.`,
        summary
      )
    )
    return
  }

  clear(root)
  root.appendChild(summary)
  const deploymentSummary = buildDeploymentSummary(state)
  if (deploymentSummary) root.appendChild(deploymentSummary)
  const list = el('div', { class: 'rw-runs-list' })
  for (const run of visibleRuns) list.appendChild(buildRunBlockNode(state, run))
  root.appendChild(list)
}
