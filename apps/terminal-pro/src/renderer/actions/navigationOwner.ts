import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'
import { recordDebugEvent } from '../services/debugEvidence.js'

export type NavigableWorkbenchView =
  | 'agent'
  | 'settings'
  | 'diagnostics'
  | 'execution-trace'
  | 'runs'
  | 'marketplace'
  | 'code'
  | 'brain'

type NavigationDeps = Pick<WorkbenchActionControllerDeps, 'trackRendererEvent'>

export function createWorkbenchNavigator(
  store: WorkbenchStore,
  deps: NavigationDeps
): (view: NavigableWorkbenchView, options?: { source?: string }) => Promise<void> {
  return async (view: NavigableWorkbenchView, options?: { source?: string }): Promise<void> => {
    const source = options?.source || 'unknown'
    recordDebugEvent('ui', 'nav.tab', { view, source, workspaceKey: store.getState().workspaceKey })
    const openDrawer = store.getState().ui.openDrawer

    if (view === 'agent') {
      store.dispatch({ type: 'ui/closeDrawer' })
      store.dispatch({ type: 'view/rightSet', view: 'agent' })
      return
    }

    if (view === 'settings') {
      if (window.__rinaSettings?.isOpen()) {
        window.__rinaSettings.close()
      } else {
        recordDebugEvent('ui', 'settings.open', { source, workspaceKey: store.getState().workspaceKey })
        window.__rinaSettings?.open()
      }
      return
    }

    if (view === 'execution-trace' || view === 'runs') {
      store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: view })
      void deps.trackRendererEvent('inspector_opened', {
        inspector: view,
        source,
        workspace_key: store.getState().workspaceKey,
      })
    }

    if (view === 'execution-trace' || view === 'runs' || view === 'marketplace' || view === 'code' || view === 'brain') {
      if (openDrawer === view) store.dispatch({ type: 'ui/closeDrawer' })
      else store.dispatch({ type: 'view/centerSet', view })
      return
    }

    if (view === 'diagnostics') {
      if (openDrawer === 'diagnostics') store.dispatch({ type: 'ui/closeDrawer' })
      else store.dispatch({ type: 'view/rightSet', view: 'diagnostics' })
    }
  }
}
