import type { WorkbenchStore } from '../workbench/store.js'

export function syncWorkbenchToSettingsVisibility(store: WorkbenchStore, open: boolean): void {
  const state = store.getState()

  if (open) {
    if (state.ui.openDrawer) {
      store.dispatch({ type: 'ui/closeDrawer' })
    }
    if (state.activeTab !== 'settings') {
      store.dispatch({ type: 'tab/set', tab: 'settings' })
    }
    return
  }

  if (state.activeTab === 'settings') {
    store.dispatch({ type: 'tab/set', tab: 'agent' })
  }
}
