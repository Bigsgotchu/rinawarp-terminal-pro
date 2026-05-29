import type { RunModel, WorkbenchState } from '../store.js'
import { clear, el, mount } from '../dom.js'
import { appendMessageContent } from './messageBlocks.js'
import { hasCanonicalThreadContent, renderCanonicalThread } from './threadSurface.js'
import {
  clearStarterPromptMount,
  mountAgentHero,
  mountStarterPromptMount,
  renderAgentCard,
} from '../components/agentSurface.js'
import { renderRecoveryStrip, renderRecoveryToggleButton } from '../components/recoverySurface.js'
import { renderTruthHud } from '../components/truthHud.js'
import {
  buildAgentHeroViewModel,
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

function renderHero(state: WorkbenchState, hidden = false): void {
  const hero = document.querySelector<HTMLElement>('.rw-agent-hero')
  if (!hero) return
  if (hidden) {
    clear(hero)
    return
  }
  mountAgentHero(hero, buildAgentHeroViewModel(state))
}

function buildEmptyStateNode(state: WorkbenchState): HTMLElement {
  const workspaceSetup = buildWorkspaceSetupCardModel(state)
  if (!workspaceSetup) return el('section', { class: 'rw-agent-empty-state-shell', dataset: { agentSection: 'empty-state' } })
  return el(
    'section',
    {
      class: ['rw-agent-empty-state-shell', 'is-single-column'].filter(Boolean).join(' '),
      dataset: { agentSection: 'empty-state' },
    },
    el(
      'div',
      {
        class: 'rw-agent-empty-column rw-agent-empty-column-main',
      },
      renderAgentCard(workspaceSetup)
    )
  )
}

export function renderAgentThreadSurface(state: WorkbenchState): void {
  const recoveryRoot = document.getElementById('agent-recovery')
  const root = document.getElementById('agent-output')
  if (!root) return
  const agentBody = document.querySelector<HTMLElement>('.rw-agent-body')
  const useCanonicalThread = hasCanonicalThreadContent(state)
  const visibleMessages = state.chat.filter((message) => message.workspaceKey === state.workspaceKey).slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const hasThreadContent = useCanonicalThread || threadMessages.length > 0
  const composerInput = document.querySelector<HTMLTextAreaElement>('#agent-input')
  const hasDraft = Boolean(composerInput?.value.trim())
  const isStreaming = Boolean(state.thinking.active)
  const isChatActive = hasThreadContent || isStreaming || hasDraft
  const recoveryFocus = recoveryMessages.length > 0 && !hasThreadContent
  const shouldCompactRecovery = recoveryMessages.length > 0 && !state.ui.recoveryExpanded
  // Recovery intro should not persist once the user has started a real chat thread.
  const shouldShowRecoveryStrip = recoveryMessages.length > 0 && !hasThreadContent

  if (recoveryRoot) {
    clear(recoveryRoot)
    if (recoveryMessages.length > 0) {
      const recoveryShell = document.createDocumentFragment()
      const stripModel = buildRecoveryStripViewModel(state, shouldCompactRecovery)

      if (stripModel && shouldShowRecoveryStrip) recoveryShell.appendChild(renderRecoveryStrip(stripModel))

      if (!shouldCompactRecovery && shouldShowRecoveryStrip) {
        for (const message of recoveryMessages) {
          const node = el('div', {
            class: ['rw-thread-message', message.role, 'is-recovery-message'].filter(Boolean).join(' '),
            dataset: { msgId: message.id },
          })
          appendMessageContent(node, message)
          recoveryShell.appendChild(node)
        }
      }
      mount(recoveryRoot, recoveryShell)
    }
  }
  renderRecoveryToggle(state)
  renderHero(state, recoveryFocus || isChatActive)

  const shell = document.createDocumentFragment()

  if (!hasThreadContent && !recoveryFocus) {
    shell.appendChild(buildEmptyStateNode(state))
  }
  if (hasThreadContent) {
    shell.appendChild(renderTruthHud(state))
    if (useCanonicalThread) {
      shell.appendChild(renderCanonicalThread(state))
    } else {
      for (const message of dedupeAdjacentThreadMessages(threadMessages)) {
        const linkedRuns = state.runs.filter((run) => run.originMessageId === message.id || (message.runIds || []).includes(run.id))
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
        shell.appendChild(node)
      }
    }
  }

  mount(root, shell)
  root.classList.toggle('is-empty-thread', !hasThreadContent)
  agentBody?.classList.toggle('is-empty', !hasThreadContent)
  agentBody?.classList.toggle('has-thread-content', hasThreadContent)
  agentBody?.classList.toggle('is-chat-active', isChatActive)
  agentBody?.classList.toggle('is-streaming', isStreaming)
  agentBody?.classList.toggle('has-recovery-strip', shouldShowRecoveryStrip)
  agentBody?.classList.toggle('is-recovery-focus', recoveryFocus)
  root.scrollTop = hasThreadContent ? root.scrollHeight : 0
  renderComposerStarterPrompts(state, hasThreadContent)
  syncStarterPromptChips(state)
}

export function renderAgent(state: WorkbenchState): void {
  renderAgentThreadSurface(state)
}
