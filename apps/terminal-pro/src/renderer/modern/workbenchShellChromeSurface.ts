import type { WorkbenchState } from '../workbench/store.js'
import { buildWorkbenchShellChromeModel } from './workbenchShellChromeModel.js'

export function applyWorkbenchShellChrome(state: WorkbenchState, doc: Document = document): void {
  const model = buildWorkbenchShellChromeModel(state)

  const buttons = Array.from(doc.querySelectorAll<HTMLElement>('[data-tab]'))
  for (const button of buttons) {
    const active = Boolean(model.activeTabs[button.dataset.tab || ''])
    button.classList.toggle('active', active)
    if (button.classList.contains('rw-workbench-tab')) {
      button.setAttribute('aria-selected', String(active))
    }
  }

  const activityButtons = Array.from(doc.querySelectorAll<HTMLElement>('.rw-activitybtn[data-tab]'))
  for (const button of activityButtons) {
    const active = Boolean(model.activeActivityTabs[button.dataset.tab || ''])
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  const workbench = doc.querySelector<HTMLElement>('.rw-workbench')
  if (workbench) {
    workbench.classList.toggle('agent-focused', model.agentFocused)
    workbench.classList.toggle('drawer-open', model.drawerOpen)
    if (model.drawer) workbench.dataset.drawer = model.drawer
    else delete workbench.dataset.drawer
  }

  const app = doc.getElementById('rw-app')
  if (app) {
    app.classList.toggle('drawer-open', model.drawerOpen)
    if (model.drawer) app.dataset.drawer = model.drawer
    else delete app.dataset.drawer
  }

  for (const [name, active] of Object.entries(model.activeCenterViews)) {
    doc.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }
  for (const [name, active] of Object.entries(model.activeRightViews)) {
    doc.querySelector<HTMLElement>(`[data-view="${name}"]`)?.classList.toggle('active', active)
  }

  const modeBar = doc.getElementById('mode-status-bar')
  if (modeBar) modeBar.textContent = model.status.modeText

  const autonomyDot = doc.getElementById('autonomy-dot')
  if (autonomyDot) autonomyDot.classList.toggle('disconnected', !model.autonomyEnabled)

  const workspace = doc.getElementById('workspace-status')
  if (workspace) {
    workspace.textContent = model.status.workspaceText
    workspace.setAttribute('title', model.status.workspaceTitle)
  }

  const workspacePicker = doc.getElementById('workspace-picker')
  if (workspacePicker) {
    workspacePicker.textContent = model.status.workspacePickerText
    workspacePicker.setAttribute('title', model.status.workspacePickerTitle)
    workspacePicker.classList.toggle('is-weak', model.status.workspacePickerWeak)
  }

  const activityStatus = doc.getElementById('activity-status')
  if (activityStatus) activityStatus.textContent = model.status.activityText

  const summary = doc.getElementById('status-summary')
  if (summary) summary.textContent = model.status.summaryText
}
