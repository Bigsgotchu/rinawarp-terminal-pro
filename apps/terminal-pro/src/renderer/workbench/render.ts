import type { FixBlockModel, MessageBlock, RunModel, TabKey, WorkbenchState } from './store.js'
import { clear, el, mount, mountMarkup, appendMarkup, markupFragment } from './dom.js'
import { formatRunStatusForDisplay, hasRunProof, isRunSuccessWithProof } from './proof.js'
import {
  escapeHtml,
  formatAnalyticsDate,
  formatExitState,
  formatInspectorRunStatus,
  formatProofBadge,
  formatRunDate,
  formatRunDuration,
  formatRunStatus,
} from './renderers/format.js'
import { renderLinkedRuns } from './renderers/linkedRuns.js'
import { currentMode, currentWorkspaceRoot, ipcCanonicalReady, rendererCanonicalReady } from './renderers/runtime.js'
import { getRunsView, lastRelevantRun, matchesWorkspace } from './renderers/selectors.js'
import { renderExecutionTrace } from './renderers/executionTrace.js'

function renderTabs(state: WorkbenchState): void {
  const drawerOpen = state.activeTab === 'agent' && Boolean(state.ui.openDrawer)
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-tab]'))
  for (const button of buttons) {
    const tab = button.dataset.tab
    const active = tab === state.activeTab || (tab !== 'agent' && tab !== 'settings' && tab === state.ui.openDrawer)
    button.classList.toggle('active', active)
    if (button.classList.contains('rw-workbench-tab')) {
      button.setAttribute('aria-selected', String(active))
    }
  }

  const activityButtons = Array.from(document.querySelectorAll<HTMLElement>('.rw-activitybtn[data-tab]'))
  for (const button of activityButtons) {
    const active = button.dataset.tab === state.activeTab
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  const workbench = document.querySelector<HTMLElement>('.rw-workbench')
  if (workbench) {
    const agentFocused = state.activeTab === 'agent'
    workbench.classList.toggle('agent-focused', agentFocused)
    workbench.classList.toggle('drawer-open', drawerOpen)
    if (state.ui.openDrawer) workbench.dataset.drawer = state.ui.openDrawer
    else delete workbench.dataset.drawer
  }

  const app = document.getElementById('rw-app')
  if (app) {
    app.classList.toggle('drawer-open', drawerOpen)
    if (state.ui.openDrawer) app.dataset.drawer = state.ui.openDrawer
    else delete app.dataset.drawer
  }

  const centerViews: Array<TabKey> = ['execution-trace', 'runs', 'marketplace', 'code', 'brain', 'settings']
  const rightViews: Array<TabKey> = ['agent', 'diagnostics']

  for (const name of centerViews) {
    const active = name === 'settings' ? state.activeTab === 'settings' : state.ui.openDrawer === name
    document.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }

  for (const name of rightViews) {
    const active = name === 'agent' ? state.activeTab === 'agent' : state.ui.openDrawer === 'diagnostics'
    document.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }
}

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
): string {
  const meta = getStarterIntentTierMeta(state, intent)
  return `<button class="rw-prompt-chip" type="button" aria-label="${escapeHtml(label)}" data-agent-prompt="${escapeHtml(
    prompt
  )}" data-intent-key="${escapeHtml(intent)}" data-tier-hint="${escapeHtml(meta.hint)}" data-tier-tone="${escapeHtml(meta.tone)}"><span class="rw-prompt-chip-label">${escapeHtml(
    label
  )}</span><span class="rw-prompt-chip-meta">${escapeHtml(meta.hint)}</span></button>`
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
    run.status === 'running' ? 'is-running' : run.status === 'failed' || run.status === 'interrupted' ? 'is-attention' : 'is-complete'
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
  const lastRunDisplay = lastRun ? `${lastRun.id} ${formatExitState(lastRun)}` : 'none'
  const mode = currentMode(state)
  const workspace = currentWorkspaceRoot(state)
  const ipcLabel = ipcCanonicalReady(state) ? 'consolidated' : 'unknown'
  const rendererLabel = rendererCanonicalReady(state) ? 'canonical' : 'unknown'
  const workspaceDisplay =
    workspace === '__none__'
      ? 'unknown'
      : workspace.length > 44
        ? `...${workspace.slice(Math.max(0, workspace.length - 41))}`
        : workspace
  const root = el('div', { class: 'rw-truth-hud' })
  const chip = (label: string, value: string, title?: string, className = 'rw-truth-chip') =>
    el('div', title ? { class: className, title } : { class: className }, el('span', undefined, label), el('code', undefined, value))
  root.appendChild(chip('Workspace', workspaceDisplay, workspace === '__none__' ? 'unknown' : workspace, 'rw-truth-chip rw-truth-chip-workspace'))
  root.appendChild(chip('Mode', mode))
  root.appendChild(chip('Last run', lastRunDisplay))
  root.appendChild(chip('IPC', ipcLabel))
  root.appendChild(chip('Renderer', rendererLabel))
  return root
}

