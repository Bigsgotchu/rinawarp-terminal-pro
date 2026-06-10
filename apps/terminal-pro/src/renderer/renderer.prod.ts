/**
 * RinaWarp Terminal Pro - Production Renderer
 *
 * This module handles all DOM queries, event listeners, and panel logic
 * for the production build. It uses the window.rina API exposed via preload
 * to communicate with the main process.
 *
 * No inline scripts - all logic is in this module for CSP compliance.
 */

import { createActionsController } from './actions/actionController.js'
import { finalizeRendererBoot, installDensityBridge, resolveInitialWorkspaceKey } from './bootstrap/rendererBootLifecycle.js'
import { FixBlockManager } from './fixes/FixBlockManager.js'
import { createFixExecutionActions } from './fixes/fixExecutionActions.js'
import { registerRendererShortcuts } from './keyboard/registerRendererShortcuts.js'
import { AgentPanel } from './panels/AgentPanel.js'
import { createPaletteController } from './palette/paletteController.js'
import { ExecutionTracePanel } from './panels/ExecutionTracePanel.js'
import { createRefreshScheduler } from './refresh/refreshScheduler.js'
import { agentStepBlock } from './replies/renderFragments.js'
import { buildExecutionHaltContent } from './replies/renderExecutionReplies.js'
import {
  buildCapabilityDecisionContent,
  buildExecutionPlanContent,
  matchPromptCapability,
  resolvePlanCapabilityRequirements,
  resolvePromptCapability,
} from './replies/renderPlanReplies.js'
import { buildRinaReplyContent } from './replies/renderRinaReply.js'
import type {
  FixPlanResponse,
  PlanCapabilityRequirement,
} from './replies/renderPlanReplies.js'
import { bindRendererEvents } from './services/bindRendererEvents.js'
import { buildDebugSnapshot, installDebugEvidenceBridge } from './services/debugEvidence.js'
import { createAgentExecutionFlow } from './services/agentExecutionFlow.js'
import {
  composeCapabilityLead,
  composeExecutionHaltLead,
  composeExecutionPlanLead,
  composeMemoryContextNote,
  composePlanModeLead,
  composeRinaReplyLead,
} from './services/responseComposer.js'
import { buildTrustSnapshot, getAgentWorkspaceRootFromStore, getWorkspaceContextFromStore, getWorkspaceKeyFromStore, normalizeWorkspaceKey, setTransientStatusSummary } from './services/rendererCoreHelpers.js'
import { createRefreshActions } from './services/refreshData.js'
import { initRetentionLoop } from './services/retentionLoop.js'
import { initUpdateNotice } from './services/updateNotice.js'
import { initOperationalChrome } from './services/operationalChrome.js'
import { didExecutionStart, isExecutionPrompt, normalizePlanSteps } from './services/planHelpers.js'
import {
  bindRendererTelemetrySessionEnd,
  trackRendererBootTiming,
  startRendererTelemetrySession,
  trackRendererEvent,
  trackRendererFunnel,
} from './services/rendererTelemetry.js'
import { createRunLinkedMessage, scrollToMessage, scrollToRun } from './services/workbenchNavigation.js'
import { createWorkbenchShell } from './shell/workbenchShell.js'
import { initSettingsUi } from './settings/bootstrap.js'
import { createWorkbenchStore, persistWorkbenchState } from './state/workbenchBootstrap.js'
import { initRendererThemeCompat } from './theme/rendererThemeCompat.js'
import type { RinaRendererWindow } from './types/rendererWindow.js'
import { renderWorkbench } from './workbench/render.js'
declare const window: RinaRendererWindow

// ============================================================
// Command Palette
// ============================================================

// ============================================================
// Main Initialization
// ============================================================

async function populateWorkspaceContext(store: WorkbenchStore, projectRoot: string | null): Promise<void> {
  if (!projectRoot) {
    store.dispatch({ type: 'workspaceContext/set', context: {
      architecture: [],
      dependencies: [],
      runtimeFacts: [],
      deploymentFacts: [],
      conventions: [],
      preferences: [],
      confidenceSummary: { high: 0, medium: 0, low: 0 },
      conflictSummary: { totalConflicts: 0, conflicts: [] },
    }})
    return
  }
  try {
    const context = await window.rina.invoke('rina:workspace:context', { projectRoot })
    if (context) {
      store.dispatch({ type: 'workspaceContext/set', context })
    }
  } catch (error) {
    console.warn('[workspace-context] failed to populate context:', error instanceof Error ? error.message : String(error))
  }
}

