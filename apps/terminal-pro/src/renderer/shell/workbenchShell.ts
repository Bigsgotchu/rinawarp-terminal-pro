import { createWorkbenchNavigator, type NavigableWorkbenchView } from '../actions/navigationOwner.js'
import { createRuntimeModeOwner, type RuntimeMode } from '../actions/runtimeOwnership.js'
import { applyWorkspaceSelection } from '../actions/workspaceOwnership.js'
import { syncWorkbenchToSettingsVisibility } from '../state/settingsVisibilityOwnership.js'
import type { WorkbenchStore } from '../workbench/store.js'
import { createWorkbenchShellInteractions } from './workbenchShellInteractions.js'

type WorkspaceRefreshers = {
  refreshRuns: (store: WorkbenchStore) => Promise<void>
  refreshCode: (store: WorkbenchStore) => Promise<void>
  refreshDiagnostics: (store: WorkbenchStore) => Promise<void>
  refreshRuntimeStatus: (store: WorkbenchStore) => Promise<void>
  refreshMarketplace: (store: WorkbenchStore) => Promise<void>
  refreshCapabilityPacks: (store: WorkbenchStore) => Promise<void>
}

type CreateWorkbenchShellArgs = {
  store: WorkbenchStore
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
  refreshers: WorkspaceRefreshers
  root?: Document | HTMLElement
}

export function createWorkbenchShell(args: CreateWorkbenchShellArgs) {
  const navigateToPanel = createWorkbenchNavigator(args.store, {
    trackRendererEvent: args.trackRendererEvent,
  })
  const setRuntimeMode = createRuntimeModeOwner(args.store)
  const shellInteractions = createWorkbenchShellInteractions({
    store: args.store,
    trackRendererEvent: args.trackRendererEvent,
    root: args.root,
  })

  const handleSettingsVisibility = ((event: Event) => {
    const open = (event as CustomEvent<{ open?: boolean }>).detail?.open
    syncWorkbenchToSettingsVisibility(args.store, Boolean(open))
  }) as EventListener

  const handleWorkspaceSelected = ((event: Event) => {
    const nextPath = (event as CustomEvent<{ path?: string }>).detail?.path
    applyWorkspaceSelection(args.store, nextPath, args.refreshers)
  }) as EventListener

  const handleLicenseUpdated = ((event: Event) => {
    const tier = String((event as CustomEvent<{ tier?: string }>).detail?.tier || 'free').toLowerCase()
    args.store.dispatch({
      type: 'license/set',
      tier: (tier as any) || 'free',
      lastCheckedAt: Date.now(),
    })
  }) as EventListener

  return {
    mount(): void {
      shellInteractions.mount()
      window.addEventListener('rina:settings-visibility', handleSettingsVisibility)
      window.addEventListener('rina:workspace-selected', handleWorkspaceSelected)
      window.addEventListener('rina:license-updated', handleLicenseUpdated)
    },

    unmount(): void {
      shellInteractions.unmount()
      window.removeEventListener('rina:settings-visibility', handleSettingsVisibility)
      window.removeEventListener('rina:workspace-selected', handleWorkspaceSelected)
      window.removeEventListener('rina:license-updated', handleLicenseUpdated)
    },

    navigateToPanel(view: NavigableWorkbenchView, options?: { source?: string }): Promise<void> {
      return navigateToPanel(view, options)
    },

    setRuntimeMode(mode: RuntimeMode, options?: { source?: string }): Promise<void> {
      return setRuntimeMode(mode, options)
    },
  }
}
