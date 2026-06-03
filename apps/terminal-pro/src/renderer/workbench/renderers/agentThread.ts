import type { RunModel, WorkbenchState } from '../store.js'
import { clear, el, mount } from '../dom.js'
import { appendMessageContent } from './messageBlocks.js'
import { hasCanonicalThreadContent, renderCanonicalThread } from './threadSurface.js'
import { clearStarterPromptMount, mountStarterPromptMount } from '../components/agentSurface.js'
import { hasAgentThreadContent, hasAgentRecoveryOnly } from '../agentLaunchState.js'
import { renderRecoveryStrip, renderRecoveryToggleButton } from '../components/recoverySurface.js'
import { renderTruthHud } from '../components/truthHud.js'
import { EMPTY_STATE_PROMPTS } from '../emptyStatePrompts.js'
import { buildRecoveryStripViewModel } from '../view-models/recoveryViewModel.js'

function syncStarterPromptChips(): void {
  // Launch chips are static; no tier/meta sync on empty state.
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


function renderComposerStarterPrompts(hasThreadContent: boolean): void {
  const container = document.getElementById('agent-starter-prompts')
  if (!container) return
  if (hasThreadContent) {
    clearStarterPromptMount(container)
    return
  }
  mountStarterPromptMount(container, EMPTY_STATE_PROMPTS)
}

function renderRecoveryToggle(state: WorkbenchState): void {
  const button = document.getElementById('recovery-toggle') as HTMLButtonElement | null
  if (!button) return
  const stripModel = buildRecoveryStripViewModel(state, false)
  renderRecoveryToggleButton(button, stripModel?.restoredCount || 0, state.ui.recoveryExpanded)
}

function renderHero(hidden = false): void {
  const hero = document.querySelector<HTMLElement>('.rw-agent-hero')
  if (!hero) return
  if (hidden) clear(hero)
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
  const hasThreadContent = hasAgentThreadContent(state)
  const composerInput = document.querySelector<HTMLTextAreaElement>('#agent-input')
  const hasDraft = Boolean(composerInput?.value.trim())
  const isStreaming = Boolean(state.thinking.active)
  const isChatActive = hasThreadContent || isStreaming || hasDraft
  const stripModel = buildRecoveryStripViewModel(state, recoveryMessages.length > 0 && !state.ui.recoveryExpanded)
  const canShowRecovery = Boolean(stripModel)
  const recoveryFocus = canShowRecovery && hasAgentRecoveryOnly(state)
  const shouldCompactRecovery = recoveryMessages.length > 0 && !state.ui.recoveryExpanded
  // Recovery intro should not persist once the user has started a real chat thread.
  const shouldShowRecoveryStrip = canShowRecovery && recoveryMessages.length > 0 && !hasThreadContent

  if (recoveryRoot) {
    clear(recoveryRoot)
    if (canShowRecovery && recoveryMessages.length > 0) {
      const recoveryShell = document.createDocumentFragment()

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
  renderHero(recoveryFocus || isChatActive)

  const shell = document.createDocumentFragment()
  const launchEmpty = document.querySelector<HTMLElement>('.rw-agent-launch-empty')

  if (hasThreadContent) {
    launchEmpty?.setAttribute('hidden', 'hidden')
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
  agentBody?.classList.toggle('is-empty', !hasThreadContent && !recoveryFocus)
  agentBody?.classList.toggle('has-thread-content', hasThreadContent)
  agentBody?.classList.toggle('is-chat-active', isChatActive)
  agentBody?.classList.toggle('is-streaming', isStreaming)
  agentBody?.classList.toggle('has-recovery-strip', shouldShowRecoveryStrip)
  agentBody?.classList.toggle('is-recovery-focus', recoveryFocus)
  if (!hasThreadContent && !recoveryFocus) {
    launchEmpty?.removeAttribute('hidden')
  }
  root.scrollTop = hasThreadContent ? root.scrollHeight : 0
  renderComposerStarterPrompts(hasThreadContent)
  syncStarterPromptChips()
}

export function renderAgent(state: WorkbenchState): void {
  renderAgentThreadSurface(state)
}
