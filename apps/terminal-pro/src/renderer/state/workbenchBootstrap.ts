import { WorkbenchStore, type WorkbenchState } from '../workbench/store.js'
import { deriveDeploymentState } from '../workbench/deploymentState.js'

const WORKBENCH_STORAGE_KEY = 'rinawarp.workbench.state.v1'

type WorkbenchSnapshot = Partial<WorkbenchStore['getState'] extends () => infer T ? T : never>

export function loadWorkbenchSnapshot(): WorkbenchSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKBENCH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WorkbenchSnapshot
  } catch {
    return null
  }
}

export function persistWorkbenchState(store: WorkbenchStore): void {
  const state = store.getState()
  try {
    const snapshot = loadWorkbenchSnapshot()
    const analyticsByWorkspace = {
      ...getSnapshotAnalyticsByWorkspace(snapshot),
      [state.workspaceKey || '__none__']: state.analytics,
    }
    localStorage.setItem(
      WORKBENCH_STORAGE_KEY,
      JSON.stringify({
        activeTab: state.activeTab,
        activeCenterView: state.activeCenterView,
        activeRightView: state.activeRightView,
        workspaceKey: state.workspaceKey,
        analytics: state.analytics,
        analyticsByWorkspace,
        runtime: state.runtime,
      })
    )
  } catch {
    // ignore persistence failures
  }
}

