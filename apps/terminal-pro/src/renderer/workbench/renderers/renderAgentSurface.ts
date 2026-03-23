import type { WorkbenchState } from '../store.js'
import { renderAgentThreadSurface } from './agentThread.js'

export function renderAgentSurface(state: WorkbenchState): void {
  renderAgentThreadSurface(state)
}