// Initialize when DOM is ready
export async function initProductionRenderer(): Promise<void> {
  const bootStartedAt = performance.now()
  document.documentElement.setAttribute('data-rw-renderer', 'prod')
  console.log('Initializing RinaWarp Terminal Pro - Production Renderer')
  if (location.pathname.includes('dist-electron/renderer')) {
    console.warn('[ui] refusing to use location.pathname as workspace root')
  }
  initRendererThemeCompat()
  const initialWorkspaceKey = await resolveInitialWorkspaceKey(normalizeWorkspaceKey)
  const store = createWorkbenchStore(initialWorkspaceKey)
  if (navigator.webdriver) {
    window.__rinaE2EWorkbench = {
      dispatch: (action) => store.dispatch(action),
      getState: () => store.getState(),
    }
  }
  store.dispatch({ type: 'workspace/set', workspaceKey: initialWorkspaceKey })
  await populateWorkspaceContext(store, getAgentWorkspaceRootFromStore(store))
  const { hydrateCanonicalThread } = await import('../workbench/store/hydrateThread.ts')
  const hydrated = hydrateCanonicalThread(store.getState(), initialWorkspaceKey)
  if (hydrated.length > 0 && store.getState().thread.length === 0) {
    store.dispatch({ type: 'thread/replace', items: hydrated })
  }
  const unbindDebugEvidence = await installDebugEvidenceBridge({
    getState: () => store.getState(),
  })
  window.__rinaDebugEvidence = {
    getSnapshot: () => buildDebugSnapshot(store.getState()),
  }
  store.subscribe((state) => {
    renderWorkbench(state)
    persistWorkbenchState(store)
  })
  const {
    refreshRuns,
    refreshCode,
    refreshDiagnostics,
    refreshBrainStats,
    refreshRuntimeStatus,
    refreshMarketplace,
    refreshCapabilityPacks,
  } = createRefreshActions({
    getWorkspaceKey: getWorkspaceKeyFromStore,
    getAgentWorkspaceRoot: getAgentWorkspaceRootFromStore,
  })
  initSettingsUi()
  void initOperationalChrome()
  initUpdateNotice()
  const unbindRetentionLoop = initRetentionLoop(store)
  installDensityBridge()
  const workbenchShell = createWorkbenchShell({
    store,
    trackRendererEvent,
    refreshers: {
      refreshRuns,
      refreshCode,
      refreshDiagnostics,
      refreshRuntimeStatus,
      refreshMarketplace,
      refreshCapabilityPacks,
    },
  })
  workbenchShell.mount()

  // Create panel instances
  const executionTracePanel = new ExecutionTracePanel('#panel-execution-trace', store)
  const agentPanel = new AgentPanel('#panel-agent', store, {
    getWorkspaceKey: getWorkspaceKeyFromStore,
    renderAgentStepBlock: agentStepBlock,
  })
  const fixBlockManager = new FixBlockManager(store)
  const { commitStartedExecutionResult, sendPromptToRina, startFixProjectFlow } = createAgentExecutionFlow({
    getWorkspaceKey: getWorkspaceKeyFromStore,
    getAgentWorkspaceRoot: getAgentWorkspaceRootFromStore,
    trackRendererFunnel,
    matchPromptCapability,
    resolvePromptCapability,
    refreshCapabilityPacks,
    isExecutionPrompt,
    normalizePlanSteps,
    resolvePlanCapabilityRequirements,
    buildExecutionPlanContent,
    buildCapabilityDecisionContent,
    buildExecutionHaltContent,
    buildRinaReplyContent,
    composeRinaReplyLead,
    composeExecutionPlanLead,
    composePlanModeLead,
    composeCapabilityLead,
    composeExecutionHaltLead,
    composeMemoryContextNote,
    didExecutionStart,
  })
  const { runFixStepFromStore, autoApplyFixFromStore } = createFixExecutionActions({
    normalizePlanSteps,
    createRunLinkedMessage: (store, args) => createRunLinkedMessage(store, args, getWorkspaceKeyFromStore),
    commitStartedExecutionResult,
    didExecutionStart,
  })
  const actionsController = createActionsController({
    root: document,
    store,
    fixBlockManager,
    deps: {
      trackRendererEvent,
      sendPromptToRina,
      startFixProjectFlow,
      mountPendingFixProjectBlock: (projectRoot) => {
        const fix = fixBlockManager.createPendingFixProjectBlock(projectRoot)
        agentPanel.mountFixBlock(fix)
        return fix.id
      },
      mountFixProjectBlock: (result, projectRoot, fixId) => {
        const fix = fixBlockManager.createFixProjectBlock(result, projectRoot, fixId)
        agentPanel.mountFixBlock(fix)
        return fix.id
      },
      scrollToRun,
      scrollToMessage,
      autoApplyFixFromStore,
      runFixStepFromStore,
      refreshMarketplace,
      refreshCapabilityPacks,
      getAgentWorkspaceRoot: () => getAgentWorkspaceRootFromStore(store),
      normalizePlanSteps,
      resolvePlanCapabilityRequirements,
      buildExecutionPlanContent: (prompt: string, plan: FixPlanResponse, requirements?: PlanCapabilityRequirement[]) =>
        buildExecutionPlanContent(prompt, plan, requirements),
      commitStartedExecutionResult,
      buildExecutionHaltContent: (prompt: string, reason: string) => buildExecutionHaltContent(prompt, reason),
      buildInterruptedRunRecoveryPrompt,
      buildTrustSnapshot,
      setTransientStatusSummary,
      getWorkspaceKey: () => getWorkspaceKeyFromStore(store),
    },
  })
  actionsController.mount()

  // Create cleanup functions that will be called on beforeunload
  let cleanupFns: Array<() => void> = []
  cleanupFns.push(() => actionsController.unmount())
  cleanupFns.push(() => agentPanel.destroy())
  cleanupFns.push(() => workbenchShell.unmount())
  cleanupFns.push(() => {
    delete window.__rinaDebugEvidence
  })
  const cleanupBeforeUnload = () => {
    cleanupFns.forEach((fn) => fn())
    cleanupFns = []
  }
  globalThis.addEventListener(
    'beforeunload',
    cleanupBeforeUnload,
    { once: true }
  )

  void refreshRuns(store, { markRestored: true })
  void refreshCode(store)
  void refreshDiagnostics(store)
  void refreshBrainStats(store)
  void refreshRuntimeStatus(store)
  void refreshMarketplace(store)
  void refreshCapabilityPacks(store)
  const refreshScheduler = createRefreshScheduler([
    { run: () => refreshDiagnostics(store), intervalMs: 10_000 },
    { run: () => refreshBrainStats(store), intervalMs: 5_000 },
    { run: () => refreshRuntimeStatus(store), intervalMs: 10_000 },
  ])
  refreshScheduler.start()
  cleanupFns.push(() => refreshScheduler.stop())

  const commandPalette = createPaletteController({
    sendPrompt: (prompt: string) => sendPromptToRina(store, prompt),
    navigateToPanel: (panel) => workbenchShell.navigateToPanel(panel, { source: 'command_palette' }),
    setRuntimeMode: (mode) => workbenchShell.setRuntimeMode(mode, { source: 'command_palette' }),
  })
  commandPalette.mount()
  cleanupFns.push(() => commandPalette.unmount())

  const unregisterShortcuts = registerRendererShortcuts({
    togglePalette: () => commandPalette.toggle(),
    hidePalette: () => commandPalette.hide(),
    toggleSettings: () => {
      if (window.__rinaSettings?.isOpen()) {
        window.__rinaSettings.close()
        return
      }
      window.__rinaSettings?.open()
    },
    closeSettings: () => window.__rinaSettings?.close(),
  })
  cleanupFns.push(() => unregisterShortcuts())

  const unbindRendererEvents = bindRendererEvents({
    store,
    fixBlockManager,
    executionTracePanel,
    trackRendererEvent,
    trackRendererFunnel,
    refreshRuns,
    refreshDiagnostics,
    refreshCode,
  })
  cleanupFns.push(() => unbindRendererEvents())
  cleanupFns.push(() => unbindDebugEvidence())
  cleanupFns.push(() => unbindRetentionLoop())

  await startRendererTelemetrySession()
  const unbindRendererTelemetrySessionEnd = bindRendererTelemetrySessionEnd()
  cleanupFns.push(() => unbindRendererTelemetrySessionEnd())

  await finalizeRendererBoot(store)
  void trackRendererBootTiming(performance.now() - bootStartedAt, {
    workspace_key: getWorkspaceKeyFromStore(store),
    runs_visible: store.getState().runs.length,
    restored_run_count: store.getState().runs.filter((entry) => entry.restored).length,
  })
}
