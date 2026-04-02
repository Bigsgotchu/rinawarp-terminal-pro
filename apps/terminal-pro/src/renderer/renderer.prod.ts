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
  composePlanModeLead,
  composeRinaReplyLead,
} from './services/responseComposer.js'
import {
  buildInterruptedRunRecoveryPrompt,
  buildTrustSnapshot,
  getAgentWorkspaceRootFromStore,
  getWorkspaceKeyFromStore,
  normalizeWorkspaceKey,
  setTransientStatusSummary,
} from './services/rendererCoreHelpers.js'
import { createRefreshActions } from './services/refreshData.js'
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

// Initialize when DOM is ready
export async function initProductionRenderer(): Promise<void> {
  const bootStartedAt = performance.now()
  console.log('[ui] renderer.prod boot', new Date().toISOString())
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
  globalThis.addEventListener(
    'beforeunload',
    () => {
      actionsController.unmount()
      commandPalette.unmount()
      agentPanel.destroy()
      refreshScheduler.stop()
      unbindRendererEvents()
      unbindDebugEvidence()
      unbindRendererTelemetrySessionEnd()
      workbenchShell.unmount()
      unregisterShortcuts()
      delete window.__rinaDebugEvidence
    },
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

  const commandPalette = createPaletteController({
    sendPrompt: (prompt: string) => sendPromptToRina(store, prompt),
    navigateToPanel: (panel) => workbenchShell.navigateToPanel(panel, { source: 'command_palette' }),
    setRuntimeMode: (mode) => workbenchShell.setRuntimeMode(mode, { source: 'command_palette' }),
  })
  commandPalette.mount()
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

  await startRendererTelemetrySession()
  const unbindRendererTelemetrySessionEnd = bindRendererTelemetrySessionEnd()

  await finalizeRendererBoot(store)
  void trackRendererBootTiming(performance.now() - bootStartedAt, {
    workspace_key: getWorkspaceKeyFromStore(store),
    runs_visible: store.getState().runs.length,
    restored_run_count: store.getState().runs.filter((entry) => entry.restored).length,
  })
}
