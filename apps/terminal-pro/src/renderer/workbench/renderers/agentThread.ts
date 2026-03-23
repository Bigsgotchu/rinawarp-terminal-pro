import type { RunModel, WorkbenchState } from '../store.js'
import { clear, el, mount } from '../dom.js'
import { formatExitState, formatProofBadge, formatRunDate, formatRunDuration, formatRunStatus } from './format.js'
import { renderLinkedRunsNode } from './linkedRuns.js'
import { currentMode } from './runtime.js'
import { getWorkspaceContextState, lastRelevantRun } from './selectors.js'
import { appendMessageContent } from './messageBlocks.js'
import { hasRunProof, isRunSuccessWithProof } from '../proof.js'
import { analyzeFailure, formatFailureNarrative, formatRecoveryNarrative, getRecoveryGuidance } from './runIntelligence.js'

type StarterIntentKey = 'build' | 'test' | 'deploy' | 'fix'

function getStarterIntentTierMeta(state: WorkbenchState, intent: StarterIntentKey): { hint: string; tone: 'available' | 'enhanced' } {
  const isStarter = (state.license.tier || 'starter') === 'starter'
  if (intent === 'build' || intent === 'test') {
    return { hint: isStarter ? 'Available now' : 'Included', tone: 'available' }
  }
  return { hint: isStarter ? 'Pro adds more' : 'Unlocked', tone: 'enhanced' }
}

function renderStarterPromptChip(
  state: WorkbenchState,
  intent: StarterIntentKey,
  label: string,
  prompt: string
): HTMLElement {
  const meta = getStarterIntentTierMeta(state, intent)
  return el(
    'button',
    {
      class: 'rw-prompt-chip',
      ariaLabel: label,
      dataset: {
        agentPrompt: prompt,
        intentKey: intent,
        tierHint: meta.hint,
        tierTone: meta.tone,
      },
    },
    el('span', { class: 'rw-prompt-chip-label' }, label),
    el('span', { class: 'rw-prompt-chip-meta' }, meta.hint)
  )
}

function syncStarterPromptChips(state: WorkbenchState): void {
  const chips = Array.from(document.querySelectorAll<HTMLElement>('.rw-prompt-chip[data-intent-key]'))
  for (const chip of chips) {
    const intent = chip.dataset.intentKey as StarterIntentKey | undefined
    if (!intent) continue
    const meta = getStarterIntentTierMeta(state, intent)
    chip.dataset.tierHint = meta.hint
    chip.dataset.tierTone = meta.tone
    const metaNode = chip.querySelector<HTMLElement>('.rw-prompt-chip-meta')
    if (metaNode) metaNode.textContent = meta.hint
  }
}

function formatWorkspaceDisplay(state: WorkbenchState): { value: string; title: string } {
  const workspaceState = getWorkspaceContextState(state)
  if (!workspaceState.workspaceRoot) return { value: workspaceState.displayValue, title: workspaceState.title }
  const workspace = workspaceState.workspaceRoot
  return {
    value: workspaceState.displayValue.length > 44 ? `...${workspaceState.displayValue.slice(Math.max(0, workspaceState.displayValue.length - 41))}` : workspaceState.displayValue,
    title: workspaceState.title,
  }
}

function blocksSignature(content: WorkbenchState['chat'][number]['content']): string {
  return JSON.stringify(content || [])
}

function dedupeAdjacentThreadMessages(messages: WorkbenchState['chat']): WorkbenchState['chat'] {
  const deduped: WorkbenchState['chat'] = []
  for (const message of messages) {
    const previous = deduped[deduped.length - 1]
    const isAdjacentDuplicatePlan =
      previous &&
      previous.role === 'rina' &&
      message.role === 'rina' &&
      blocksSignature(previous.content) === blocksSignature(message.content)
    if (isAdjacentDuplicatePlan) {
      deduped[deduped.length - 1] = {
        ...message,
        runIds: [...new Set([...(previous.runIds || []), ...(message.runIds || [])])],
      }
      continue
    }
    deduped.push(message)
  }
  return deduped
}

