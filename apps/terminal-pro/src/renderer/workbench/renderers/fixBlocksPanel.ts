import type { FixBlockModel, WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'

type AgentViewState = 'idle' | 'recovered' | 'running' | 'completed'

function phaseLabel(fix: FixBlockModel): string {
  switch (fix.phase) {
    case 'detecting':
      return 'Analyzing'
    case 'planning':
      return 'Plan Ready'
    case 'executing':
      return 'Executing'
    case 'verifying':
      return 'Verifying'
    case 'done':
      return 'Fixed'
    case 'error':
      return 'Needs Review'
    default:
      return fix.status.toUpperCase()
  }
}

function phaseTone(fix: FixBlockModel): 'safe' | 'caution' | 'danger' {
  if (fix.status === 'error' || fix.phase === 'error') return 'danger'
  if (fix.phase === 'planning' || fix.phase === 'verifying') return 'caution'
  return 'safe'
}

function stepStatusGlyph(step: FixBlockModel['steps'][number]): string {
  if (step.status === 'done') return '✔'
  if (step.status === 'running') return '▶'
  if (step.status === 'error') return '✖'
  return '○'
}

function renderRiskBadge(step: FixBlockModel['steps'][number]): HTMLElement {
  return el('span', { class: `fix-badge ${step.risk === 'dangerous' ? 'danger' : step.risk === 'moderate' ? 'caution' : 'safe'}` }, step.risk === 'dangerous' ? 'high-impact' : step.risk === 'moderate' ? 'safe-write' : 'safe')
}

function stepRiskCounts(steps: FixBlockModel['steps']): { safe: number; moderate: number; dangerous: number } {
  return steps.reduce(
    (counts, step) => {
      if (step.risk === 'dangerous') counts.dangerous += 1
      else if (step.risk === 'moderate') counts.moderate += 1
      else counts.safe += 1
      return counts
    },
    { safe: 0, moderate: 0, dangerous: 0 }
  )
}

function renderPlanSummary(fix: FixBlockModel): HTMLElement {
  const counts = stepRiskCounts(fix.steps)

  return el(
    'div',
    { class: 'fix-summary-grid' },
    el(
      'div',
      { class: 'fix-summary-chip is-safe' },
      el('span', { class: 'fix-summary-count' }, String(counts.safe)),
      el('span', undefined, counts.safe === 1 ? 'safe step' : 'safe steps')
    ),
    el(
      'div',
      { class: 'fix-summary-chip is-caution' },
      el('span', { class: 'fix-summary-count' }, String(counts.moderate)),
      el('span', undefined, counts.moderate === 1 ? 'config change' : 'config changes')
    ),
    el(
      'div',
      { class: 'fix-summary-chip is-danger' },
      el('span', { class: 'fix-summary-count' }, String(counts.dangerous)),
      el('span', undefined, counts.dangerous === 1 ? 'high-impact step' : 'high-impact steps')
    )
  )
}

function renderIssueCard(issue: NonNullable<FixBlockModel['issues']>[number]): HTMLElement {
  const proposedFixes = Array.isArray(issue.proposedFixes) ? issue.proposedFixes.filter(Boolean) : []
  return el(
    'details',
    { class: `fix-issue-card is-${issue.kind || 'general'}` },
    el(
      'summary',
      { class: 'fix-issue-summary' },
      el('span', { class: 'fix-issue-title' }, issue.summary),
      el('span', { class: 'fix-issue-kind' }, issue.kind || 'issue')
    ),
    el(
      'div',
      { class: 'fix-issue-body' },
      el('div', { class: 'fix-copy' }, issue.evidence || 'No evidence attached.'),
      proposedFixes.length
        ? el(
            'div',
            { class: 'fix-issue-proposed' },
            el('div', { class: 'fix-label' }, 'Proposed fixes'),
            el(
              'ul',
              { class: 'fix-issue-proposed-list' },
              ...proposedFixes.map((command) => el('li', undefined, command))
            )
          )
        : null
    )
  )
}

function renderVerificationChecks(fix: FixBlockModel): HTMLElement | null {
  const checks = Array.isArray(fix.verificationChecks) ? fix.verificationChecks.filter(Boolean) : []
  if (checks.length === 0) return null
  return el(
    'div',
    { class: 'fix-verification-checks' },
    el('div', { class: 'fix-label' }, 'Verification checks'),
    el(
      'ul',
      { class: 'fix-verification-list' },
      ...checks.map((check) => el('li', undefined, check))
    )
  )
}

function summarizeIssueOutcome(issue: NonNullable<FixBlockModel['issues']>[number]): string {
  if (issue.kind === 'missing-dependency') return 'Installed or repaired missing dependencies'
  if (issue.kind === 'port-conflict') return 'Cleared a local port conflict blocking startup'
  if (issue.kind === 'build-config') return 'Updated project build or configuration settings'
  return issue.summary
}

function fallbackOutcomeFromSteps(fix: FixBlockModel): string[] {
  return fix.steps
    .filter((step) => step.status === 'done')
    .slice(0, 3)
    .map((step) => step.title || step.command)
}

function renderOutcomeSummary(fix: FixBlockModel): HTMLElement | null {
  if (fix.phase !== 'done' && fix.phase !== 'error') return null

  const computedSummary = fix.summary
  const issueSummaries = Array.isArray(fix.issues) ? fix.issues.map((issue) => summarizeIssueOutcome(issue)) : []
  const fallbackItems = (issueSummaries.length > 0 ? issueSummaries : fallbackOutcomeFromSteps(fix)).slice(0, 4)
  const summaryItems = (computedSummary?.highlights || fallbackItems).slice(0, 4)

  if (!computedSummary && summaryItems.length === 0 && !fix.verificationText) return null

  const confidence = fix.confidence
  const confidenceLabel = computedSummary?.confidence
    ? computedSummary.confidence
    : confidence
    ? `${confidence.level.toUpperCase()} CONFIDENCE (${confidence.score}%)`
    : fix.verificationStatus === 'passed'
      ? 'High confidence fix'
      : fix.verificationStatus === 'failed'
        ? 'Needs manual input'
        : 'Partial fix'

  return el(
    'div',
    { class: 'fix-outcome-summary' },
    el(
      'div',
      { class: 'fix-outcome-head' },
      el(
        'div',
        { class: 'fix-summary-title-wrap' },
        el('div', { class: 'fix-label' }, fix.phase === 'done' ? 'What we fixed' : 'Repair summary'),
        computedSummary?.title ? el('div', { class: 'fix-summary-title' }, computedSummary.title) : null
      ),
      el(
        'div',
        {
          class: `fix-confidence-badge ${
            confidence?.level === 'high' || (!confidence && fix.verificationStatus === 'passed')
              ? 'is-success'
              : confidence?.level === 'low' || (!confidence && fix.verificationStatus === 'failed')
                ? 'is-error'
                : 'is-caution'
          }`,
        },
        confidenceLabel
      )
    ),
    confidence
      ? el(
          'details',
          { class: 'fix-confidence-details' },
          el('summary', { class: 'fix-confidence-summary' }, 'Confidence details'),
          el(
            'ul',
            { class: 'fix-confidence-signals' },
            el('li', undefined, `Steps succeeded: ${confidence.signals.stepsSucceeded}`),
            el('li', undefined, `Steps failed: ${confidence.signals.stepsFailed}`),
            el('li', undefined, `Verification passed: ${confidence.signals.verificationPassed ? 'yes' : 'no'}`),
            el('li', undefined, `Partial verification: ${confidence.signals.partialVerification ? 'yes' : 'no'}`),
            el('li', undefined, `High-impact steps skipped: ${confidence.signals.highImpactSkipped}`),
            el('li', undefined, `Execution errors detected: ${confidence.signals.errorsDetected}`)
          )
        )
      : null,
    confidence?.reasons?.length
      ? el(
          'ul',
          { class: 'fix-confidence-reasons' },
          ...confidence.reasons.map((reason) => el('li', undefined, reason))
        )
      : null,
    summaryItems.length > 0
      ? el(
          'ul',
          { class: 'fix-outcome-list' },
          ...summaryItems.map((item) => el('li', undefined, `✔ ${item}`))
        )
      : null,
    computedSummary?.result
      ? el('div', { class: 'fix-summary-result' }, computedSummary.result)
      : null,
    computedSummary?.remainingIssues?.length
      ? el(
          'div',
          { class: 'fix-summary-remaining' },
          el('div', { class: 'fix-label' }, 'Remaining issues'),
          el(
            'ul',
            { class: 'fix-summary-remaining-list' },
            ...computedSummary.remainingIssues.map((issue) => el('li', undefined, `⚠ ${issue}`))
          )
        )
      : null,
    fix.verificationText
      ? el('div', { class: 'fix-outcome-proof' }, fix.verificationText)
      : null
  )
}

function renderChangedFilesSummary(fix: FixBlockModel): HTMLElement | null {
  const changedFiles = Array.isArray(fix.changedFiles) ? fix.changedFiles.filter(Boolean).slice(0, 6) : []
  const diffHints = Array.isArray(fix.diffHints) ? fix.diffHints.filter(Boolean).slice(0, 4) : []
  if (changedFiles.length === 0 && diffHints.length === 0) return null

  return el(
    'div',
    { class: 'fix-changed-files' },
    el('div', { class: 'fix-label' }, 'Changed files'),
    changedFiles.length > 0
      ? el(
          'ul',
          { class: 'fix-changed-files-list' },
          ...changedFiles.map((file) => el('li', undefined, file))
        )
      : null,
    fix.changedFiles && fix.changedFiles.length > changedFiles.length
      ? el(
          'div',
          { class: 'fix-status-note' },
          `${fix.changedFiles.length - changedFiles.length} more file${fix.changedFiles.length - changedFiles.length === 1 ? '' : 's'} are available in the receipt trail.`
        )
      : null,
    diffHints.length > 0
      ? el(
          'div',
          { class: 'fix-diff-hints' },
          el('div', { class: 'fix-label' }, 'What changed'),
          el(
            'ul',
            { class: 'fix-diff-hints-list' },
            ...diffHints.map((hint) => el('li', undefined, hint))
          )
        )
      : null
  )
}

function renderNarration(fix: FixBlockModel): HTMLElement | null {
  const narration = Array.isArray(fix.narration) ? fix.narration.filter((item) => item?.title) : []
  if (narration.length === 0) return null

  return el(
    'div',
    { class: 'fix-narration' },
    el('div', { class: 'fix-label' }, 'Live repair narration'),
    ...narration.map((item) =>
      el(
        'div',
        { class: `narration-item narration-${item.level}` },
        el('div', { class: 'narration-title' }, item.title),
        item.description ? el('div', { class: 'narration-desc' }, item.description) : null
      )
    )
  )
}

function renderProofSummary(fix: FixBlockModel): HTMLElement {
  const proofRows = [
    {
      label: 'Verification',
      value:
        fix.verificationStatus === 'passed'
          ? 'Passed'
          : fix.verificationStatus === 'failed'
            ? 'Needs review'
            : 'Pending',
      tone:
        fix.verificationStatus === 'passed'
          ? 'success'
          : fix.verificationStatus === 'failed'
            ? 'error'
            : 'pending',
    },
    {
      label: 'Repair run',
      value: fix.applyRunId || 'Attaches when execution starts',
      tone: fix.applyRunId ? 'success' : 'pending',
    },
    {
      label: 'Receipt trail',
      value: fix.applyPlanRunId || fix.runId || 'Pending',
      tone: fix.applyPlanRunId || fix.runId ? 'success' : 'pending',
    },
  ] as const

  return el(
    'div',
    { class: 'fix-proof-grid' },
    ...proofRows.map((row) =>
      el(
        'div',
        { class: `fix-proof-card is-${row.tone}` },
        el('div', { class: 'fix-label' }, row.label),
        el('div', { class: 'fix-proof-value' }, row.value)
      )
    )
  )
}

function renderNextStepGuidance(fix: FixBlockModel): HTMLElement {
  const message =
    fix.phase === 'detecting'
      ? 'RinaWarp is still reading the workspace. No files change until the repair plan is ready.'
      : fix.phase === 'planning'
        ? 'Review the plan summary first. If it looks right, start the proof-backed repair run.'
        : fix.phase === 'executing'
          ? 'Watch the live terminal and active step. The repair is already running, so this card is now your source of truth.'
          : fix.phase === 'verifying'
            ? 'The commands finished. RinaWarp is checking whether the project actually cleared the repair.'
            : fix.phase === 'done'
              ? 'The repair cleared verification. Review the proof trail or receipt if you want to confirm what changed.'
              : 'The automatic repair stopped early. Review the receipt trail, then rerun a step or adjust the project manually.'

  const tone =
    fix.phase === 'done'
      ? 'success'
      : fix.phase === 'error'
        ? 'error'
        : fix.phase === 'planning' || fix.phase === 'verifying'
          ? 'caution'
          : 'info'

  return el(
    'div',
    { class: `fix-guidance-card is-${tone}` },
    el('div', { class: 'fix-label' }, 'What happens next'),
    el('div', { class: 'fix-guidance-copy' }, message)
  )
}

function renderPhaseTimeline(fix: FixBlockModel): HTMLElement {
  const phases = [
    { key: 'detecting', label: 'Analyze' },
    { key: 'planning', label: 'Plan' },
    { key: 'executing', label: 'Execute' },
    { key: 'verifying', label: 'Verify' },
    { key: 'done', label: 'Prove' },
  ] as const

  const activeIndex =
    fix.phase === 'error'
      ? 3
      : Math.max(
          0,
          phases.findIndex((phase) => phase.key === fix.phase)
        )

  return el(
    'div',
    { class: 'fix-phase-timeline' },
    ...phases.map((phase, index) =>
      el(
        'div',
        {
          class: `fix-phase-node ${index < activeIndex ? 'is-complete' : ''} ${index === activeIndex ? 'is-active' : ''}`.trim(),
        },
        el('div', { class: 'fix-phase-dot' }, index < activeIndex ? '✓' : String(index + 1)),
        el('div', { class: 'fix-phase-label' }, phase.label)
      )
    )
  )
}

function renderFixStep(
  step: FixBlockModel['steps'][number],
  fixId: string,
  index: number,
  options: { showRunButton: boolean }
): HTMLElement {
  return el(
    'div',
    { class: `fix-step ${step.status ? `is-${step.status}` : ''}`.trim() },
    el(
      'div',
      { class: 'fix-step-head' },
      el(
        'div',
        { class: 'fix-step-title-wrap' },
        el('div', { class: `fix-step-glyph ${step.status ? `is-${step.status}` : ''}`.trim() }, stepStatusGlyph(step)),
        el('div', { class: 'fix-step-title' }, step.title || `Step ${index + 1}`)
      ),
      renderRiskBadge(step)
    ),
    step.status
      ? el(
          'div',
          { class: `fix-status-note ${step.status === 'error' ? 'error' : step.status === 'done' ? 'success' : step.status === 'running' ? 'active' : ''}` },
          step.status === 'running' ? 'Running now…' : step.status === 'done' ? 'Completed' : step.status === 'error' ? 'Failed' : 'Pending'
        )
      : null,
    el('div', { class: 'fix-step-command' }, el('code', undefined, step.command)),
    options.showRunButton
      ? el(
          'div',
          { class: 'fix-block-row' },
          el('button', { class: 'fix-btn', dataset: { runStep: String(index), fixId }, disabled: step.status === 'running' }, 'Run this step')
        )
      : null
  )
}

function getAgentViewState(fix: FixBlockModel): AgentViewState {
  if (fix.phase === 'done' || fix.phase === 'error') return 'completed'
  if (fix.phase === 'detecting' || fix.phase === 'planning' || fix.phase === 'executing' || fix.phase === 'verifying' || fix.status === 'running') {
    return 'running'
  }
  return 'recovered'
}

function renderAgentPanelHeader(fix: FixBlockModel): HTMLElement {
  const workspaceName = fix.cwd.split('/').filter(Boolean).pop() || fix.cwd || 'workspace'
  return el(
    'div',
    { class: 'agent-panel-header' },
    el('div', { class: 'agent-panel-title' }, 'Rina - Terminal Workbench'),
    el('div', { class: 'agent-panel-subtitle' }, `Workspace: ${workspaceName}`)
  )
}

function renderAgentPanelContext(fix: FixBlockModel, viewState: AgentViewState): HTMLElement {
  const title =
    viewState === 'completed'
      ? fix.phase === 'done'
        ? 'Your project is working again'
        : 'The repair needs a quick review'
      : viewState === 'running'
        ? 'Fixing your project...'
        : 'We recovered your last work'

  const copy =
    viewState === 'completed'
      ? fix.phase === 'done'
        ? 'The repair finished with proof attached and the project is ready for the next step.'
        : 'The safe repair flow stopped before full success, but the work and proof trail are still intact.'
      : viewState === 'running'
        ? fix.statusText || 'RinaWarp is repairing the project and streaming each safe step as it runs.'
        : 'Your project is safe and ready to continue.'

  return el(
    'div',
    { class: 'agent-context' },
    el('div', { class: 'agent-block-kicker' }, viewState === 'recovered' ? 'Recovered session' : viewState === 'running' ? 'Live execution' : 'Result'),
    el('h3', { class: 'agent-block-title' }, title),
    el('p', { class: 'agent-block-copy' }, copy),
    viewState === 'recovered'
      ? el('div', { class: 'agent-context-trust' }, 'Nothing was lost')
      : null
  )
}

function renderAgentPrimaryAction(fix: FixBlockModel, viewState: AgentViewState): HTMLElement {
  const actions: HTMLElement[] = []

  if (viewState === 'recovered') {
    actions.push(
      el('button', { class: 'primary-btn fix-auto-apply', dataset: { fixId: fix.id, fixAutoApply: '' } }, 'Resume where you left off'),
      el('button', { class: 'secondary-btn', dataset: { fixReveal: '', fixId: fix.id } }, 'View details')
    )
  } else if (viewState === 'running') {
    actions.push(
      el('button', { class: 'secondary-btn', dataset: { fixReveal: '', fixId: fix.id } }, 'View details')
    )
  } else if (fix.phase === 'done') {
    actions.push(
      el('button', { class: 'primary-btn', dataset: { pickWorkspace: 'fix-success' } }, 'Fix another project'),
      el(
        'button',
        {
          class: 'secondary-btn',
          dataset: {
            agentPrompt: 'Check this project health. Find outdated dependencies, configuration risks, and the safest next fixes without changing files yet.',
            healthCheck: 'fix-success',
          },
        },
        'Check health'
      )
    )
  } else {
    actions.push(
      el('button', { class: 'primary-btn', dataset: { fixReveal: '', fixId: fix.id } }, 'View details'),
      el('button', { class: 'secondary-btn fix-auto-apply', dataset: { fixAutoApply: '', fixId: fix.id } }, 'Try repair again')
    )
  }

  return el('div', { class: 'agent-primary-action' }, ...actions)
}

function renderAgentExecution(fix: FixBlockModel, viewState: AgentViewState): HTMLElement | null {
  if (viewState !== 'running') return null

  const narration = Array.isArray(fix.narration) ? fix.narration.filter((item) => item?.title).slice(-2) : []
  const visibleSteps = fix.steps.slice(0, 5)

  return el(
    'div',
    { class: 'agent-execution' },
    el('div', { class: 'agent-block-kicker' }, 'Live execution'),
    el('h3', { class: 'agent-block-title' }, 'Fixing your project...'),
    narration.length > 0
      ? el(
          'div',
          { class: 'agent-execution-narration' },
          ...narration.map((item) =>
            el(
              'div',
              { class: `agent-execution-note is-${item.level}` },
              el('div', { class: 'agent-execution-note-title' }, item.title),
              item.description ? el('div', { class: 'agent-execution-note-copy' }, item.description) : null
            )
          )
        )
      : null,
    el(
      'div',
      { class: 'agent-execution-steps' },
      ...(visibleSteps.length > 0
        ? visibleSteps.map((step) =>
            el(
              'div',
              { class: `execution-step ${step.status === 'running' ? 'active' : step.status === 'done' ? 'done' : ''}`.trim() },
              `${step.status === 'done' ? '✔' : step.status === 'running' ? '•' : '○'} ${step.title || step.command}`
            )
          )
        : [el('div', { class: 'execution-step active' }, '• Inspecting the project and preparing a safe repair plan')])
    ),
    fix.latestOutput
      ? el(
          'details',
          { class: 'agent-execution-log' },
          el('summary', { class: 'agent-history-summary' }, 'Live terminal output'),
          el('pre', { class: 'fix-terminal-output' }, fix.latestOutput)
        )
      : null
  )
}

function renderAgentResult(fix: FixBlockModel, viewState: AgentViewState): HTMLElement | null {
  if (viewState !== 'completed') return null

  const summaryItems =
    (fix.summary?.highlights || []).length > 0
      ? (fix.summary?.highlights || []).slice(0, 4)
      : (Array.isArray(fix.issues) ? fix.issues.map((issue) => summarizeIssueOutcome(issue)) : []).slice(0, 4)

  const confidence = fix.confidence?.score != null ? `${fix.confidence.level.charAt(0).toUpperCase()}${fix.confidence.level.slice(1)} (${fix.confidence.score}%)` : fix.summary?.confidence || 'Working proof attached'

  return el(
    'div',
    { class: 'agent-result' },
    el('div', { class: 'agent-block-kicker' }, fix.phase === 'done' ? 'Result' : 'Needs review'),
    el('h3', { class: 'agent-block-title' }, fix.phase === 'done' ? 'Project fixed' : 'Automatic repair stopped early'),
    fix.phase === 'done'
      ? el('p', { class: 'agent-block-copy' }, 'Before: Broken. After: Working.')
      : el('p', { class: 'agent-block-copy' }, 'Before: Broken. After: Safer, but still needs a quick manual review.'),
    summaryItems.length > 0
      ? el(
          'ul',
          { class: 'agent-result-list' },
          ...summaryItems.map((item) => el('li', undefined, `✔ ${item}`))
        )
      : null,
    el(
      'div',
      { class: 'agent-result-confidence' },
      el('span', undefined, 'Confidence:'),
      el('strong', undefined, confidence)
    ),
    fix.verificationText ? el('div', { class: `fix-result-note ${fix.verificationStatus === 'passed' ? 'success' : fix.verificationStatus === 'failed' ? 'error' : ''}`.trim() }, fix.verificationText) : null,
    fix.phase === 'done'
      ? el(
          'div',
          { class: 'agent-primary-action' },
          el('button', { class: 'primary-btn', dataset: { shareFix: fix.id } }, 'Share this fix'),
          el('button', { class: 'secondary-btn', dataset: { copyFixSummary: fix.id } }, 'Copy summary')
        )
      : null
  )
}

function renderAgentHistory(fix: FixBlockModel): HTMLElement {
  const outcomeSummary = renderOutcomeSummary(fix)
  const changedFilesSummary = renderChangedFilesSummary(fix)
  const hasHistoryContent = Boolean(
    outcomeSummary ||
      changedFilesSummary ||
      (fix.issues && fix.issues.length > 0) ||
      fix.steps.length > 0 ||
      fix.applyRunId ||
      fix.runId
  )

  if (!hasHistoryContent) {
    return el('div')
  }

  const historyBody = el(
    'div',
    { class: 'agent-history-body' },
    outcomeSummary || el('div', { class: 'fix-status-note' }, 'No result summary yet.'),
    changedFilesSummary,
    fix.issues?.length
      ? el(
          'div',
          { class: 'fix-issues' },
          ...fix.issues.map((issue) => renderIssueCard(issue))
        )
      : null,
    fix.steps.length > 0
      ? el(
          'div',
          { class: 'fix-steps' },
          ...fix.steps.slice(0, 5).map((step, index) => renderFixStep(step, fix.id, index, { showRunButton: false }))
        )
      : null,
    el(
      'div',
      { class: 'agent-history-actions' },
      el('button', { class: 'secondary-btn', dataset: { fixReveal: '', fixId: fix.id } }, 'Open receipt'),
      fix.applyRunId ? el('button', { class: 'secondary-btn', dataset: { fixProof: '', fixId: fix.id } }, 'Export proof') : null,
      el('button', { class: 'secondary-btn', dataset: { tab: 'runs' } }, 'Open runs')
    )
  )

  return el(
    'details',
    { class: 'agent-history collapsed' },
    el('summary', { class: 'agent-history-summary' }, 'Recent work'),
    historyBody
  )
}

function renderAgentInputActions(fix: FixBlockModel): HTMLElement {
  const projectPrompt = fix.cwd && fix.cwd !== '.'
    ? 'Figure out what is broken and fix the safest parts first.'
    : 'Help me fix this project.'

  return el(
    'div',
    { class: 'agent-input-panel' },
    el('div', { class: 'agent-input-placeholder' }, 'Ask anything...'),
    el(
      'div',
      { class: 'agent-input-actions' },
      el(
        'button',
        {
          class: 'primary-btn',
          dataset: {
            agentPrompt: projectPrompt,
            intentKey: 'fix',
            tierHint: 'Start here',
            tierTone: 'available',
          },
        },
        'Fix my project'
      ),
      el(
        'button',
        {
          class: 'secondary-btn',
          dataset: {
            agentPrompt: 'Check this project health. Find outdated dependencies, configuration risks, and the safest next fixes without changing files yet.',
            healthCheck: 'agent-panel',
          },
        },
        'Check health'
      )
    )
  )
}

function renderFixBlock(fix: FixBlockModel): HTMLElement {
  const viewState = getAgentViewState(fix)

  return el(
    'section',
    { class: `fix-block agent-panel ${fix.phase ? `is-${fix.phase}` : ''}`.trim(), dataset: { fixId: fix.id, agentViewState: viewState } },
    renderAgentPanelHeader(fix),
    renderAgentPanelContext(fix, viewState),
    renderAgentPrimaryAction(fix, viewState),
    renderAgentExecution(fix, viewState),
    renderAgentResult(fix, viewState),
    renderAgentHistory(fix),
    renderAgentInputActions(fix)
  )
}

export function renderFixBlocks(state: WorkbenchState): void {
  const root = document.getElementById('agent-plan-container')
  if (!root) return
  const shell = el('div')
  for (const fix of state.fixBlocks.slice(0, 10)) {
    shell.appendChild(renderFixBlock(fix))
  }
  mount(root, shell)
}
