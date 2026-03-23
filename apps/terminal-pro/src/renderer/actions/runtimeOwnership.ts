import type { WorkbenchStore } from '../workbench/store.js'
import { recordDebugEvent } from '../services/debugEvidence.js'

export type RuntimeMode = 'auto' | 'assist' | 'explain'

export function createRuntimeModeOwner(store: WorkbenchStore) {
  return async (mode: RuntimeMode, options?: { source?: string }): Promise<void> => {
    const source = options?.source || 'unknown'
    recordDebugEvent('ui', 'runtime.mode.change', {
      mode,
      source,
      workspaceKey: store.getState().workspaceKey,
    })

    const result = await window.rina.setMode(mode)
    if (!result?.ok) {
      store.dispatch({
        type: 'ui/setStatusSummary',
        text: 'Could not change runtime mode.',
      })
      return
    }

    store.dispatch({
      type: 'runtime/set',
      runtime: {
        ...store.getState().runtime,
        mode: result.mode || mode,
      },
    })
  }
}