function renderComposerStarterPrompts(state: WorkbenchState): void {
  const root = document.getElementById('agent-starter-prompts')
  if (!root) return
  mountMarkup(
    root,
    [
      renderStarterPromptChip(state, 'build', 'Build this project', 'Build this project and tell me what fails.'),
      renderStarterPromptChip(state, 'test', 'Run tests', 'Run the tests and summarize the failures.'),
      renderStarterPromptChip(state, 'deploy', 'Deploy', 'Deploy this project and tell me what you need first.'),
      renderStarterPromptChip(state, 'fix', 'Fix what’s broken', 'Figure out what is broken and fix the safest parts first.'),
    ].join('')
  )
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

function buildMessageBlockNode(block: MessageBlock): HTMLElement | DocumentFragment {
  if (block.type === 'bubble') {
    return el('div', { class: 'rw-message-bubble' }, block.text)
  }
  if (block.type === 'agent-step') {
    return el('div', { class: `agent-step ${block.statusClass}` }, block.text)
  }
  if (block.type === 'reply-card') {
    const persistentCardClasses = ['rw-command-result-card', 'rw-recovery-card', 'halted']
    const blockClasses = (block.className || '').split(/\s+/).filter(Boolean)
    const useCardShell = blockClasses.some((name) => persistentCardClasses.includes(name))
    const container = el('div', {
      class: [useCardShell ? 'rw-reply-card' : 'rw-message-section', block.className || ''].filter(Boolean).join(' '),
    })
    const head = el(
      'div',
      { class: useCardShell ? 'rw-reply-card-head' : 'rw-message-section-head' },
      el('div', { class: useCardShell ? 'rw-reply-card-label' : 'rw-message-section-label' }, block.label)
    )
    if (block.badge) {
      head.appendChild(el('div', { class: useCardShell ? 'rw-reply-card-badge' : 'rw-message-section-badge' }, block.badge))
    }
    container.appendChild(head)
    appendMarkup(container, block.bodyHtml)
    return container
  }
  return markupFragment(block.html)
}

function appendMessageContent(node: HTMLElement, message: WorkbenchState['chat'][number]): void {
  if (Array.isArray(message.content) && message.content.length > 0) {
    for (const block of message.content) {
      node.appendChild(buildMessageBlockNode(block))
    }
    return
  }
  if (message.html) {
    appendMarkup(node, message.html)
  }
}

function renderAgent(state: WorkbenchState): void {
  const recoveryRoot = document.getElementById('agent-recovery')
  const root = document.getElementById('agent-output')
  if (!root) return
  const agentBody = document.querySelector<HTMLElement>('.rw-agent-body')
  const visibleMessages = state.chat
    .filter((message) => message.workspaceKey === state.workspaceKey)
    .slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const hasConversation = threadMessages.length > 0 || recoveryMessages.length > 0 || state.fixBlocks.length > 0

  if (recoveryRoot) {
    clear(recoveryRoot)
  }
  renderRecoveryToggle(state)

  const shell = document.createDocumentFragment()
  shell.appendChild(renderTruthHudNode(state))

  const hasThreadContent = threadMessages.length > 0
  if (hasThreadContent) {
    for (const message of threadMessages) {
      const isRecoveryMessage = message.id.startsWith('system:runs:restore:')
      const linkedRuns = state.runs.filter(
        (run) => run.originMessageId === message.id || (message.runIds || []).includes(run.id)
      )
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
        appendMarkup(node, renderLinkedRuns(state, message.id, linkedRuns, unresolvedRunIds))
      }
      shell.appendChild(node)
    }
  }

  mount(root, shell)
  root.classList.toggle('is-empty-thread', !hasThreadContent)
  agentBody?.classList.toggle('is-empty', !hasThreadContent)
  agentBody?.classList.toggle('has-thread-content', hasConversation)
  root.scrollTop = hasThreadContent ? root.scrollHeight : 0
  renderComposerStarterPrompts(state)
  syncStarterPromptChips(state)
}

