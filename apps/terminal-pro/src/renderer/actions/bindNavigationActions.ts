import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'

export function createNavigationActionHandler(
  store: WorkbenchStore,
  deps: Pick<
    WorkbenchActionControllerDeps,
    'trackRendererEvent' | 'scrollToRun' | 'scrollToMessage' | 'sendPromptToRina'
  >
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const tab = target.closest<HTMLElement>('[data-tab]')
    if (tab?.dataset.tab) {
      const view = tab.dataset.tab
      const openDrawer = store.getState().ui.openDrawer
      if (view === 'agent') {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        return true
      }
      if (view === 'settings') {
        if (window.__rinaSettings?.isOpen()) {
          window.__rinaSettings.close()
          store.dispatch({ type: 'tab/set', tab: 'agent' })
        } else {
          store.dispatch({ type: 'ui/closeDrawer' })
          window.__rinaSettings?.open()
          store.dispatch({ type: 'tab/set', tab: 'settings' })
        }
        return true
      }
      if (view === 'execution-trace' || view === 'runs') {
        store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: view })
        void deps.trackRendererEvent('inspector_opened', {
          inspector: view,
          source: 'sidebar_tab',
          workspace_key: store.getState().workspaceKey,
        })
      }
      if (view === 'execution-trace' || view === 'runs' || view === 'marketplace' || view === 'code' || view === 'brain') {
        if (openDrawer === view) store.dispatch({ type: 'ui/closeDrawer' })
        else store.dispatch({ type: 'view/centerSet', view })
      } else if (view === 'agent' || view === 'diagnostics') {
        if (view === 'diagnostics' && openDrawer === 'diagnostics') store.dispatch({ type: 'ui/closeDrawer' })
        else store.dispatch({ type: 'view/rightSet', view })
      }
      return true
    }

    if (target.closest('[data-close-drawer]')) {
      store.dispatch({ type: 'ui/closeDrawer' })
      return true
    }

    const promptChip = target.closest<HTMLElement>('[data-agent-prompt]')
    if (promptChip?.dataset.agentPrompt) {
      const label = promptChip.textContent?.trim() || promptChip.dataset.agentPrompt
      store.dispatch({ type: 'analytics/track', event: 'starter_intent_selected', label })
      void deps.trackRendererEvent('starter_intent_selected', {
        label,
        prompt: promptChip.dataset.agentPrompt,
        workspace_key: store.getState().workspaceKey,
        source: 'starter_chip',
      })
      await deps.sendPromptToRina(store, promptChip.dataset.agentPrompt)
      return true
    }

    const openRunBtn = target.closest<HTMLElement>('[data-open-run]')
    if (openRunBtn?.dataset.openRun) {
      store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: 'runs' })
      void deps.trackRendererEvent('inspector_opened', {
        inspector: 'runs',
        source: 'inline_run_link',
        run_id: openRunBtn.dataset.openRun,
        workspace_key: store.getState().workspaceKey,
      })
      store.dispatch({ type: 'view/centerSet', view: 'runs' })
      deps.scrollToRun(openRunBtn.dataset.openRun)
      return true
    }

    const openRunsPanelBtn = target.closest<HTMLElement>('[data-open-runs-panel]')
    if (openRunsPanelBtn?.dataset.openRunsPanel) {
      store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: 'runs' })
      void deps.trackRendererEvent('inspector_opened', {
        inspector: 'runs',
        source: 'thread_runs_link',
        message_id: openRunsPanelBtn.dataset.openRunsPanel,
        workspace_key: store.getState().workspaceKey,
      })
      store.dispatch({ type: 'ui/setShowAllRuns', showAllRuns: false })
      store.dispatch({ type: 'ui/setScopeRunsToWorkspace', scopeRunsToWorkspace: true })
      store.dispatch({ type: 'view/centerSet', view: 'runs' })
      return true
    }

    const toggleRunsVisibilityBtn = target.closest<HTMLElement>('[data-toggle-runs-visibility]')
    if (toggleRunsVisibilityBtn) {
      store.dispatch({ type: 'ui/setShowAllRuns', showAllRuns: !store.getState().ui.showAllRuns })
      return true
    }

    const toggleRunsScopeBtn = target.closest<HTMLElement>('[data-toggle-runs-scope]')
    if (toggleRunsScopeBtn) {
      store.dispatch({
        type: 'ui/setScopeRunsToWorkspace',
        scopeRunsToWorkspace: !store.getState().ui.scopeRunsToWorkspace,
      })
      return true
    }

    const openMessageBtn = target.closest<HTMLElement>('[data-open-message]')
    if (openMessageBtn?.dataset.openMessage) {
      store.dispatch({ type: 'ui/closeDrawer' })
      store.dispatch({ type: 'view/rightSet', view: 'agent' })
      deps.scrollToMessage(openMessageBtn.dataset.openMessage)
      return true
    }

    const capabilityInspectBtn = target.closest<HTMLElement>('[data-capability-open-marketplace]')
    if (capabilityInspectBtn?.dataset.capabilityOpenMarketplace) {
      store.dispatch({ type: 'view/centerSet', view: 'marketplace' })
      return true
    }

    return false
  }
}
