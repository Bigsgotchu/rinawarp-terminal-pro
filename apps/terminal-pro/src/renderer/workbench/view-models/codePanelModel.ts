import type { WorkbenchState } from '../store.js'

export function buildCodePanelViewModel(state: WorkbenchState) {
  return {
    isEmpty: state.code.files.length === 0,
    files: state.code.files,
  }
}
