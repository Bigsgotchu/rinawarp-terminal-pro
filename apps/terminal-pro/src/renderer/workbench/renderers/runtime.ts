import type { WorkbenchState } from '../store.js'

export function currentWorkspaceRoot(state: WorkbenchState): string {
  return state.workspaceKey || '__none__'
}

export function currentMode(state: WorkbenchState): string {
  return state.runtime.mode || 'assist'
}

export function ipcCanonicalReady(state: WorkbenchState): boolean {
  return Boolean(state.runtime.ipcCanonicalReady)
}

export function rendererCanonicalReady(state: WorkbenchState): boolean {
  return Boolean(state.runtime.rendererCanonicalReady)
}
