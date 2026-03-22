import type { RunModel, WorkbenchState } from '../store.js'
import { clear, el, mount } from '../dom.js'
import { formatExitState, formatProofBadge, formatRunDate, formatRunDuration, formatRunStatus } from './format.js'
import { renderLinkedRunsNode } from './linkedRuns.js'
import { currentMode, currentWorkspaceRoot, ipcCanonicalReady, rendererCanonicalReady } from './runtime.js'
import { lastRelevantRun } from './selectors.js'
import { appendMessageContent } from './messageBlocks.js'
import { hasRunProof, isRunSuccessWithProof } from '../proof.js'

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
  const workspace = currentWorkspaceRoot(state)
  if (workspace === '__none__') return { value: 'unknown', title: 'unknown' }
  return {
    value: workspace.length > 44 ? `...${workspace.slice(Math.max(0, workspace.length - 41))}` : workspace,
    title: workspace,
  }
}

function appendMarkupPair(container: HTMLElement, label: string, value: string): void {
  container.appendChild(el('span', { class: 'rw-inline-label' }, label))
  container.appendChild(el('code', undefined, value))
}

function buildInlineRunBlockNode(state: WorkbenchState, run: RunModel): HTMLElement {
  const expanded = state.ui.expandedRunOutputByRunId[run.id] ?? false
  const tail = state.runOutputTailByRunId[run.id] ?? ''
  const hasTail = tail.trim().length > 0
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

  const head = el('div', { class: 'rw-inline-runblock-head' })
  const left = el('div', { class: 'rw-inline-runblock-left' })
  left.appendChild(el('span', { class: `rw-status-pill rw-status-${run.status}` }, formatRunStatus(run)))
  if (run.status === 'running') left.appendChild(el('span', { class: 'rw-run-live-indicator' }, 'LIVE'))
  if (run.restored) left.appendChild(el('span', { class: 'rw-pill rw-pill-muted' }, 'RESTORED'))
  head.appendChild(left)

  const topActions = el('div', { class: 'rw-inline-runblock-actions-top' })
  topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runCopy: run.id } }, 'Copy'))
  topActions.appendChild(el('button', { class: 'rw-link-btn', dataset: { runRerun: run.id } }, 'Rerun'))
  const overflowActions = el(
    'div',
    { class: 'rw-inline-runblock-overflow-menu' },
    el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: { runReveal: receiptId } }, 'Reveal receipt'),
    el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: { runFolder: '' } }, 'Open runs folder')
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
    article.appendChild(
      el(
        'div',
        { class: 'rw-inline-runblock-banner is-attention' },
        run.status === 'interrupted'
          ? 'This stopped before completion. Treat the receipt as partial proof and decide whether to resume or rerun.'
          : 'This failed. Use the receipt and output below to inspect what broke before trying again.'
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
  bottomActions.appendChild(
    el('button', { class: 'rw-inline-action', dataset: { runToggleOutput: run.id } }, expanded ? 'Collapse output' : 'Expand output')
  )
  bottomActions.appendChild(el('button', { class: 'rw-inline-action', dataset: { runReveal: receiptId } }, 'Receipt'))
  bottomActions.appendChild(el('button', { class: 'rw-inline-action', dataset: { openRun: run.id } }, 'Inspect run'))
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

function renderTruthHudNode(state: WorkbenchState): HTMLElement {
  const lastRun = lastRelevantRun(state)
  const restoredRuns = state.runs.filter((run) => run.restored)
  const lastRunDisplay = lastRun ? `${formatRunStatus(lastRun)} · ${formatExitState(lastRun)}` : 'No proof yet'
  const mode = currentMode(state)
  const ipcLabel = ipcCanonicalReady(state) ? 'consolidated' : 'unknown'
  const rendererLabel = rendererCanonicalReady(state) ? 'canonical' : 'unknown'
  const workspace = formatWorkspaceDisplay(state)
  const root = el('div', { class: 'rw-truth-hud' })
  const chip = (label: string, value: string, title?: string, className = 'rw-truth-chip') =>
    el('div', title ? { class: className, title } : { class: className }, el('span', undefined, label), el('code', undefined, value))
  const product = el('div', { class: 'rw-truth-group rw-truth-group-product' })
  product.appendChild(chip('Workspace', workspace.value, workspace.title, 'rw-truth-chip rw-truth-chip-workspace'))
  product.appendChild(chip('Mode', mode))
  product.appendChild(chip('Last run', lastRunDisplay, lastRun ? lastRun.id : 'No run recorded yet'))
  product.appendChild(chip('Recovery', restoredRuns.length > 0 ? `${restoredRuns.length} ready` : 'clear'))
  const dev = el('div', { class: 'rw-truth-group rw-truth-group-dev' })
  dev.appendChild(el('span', { class: 'rw-truth-group-label' }, 'Dev'))
  dev.appendChild(chip('IPC', ipcLabel, undefined, 'rw-truth-chip rw-truth-chip-dev'))
  dev.appendChild(chip('Renderer', rendererLabel, undefined, 'rw-truth-chip rw-truth-chip-dev'))
  root.appendChild(product)
  root.appendChild(dev)
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
    return
  }
  button.hidden = false
  button.textContent = `Recovered ${restoredRuns.length}`
  button.title = `${restoredRuns.length} restored run${restoredRuns.length === 1 ? '' : 's'} available in Runs`
}

function renderHero(state: WorkbenchState): void {
  const hero = document.querySelector<HTMLElement>('.rw-agent-hero')
  if (!hero) return
  const workspace = formatWorkspaceDisplay(state)
  const lastRun = lastRelevantRun(state)
  const restoredRuns = state.runs.filter((run) => run.restored)
  const heading =
    restoredRuns.length > 0
      ? 'Ready when you are. I recovered the thread of what was happening and kept the proof nearby.'
      : lastRun && isRunSuccessWithProof(lastRun)
        ? 'Ready when you are. I know the workspace, and the last verified run ended cleanly.'
        : lastRun
          ? 'Ready when you are. I know where we are, and I can pick up from the last run without pretending.'
          : 'Ready when you are. I’ve got the workspace, the receipts when we need them, and a calm way through the work.'
  const copy =
    restoredRuns.length > 0
      ? `There ${restoredRuns.length === 1 ? 'is' : 'are'} ${restoredRuns.length} recovered run${restoredRuns.length === 1 ? '' : 's'} ready to inspect or resume. Pick a lane and I’ll keep it clean.`
      : lastRun
        ? `I can build, test, deploy, or inspect what just happened in ${workspace.value}. No drama, just proof when it counts.`
        : `Tell me what to build, test, fix, or ship in ${workspace.value}. I’ll explain the path, do the work through the trusted runner, and leave the receipts behind.`
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
        el('span', { class: 'rw-agent-welcome-pill' }, `Workspace · ${workspace.value}`),
        el('span', { class: 'rw-agent-welcome-pill' }, `Mode · ${currentMode(state)}`),
        el(
          'span',
          { class: 'rw-agent-welcome-pill' },
          restoredRuns.length > 0
            ? `Recovery · ${restoredRuns.length} ready`
            : lastRun
              ? `Last run · ${formatRunStatus(lastRun)}`
              : 'Last run · none yet'
        )
      )
    )
  )
}

