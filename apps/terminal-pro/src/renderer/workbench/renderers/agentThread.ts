import type { RunModel, WorkbenchState } from '../store.js'
import { clear, el, mount } from '../dom.js'
import { renderLinkedRunsNode } from './linkedRuns.js'
import { appendMessageContent } from './messageBlocks.js'
import {
  clearStarterPromptMount,
  mountAgentHero,
  mountStarterPromptMount,
  renderAgentCard,
  renderInlineRunBlock,
} from '../components/agentSurface.js'
import { renderRecoveryStrip, renderRecoveryToggleButton } from '../components/recoverySurface.js'
import {
  buildAgentHeroViewModel,
  buildInlineRunViewModel,
  buildRetentionLoopCardModel,
  buildWorkspaceSetupCardModel,
} from '../view-models/agentThreadModel.js'
import { buildRecoveryStripViewModel } from '../view-models/recoveryViewModel.js'
import { getStarterPromptViewModels } from '../view-models/suggestedActionsViewModel.js'

function syncStarterPromptChips(state: WorkbenchState): void {
  const chips = Array.from(document.querySelectorAll<HTMLElement>('.rw-prompt-chip[data-intent-key]'))
  for (const chip of chips) {
    const intent = chip.dataset.intentKey as 'build' | 'test' | 'deploy' | 'fix' | undefined
    if (!intent) continue
    const meta = getStarterPromptViewModels(state).find((entry) => entry.intent === intent)
    if (!meta) continue
    chip.dataset.tierHint = meta.hint
    chip.dataset.tierTone = meta.tone
    const metaNode = chip.querySelector<HTMLElement>('.rw-prompt-chip-meta')
    if (metaNode) metaNode.textContent = meta.hint
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

function renderInlineRunBlocksNode(state: WorkbenchState, linkedRuns: RunModel[]): HTMLElement | null {
  if (linkedRuns.length === 0) return null
  const orderedRuns = [...linkedRuns].sort((left, right) => {
    const leftRunning = left.status === 'running' ? 0 : 1
    const rightRunning = right.status === 'running' ? 0 : 1
    if (leftRunning !== rightRunning) return leftRunning - rightRunning
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
  const root = el('div', { class: 'rw-inline-runs' })
  for (const run of orderedRuns) root.appendChild(renderInlineRunBlock(buildInlineRunViewModel(state, run)))
  return root
}

function renderComposerStarterPrompts(state: WorkbenchState, hasThreadContent: boolean): void {
  const container = document.getElementById('agent-starter-prompts')
  if (!container) return
  const workspaceSetup = buildWorkspaceSetupCardModel(state)
  if (hasThreadContent || workspaceSetup) {
    clearStarterPromptMount(container)
    return
  }
  mountStarterPromptMount(container, getStarterPromptViewModels(state))
}

function renderRecoveryToggle(state: WorkbenchState): void {
  const button = document.getElementById('recovery-toggle') as HTMLButtonElement | null
  if (!button) return
  renderRecoveryToggleButton(button, state.runs.filter((run) => run.restored).length, state.ui.recoveryExpanded)
}

function renderHero(state: WorkbenchState): void {
  const hero = document.querySelector<HTMLElement>('.rw-agent-hero')
  if (!hero) return
  mountAgentHero(hero, buildAgentHeroViewModel(state))
}

function buildEmptyStateNode(state: WorkbenchState): HTMLElement {
  const workspaceSetup = buildWorkspaceSetupCardModel(state)
  const retentionCard = buildRetentionLoopCardModel(state)
  if (!workspaceSetup) return el('section', { class: 'rw-agent-empty-state-shell', dataset: { agentSection: 'empty-state' } })
  return el(
    'section',
    {
      class: ['rw-agent-empty-state-shell', retentionCard ? '' : 'is-single-column'].filter(Boolean).join(' '),
      dataset: { agentSection: 'empty-state' },
    },
    el(
      'div',
      {
        class: 'rw-agent-empty-column rw-agent-empty-column-main',
      },
      renderAgentCard(workspaceSetup)
    ),
    retentionCard
      ? el(
          'div',
          {
            class: 'rw-agent-empty-column rw-agent-empty-column-side',
          },
          renderAgentCard(retentionCard)
        )
      : null
  )
}

export function renderAgentThreadSurface(state: WorkbenchState): void {
  const recoveryRoot = document.getElementById('agent-recovery')
  const root = document.getElementById('agent-output')
  if (!root) return
  const agentBody = document.querySelector<HTMLElement>('.rw-agent-body')
  const visibleMessages = state.chat.filter((message) => message.workspaceKey === state.workspaceKey).slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const hasThreadContent = threadMessages.length > 0
  const shouldCompactRecovery = recoveryMessages.length > 0 && !state.ui.recoveryExpanded
  const shouldShowRecoveryStrip = recoveryMessages.length > 0 && (shouldCompactRecovery || hasThreadContent)

  if (recoveryRoot) {
    clear(recoveryRoot)
    if (recoveryMessages.length > 0) {
      const recoveryShell = document.createDocumentFragment()
      const stripModel = buildRecoveryStripViewModel(state, shouldCompactRecovery)

      if (stripModel && shouldShowRecoveryStrip) recoveryShell.appendChild(renderRecoveryStrip(stripModel))

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
  const workspaceSetup = buildWorkspaceSetupCardModel(state)
  const retentionCard = buildRetentionLoopCardModel(state)

  if (!hasThreadContent) {
    shell.appendChild(buildEmptyStateNode(state))
  }
  if (hasThreadContent && workspaceSetup) {
    shell.appendChild(renderAgentCard(workspaceSetup))
    if (retentionCard) shell.appendChild(renderAgentCard(retentionCard))
  }
  if (hasThreadContent) {
    for (const message of dedupeAdjacentThreadMessages(threadMessages)) {
      const isRecoveryMessage = message.id.startsWith('system:runs:restore:')
      const linkedRuns = state.runs.filter((run) => run.originMessageId === message.id || (message.runIds || []).includes(run.id))
      const unresolvedRunIds = (message.runIds || []).filter((runId) => !linkedRuns.some((run) => run.id === runId))
      const hasRunningRun = linkedRuns.some((run) => run.status === 'running')
      const node = el('div', {
        class: [
          'rw-thread-message',
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
  renderComposerStarterPrompts(state, hasThreadContent)
  syncStarterPromptChips(state)
}

export function renderAgent(state: WorkbenchState): void {
  renderAgentThreadSurface(state)
}