function appendMarkupPair(container: HTMLElement, label: string, value: string): void {
  container.appendChild(el('span', { class: 'rw-inline-label' }, label))
  container.appendChild(el('code', undefined, value))
}

function runActionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  if (role === 'quiet') return 'rw-inline-action is-subtle'
  return 'rw-inline-action'
}

function buildInlineRunBlockNode(state: WorkbenchState, run: RunModel): HTMLElement {
  const expanded = state.ui.expandedRunOutputByRunId[run.id] ?? false
  const tail = state.runOutputTailByRunId[run.id] ?? ''
  const hasTail = tail.trim().length > 0
  const artifactSummary = state.runArtifactSummaryByRunId[run.id] || null
  const receiptId = run.latestReceiptId || run.sessionId || run.id
  const proofBadge = formatProofBadge(run)
  const exitSummary = formatExitState(run)
  const toneClass =
    run.status === 'running'
      ? 'is-running'
      : run.status === 'failed' || run.status === 'interrupted'
        ? 'is-attention'
        : isRunSuccessWithProof(run)
          ? 'is-complete'
          : 'is-verifying'
  const article = el('article', {
    class: `rw-inline-runblock ${toneClass}`,
    dataset: { runId: run.id },
  })
  const recovery = getRecoveryGuidance(run)

  const head = el('div', { class: 'rw-inline-runblock-head' })
  const left = el('div', { class: 'rw-inline-runblock-left' })
  left.appendChild(el('span', { class: `rw-status-pill rw-status-${run.status}` }, formatRunStatus(run)))
  if (run.status === 'running') left.appendChild(el('span', { class: 'rw-run-live-indicator' }, 'LIVE'))
  if (run.restored) left.appendChild(el('span', { class: 'rw-pill rw-pill-muted' }, 'RESTORED'))
  head.appendChild(left)

  const topActions = el('div', { class: 'rw-inline-runblock-actions-top' })
  if (run.status === 'interrupted') {
    topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runResume: run.id } }, recovery.resumeLabel))
  }
  topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runRerun: run.id } }, recovery.rerunLabel))
  if (run.status === 'failed' || run.status === 'interrupted') {
    topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runFix: run.id } }, 'Fix & retry'))
  }
  topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runToggleOutput: run.id } }, expanded ? 'Collapse' : 'Inspect output'))
  const overflowActions = el(
    'div',
    { class: 'rw-inline-runblock-overflow-menu' },
    el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: { runReveal: receiptId } }, 'Open receipt'),
    el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: { runFolder: '' } }, 'Open runs folder'),
    el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: { runDiff: run.id } }, 'Show diff')
  )
  const overflow = el(
    'details',
    { class: 'rw-inline-runblock-overflow' },
    el('summary', { class: 'rw-link-btn rw-inline-runblock-more', ariaLabel: 'More run actions' }, 'More'),
    overflowActions
  )
  topActions.appendChild(overflow)
  head.appendChild(topActions)
  article.appendChild(head)

  if (run.status === 'running') {
    article.appendChild(
      el('div', { class: 'rw-inline-runblock-banner' }, 'Rina is working through this now. I’ll keep this thread updated as output comes in.')
    )
  } else if (run.status === 'failed' || run.status === 'interrupted') {
    const summary = generateFailureSummary(run, tail, artifactSummary)
    article.appendChild(
      el(
        'div',
        { class: 'rw-inline-runblock-banner is-attention' },
        summary
      )
    )
  } else if (!hasRunProof(run)) {
    article.appendChild(
      el(
        'div',
        { class: 'rw-inline-runblock-banner is-verifying' },
        'The command finished, but proof is still incomplete. Treat this as verifying until the receipt and exit state agree.'
      )
    )
  }

  const meta = el('div', { class: 'rw-inline-runblock-meta' })
  meta.appendChild(el('div', { class: 'rw-inline-runblock-title' }, run.title || 'Run'))

  const runDetail = el('div', { class: 'rw-inline-runblock-detail' })
  appendMarkupPair(runDetail, 'run', run.id)
  runDetail.appendChild(el('span', { class: 'rw-proof-pill' }, proofBadge))
  runDetail.appendChild(el('span', { class: 'rw-inline-exit' }, exitSummary))
  meta.appendChild(runDetail)

  const cwdDetail = el('div', { class: 'rw-inline-runblock-detail' })
  appendMarkupPair(cwdDetail, 'cwd', run.cwd || run.projectRoot || 'No workspace path recorded')
  meta.appendChild(cwdDetail)

  const receiptDetail = el('div', { class: 'rw-inline-runblock-detail' })
  appendMarkupPair(receiptDetail, 'receipt', receiptId)
  meta.appendChild(receiptDetail)
  if (run.status === 'failed' || run.status === 'interrupted') {
    const recoveryDetail = el('div', { class: 'rw-inline-runblock-detail' })
    appendMarkupPair(recoveryDetail, 'next', recovery.bestNextActionLabel)
    meta.appendChild(recoveryDetail)
  }
  article.appendChild(meta)

  article.appendChild(el('div', { class: 'rw-inline-runblock-command' }, el('code', undefined, run.command || 'No command captured')))

  const output = el('div', { class: 'rw-inline-runblock-output' })
  if (expanded) {
    if (hasTail) output.appendChild(el('pre', { class: 'rw-inline-runblock-tail' }, tail))
    else {
      output.appendChild(
        el(
          'div',
          { class: 'rw-inline-runblock-placeholder' },
          run.status === 'running' ? 'Still waiting on the first output…' : 'There is no saved output for this run yet.'
        )
      )
    }
  } else {
    output.appendChild(
      el(
        'div',
        { class: 'rw-inline-runblock-placeholder' },
        run.status === 'running'
          ? 'Live proof is coming in. Expand this when you want to inspect it.'
          : 'Output is tucked away until you want to inspect it.'
      )
    )
  }
  article.appendChild(output)

  const bottomActions = el('div', { class: 'rw-inline-runblock-actions-bottom' })
  bottomActions.appendChild(el('button', { class: runActionClass('quiet'), dataset: { runCopy: run.id } }, 'Copy command'))
  if (run.status === 'interrupted') {
    bottomActions.appendChild(el('button', { class: runActionClass('primary'), dataset: { runResume: run.id } }, recovery.resumeLabel))
  }
  bottomActions.appendChild(el('button', { class: runActionClass(run.status === 'interrupted' ? 'secondary' : 'primary'), dataset: { runRerun: run.id } }, recovery.rerunLabel))
  if (run.status === 'failed' || run.status === 'interrupted') {
    bottomActions.appendChild(el('button', { class: runActionClass('attention'), dataset: { runFix: run.id } }, 'Fix & retry'))
  }
  bottomActions.appendChild(
    el('button', { class: runActionClass('secondary'), dataset: { runToggleOutput: run.id } }, expanded ? 'Collapse output' : 'Inspect output')
  )
  bottomActions.appendChild(el('button', { class: runActionClass('secondary'), dataset: { runReveal: receiptId } }, recovery.receiptLabel))
  bottomActions.appendChild(el('button', { class: runActionClass('secondary'), dataset: { runDiff: run.id } }, 'Show diff'))
  bottomActions.appendChild(el('button', { class: runActionClass('quiet'), dataset: { openRun: run.id } }, 'Inspect run'))
  article.appendChild(bottomActions)

  return article
}

