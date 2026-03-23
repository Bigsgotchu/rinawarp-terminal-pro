import type { DrawerView, TabKey, WorkbenchState } from '../workbench/store.js'
import { getTruthHudState, getWorkspaceContextState } from '../workbench/renderers/selectors.js'

export type StatusBarModel = {
  modeText: string
  workspaceText: string
  workspaceTitle: string
  workspacePickerText: string
  workspacePickerTitle: string
  workspacePickerWeak: boolean
  activityText: string
  summaryText: string
}

export type WorkbenchShellChromeModel = {
  activeTabs: Record<string, boolean>
  activeActivityTabs: Record<string, boolean>
  activeCenterViews: Record<string, boolean>
  activeRightViews: Record<string, boolean>
  agentFocused: boolean
  drawerOpen: boolean
  drawer: DrawerView | null
  status: StatusBarModel
  autonomyEnabled: boolean
}

function humanizeRunStatus(status: string | null): string {
  if (!status) return 'Unverified'
  return status
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getStatusBarModel(state: WorkbenchState): StatusBarModel {
  const hudState = getTruthHudState(state)
  const workspaceState = getWorkspaceContextState(state)
  const mode = hudState.mode || 'assist'
  const lastRunStatus = humanizeRunStatus(hudState.lastRunStatus)
  const recoveryText = hudState.recoveryReadyCount > 0 ? `${hudState.recoveryReadyCount} items restored` : 'No recovery'
  const workspacePickerText =
    workspaceState.status === 'missing'
      ? 'Choose workspace'
      : workspaceState.status === 'weak'
        ? `Workspace may be wrong: ${workspaceState.displayValue}`
        : `Workspace: ${workspaceState.displayValue}`

  let summaryText: string
  if (workspaceState.status !== 'project') summaryText = 'Choose a project folder to give Rina stronger context'
  else if (state.ui.statusSummaryText && state.ui.statusSummaryText.trim() && state.ui.statusSummaryText.trim().toLowerCase() !== 'ready') {
    summaryText = state.ui.statusSummaryText
  } else if (state.thinking.active && state.thinking.message) summaryText = state.thinking.message
  else summaryText = 'Rina is ready to work in this project.'

  return {
    modeText: `Mode: ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`,
    workspaceText: `Workspace: ${workspaceState.displayValue}`,
    workspaceTitle: workspaceState.title,
    workspacePickerText,
    workspacePickerTitle: workspaceState.title,
    workspacePickerWeak: workspaceState.status !== 'project',
    activityText: `Last run: ${lastRunStatus} • Recovery: ${recoveryText}`,
    summaryText,
  }
}

export function buildWorkbenchShellChromeModel(state: WorkbenchState): WorkbenchShellChromeModel {
  const drawerOpen = state.activeTab === 'agent' && Boolean(state.ui.openDrawer)
  const activeTabs: Record<string, boolean> = {}
  const tabCandidates: TabKey[] = ['agent', 'runs', 'settings']
  for (const tab of tabCandidates) {
    activeTabs[tab] = tab === state.activeTab || (tab !== 'agent' && tab !== 'settings' && tab === state.ui.openDrawer)
  }

  return {
    activeTabs,
    activeActivityTabs: {
      agent: state.activeTab === 'agent',
      runs: state.ui.openDrawer === 'runs',
      marketplace: state.ui.openDrawer === 'marketplace',
      diagnostics: state.ui.openDrawer === 'diagnostics',
      settings: state.activeTab === 'settings',
    },
    activeCenterViews: {
      'execution-trace': state.ui.openDrawer === 'execution-trace',
      runs: state.ui.openDrawer === 'runs',
      receipt: state.ui.openDrawer === 'receipt',
      marketplace: state.ui.openDrawer === 'marketplace',
      code: state.ui.openDrawer === 'code',
      brain: state.ui.openDrawer === 'brain',
    },
    activeRightViews: {
      agent: state.activeTab === 'agent',
      diagnostics: state.ui.openDrawer === 'diagnostics',
    },
    agentFocused: state.activeTab === 'agent',
    drawerOpen,
    drawer: state.ui.openDrawer,
    status: getStatusBarModel(state),
    autonomyEnabled: Boolean(state.runtime.autonomyEnabled),
  }
}
