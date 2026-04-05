import type { DrawerView, TabKey, WorkbenchState } from '../workbench/store.js'
import { getWorkspaceContextState } from '../workbench/renderers/selectors.js'

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
  recoveryFocused: boolean
  status: StatusBarModel
  autonomyEnabled: boolean
}

export function getStatusBarModel(state: WorkbenchState): StatusBarModel {
  const workspaceState = getWorkspaceContextState(state)
  const workspacePickerText =
    workspaceState.status === 'weak'
      ? `Workspace: ${workspaceState.displayValue}`
      : workspaceState.status === 'missing'
        ? 'Workspace: choose project'
        : `Workspace: ${workspaceState.displayValue}`

  let summaryText: string
  if (workspaceState.status !== 'project') summaryText = 'Choose a project folder to give Rina stronger context'
  else if (state.ui.statusSummaryText && state.ui.statusSummaryText.trim() && state.ui.statusSummaryText.trim().toLowerCase() !== 'ready') {
    summaryText = state.ui.statusSummaryText
  } else if (state.thinking.active && state.thinking.message) summaryText = state.thinking.message
  else summaryText = 'Rina is ready to work in this project.'

  return {
    modeText: 'Rina workbench',
    workspaceText: `Workspace: ${workspaceState.displayValue}`,
    workspaceTitle: workspaceState.title,
    workspacePickerText,
    workspacePickerTitle: workspaceState.title,
    workspacePickerWeak: workspaceState.status !== 'project',
    activityText: '',
    summaryText,
  }
}

export function buildWorkbenchShellChromeModel(state: WorkbenchState): WorkbenchShellChromeModel {
  const visibleMessages = state.chat.filter((message) => message.workspaceKey === state.workspaceKey).slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const recoveryFocused = state.activeTab === 'agent' && recoveryMessages.length > 0 && threadMessages.length === 0
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
    recoveryFocused,
    status: getStatusBarModel(state),
    autonomyEnabled: Boolean(state.runtime.autonomyEnabled),
  }
}