function renderInlineRunBlocksNode(state: WorkbenchState, linkedRuns: RunModel[]): HTMLElement | null {
  if (linkedRuns.length === 0) return null
  const orderedRuns = [...linkedRuns].sort((left, right) => {
    const leftRunning = left.status === 'running' ? 0 : 1
    const rightRunning = right.status === 'running' ? 0 : 1
    if (leftRunning !== rightRunning) return leftRunning - rightRunning
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
  const root = el('div', { class: 'rw-inline-runs' })
  for (const run of orderedRuns) root.appendChild(buildInlineRunBlockNode(state, run))
  return root
}

function renderComposerStarterPrompts(): void {
  const root = document.getElementById('agent-starter-prompts')
  if (!root) return
  clear(root)
}

function renderRecoveryToggle(state: WorkbenchState): void {
  const button = document.getElementById('recovery-toggle') as HTMLButtonElement | null
  if (!button) return
  const restoredRuns = state.runs.filter((run) => run.restored)
  if (restoredRuns.length === 0) {
    button.hidden = true
    button.textContent = 'Recovered runs'
    button.title = ''
    delete button.dataset.recoveryToggle
    delete button.dataset.recoveryExpanded
    return
  }
  button.hidden = false
  button.dataset.recoveryToggle = 'topbar'
  button.dataset.recoveryExpanded = String(state.ui.recoveryExpanded)
  button.textContent = state.ui.recoveryExpanded ? 'Hide recovery' : 'Recovered session'
  button.title = state.ui.recoveryExpanded
    ? 'Collapse recovered-session details'
    : `${restoredRuns.length} restored run${restoredRuns.length === 1 ? '' : 's'} available`
}

function renderHero(state: WorkbenchState): void {
  const hero = document.querySelector<HTMLElement>('.rw-agent-hero')
  if (!hero) return
  const workspaceState = getWorkspaceContextState(state)
  const lastRun = lastRelevantRun(state)
  const restoredRuns = state.runs.filter((run) => run.restored)
  const heading =
    workspaceState.status === 'missing'
      ? 'Start by choosing the project or folder you want Rina to work in.'
      : workspaceState.status === 'weak'
        ? 'This folder may not be the project root yet.'
        : restoredRuns.length > 0
          ? 'Ready when you are. I recovered the thread of what was happening and kept the proof nearby.'
          : lastRun && isRunSuccessWithProof(lastRun)
            ? 'Ready when you are. I know the workspace, and the last verified run ended cleanly.'
            : lastRun
              ? 'Ready when you are. I know where we are, and I can pick up from the last run without pretending.'
              : 'Ready when you are. I’ve got the workspace, the receipts when we need them, and a calm way through the work.'
  const copy =
    workspaceState.status === 'missing'
      ? 'Choose a workspace first so build, test, fix, and deploy actions happen in the right place from the start.'
      : workspaceState.status === 'weak'
        ? workspaceState.reason
        : restoredRuns.length > 0
          ? `There ${restoredRuns.length === 1 ? 'is' : 'are'} ${restoredRuns.length} recovered run${restoredRuns.length === 1 ? '' : 's'} ready to inspect or resume. Pick a lane and I’ll keep it clean.`
          : lastRun
            ? `I can build, test, deploy, or inspect what just happened in ${workspaceState.displayValue}. No drama, just proof when it counts.`
            : `Tell me what to build, test, fix, or ship in ${workspaceState.displayValue}. I’ll explain the path, do the work through the trusted runner, and leave the receipts behind.`
  const actions =
    workspaceState.status === 'project'
      ? null
      : el(
          'div',
          { class: 'rw-inline-actions rw-agent-welcome-actions' },
          el('button', { class: runActionClass('primary'), dataset: { pickWorkspace: 'hero' } }, 'Choose workspace'),
          el(
            'button',
            { class: runActionClass('secondary'), dataset: { agentPrompt: 'Explain how workspaces work and how I should choose the right project folder.' } },
            'Learn how workspaces work'
          )
        )
  mount(
    hero,
    el(
      'div',
      { class: 'rw-agent-welcome-card' },
      el('div', { class: 'rw-agent-kicker' }, 'Rina is in the room'),
      el('h2', undefined, heading),
      el('p', undefined, copy),
      el(
        'div',
        { class: 'rw-agent-welcome-meta' },
        el('span', { class: 'rw-agent-welcome-pill' }, `Workspace · ${workspaceState.displayValue}`),
        el('span', { class: 'rw-agent-welcome-pill' }, `Mode · ${currentMode(state)}`),
        el(
          'span',
          { class: 'rw-agent-welcome-pill' },
          restoredRuns.length > 0
            ? `Recovery · ${restoredRuns.length} items restored`
            : lastRun
              ? `Last run · ${formatRunStatus(lastRun)}`
              : 'Last run · none yet'
        ),
        workspaceState.status === 'weak'
          ? el('span', { class: 'rw-agent-welcome-pill is-warning', title: workspaceState.reason }, 'Project root not detected')
          : null
      )
      ,
      actions
    )
  )
}

function buildSuggestedActionsNode(state: WorkbenchState): HTMLElement {
  const workspaceState = getWorkspaceContextState(state)
  return el(
    'section',
    { class: 'rw-agent-empty-card rw-agent-empty-actions', dataset: { agentSection: 'suggested-actions' } },
    el('div', { class: 'rw-agent-empty-label' }, 'Suggested actions'),
    el(
      'h3',
      { class: 'rw-agent-empty-title' },
      workspaceState.status === 'project'
        ? 'Pick a lane and I’ll keep the proof attached.'
        : 'Choose the right project folder first, then I can help with the work.'
    ),
    el(
      'p',
      { class: 'rw-agent-empty-copy' },
      workspaceState.status === 'project' ? 'Start with the obvious move, or tell me what changed and I’ll map the next safe step.' : workspaceState.reason
    ),
    workspaceState.status === 'project'
      ? null
      : el(
          'div',
          { class: 'rw-inline-actions' },
          el('button', { class: runActionClass('primary'), dataset: { pickWorkspace: 'suggested-actions' } }, 'Choose workspace'),
          el('button', { class: runActionClass('secondary'), dataset: { openSettingsTab: 'general' } }, 'Open workspace settings')
        ),
    el(
      'div',
      { class: 'rw-agent-empty-prompts' },
      renderStarterPromptChip(state, 'build', 'Build this project', 'Build this project and tell me what fails.'),
      renderStarterPromptChip(state, 'test', 'Run tests', 'Run the tests and summarize the failures.'),
      renderStarterPromptChip(state, 'deploy', 'Deploy', 'Deploy this project and tell me what you need first.'),
      renderStarterPromptChip(state, 'fix', 'Fix what’s broken', 'Figure out what is broken and fix the safest parts first.')
    )
  )
}

function buildRecentProofNode(state: WorkbenchState): HTMLElement {
  const workspaceState = getWorkspaceContextState(state)
  const run = lastRelevantRun(state)
  if (!run) {
    return el(
      'section',
      { class: 'rw-agent-empty-card rw-agent-empty-proof', dataset: { agentSection: 'recent-proof' } },
      el('div', { class: 'rw-agent-empty-label' }, 'Recent proof'),
      el(
        'h3',
        { class: 'rw-agent-empty-title' },
        workspaceState.status === 'project' ? 'No verified work yet in this workspace.' : 'No verified work yet in the selected folder.'
      ),
      el(
        'p',
        { class: 'rw-agent-empty-copy' },
        'The first real run will land here with its status, receipt trail, and the quickest way back into the inspector.'
      )
    )
  }

  const receiptId = run.latestReceiptId || run.sessionId || run.id
  const summary = isRunSuccessWithProof(run)
    ? 'The last run finished with verified proof.'
    : run.status === 'running'
      ? 'The last run is still live and the proof is still moving.'
      : run.status === 'failed' || run.status === 'interrupted'
        ? 'The last run needs attention, and the receipt trail is ready to inspect.'
        : 'The last run returned, but the proof is still settling.'

  return el(
    'section',
    { class: 'rw-agent-empty-card rw-agent-empty-proof', dataset: { agentSection: 'recent-proof' } },
    el('div', { class: 'rw-agent-empty-label' }, 'Recent proof'),
    el('h3', { class: 'rw-agent-empty-title' }, run.title || 'Latest run'),
    el('p', { class: 'rw-agent-empty-copy' }, summary),
    el(
      'div',
      { class: 'rw-agent-empty-stats' },
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Status'), el('strong', undefined, formatRunStatus(run))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Proof'), el('strong', undefined, formatProofBadge(run))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Updated'), el('strong', undefined, formatRunDate(run.updatedAt))),
      el(
        'div',
        { class: 'rw-stat-pill' },
        el('span', undefined, 'Duration'),
        el('strong', undefined, formatRunDuration(run) || formatExitState(run))
      )
    ),
    el(
      'div',
      { class: 'rw-inline-actions' },
      el('button', { class: runActionClass('primary'), dataset: { runRerun: run.id } }, 'Rerun'),
      el('button', { class: runActionClass('secondary'), dataset: { runReveal: receiptId } }, 'Receipt'),
      el('button', { class: runActionClass('quiet'), dataset: { openRun: run.id } }, 'Inspect run')
    )
  )
}

function buildWorkspaceSetupNode(state: WorkbenchState): HTMLElement | null {
  const workspaceState = getWorkspaceContextState(state)
  if (workspaceState.status === 'project') return null
  return el(
    'section',
    {
      class: `rw-agent-empty-card rw-agent-workspace-setup is-${workspaceState.status}`,
      dataset: { agentSection: 'workspace-setup' },
    },
    el('div', { class: 'rw-agent-empty-label' }, workspaceState.status === 'missing' ? 'Choose workspace' : 'Workspace check'),
    el(
      'h3',
      { class: 'rw-agent-empty-title' },
      workspaceState.status === 'missing'
        ? 'Start by choosing the project or folder you want Rina to work in.'
        : `${workspaceState.displayValue} may not be the right project folder.`
    ),
    el(
      'p',
      { class: 'rw-agent-empty-copy' },
      workspaceState.status === 'missing'
        ? 'Without a real workspace, Rina cannot safely build, test, fix, or deploy for you yet.'
        : workspaceState.reason
    ),
    el(
      'div',
      { class: 'rw-inline-actions' },
      el('button', { class: runActionClass('primary'), dataset: { pickWorkspace: 'workspace-setup' } }, 'Choose workspace'),
      el('button', { class: runActionClass('secondary'), dataset: { openSettingsTab: 'general' } }, 'Open workspace settings'),
      el(
        'button',
        { class: runActionClass('quiet'), dataset: { agentPrompt: 'Explain how workspaces work and how I should choose the right project folder.' } },
        'Learn how workspaces work'
      )
    ),
    workspaceState.rootMarkers.length > 0
      ? el('div', { class: 'rw-agent-empty-copy' }, `Detected project markers: ${workspaceState.rootMarkers.join(', ')}`)
      : null
  )
}

function generateFailureSummary(run: RunModel, tail: string, artifactSummary?: WorkbenchState['runArtifactSummaryByRunId'][string] | null): string {
  const analysis = analyzeFailure({
    command: run.command || '',
    exitCode: run.exitCode,
    outputText: tail,
    interrupted: run.status === 'interrupted',
    changedFiles: artifactSummary?.changedFiles || [],
    diffHints: artifactSummary?.diffHints || [],
    metaText: artifactSummary?.metaPreview || '',
  })
  return formatFailureNarrative(analysis)
}

function buildRecoverySummaryNode(state: WorkbenchState): HTMLElement | null {
  const restoredRuns = state.runs
    .filter((run) => run.restored)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  const latest = restoredRuns[0]
  if (!latest) return null
  const recovery = getRecoveryGuidance(latest)

  return el(
    'section',
    { class: 'rw-agent-empty-card rw-agent-empty-recovery', dataset: { agentSection: 'recovery-summary' } },
    el('div', { class: 'rw-agent-empty-label' }, 'Recovered session'),
    el('h3', { class: 'rw-agent-empty-title' }, `${restoredRuns.length} recovered item${restoredRuns.length === 1 ? '' : 's'} are ready when you are.`),
    el(
      'p',
      { class: 'rw-agent-empty-copy' },
      formatRecoveryNarrative(recovery, { prefix: 'Recovered task' })
    ),
    el(
      'div',
      { class: 'rw-agent-empty-stats' },
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Latest'), el('strong', undefined, formatRunStatus(latest))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Receipt'), el('strong', undefined, formatProofBadge(latest))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Updated'), el('strong', undefined, formatRunDate(latest.updatedAt))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Next'), el('strong', undefined, recovery.bestNextActionLabel))
    ),
    el(
      'div',
      { class: 'rw-inline-actions' },
      ...(recovery.resumeSafe ? [el('button', { class: runActionClass('primary'), dataset: { runResume: latest.id } }, recovery.resumeLabel)] : []),
      el('button', { class: runActionClass(recovery.resumeSafe ? 'secondary' : 'primary'), dataset: { runRerun: latest.id } }, recovery.rerunLabel),
      el('button', { class: runActionClass('secondary'), dataset: { runReveal: latest.latestReceiptId || latest.id } }, recovery.receiptLabel),
      el('button', { class: runActionClass('quiet'), dataset: { tab: 'runs' } }, 'Open Runs'),
      el('button', { class: runActionClass('quiet'), dataset: { openRun: latest.id } }, 'Inspect run')
    )
  )
}

