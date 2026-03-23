import type { WorkbenchStore } from '../workbench/store.js'
import { recordDebugEvent } from '../services/debugEvidence.js'

export async function openRunsFolderOwned(store: WorkbenchStore, options?: { source?: string }): Promise<{ ok: boolean; error?: string }> {
  const source = options?.source || 'unknown'
  recordDebugEvent('ui', 'runs.folder.open', {
    source,
    workspaceKey: store.getState().workspaceKey,
  })
  const result = await window.rina.openRunsFolder()
  if (!result?.ok) {
    store.dispatch({
      type: 'ui/setStatusSummary',
      text: result?.error || 'Could not open the runs folder.',
    })
    return { ok: false, error: result?.error || 'Could not open the runs folder.' }
  }
  return { ok: true }
}

export async function exportSupportBundleOwned(
  workspaceKey: string,
  snapshot?: unknown,
  options?: { source?: string }
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const source = options?.source || 'unknown'
  recordDebugEvent('ui', 'support.bundle.export', {
    source,
    workspaceKey,
  })
  const result = await window.rina.supportBundle(snapshot)
  if (!result?.ok) {
    return { ok: false, error: result?.error || 'unknown' }
  }
  return { ok: true, path: result.path }
}