function renderRiskBadge(step: FixBlockModel['steps'][number]): string {
  return `<span class="fix-badge ${escapeHtml(step.risk === 'dangerous' ? 'danger' : step.risk === 'moderate' ? 'caution' : 'safe')}">${escapeHtml(step.risk)}</span>`
}

function renderFixBlock(fix: FixBlockModel): string {
  const steps = fix.steps
    .map(
      (step, index) => `
        <div class="fix-step">
          <div class="fix-step-head">
            <div class="fix-step-title">${escapeHtml(step.title || `Step ${index + 1}`)}</div>
            ${renderRiskBadge(step)}
          </div>
          <div class="fix-step-command"><code>${escapeHtml(step.command)}</code></div>
          <div class="fix-block-row">
            <button class="fix-btn" data-run-step="${index}" data-fix-id="${escapeHtml(fix.id)}">Run step</button>
          </div>
        </div>
      `
    )
    .join('')

  return `
    <section class="fix-block" data-fix-id="${escapeHtml(fix.id)}">
      <div class="fix-block-head">
        <div class="fix-block-title">Fix Block</div>
        <div class="fix-badge ${escapeHtml(fix.status === 'error' ? 'danger' : fix.status === 'planning' ? 'caution' : 'safe')}">${escapeHtml(
          fix.status.toUpperCase()
        )}</div>
      </div>
      <div class="fix-body">
        <div>
          <div class="fix-label">What broke</div>
          <div class="fix-copy">${escapeHtml(fix.whatBroke)}</div>
        </div>
        <div>
          <div class="fix-label">Why this is safe</div>
          <div class="fix-copy">${escapeHtml(fix.whySafe)}</div>
        </div>
        <div class="fix-meta">
          <div><strong>Command:</strong> <code>${escapeHtml(fix.command)}</code></div>
          <div><strong>cwd:</strong> <code>${escapeHtml(fix.cwd)}</code></div>
          <div><strong>Receipt:</strong> <code>${escapeHtml(fix.runId || fix.streamId)}</code></div>
          ${fix.applyRunId ? `<div><strong>Apply run:</strong> <code>${escapeHtml(fix.applyRunId)}</code></div>` : ''}
        </div>
        <div>
          <div class="fix-label">Suggested actions</div>
          ${steps || '<div class="fix-status-note">Planning runnable actions…</div>'}
        </div>
        <div class="fix-block-footer">
          <button class="fix-btn primary fix-auto-apply" data-fix-id="${escapeHtml(fix.id)}" ${fix.steps.length ? '' : 'disabled'}>Auto-apply safe fix (Pro)</button>
          <button class="fix-btn" data-fix-reveal data-fix-id="${escapeHtml(fix.id)}">Reveal receipt</button>
          <button class="fix-btn" data-fix-folder>Open runs folder</button>
          <button class="fix-btn" data-fix-proof data-fix-id="${escapeHtml(fix.id)}">Export proof</button>
          <button class="fix-btn" data-fix-receipt data-fix-id="${escapeHtml(fix.id)}">Copy receipt ID</button>
        </div>
        ${fix.status === 'running' ? '<div class="fix-status-note">Execution started. Wait for the run proof before treating this fix as done.</div>' : ''}
        ${fix.error ? `<div class="fix-result-note error">${escapeHtml(fix.error)}</div>` : ''}
      </div>
    </section>
  `
}

function renderFixBlocks(state: WorkbenchState): void {
  const root = document.getElementById('agent-plan-container')
  if (!root) return
  mountMarkup(root, state.fixBlocks.slice(0, 10).map(renderFixBlock).join(''))
}