function buildSuggestedActionsNode(state: WorkbenchState): HTMLElement {
  return el(
    'section',
    { class: 'rw-agent-empty-card rw-agent-empty-actions', dataset: { agentSection: 'suggested-actions' } },
    el('div', { class: 'rw-agent-empty-label' }, 'Suggested actions'),
    el('h3', { class: 'rw-agent-empty-title' }, 'Pick a lane and I’ll keep the proof attached.'),
    el('p', { class: 'rw-agent-empty-copy' }, 'Start with the obvious move, or tell me what changed and I’ll map the next safe step.'),
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
  const run = lastRelevantRun(state)
  if (!run) {
    return el(
      'section',
      { class: 'rw-agent-empty-card rw-agent-empty-proof', dataset: { agentSection: 'recent-proof' } },
      el('div', { class: 'rw-agent-empty-label' }, 'Recent proof'),
      el('h3', { class: 'rw-agent-empty-title' }, 'No verified work yet in this workspace.'),
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
      el('button', { class: 'rw-inline-action', dataset: { openRun: run.id } }, 'Inspect run'),
      el('button', { class: 'rw-inline-action', dataset: { runReveal: receiptId } }, 'Receipt'),
      el('button', { class: 'rw-inline-action', dataset: { runRerun: run.id } }, 'Rerun')
    )
  )
}

function buildRecoverySummaryNode(state: WorkbenchState): HTMLElement | null {
  const restoredRuns = state.runs
    .filter((run) => run.restored)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  const latest = restoredRuns[0]
  if (!latest) return null

  return el(
    'section',
    { class: 'rw-agent-empty-card rw-agent-empty-recovery', dataset: { agentSection: 'recovery-summary' } },
    el('div', { class: 'rw-agent-empty-label' }, 'Recovery ready'),
    el('h3', { class: 'rw-agent-empty-title' }, `${restoredRuns.length} restored run${restoredRuns.length === 1 ? '' : 's'} waiting for a call.`),
    el(
      'p',
      { class: 'rw-agent-empty-copy' },
      `Latest interrupted task: ${latest.command || latest.title || 'Unknown command'}. I kept the receipt trail so we can resume cleanly instead of guessing.`
    ),
    el(
      'div',
      { class: 'rw-agent-empty-stats' },
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Latest'), el('strong', undefined, formatRunStatus(latest))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Receipt'), el('strong', undefined, formatProofBadge(latest))),
      el('div', { class: 'rw-stat-pill' }, el('span', undefined, 'Updated'), el('strong', undefined, formatRunDate(latest.updatedAt)))
    ),
    el(
      'div',
      { class: 'rw-inline-actions' },
      el('button', { class: 'rw-inline-action', dataset: { runResume: latest.id } }, 'Resume recovery'),
      el('button', { class: 'rw-inline-action', dataset: { openRun: latest.id } }, 'Inspect run'),
      el('button', { class: 'rw-inline-action', dataset: { tab: 'runs' } }, 'Open Runs')
    )
  )
}

