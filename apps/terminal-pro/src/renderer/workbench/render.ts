import type { TabKey, WorkbenchState } from './store.js'
import { renderExecutionTrace } from './renderers/executionTrace.js'
import { renderBrain, renderCode, renderDiagnostics, renderMarketplace, renderStatus } from './renderers/secondaryPanels.js'
import { renderRuns } from './renderers/runsPanel.js'
import { renderAgent } from './renderers/agentThread.js'
import { renderFixBlocks } from './renderers/fixBlocksPanel.js'

function renderTabs(state: WorkbenchState): void {
  const drawerOpen = state.activeTab === 'agent' && Boolean(state.ui.openDrawer)
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-tab]'))
  for (const button of buttons) {
    const tab = button.dataset.tab
    const active = tab === state.activeTab || (tab !== 'agent' && tab !== 'settings' && tab === state.ui.openDrawer)
    button.classList.toggle('active', active)
    if (button.classList.contains('rw-workbench-tab')) {
      button.setAttribute('aria-selected', String(active))
    }
  }

  const activityButtons = Array.from(document.querySelectorAll<HTMLElement>('.rw-activitybtn[data-tab]'))
  for (const button of activityButtons) {
    const active = button.dataset.tab === state.activeTab
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  const workbench = document.querySelector<HTMLElement>('.rw-workbench')
  if (workbench) {
    const agentFocused = state.activeTab === 'agent'
    workbench.classList.toggle('agent-focused', agentFocused)
    workbench.classList.toggle('drawer-open', drawerOpen)
    if (state.ui.openDrawer) workbench.dataset.drawer = state.ui.openDrawer
    else delete workbench.dataset.drawer
  }

  const app = document.getElementById('rw-app')
  if (app) {
    app.classList.toggle('drawer-open', drawerOpen)
    if (state.ui.openDrawer) app.dataset.drawer = state.ui.openDrawer
    else delete app.dataset.drawer
  }

  const centerViews: Array<TabKey> = ['execution-trace', 'runs', 'marketplace', 'code', 'brain']
  const rightViews: Array<TabKey> = ['agent', 'diagnostics']

  for (const name of centerViews) {
    const active = state.ui.openDrawer === name
    document.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }

  for (const name of rightViews) {
    const active = name === 'agent' ? state.activeTab === 'agent' : state.ui.openDrawer === 'diagnostics'
    document.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }
}
export function renderWorkbench(state: WorkbenchState): void {
  renderTabs(state)
  renderExecutionTrace(state)
  renderAgent(state)
  renderFixBlocks(state)
  renderRuns(state)
  renderMarketplace(state)
  renderCode(state)
  renderDiagnostics(state)
  renderBrain(state)
  renderStatus(state)
}