function renderRuns(state: WorkbenchState): void {
  const root = document.getElementById('runs-output')
  if (!root) return

  if (state.runs.length === 0) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">No runs yet</div>
        <div class="rw-empty-copy">Run a command and its session receipts will appear here.</div>
      </div>
    `)
    return
  }

  const { visibleRuns, hiddenWorkspaceCount, hiddenNoiseCount, hiddenOverflowCount } = getRunsView(state)
  const toolbar = `
    <div class="rw-runs-toolbar">
      <button class="rw-link-btn" type="button" data-toggle-runs-scope>
        ${state.ui.scopeRunsToWorkspace ? 'Current workspace only' : 'All workspaces'}
      </button>
      <button class="rw-link-btn" type="button" data-toggle-runs-visibility>
        ${state.ui.showAllRuns ? 'Show only meaningful runs' : 'Show all run activity'}
      </button>
    </div>
  `

  const summary =
    hiddenNoiseCount || hiddenWorkspaceCount || hiddenOverflowCount
      ? `
        <div class="rw-runs-summary">
          ${toolbar}
          <div class="rw-runs-summary-copy">Showing ${visibleRuns.length} run${visibleRuns.length === 1 ? '' : 's'} for ${
            state.ui.scopeRunsToWorkspace ? 'this workspace' : 'all workspaces'
          }.</div>
          ${
            hiddenWorkspaceCount
              ? `<div class="rw-runs-summary-copy">Hidden ${hiddenWorkspaceCount} run${hiddenWorkspaceCount === 1 ? '' : 's'} from other workspaces.</div>`
              : ''
          }
          ${
            hiddenNoiseCount
              ? `<div class="rw-runs-summary-copy">Hidden ${hiddenNoiseCount} session activity item${hiddenNoiseCount === 1 ? '' : 's'} with 0 commands.</div>`
              : ''
          }
          ${
            hiddenOverflowCount > 0
              ? `<div class="rw-runs-summary-copy">Hidden ${hiddenOverflowCount} older run${hiddenOverflowCount === 1 ? '' : 's'} from the current view.</div>`
              : ''
          }
        </div>
      `
      : toolbar

  if (visibleRuns.length === 0) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">No meaningful runs to inspect</div>
        <div class="rw-empty-copy">Rina’s run history is quiet for ${state.ui.scopeRunsToWorkspace ? 'this workspace' : 'the current view'} right now.</div>
        ${summary}
      </div>
    `)
    return
  }

  clear(root)
  appendMarkup(root, summary)
  const list = el('div', { class: 'rw-runs-list' })
  for (const run of visibleRuns) list.appendChild(buildRunBlockNode(state, run))
  root.appendChild(list)
}

function buildRunSection(summary: string, body: HTMLElement, open = false): HTMLElement {
  const details = el('details', { class: 'rw-run-section' })
  if (open) details.open = true
  details.appendChild(el('summary', undefined, summary))
  details.appendChild(body)
  return details
}

