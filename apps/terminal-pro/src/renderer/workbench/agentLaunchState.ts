import type { WorkbenchState } from './store.js'
import { hasCanonicalThreadContent } from './renderers/threadSurface.js'

export function getAgentThreadMessages(state: WorkbenchState) {
  return state.chat
    .filter((message) => message.workspaceKey === state.workspaceKey)
    .filter((message) => !message.id.startsWith('system:runs:restore:'))
}

export function hasAgentThreadContent(state: WorkbenchState): boolean {
  return hasCanonicalThreadContent(state) || getAgentThreadMessages(state).length > 0
}

export function hasAgentRecoveryOnly(state: WorkbenchState): boolean {
  const recoveryMessages = state.chat
    .filter((message) => message.workspaceKey === state.workspaceKey)
    .filter((message) => message.id.startsWith('system:runs:restore:'))
  return recoveryMessages.length > 0 && !hasAgentThreadContent(state)
}

export function isAgentLaunchEmpty(state: WorkbenchState): boolean {
  if (state.activeTab !== 'agent') return false
  if (hasAgentRecoveryOnly(state)) return false
  if (hasAgentThreadContent(state)) return false
  if (state.fixBlocks.length > 0) return false
  return true
}

export function hasExecutionTraceActivity(state: WorkbenchState): boolean {
  if (state.executionTrace.blocks.length > 0) return true
  if (state.thinking.active) return true
  return Boolean(state.thinking.message?.trim() || state.thinking.stream?.trim())
}