function buildEmptyStateNode(state: WorkbenchState): HTMLElement {
  const recovery = buildRecoverySummaryNode(state)
  const sideColumn = el('div', { class: 'rw-agent-empty-column rw-agent-empty-column-side' }, buildRecentProofNode(state))
  if (recovery) sideColumn.appendChild(recovery)
  return el(
    'section',
    { class: 'rw-agent-empty-state-shell', dataset: { agentSection: 'empty-state' } },
    el('div', { class: 'rw-agent-empty-column rw-agent-empty-column-main' }, buildSuggestedActionsNode(state)),
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

  if (recoveryRoot) {
    clear(recoveryRoot)
    if (recoveryMessages.length > 0) {
      const recoveryShell = document.createDocumentFragment()
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
      mount(recoveryRoot, recoveryShell)
    }
  }
  renderRecoveryToggle(state)
  renderHero(state)

  const shell = document.createDocumentFragment()
  shell.appendChild(renderTruthHudNode(state))

  const hasThreadContent = threadMessages.length > 0
  if (!hasThreadContent) {
    shell.appendChild(buildEmptyStateNode(state))
  }
  if (hasThreadContent) {
    for (const message of threadMessages) {
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
  root.scrollTop = hasThreadContent ? root.scrollHeight : 0
  renderComposerStarterPrompts()
  syncStarterPromptChips(state)
}