function buildRunBlockNode(state: WorkbenchState, run: RunModel): HTMLElement {
  const statusLabel = formatInspectorRunStatus(run)
  const locationLabel = run.cwd || run.projectRoot || 'No workspace path recorded'
  const commandLabel = run.command || 'No command captured'
  const receiptLabel = run.latestReceiptId || run.sessionId
  const hasCommand = Boolean(run.command)
  const isInterrupted = run.status === 'interrupted'
  const outputTail = state.runOutputTailByRunId[run.id]?.trim() || ''
  const durationLabel = formatRunDuration(run)
  const successProof = isRunSuccessWithProof(run)
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
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runCopy: run.id }, disabled: !hasCommand, title: 'Copy command' }, 'Copy'))
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { openRun: run.id }, title: 'Inspect run' }, 'Inspect'))
  actions.appendChild(
    el(
      'button',
      { class: 'rw-link-btn rw-run-action', dataset: { runRerun: run.id }, disabled: !hasCommand, title: isInterrupted ? 'Rerun interrupted' : 'Rerun' },
      'Rerun'
    )
  )
  actions.appendChild(el('button', { class: 'rw-link-btn rw-run-action', dataset: { runReveal: receiptLabel }, title: 'Reveal receipt' }, 'Receipt'))
  row.appendChild(actions)
  article.appendChild(row)

  if (isInterrupted) {
    article.appendChild(el('div', { class: 'rw-run-alert' }, 'Interrupted during the last session. Review the proof sections below or ask Rina to resume.'))
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
  sections.appendChild(buildRunSection('Artifacts', artifacts))

  const timings = el('div', { class: 'rw-run-section-body rw-run-section-grid' })
  timings.appendChild(artifactRow('Started', formatRunDate(run.startedAt)))
  timings.appendChild(artifactRow('Updated', formatRunDate(run.updatedAt)))
  timings.appendChild(artifactRow('Ended', run.endedAt ? formatRunDate(run.endedAt) : 'not finished'))
  timings.appendChild(artifactRow('Duration', durationLabel || 'unknown'))
  sections.appendChild(buildRunSection('Timings', timings))

  const actionBody = el('div', { class: 'rw-run-section-body rw-run-section-actions' })
  if (isInterrupted) {
    actionBody.appendChild(el('button', { class: 'rw-inline-action', dataset: { runResume: run.id } }, 'Ask Rina to resume'))
  }
  actionBody.appendChild(el('button', { class: 'rw-inline-action', dataset: { runFolder: '' } }, 'Open runs folder'))
  sections.appendChild(buildRunSection('Actions', actionBody))

  article.appendChild(sections)
  return article
}