function buildEmptyStateNode(state: WorkbenchState): HTMLElement {
  const workspaceSetup = buildWorkspaceSetupNode(state)
  const recovery = buildRecoverySummaryNode(state)
  const sideColumn = el('div', { class: 'rw-agent-empty-column rw-agent-empty-column-side' }, buildRecentProofNode(state))
  if (recovery) sideColumn.appendChild(recovery)
  const mainColumn = el('div', { class: 'rw-agent-empty-column rw-agent-empty-column-main' })
  if (workspaceSetup) mainColumn.appendChild(workspaceSetup)
  mainColumn.appendChild(buildSuggestedActionsNode(state))
  return el(
    'section',
    { class: 'rw-agent-empty-state-shell', dataset: { agentSection: 'empty-state' } },
    mainColumn,
    sideColumn
  )
}

export function renderAgent(state: WorkbenchState): void {
  const recoveryRoot = document.getElementById('agent-recovery')
  const root = document.getElementById('agent-output')
  if (!root) return
  const agentBody = document.querySelector<HTMLElement>('.rw-agent-body')
  const visibleMessages = state.chat.filter((message) => message.workspaceKey === state.workspaceKey).slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const hasConversation = threadMessages.length > 0 || recoveryMessages.length > 0 || state.fixBlocks.length > 0
  const shouldCompactRecovery = recoveryMessages.length > 0 && threadMessages.length > 0 && !state.ui.recoveryExpanded

  if (recoveryRoot) {
    clear(recoveryRoot)
    if (recoveryMessages.length > 0) {
      const restoredRuns = state.runs
        .filter((run) => run.restored)
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      const latestRun = restoredRuns[0]
      const latestRecovery = latestRun ? getRecoveryGuidance(latestRun) : null
      const recoveryShell = document.createDocumentFragment()

      const summaryCard = el(
        'section',
        {
          class: ['rw-recovery-strip', shouldCompactRecovery ? 'is-collapsed' : ''].filter(Boolean).join(' '),
          dataset: { recoveryExpanded: String(state.ui.recoveryExpanded) },
        },
        el(
          'div',
          { class: 'rw-recovery-strip-head' },
          el('div', { class: 'rw-recovery-strip-title' }, 'I recovered your last session safely'),
          el('div', { class: 'rw-recovery-strip-badge' }, `${restoredRuns.length} items restored`)
        ),
        el(
          'p',
          { class: 'rw-recovery-strip-copy' },
          latestRun
            ? latestRecovery
              ? `Receipts are intact. ${formatRecoveryNarrative(latestRecovery, { prefix: 'Recovered task' })}`
              : `Receipts are intact. ${latestRun.command || latestRun.title || 'Recovered session activity'}.`
            : 'Receipts are intact and the restored runs are ready when you want them.'
        ),
        el(
          'div',
          { class: 'rw-inline-actions rw-inline-actions-recovery' },
          ...(latestRun && latestRecovery?.resumeSafe
            ? [el('button', { class: runActionClass('primary'), dataset: { runResume: latestRun.id } }, latestRecovery.resumeLabel)]
            : []),
          ...(latestRun
            ? [
                el(
                  'button',
                  { class: runActionClass(latestRecovery?.resumeSafe ? 'secondary' : 'primary'), dataset: { runRerun: latestRun.id } },
                  latestRecovery?.rerunLabel || 'Rerun task'
                ),
              ]
            : []),
          ...(latestRun
            ? [
                el(
                  'button',
                  { class: runActionClass('secondary'), dataset: { runReveal: latestRun.latestReceiptId || latestRun.id } },
                  latestRecovery?.receiptLabel || 'Open receipt'
                ),
              ]
            : []),
          el(
            'button',
            {
              class: runActionClass('quiet'),
              dataset: { recoveryToggle: state.ui.recoveryExpanded ? 'collapse' : 'expand' },
            },
            state.ui.recoveryExpanded ? 'Hide details' : 'Show details'
          ),
          el('button', { class: runActionClass('quiet'), dataset: { tab: 'runs' } }, 'Open Runs')
        )
      )
      recoveryShell.appendChild(summaryCard)

      if (!shouldCompactRecovery) {
        for (const message of recoveryMessages) {
          const linkedRuns = state.runs.filter((run) => run.originMessageId === message.id || (message.runIds || []).includes(run.id))
          const unresolvedRunIds = (message.runIds || []).filter((runId) => !linkedRuns.some((run) => run.id === runId))
          const node = el('div', {
            class: ['rw-thread-message', message.role, 'is-recovery-message'].filter(Boolean).join(' '),
            dataset: { msgId: message.id },
          })
          appendMessageContent(node, message)
          const linkedRunsNode = renderLinkedRunsNode(state, message.id, linkedRuns, unresolvedRunIds)
          if (linkedRunsNode) node.appendChild(linkedRunsNode)
          recoveryShell.appendChild(node)
        }
      }
      mount(recoveryRoot, recoveryShell)
    }
  }
  renderRecoveryToggle(state)
  renderHero(state)

  const shell = document.createDocumentFragment()
  const workspaceSetup = buildWorkspaceSetupNode(state)

  const hasThreadContent = threadMessages.length > 0
  if (!hasThreadContent) {
    shell.appendChild(buildEmptyStateNode(state))
  }
  if (hasThreadContent && workspaceSetup) shell.appendChild(workspaceSetup)
  if (hasThreadContent) {
    for (const message of dedupeAdjacentThreadMessages(threadMessages)) {
      const isRecoveryMessage = message.id.startsWith('system:runs:restore:')
      const linkedRuns = state.runs.filter((run) => run.originMessageId === message.id || (message.runIds || []).includes(run.id))
      const unresolvedRunIds = (message.runIds || []).filter((runId) => !linkedRuns.some((run) => run.id === runId))
      const hasRunningRun = linkedRuns.some((run) => run.status === 'running')
      const node = el('div', {
        class: [
          'rw-thread-message',
          message.role,
          linkedRuns.length > 0 && message.role === 'rina' ? 'has-inline-runs' : '',
          hasRunningRun ? 'has-live-inline-run' : '',
        ]
          .filter(Boolean)
          .join(' '),
        dataset: { msgId: message.id },
      })
      appendMessageContent(node, message)
      if (message.role === 'rina' && linkedRuns.length > 0 && !isRecoveryMessage) {
        const inlineRuns = renderInlineRunBlocksNode(state, linkedRuns)
        if (inlineRuns) node.appendChild(inlineRuns)
      }
      if (message.role === 'rina' && !isRecoveryMessage) {
        const linkedRunsNode = renderLinkedRunsNode(state, message.id, linkedRuns, unresolvedRunIds)
        if (linkedRunsNode) node.appendChild(linkedRunsNode)
      }
      shell.appendChild(node)
    }
  }

  mount(root, shell)
  root.classList.toggle('is-empty-thread', !hasThreadContent)
  agentBody?.classList.toggle('is-empty', !hasThreadContent)
  agentBody?.classList.toggle('has-thread-content', hasThreadContent)
  agentBody?.classList.toggle('has-recovery-strip', recoveryMessages.length > 0)
  root.scrollTop = hasThreadContent ? root.scrollHeight : 0
  renderComposerStarterPrompts()
  syncStarterPromptChips(state)
}