export function createWorkbenchStore(initialWorkspaceKey?: string): WorkbenchStore {
  const snapshot = loadWorkbenchSnapshot()
  const activeWorkspaceKey =
    typeof initialWorkspaceKey === 'string' && initialWorkspaceKey.trim() ? initialWorkspaceKey.trim() : '__none__'
  const snapshotActiveCenterView =
    typeof (snapshot as { activeCenterView?: unknown } | undefined)?.activeCenterView === 'string'
      ? String((snapshot as { activeCenterView?: unknown }).activeCenterView)
      : undefined
  const restoredAnalytics =
    getSnapshotAnalyticsByWorkspace(snapshot)[activeWorkspaceKey] ||
    (typeof snapshot?.workspaceKey === 'string' && snapshot.workspaceKey === activeWorkspaceKey ? snapshot.analytics : undefined) ||
    snapshot?.analytics

  const initialState: WorkbenchState = {
    activeTab: 'agent',
    activeCenterView:
      snapshotActiveCenterView === 'runs' ||
      snapshotActiveCenterView === 'marketplace' ||
      snapshotActiveCenterView === 'code' ||
      snapshotActiveCenterView === 'brain' ||
      snapshotActiveCenterView === 'execution-trace' ||
      snapshotActiveCenterView === 'terminal'
        ? snapshotActiveCenterView === 'terminal'
          ? 'execution-trace'
          : snapshotActiveCenterView
        : 'runs',
    activeRightView: 'agent',
    ui: {
      expandedRunLinksByMessageId:
        snapshot?.ui && typeof snapshot.ui === 'object' && snapshot.ui.expandedRunLinksByMessageId && typeof snapshot.ui.expandedRunLinksByMessageId === 'object'
          ? snapshot.ui.expandedRunLinksByMessageId
          : {},
      expandedRunOutputByRunId:
        snapshot?.ui && typeof snapshot.ui === 'object' && snapshot.ui.expandedRunOutputByRunId && typeof snapshot.ui.expandedRunOutputByRunId === 'object'
          ? snapshot.ui.expandedRunOutputByRunId
          : {},
      recoveryExpanded: Boolean(snapshot?.ui?.recoveryExpanded),
      showAllRuns: Boolean(snapshot?.ui?.showAllRuns),
      scopeRunsToWorkspace: snapshot?.ui?.scopeRunsToWorkspace !== false,
      openDrawer: null,
      statusSummaryText: typeof snapshot?.ui?.statusSummaryText === 'string' ? snapshot.ui.statusSummaryText : null,
    },
    runOutputTailByRunId:
      snapshot?.runOutputTailByRunId && typeof snapshot.runOutputTailByRunId === 'object' ? snapshot.runOutputTailByRunId : {},
    runArtifactSummaryByRunId: {},
    workspaceKey:
      activeWorkspaceKey !== '__none__' ? activeWorkspaceKey : typeof snapshot?.workspaceKey === 'string' ? snapshot.workspaceKey : activeWorkspaceKey,
    license: { tier: 'starter', lastCheckedAt: null },
    chat: [],
    executionTrace: { blocks: [] },
    fixBlocks: [],
    runs: [],
    receipt: null,
    deployment: {
      target: null,
      detectedTarget: null,
      detectedSignals: [],
      recommendedPackKey: null,
      targetIdentity: null,
      targetIdentitySource: 'unknown',
      targetIdentityEvidence: [],
      status: 'idle',
      verification: 'not-run',
      rollback: 'unknown',
      latestRunId: null,
      latestReceiptId: null,
      targetUrl: null,
      artifact: null,
      buildId: null,
      verificationEvidence: [],
      rollbackEvidence: [],
      summary: 'No deploy proof yet.',
      verificationSummary: 'Verification has not run yet.',
      rollbackSummary: 'Rollback truth is unknown until a deploy target is selected.',
      nextActionLabel: 'Run deploy preflight',
      updatedAt: null,
      source: 'none',
    },
    code: { files: [] },
    diagnostics: {
      mode: 'unknown',
      toolsCount: 0,
      agentRunning: false,
      conversationCount: 0,
      learnedCommandsCount: 0,
    },
    analytics: {
      starterIntentCount: Number(restoredAnalytics?.starterIntentCount || 0),
      inspectorOpenCount: Number(restoredAnalytics?.inspectorOpenCount || 0),
      runOutputExpandCount: Number(restoredAnalytics?.runOutputExpandCount || 0),
      proofBackedRunCount: Number(restoredAnalytics?.proofBackedRunCount || 0),
      lastStarterIntent:
        typeof restoredAnalytics?.lastStarterIntent === 'string' ? restoredAnalytics.lastStarterIntent : undefined,
      lastInspector: typeof restoredAnalytics?.lastInspector === 'string' ? restoredAnalytics.lastInspector : undefined,
      firstStarterIntentAt:
        typeof restoredAnalytics?.firstStarterIntentAt === 'number' ? restoredAnalytics.firstStarterIntentAt : undefined,
      firstProofBackedRunAt:
        typeof restoredAnalytics?.firstProofBackedRunAt === 'number' ? restoredAnalytics.firstProofBackedRunAt : undefined,
    },
    brain: { stats: null, events: [] },
    thinking: { active: false, message: '', stream: '' },
    runtime: {
      mode: typeof snapshot?.runtime?.mode === 'string' ? snapshot.runtime.mode : 'explain',
      autonomyEnabled: Boolean(snapshot?.runtime?.autonomyEnabled),
      autonomyLevel: typeof snapshot?.runtime?.autonomyLevel === 'string' ? snapshot.runtime.autonomyLevel : 'off',
      ipcCanonicalReady: false,
      rendererCanonicalReady: false,
    },
    marketplace: { loading: false, agents: [], installed: [] },
    capabilities: { loading: false, packs: [] },
  }

  initialState.deployment = deriveDeploymentState(initialState)
  return new WorkbenchStore(initialState)
}

function getSnapshotAnalyticsByWorkspace(snapshot: unknown): Record<string, WorkbenchState['analytics']> {
  if (!snapshot || typeof snapshot !== 'object') return {}
  const candidate = (snapshot as { analyticsByWorkspace?: unknown }).analyticsByWorkspace
  if (!candidate || typeof candidate !== 'object') return {}
  return candidate as Record<string, WorkbenchState['analytics']>
}