function renderMarketplace(state: WorkbenchState): void {
  const root = document.getElementById('marketplace-output')
  if (!root) return

  if (state.marketplace.loading && state.marketplace.agents.length === 0) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">Loading marketplace</div>
        <div class="rw-empty-copy">Fetching available agents and lock states…</div>
      </div>
    `)
    return
  }

  if (state.marketplace.error) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">Marketplace unavailable</div>
        <div class="rw-empty-copy">${escapeHtml(state.marketplace.error)}</div>
      </div>
    `)
    return
  }

  if (state.marketplace.agents.length === 0) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">No agents published yet</div>
        <div class="rw-empty-copy">Publish or sync marketplace agents to see them here.</div>
      </div>
    `)
    return
  }

  const isStarter = state.license.tier === 'starter'
  const agents = state.marketplace.agents
  const installedCount = agents.filter((agent) => state.marketplace.installed.includes(agent.name)).length
  const lockedCount = agents.filter((agent) => Number(agent.price || 0) > 0 && isStarter && !state.marketplace.installed.includes(agent.name)).length
  const availableCount = agents.length - installedCount - lockedCount
  mountMarkup(
    root,
    `
      <section class="rw-market-summary">
        <div class="rw-market-summary-copy">
          <div class="rw-market-summary-title">Capability packs extend what Rina can do in the thread.</div>
          <div class="rw-market-summary-text">Install or unlock a pack here, then come back to Agent to run it through the trusted path with proof attached.</div>
        </div>
        <div class="rw-market-summary-stats">
          <span class="rw-market-summary-pill">Ready ${installedCount}</span>
          <span class="rw-market-summary-pill">Available ${availableCount}</span>
          <span class="rw-market-summary-pill">Locked ${lockedCount}</span>
        </div>
      </section>
      <section class="rw-market-list">
      ${agents
        .map((agent) => {
          const premium = Number(agent.price || 0) > 0
          const installed = state.marketplace.installed.includes(agent.name)
          const locked = premium && isStarter && !installed
          const badge = installed ? 'Ready in thread' : locked ? 'Upgrade required' : premium ? 'Paid pack' : 'Installable now'
          const actionLabel = installed ? 'Installed' : locked ? 'Upgrade to Pro' : 'Install'
          const commandCount = Array.isArray(agent.commands) ? agent.commands.length : 0
          const statusLabel = installed ? 'Ready' : locked ? 'Locked' : 'Available'
          const proofLabel = installed ? 'Proof ready in thread' : locked ? 'Unlock to run with proof' : 'Install to run with proof'
          return `
            <article class="rw-market-card" data-agent-name="${escapeHtml(agent.name)}">
              <div class="rw-market-head">
                <div class="rw-market-head-copy">
                  <div class="rw-market-title">${escapeHtml(agent.name)}</div>
                  <div class="rw-market-subtitle">by ${escapeHtml(agent.author || 'unknown')} · v${escapeHtml(agent.version || '1.0.0')}</div>
                </div>
                <div class="rw-market-badge ${installed ? 'ready' : locked ? 'locked' : premium ? 'premium' : 'free'}">${escapeHtml(badge)}</div>
              </div>
              <div class="rw-market-copy">${escapeHtml(agent.description || 'No description provided.')}</div>
              <div class="rw-market-meta">
                <span>${escapeHtml(statusLabel)}</span>
                <span>${commandCount} workflow${commandCount === 1 ? '' : 's'}</span>
                <span>${proofLabel}</span>
                <span>${escapeHtml(String(agent.downloads || 0))} downloads</span>
              </div>
              <div class="rw-market-actions">
                <button class="fix-btn ${locked ? '' : 'primary'}" data-market-install="${escapeHtml(agent.name)}" ${installed ? 'disabled' : ''}>${escapeHtml(actionLabel)}</button>
              </div>
            </article>
          `
        })
        .join('')}
      </section>
    `
  )
}

function renderCode(state: WorkbenchState): void {
  const root = document.getElementById('workspace-files')
  if (!root) return
  if (state.code.files.length === 0) {
    mountMarkup(root, `
      <div class="rw-empty-state">
        <div class="rw-empty-title">No workspace files loaded</div>
        <div class="rw-empty-copy">Open a workspace and RinaWarp will show the files it is using for context.</div>
      </div>
    `)
    return
  }
  mountMarkup(root, state.code.files
    .map((file) => `<div class="code-file">${escapeHtml(file)}</div>`)
    .join(''))
}

function renderDiagnostics(state: WorkbenchState): void {
  const root = document.getElementById('diagnostics-output')
  if (!root) return
  mountMarkup(root, `
    <div class="stat-item"><span class="stat-label">Mode:</span><span class="stat-value">${escapeHtml(state.diagnostics.mode || 'unknown')}</span></div>
    <div class="stat-item"><span class="stat-label">Tools:</span><span class="stat-value">${escapeHtml(String(state.diagnostics.toolsCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Agent Running:</span><span class="stat-value">${state.diagnostics.agentRunning ? 'Yes' : 'No'}</span></div>
    <div class="stat-item"><span class="stat-label">Conversations:</span><span class="stat-value">${escapeHtml(String(state.diagnostics.conversationCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Learned Commands:</span><span class="stat-value">${escapeHtml(String(state.diagnostics.learnedCommandsCount))}</span></div>
    <div class="rw-diagnostics-divider">Trust signals (current workspace)</div>
    <div class="stat-item"><span class="stat-label">Starter intents:</span><span class="stat-value">${escapeHtml(String(state.analytics.starterIntentCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Inspector opens:</span><span class="stat-value">${escapeHtml(String(state.analytics.inspectorOpenCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Output expands:</span><span class="stat-value">${escapeHtml(String(state.analytics.runOutputExpandCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Proof-backed runs:</span><span class="stat-value">${escapeHtml(String(state.analytics.proofBackedRunCount))}</span></div>
    <div class="stat-item"><span class="stat-label">Last starter:</span><span class="stat-value">${escapeHtml(state.analytics.lastStarterIntent || 'none')}</span></div>
    <div class="stat-item"><span class="stat-label">First starter at:</span><span class="stat-value">${escapeHtml(formatAnalyticsDate(state.analytics.firstStarterIntentAt))}</span></div>
    <div class="stat-item"><span class="stat-label">Last inspector:</span><span class="stat-value">${escapeHtml(state.analytics.lastInspector || 'none')}</span></div>
    <div class="stat-item"><span class="stat-label">First proof at:</span><span class="stat-value">${escapeHtml(formatAnalyticsDate(state.analytics.firstProofBackedRunAt))}</span></div>
    <div class="rw-inline-actions">
      <button class="rw-inline-action" type="button" data-copy-trust-snapshot>Copy workspace trust snapshot</button>
    </div>
  `)
}

function renderBrain(state: WorkbenchState): void {
  const statsRoot = document.getElementById('brain-stats')
  const vizRoot = document.getElementById('brain-visualization')
  if (statsRoot) {
    const stats = state.brain.stats
    mountMarkup(statsRoot, stats
      ? `
        <div class="brain-stat"><div class="brain-stat-value text-teal">${stats.total}</div><div class="brain-stat-label">Total</div></div>
        <div class="brain-stat"><div class="brain-stat-value text-hot-pink">${stats.intent}</div><div class="brain-stat-label">Intent</div></div>
        <div class="brain-stat"><div class="brain-stat-value text-coral">${stats.planning}</div><div class="brain-stat-label">Planning</div></div>
        <div class="brain-stat"><div class="brain-stat-value text-babyblue">${stats.tool}</div><div class="brain-stat-label">Tools</div></div>
        <div class="brain-stat"><div class="brain-stat-value text-purple">${stats.memory}</div><div class="brain-stat-label">Memory</div></div>
        <div class="brain-stat"><div class="brain-stat-value text-green">${stats.result}</div><div class="brain-stat-label">Results</div></div>
      `
      : '')
  }
  if (vizRoot) {
    mountMarkup(vizRoot, state.brain.events
      .map((event) => {
        const progress = event.progress !== undefined ? `<div class="progress-bar"><div class="progress-fill" style="width: ${event.progress}%"></div></div>` : ''
        return `
          <div class="brain-flow-wrapper">
            <div class="brain-flow">
              <div class="brain-icon ${escapeHtml(event.type)}">•</div>
              <div class="brain-step">
                <div class="brain-label">${escapeHtml(event.type.toUpperCase())}</div>
                <div class="brain-text">${escapeHtml(event.message)}</div>
                ${progress}
              </div>
            </div>
          </div>
        `
      })
      .join(''))
  }
}

function renderStatus(state: WorkbenchState): void {
  const autonomyChip = document.getElementById('autonomy-status')
  if (autonomyChip) autonomyChip.textContent = `Autonomy: ${state.runtime.autonomyEnabled ? state.runtime.autonomyLevel.toUpperCase() : 'OFF'}`

  const modeBar = document.getElementById('mode-status-bar')
  if (modeBar) modeBar.textContent = `Mode: ${state.runtime.mode || 'explain'}`

  const autonomyDot = document.getElementById('autonomy-dot')
  if (autonomyDot) autonomyDot.classList.toggle('disconnected', !state.runtime.autonomyEnabled)

  const modeRight = document.getElementById('status-right')
  if (modeRight) modeRight.textContent = `Mode: ${state.runtime.mode || 'explain'}`

  const workspace = document.getElementById('workspace-status')
  if (workspace) {
    const workspaceText = state.workspaceKey === '__none__' ? '-' : state.workspaceKey
    const compactWorkspace =
      workspaceText.length > 42 ? `...${workspaceText.slice(Math.max(0, workspaceText.length - 39))}` : workspaceText
    workspace.textContent = `Workspace: ${compactWorkspace}`
    workspace.setAttribute('title', workspaceText)
  }

  const activityStatus = document.getElementById('activity-status')
  if (activityStatus) {
    const commands = state.diagnostics.learnedCommandsCount || state.executionTrace.blocks.length
    activityStatus.textContent = `${commands} commands · ${state.diagnostics.toolsCount} tools`
  }

  const summary = document.getElementById('status-summary')
  if (summary) {
    if (state.ui.statusSummaryText) summary.textContent = state.ui.statusSummaryText
    else if (state.thinking.active && state.thinking.message) summary.textContent = state.thinking.message
    else summary.textContent = state.license.tier === 'starter' ? 'Ready' : `Ready · ${state.license.tier}`
  }
}

export function renderWorkbench(state: WorkbenchState): void {
  renderTabs(state)
  renderExecutionTrace(state)
  renderAgent(state)
  renderFixBlocks(state)
  renderRuns(state)
  renderMarketplace(state)
  renderCode(state)
  renderDiagnostics(state)
  renderBrain(state)
  renderStatus(state)
}
