import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'
import type { UserTurnSource } from './conversationOwner.js'
import { recordDebugEvent } from '../services/debugEvidence.js'
import { createWorkbenchNavigator } from './navigationOwner.js'
import { requestWorkspaceSelection } from './workspaceOwnership.js'

function promptSourceFor(target: HTMLElement): UserTurnSource {
  if (target.dataset.intentKey) return 'starter_chip'
  if (target.closest('#agent-starter-prompts')) return 'starter_chip'
  return 'inline_prompt'
}

export function createNavigationActionHandler(
  store: WorkbenchStore,
  deps: Pick<
    WorkbenchActionControllerDeps,
    'trackRendererEvent' | 'scrollToRun' | 'scrollToMessage'
  > & { submitUserTurn: (prompt: string, source: UserTurnSource) => Promise<boolean> }
): (target: HTMLElement) => Promise<boolean> {
  const navigateTo = createWorkbenchNavigator(store, { trackRendererEvent: deps.trackRendererEvent })
  return async (target: HTMLElement): Promise<boolean> => {
    if (target.closest('[data-shell-owned="true"]')) {
      return false
    }

    const settingsAction = target.closest<HTMLElement>('[data-action="open-settings"]')
    if (settingsAction) {
      if (window.__rinaSettings?.isOpen()) {
        recordDebugEvent('ui', 'settings.open_ignored_already_open', {
          source: 'data-action',
          workspaceKey: store.getState().workspaceKey,
        })
        return true
      }
      recordDebugEvent('ui', 'settings.open', { source: 'data-action', workspaceKey: store.getState().workspaceKey })
      window.__rinaSettings?.open()
      return true
    }

    const tab = target.closest<HTMLElement>('[data-tab]')
    if (tab?.dataset.tab) {
      await navigateTo(tab.dataset.tab as Parameters<typeof navigateTo>[0], { source: 'sidebar_tab' })
      return true
    }

    if (target.closest('[data-close-drawer]')) {
      store.dispatch({ type: 'ui/closeDrawer' })
      return true
    }

    const pickWorkspaceBtn = target.closest<HTMLElement>('[data-pick-workspace]')
    if (pickWorkspaceBtn) {
      await requestWorkspaceSelection({
        source: pickWorkspaceBtn.dataset.pickWorkspace || 'unknown',
      })
      return true
    }

    const openSettingsTabBtn = target.closest<HTMLElement>('[data-open-settings-tab]')
    if (openSettingsTabBtn?.dataset.openSettingsTab) {
      const tabId = openSettingsTabBtn.dataset.openSettingsTab as any
      if (window.__rinaSettings?.isOpen()) {
        recordDebugEvent('ui', 'settings.open_tab_while_open', { tabId })
      } else {
        recordDebugEvent('ui', 'settings.open.tab', { tabId })
      }
      window.__rinaSettings?.open(tabId)
      return true
    }

    const promptChip = target.closest<HTMLElement>('[data-agent-prompt]')
    if (promptChip?.dataset.agentPrompt) {
      const source = promptSourceFor(promptChip)
      const label = promptChip.textContent?.trim() || promptChip.dataset.agentPrompt
      recordDebugEvent('ui', 'starter-prompt.select', { label })
      store.dispatch({ type: 'analytics/track', event: 'starter_intent_selected', label })
      void deps.trackRendererEvent('starter_intent_selected', {
        label,
        prompt: promptChip.dataset.agentPrompt,
        workspace_key: store.getState().workspaceKey,
        source,
      })
      await deps.submitUserTurn(promptChip.dataset.agentPrompt, source)
      return true
    }

    const openRunBtn = target.closest<HTMLElement>('[data-open-run]')
    if (openRunBtn?.dataset.openRun) {
      recordDebugEvent('ui', 'runs.inspect', { runId: openRunBtn.dataset.openRun })
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
      recordDebugEvent('ui', 'runs.open-panel', { messageId: openRunsPanelBtn.dataset.openRunsPanel })
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
