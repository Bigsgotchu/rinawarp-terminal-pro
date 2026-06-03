import type { DrawerView, TabKey, WorkbenchState } from '../workbench/store.js'
import { isAgentLaunchEmpty } from '../workbench/agentLaunchState.js'
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
  centerRouteFocused: boolean
  agentLaunchEmpty: boolean
  drawerOpen: boolean
  drawer: DrawerView | null
  recoveryFocused: boolean
  status: StatusBarModel
  autonomyEnabled: boolean
}

const CENTER_ROUTE_VIEWS = new Set<DrawerView>(['runs', 'receipt', 'marketplace', 'code', 'brain'])

function hasPendingWorkspaceRecovery(state: WorkbenchState): boolean {
  const workspaceState = getWorkspaceContextState(state)
  if (workspaceState.status !== 'project' || !workspaceState.workspaceRoot) return false
  return state.runs.some(
    (run) =>
      run.restored &&
      run.projectRoot === workspaceState.workspaceRoot &&
      (run.status === 'running' || run.status === 'interrupted')
  )
}

export function getStatusBarModel(state: WorkbenchState, options: { launchEmpty?: boolean } = {}): StatusBarModel {
  if (options.launchEmpty) {
    return {
      modeText: '',
      workspaceText: '',
      workspaceTitle: '',
      workspacePickerText: '',
      workspacePickerTitle: '',
      workspacePickerWeak: false,
      activityText: '',
      summaryText: '',
    }
  }

  const workspaceState = getWorkspaceContextState(state)
  const hasPendingRecovery = hasPendingWorkspaceRecovery(state)
  const rawStatusSummary = String(state.ui.statusSummaryText || '').trim()
  const hasStaleRecoverySummary =
    /recovery:/i.test(rawStatusSummary) &&
    /\b(?:no|none|not available|not found|unknown)\b/i.test(rawStatusSummary)
  const preferredStatusSummary = hasPendingRecovery && hasStaleRecoverySummary ? '' : rawStatusSummary
  const workspacePickerText =
    workspaceState.status === 'weak'
      ? 'Workspace: choose project'
      : workspaceState.status === 'missing'
        ? 'Workspace: choose project'
        : `Workspace: ${workspaceState.displayValue}`

  let summaryText: string
  if (workspaceState.status !== 'project') summaryText = 'Choose a project folder to give Rina stronger context'
  else if (preferredStatusSummary && preferredStatusSummary.toLowerCase() !== 'ready') {
    summaryText = preferredStatusSummary
  } else if (state.thinking.active && state.thinking.message) summaryText = state.thinking.message
  else if (hasPendingRecovery) summaryText = 'Recovered session is ready. Resume task or open receipt.'
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
  const agentLaunchEmpty = isAgentLaunchEmpty(state)
  const centerRouteFocused = state.ui.openDrawer ? CENTER_ROUTE_VIEWS.has(state.ui.openDrawer) : false
  const agentFocused = state.activeTab === 'agent' && !centerRouteFocused
  const visibleMessages = state.chat.filter((message) => message.workspaceKey === state.workspaceKey).slice(-200)
  const recoveryMessages = visibleMessages.filter((message) => message.id.startsWith('system:runs:restore:'))
  const threadMessages = visibleMessages.filter((message) => !message.id.startsWith('system:runs:restore:'))
  const recoveryFocused = agentFocused && recoveryMessages.length > 0 && threadMessages.length === 0
  const drawerOpen = agentFocused && state.ui.openDrawer === 'diagnostics'
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
      receipt: state.ui.openDrawer === 'receipt',
      marketplace: state.ui.openDrawer === 'marketplace',
      code: state.ui.openDrawer === 'code',
      brain: state.ui.openDrawer === 'brain',
      diagnostics: state.ui.openDrawer === 'diagnostics',
      settings: state.activeTab === 'settings',
    },
    activeCenterViews: {
      agent: agentFocused,
      runs: state.ui.openDrawer === 'runs',
      receipt: state.ui.openDrawer === 'receipt',
      marketplace: state.ui.openDrawer === 'marketplace',
      code: state.ui.openDrawer === 'code',
      brain: state.ui.openDrawer === 'brain',
    },
    activeRightViews: {
      'execution-trace': agentFocused && state.ui.openDrawer !== 'diagnostics',
      diagnostics: state.ui.openDrawer === 'diagnostics',
    },
    agentFocused,
    centerRouteFocused,
    drawerOpen,
    drawer: state.ui.openDrawer,
    recoveryFocused,
    agentLaunchEmpty,
    status: getStatusBarModel(state, { launchEmpty: agentLaunchEmpty }),
    autonomyEnabled: Boolean(state.runtime.autonomyEnabled),
  }
}
