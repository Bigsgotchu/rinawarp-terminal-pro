import type { FixBlockModel, WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'

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
        el('div', { class: 'fix-label' }, 'Repair summary'),
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

function renderFixBlock(fix: FixBlockModel): HTMLElement {
  const visibleSteps = fix.steps.slice(0, 5)
  const hiddenStepCount = Math.max(0, fix.steps.length - visibleSteps.length)
  const riskCounts = stepRiskCounts(fix.steps)
  const hasProofRun = Boolean(fix.applyRunId)
  const hasReceiptTrail = Boolean(fix.applyPlanRunId || fix.runId)
  const isRepairActive = fix.phase === 'detecting' || fix.phase === 'planning' || fix.phase === 'executing' || fix.phase === 'verifying'
  const showManualStepActions = fix.phase === 'planning' || fix.phase === 'error'
  const issueHeading =
    fix.phase === 'done'
      ? 'Project fixed successfully'
      : fix.phase === 'error'
        ? 'Some issues could not be fixed automatically'
        : 'We found issues and can fix them'

  const body = el(
    'div',
    { class: 'fix-body' },
    el(
      'div',
      { class: 'fix-hero' },
      el('div', { class: 'fix-label' }, 'Fix Project'),
      el('div', { class: 'fix-hero-title' }, issueHeading),
      el('div', { class: 'fix-copy' }, fix.whatBroke)
    ),
    renderPhaseTimeline(fix),
    el('div', undefined, el('div', { class: 'fix-label' }, 'Why this is safe'), el('div', { class: 'fix-copy' }, fix.whySafe)),
    el(
      'div',
      { class: 'fix-overview' },
      el(
        'div',
        { class: 'fix-overview-card' },
        el('div', { class: 'fix-label' }, 'Plan'),
        el('div', { class: 'fix-overview-value' }, `${fix.steps.length} step${fix.steps.length === 1 ? '' : 's'}`),
        el('div', { class: 'fix-overview-copy' }, 'Review the plan, then watch the streamed run prove the repair.')
      ),
      el(
        'div',
        { class: 'fix-overview-card' },
        el('div', { class: 'fix-label' }, 'Run'),
        el('div', { class: 'fix-overview-value' }, fix.applyRunId || fix.runId || fix.streamId),
        el('div', { class: 'fix-overview-copy' }, fix.applyRunId ? 'Proof-backed run attached.' : 'Repair run will attach once execution starts.')
      ),
      el(
        'div',
        { class: 'fix-overview-card' },
        el('div', { class: 'fix-label' }, 'Workspace'),
        el('div', { class: 'fix-overview-value' }, fix.cwd),
        el('div', { class: 'fix-overview-copy' }, 'This repair stays scoped to the current project root.')
      )
    ),
    el(
      'div',
      undefined,
      el('div', { class: 'fix-label' }, fix.phase === 'done' ? 'Proof of repair' : 'Proof path'),
      renderProofSummary(fix)
    ),
    fix.steps.length > 0
      ? el(
          'div',
          undefined,
          el('div', { class: 'fix-label' }, 'Repair summary'),
          renderPlanSummary(fix)
        )
      : null,
    fix.issues?.length
      ? el(
          'div',
          undefined,
          el('div', { class: 'fix-label' }, 'Issues found'),
          el('div', { class: 'fix-issues' }, ...fix.issues.map((issue) => renderIssueCard(issue)))
        )
      : null,
    riskCounts.dangerous > 0 && fix.phase !== 'done'
      ? el(
          'div',
          { class: 'fix-warning-banner' },
          'This plan includes project-modifying steps. Review the high-impact items before treating this run as routine.'
        )
      : null,
    renderNextStepGuidance(fix),
    renderNarration(fix),
    el(
      'div',
      undefined,
      el('div', { class: 'fix-label' }, fix.phase === 'executing' || fix.phase === 'verifying' || fix.phase === 'done' ? 'Repair steps' : 'Planned steps')
    ),
    renderVerificationChecks(fix),
  )

  if (fix.statusText) {
    body.appendChild(el('div', { class: `fix-status-banner ${fix.phase === 'executing' || fix.phase === 'verifying' ? 'is-active' : fix.phase === 'done' ? 'is-success' : fix.phase === 'error' ? 'is-error' : ''}`.trim() }, fix.statusText))
  }

  if (fix.latestOutput) {
    body.appendChild(
      el(
        'div',
        { class: 'fix-terminal-shell' },
        el('div', { class: 'fix-label' }, 'Execution stream'),
        el('div', { class: 'fix-terminal-title' }, 'Live terminal output'),
        undefined,
        el('pre', { class: 'fix-terminal-output' }, fix.latestOutput)
      )
    )
  }

  const actionsContainer = el('div', { class: 'fix-steps' })
  if (fix.steps.length > 0) {
    for (const [index, step] of visibleSteps.entries()) {
      actionsContainer.appendChild(renderFixStep(step, fix.id, index, { showRunButton: showManualStepActions }))
    }
    if (hiddenStepCount > 0) {
      actionsContainer.appendChild(
        el(
          'div',
          { class: 'fix-status-note' },
          `Showing the first ${visibleSteps.length} steps. ${hiddenStepCount} more step${hiddenStepCount === 1 ? '' : 's'} remain in this repair run and will appear in the receipt trail.`
        )
      )
    }
    if (!showManualStepActions) {
      actionsContainer.appendChild(
        el(
          'div',
          { class: 'fix-status-note' },
          fix.phase === 'done'
            ? 'This repair already ran. Review the proof and receipt trail before rerunning individual steps.'
            : 'Step controls stay hidden while the repair is active so the live run remains the main source of truth.'
        )
      )
    }
  } else {
    actionsContainer.appendChild(el('div', { class: 'fix-status-note' }, 'Planning runnable actions…'))
  }
  body.appendChild(actionsContainer)

  const footerActions = [el(
    'button',
    { class: 'fix-btn primary fix-auto-apply', dataset: { fixId: fix.id }, disabled: fix.steps.length === 0 || fix.phase === 'detecting' },
    fix.phase === 'planning' ? 'Fix Automatically (Pro)' : fix.phase === 'done' ? 'Run Repair Again (Pro)' : 'Re-run Safe Fix (Pro)'
  )]

  if (hasReceiptTrail) {
    footerActions.push(
      el('button', { class: 'fix-btn', dataset: { fixReveal: '', fixId: fix.id } }, fix.phase === 'done' ? 'View Receipt' : 'Review Receipt')
    )
  }

  if (hasProofRun) {
    footerActions.push(el('button', { class: 'fix-btn', dataset: { fixProof: '', fixId: fix.id } }, fix.phase === 'done' ? 'Export Proof' : 'Prepare Proof Bundle'))
  }

  if (!isRepairActive || hasProofRun) {
    footerActions.push(el('button', { class: 'fix-btn', dataset: { fixFolder: '' } }, 'Open Runs Folder'))
  }

  body.appendChild(el('div', { class: 'fix-block-footer' }, ...footerActions))

  if (fix.status === 'running') {
    body.appendChild(el('div', { class: 'fix-status-note active' }, 'Repair is running now. Watch the step list and terminal stream for proof.'))
  }
  if (fix.verificationText) {
    body.appendChild(
      el(
        'div',
        { class: `fix-result-note ${fix.verificationStatus === 'failed' ? 'error' : fix.verificationStatus === 'passed' ? 'success' : ''}` },
        fix.verificationText
      )
    )
  }
  const outcomeSummary = renderOutcomeSummary(fix)
  if (outcomeSummary) {
    body.appendChild(outcomeSummary)
  }
  const changedFilesSummary = renderChangedFilesSummary(fix)
  if (changedFilesSummary) {
    body.appendChild(changedFilesSummary)
  }
  if (fix.phase === 'done' || fix.phase === 'error') {
    body.appendChild(
      el(
        'div',
        { class: 'fix-status-note' },
        fix.phase === 'done'
          ? 'The repair finished with proof attached. Use the receipt or exported bundle if you need to review what changed.'
          : 'The repair surfaced a reviewable outcome. Use the receipt and proof trail to inspect what ran and what still needs attention.'
      )
    )
  }
  if (fix.explanation) {
    body.appendChild(
      el(
        'div',
        undefined,
        el('div', { class: 'fix-label' }, 'Explanation'),
        el('div', { class: 'fix-copy' }, fix.explanation)
      )
    )
  }
  if (fix.error) {
    body.appendChild(el('div', { class: 'fix-result-note error' }, fix.error))
  }

  return el(
    'section',
    { class: `fix-block ${fix.phase ? `is-${fix.phase}` : ''}`.trim(), dataset: { fixId: fix.id } },
    el(
      'div',
      { class: 'fix-block-head' },
      el('div', { class: 'fix-block-title' }, 'Fix Project'),
      el('div', { class: `fix-badge ${phaseTone(fix)}` }, phaseLabel(fix))
    ),
    body
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
