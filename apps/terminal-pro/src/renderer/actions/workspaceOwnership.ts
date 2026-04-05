import type { WorkbenchStore } from '../workbench/store.js'
import { normalizeWorkspaceKey } from '../services/rendererCoreHelpers.js'
import { recordDebugEvent } from '../services/debugEvidence.js'

type WorkspaceRefreshers = {
  refreshRuns: (store: WorkbenchStore) => Promise<void>
  refreshCode: (store: WorkbenchStore) => Promise<void>
  refreshDiagnostics: (store: WorkbenchStore) => Promise<void>
  refreshRuntimeStatus: (store: WorkbenchStore) => Promise<void>
  refreshMarketplace: (store: WorkbenchStore) => Promise<void>
  refreshCapabilityPacks: (store: WorkbenchStore) => Promise<void>
}

export async function requestWorkspaceSelection(options?: {
  source?: string
  onStatus?: (message: string) => void
}): Promise<{ ok: boolean; path?: string; cancelled?: boolean; error?: string }> {
  const source = options?.source || 'unknown'
  recordDebugEvent('ui', 'workspace.pick', { source })
  options?.onStatus?.('Opening workspace picker...')
  try {
    const result = await window.rina.pickWorkspace?.()
    if (!result?.ok || !result.path) {
      options?.onStatus?.('Workspace selection cancelled.')
      return { ok: false, cancelled: true }
    }
    const path = String(result.path)
    recordDebugEvent('ui', 'workspace.selected', { path, source })
    void (window.rina as any)?.trackEvent?.('workspace_selected', {
      source,
      selection_method: 'picker',
      workspace_present: true,
    })
    options?.onStatus?.('Workspace updated.')
    window.dispatchEvent(
      new CustomEvent('rina:workspace-selected', {
        detail: { path, source },
      })
    )
    return { ok: true, path }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not change workspace.'
    options?.onStatus?.(message)
    return { ok: false, error: message }
  }
}

export async function requestDemoWorkspaceSelection(options?: {
  source?: string
  onStatus?: (message: string) => void
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  const source = options?.source || 'unknown'
  recordDebugEvent('ui', 'workspace.demo', { source })
  options?.onStatus?.('Preparing a demo project...')
  try {
    const result = await window.rina.demoWorkspace?.()
    if (!result?.ok || !result.path) {
      const message = result?.error || 'Could not prepare the demo project.'
      options?.onStatus?.(message)
      return { ok: false, error: message }
    }
    const path = String(result.path)
    recordDebugEvent('ui', 'workspace.selected.demo', { path, source })
    options?.onStatus?.('Demo project ready.')
    window.dispatchEvent(
      new CustomEvent('rina:workspace-selected', {
        detail: { path, source: `demo:${source}` },
      })
    )
    return { ok: true, path }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not prepare the demo project.'
    options?.onStatus?.(message)
    return { ok: false, error: message }
  }
}

export function applyWorkspaceSelection(
  store: WorkbenchStore,
  path: string | undefined,
  refreshers: WorkspaceRefreshers
): void {
  const workspaceKey = normalizeWorkspaceKey(path)
  store.dispatch({ type: 'workspace/set', workspaceKey })
  void refreshers.refreshRuns(store)
  void refreshers.refreshCode(store)
  void refreshers.refreshDiagnostics(store)
  void refreshers.refreshRuntimeStatus(store)
  void refreshers.refreshMarketplace(store)
  void refreshers.refreshCapabilityPacks(store)
}
