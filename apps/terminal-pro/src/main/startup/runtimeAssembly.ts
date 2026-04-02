import type {
  AgentdRuntime,
  AgentdClient,
  DiagnosticsRuntime,
  IpcRegistrationDeps,
  MemoryIpcDeps,
  PlanRunRegistry,
  PlanExecutionHelpers,
  PolicyGateHelpers,
  RegisterPostStartupIpcAndServicesDeps,
  RegisterAnalyticsIpcDeps,
  RegisterRinaIpcDeps,
  RuntimeDiagnosticsHelpers,
  ExecutionRuntime,
  LicenseStateHelpers,
  LicensingRuntime,
  ProjectRootResolver,
  RegistrationRuntime,
  RunsRuntime,
  RunsIpcHelpers,
  SessionHelpers,
  StartupRuntime,
  TeamRuntime,
  ThemeRegistryDeps,
  UpdateIpcDeps,
  PtyRuntimeHelpers,
  WindowsRuntime,
} from "./runtimeTypes.js";
import type { RegisterAgentExecutionArgs } from "../ipc/agentExecutionFlow.js";

type AnyFn = (...args: any[]) => any;

export function buildRuntimeSurfaces(args: {
  bootstrapAuth: StartupRuntime["bootstrapAuth"];
  restoreEntitlements: StartupRuntime["restoreEntitlements"];
  initializeAnalyticsSession: StartupRuntime["initializeAnalyticsSession"];
  maybeAutoStartDaemon: StartupRuntime["maybeAutoStartDaemon"];
  createWindow: WindowsRuntime["createWindow"];
  devtoolsToggleForIpc: WindowsRuntime["devtoolsToggleForIpc"];
  closePtyForWebContents: WindowsRuntime["closePtyForWebContents"];
  ptySessions: WindowsRuntime["ptySessions"];
  daemonStatus: AgentdRuntime["daemonStatus"];
  daemonTasks: AgentdRuntime["daemonTasks"];
  daemonTaskAdd: AgentdRuntime["daemonTaskAdd"];
  daemonStart: AgentdRuntime["daemonStart"];
  daemonStop: AgentdRuntime["daemonStop"];
  fetchRemotePlanForIpc: AgentdRuntime["fetchRemotePlanForIpc"];
  executeRemotePlanForIpc: AgentdRuntime["executeRemotePlanForIpc"];
  getLicenseState: LicensingRuntime["getLicenseState"];
  getLicenseToken: LicensingRuntime["getLicenseToken"];
  applyVerifiedLicense: LicenseStateHelpers["applyVerifiedLicense"];
  resetLicenseToStarter: LicensingRuntime["resetLicenseToStarter"];
  refreshLicenseState: LicensingRuntime["refreshLicenseState"];
  diagnoseHotLinux: RuntimeDiagnosticsHelpers["diagnoseHotLinux"];
  runCommandOnce: RuntimeDiagnosticsHelpers["runCommandOnce"];
  runGatherCommand: RuntimeDiagnosticsHelpers["runGatherCommand"];
  diagnosticsBundleDeps: DiagnosticsRuntime["diagnosticsBundleDeps"];
  explainPolicy: DiagnosticsRuntime["explainPolicy"];
  redactionPreviewForIpc: DiagnosticsRuntime["redactionPreviewForIpc"];
  supportBundleForIpcWithSnapshot: DiagnosticsRuntime["supportBundleForIpcWithSnapshot"];
  engine: ExecutionRuntime["engine"];
  executeViaEngine: ExecutionRuntime["executeViaEngine"];
  terminalWriteSafetyFields: ExecutionRuntime["terminalWriteSafetyFields"];
  getLicenseTier: ExecutionRuntime["getLicenseTier"];
  openRunsFolderForIpc: RunsRuntime["openRunsFolderForIpc"];
  revealRunReceiptForIpc: RunsRuntime["revealRunReceiptForIpc"];
  buildAgentdHeaders: AgentdClient["buildAgentdHeaders"];
  agentdJson: AgentdClient["agentdJson"];
  runsListForIpc: RunsIpcHelpers["runsListForIpc"];
  runsTailForIpc: RunsIpcHelpers["runsTailForIpc"];
  runsArtifactsForIpc: RunsIpcHelpers["runsArtifactsForIpc"];
  getCurrentRole: TeamRuntime["getCurrentRole"];
  hasRoleAtLeast: TeamRuntime["hasRoleAtLeast"];
  loadTeamDb: TeamRuntime["loadTeamDb"];
  saveTeamDb: TeamRuntime["saveTeamDb"];
  normalizeRole: TeamRuntime["normalizeRole"];
  accountPlanForIpc: TeamRuntime["accountPlanForIpc"];
  teamWorkspaceCreateForIpc: TeamRuntime["teamWorkspaceCreateForIpc"];
  teamWorkspaceGetForIpc: TeamRuntime["teamWorkspaceGetForIpc"];
  teamInvitesListForIpc: TeamRuntime["teamInvitesListForIpc"];
  teamInviteCreateForIpc: TeamRuntime["teamInviteCreateForIpc"];
  teamInviteRevokeForIpc: TeamRuntime["teamInviteRevokeForIpc"];
  teamAuditListForIpc: TeamRuntime["teamAuditListForIpc"];
  teamBillingEnforcementForIpc: TeamRuntime["teamBillingEnforcementForIpc"];
}): {
  startup: StartupRuntime;
  windows: WindowsRuntime;
  agentd: AgentdRuntime;
  licensing: LicensingRuntime;
  diagnostics: DiagnosticsRuntime;
  execution: ExecutionRuntime;
  runs: RunsRuntime;
  team: TeamRuntime;
} {
  return {
    startup: {
      bootstrapAuth: args.bootstrapAuth,
      restoreEntitlements: args.restoreEntitlements,
      initializeAnalyticsSession: args.initializeAnalyticsSession,
      maybeAutoStartDaemon: args.maybeAutoStartDaemon,
    },
    windows: {
      createWindow: args.createWindow,
      devtoolsToggleForIpc: args.devtoolsToggleForIpc,
      closePtyForWebContents: args.closePtyForWebContents,
      ptySessions: args.ptySessions,
    },
    agentd: {
      buildAgentdHeaders: args.buildAgentdHeaders,
      agentdJson: args.agentdJson,
      daemonStatus: args.daemonStatus,
      daemonTasks: args.daemonTasks,
      daemonTaskAdd: args.daemonTaskAdd,
      daemonStart: args.daemonStart,
      daemonStop: args.daemonStop,
      fetchRemotePlanForIpc: args.fetchRemotePlanForIpc,
      executeRemotePlanForIpc: args.executeRemotePlanForIpc,
    },
    licensing: {
      getLicenseState: args.getLicenseState,
      getLicenseToken: args.getLicenseToken,
      applyVerifiedLicense: args.applyVerifiedLicense,
      resetLicenseToStarter: args.resetLicenseToStarter,
      refreshLicenseState: args.refreshLicenseState,
    },
    diagnostics: {
      diagnoseHotLinux: args.diagnoseHotLinux,
      runCommandOnce: args.runCommandOnce,
      runGatherCommand: args.runGatherCommand,
      diagnosticsBundleDeps: args.diagnosticsBundleDeps,
      explainPolicy: args.explainPolicy,
      redactionPreviewForIpc: args.redactionPreviewForIpc,
      supportBundleForIpcWithSnapshot: args.supportBundleForIpcWithSnapshot,
    },
    execution: {
      engine: args.engine,
      executeViaEngine: args.executeViaEngine,
      terminalWriteSafetyFields: args.terminalWriteSafetyFields,
      getLicenseTier: args.getLicenseTier,
    },
    runs: {
      openRunsFolderForIpc: args.openRunsFolderForIpc,
      revealRunReceiptForIpc: args.revealRunReceiptForIpc,
      runsListForIpc: args.runsListForIpc,
      runsTailForIpc: args.runsTailForIpc,
      runsArtifactsForIpc: args.runsArtifactsForIpc,
    },
    team: {
      getCurrentRole: args.getCurrentRole,
      hasRoleAtLeast: args.hasRoleAtLeast,
      loadTeamDb: args.loadTeamDb,
      saveTeamDb: args.saveTeamDb,
      normalizeRole: args.normalizeRole,
      accountPlanForIpc: args.accountPlanForIpc,
      teamWorkspaceCreateForIpc: args.teamWorkspaceCreateForIpc,
      teamWorkspaceGetForIpc: args.teamWorkspaceGetForIpc,
      teamInvitesListForIpc: args.teamInvitesListForIpc,
      teamInviteCreateForIpc: args.teamInviteCreateForIpc,
      teamInviteRevokeForIpc: args.teamInviteRevokeForIpc,
      teamAuditListForIpc: args.teamAuditListForIpc,
      teamBillingEnforcementForIpc: args.teamBillingEnforcementForIpc,
    },
  };
}

export function buildRegistrationRuntime(args: {
  deps: IpcRegistrationDeps & {
    ipcMain: unknown;
    resolveProjectRootSafe: ProjectRootResolver;
    riskFromPlanStep: AnyFn;
    gateProfileCommand: AnyFn;
    trackFunnelStep: RegisterAnalyticsIpcDeps["trackFunnelStep"];
    trackEvent: RegisterAnalyticsIpcDeps["trackEvent"];
    getUsageStatus: RegisterAnalyticsIpcDeps["getUsageStatus"];
    isUsageTrackingEnabled: RegisterAnalyticsIpcDeps["isUsageTrackingEnabled"];
    enableUsageTracking: RegisterAnalyticsIpcDeps["enableUsageTracking"];
    disableUsageTracking: AnyFn;
    trackCommandExecuted: RegisterAnalyticsIpcDeps["trackCommandExecuted"];
    trackAISuggestionUsed: RegisterAnalyticsIpcDeps["trackAISuggestionUsed"];
    trackSelfHealingRun: RegisterAnalyticsIpcDeps["trackSelfHealingRun"];
    trackTerminalSessionStart: RegisterAnalyticsIpcDeps["trackTerminalSessionStart"];
    diagnosticsPathsForIpc: RegisterRinaIpcDeps["diagnosticsPathsForIpc"];
  };
  team: TeamRuntime;
  runs: RunsRuntime;
  diagnostics: DiagnosticsRuntime;
  agentd: AgentdRuntime;
  themeRegistryDeps: ThemeRegistryDeps;
  memoryIpcDeps: MemoryIpcDeps;
  updateIpcDeps: UpdateIpcDeps;
  workspacePickForIpc: RegisterRinaIpcDeps["workspacePickForIpc"];
  workspaceDefaultForIpc: RegisterRinaIpcDeps["workspaceDefaultForIpc"];
  fixProjectForIpc: AnyFn;
  newPlanRunId: PlanExecutionHelpers["newPlanRunId"];
  ensureStructuredSession: SessionHelpers["ensureStructuredSession"];
  runningPlanRuns: PlanRunRegistry;
  safeSend: AnyFn;
  evaluatePolicyGate: PolicyGateHelpers["evaluatePolicyGate"];
  pipeAgentdSseToRenderer: PlanExecutionHelpers["pipeAgentdSseToRenderer"];
  createStreamId: PtyRuntimeHelpers["createStreamId"];
  streamCancelForIpc: PlanExecutionHelpers["streamCancelForIpc"];
  streamKillForIpc: PlanExecutionHelpers["streamKillForIpc"];
  planStopForIpc: PlanExecutionHelpers["planStopForIpc"];
}): RegistrationRuntime {
  const postStartupDeps: RegisterPostStartupIpcAndServicesDeps = {
    registerPtyHandlers: args.deps.registerPtyHandlers,
    registerAgentExecutionIpc: args.deps.registerAgentExecutionIpc,
    agentExecutionIpcDeps: {
      ipcMain: args.deps.ipcMain as RegisterAgentExecutionArgs["ipcMain"],
      newPlanRunId: args.newPlanRunId,
      resolveProjectRootSafe: args.deps.resolveProjectRootSafe,
      ensureStructuredSession: args.ensureStructuredSession,
      runningPlanRuns: args.runningPlanRuns,
      safeSend: args.safeSend,
      riskFromPlanStep: args.deps.riskFromPlanStep,
      gateProfileCommand: args.deps.gateProfileCommand,
      evaluatePolicyGate: args.evaluatePolicyGate,
      executeRemotePlan: args.agentd.executeRemotePlanForIpc,
      pipeAgentdSseToRenderer: args.pipeAgentdSseToRenderer,
      createStreamId: args.createStreamId,
      streamCancel: args.streamCancelForIpc,
      streamKill: args.streamKillForIpc,
      planStop: args.planStopForIpc,
    },
    registerAnalyticsIpc: args.deps.registerAnalyticsIpc,
    analyticsIpcDeps: {
      ipcMain: args.deps.ipcMain,
      trackFunnelStep: args.deps.trackFunnelStep,
      trackEvent: args.deps.trackEvent,
      getUsageStatus: args.deps.getUsageStatus,
      isUsageTrackingEnabled: args.deps.isUsageTrackingEnabled,
      enableUsageTracking: args.deps.enableUsageTracking,
      disableUsageTracking: args.deps.disableUsageTracking,
      trackCommandExecuted: args.deps.trackCommandExecuted,
      trackAISuggestionUsed: args.deps.trackAISuggestionUsed,
      trackSelfHealingRun: args.deps.trackSelfHealingRun,
      trackTerminalSessionStart: args.deps.trackTerminalSessionStart,
    },
    registerRinaPlanIpc: args.deps.registerRinaPlanIpc,
    rinaPlanIpcDeps: {
      ipcMain: args.deps.ipcMain,
      resolveProjectRootSafe: args.deps.resolveProjectRootSafe,
      fetchRemotePlanForIpc: args.agentd.fetchRemotePlanForIpc,
    },
    registerRinaIpc: args.deps.registerRinaIpc,
    rinaIpcDeps: {
      ipcMain: args.deps.ipcMain,
      openRunsFolderForIpc: args.runs.openRunsFolderForIpc,
      revealRunReceiptForIpc: args.runs.revealRunReceiptForIpc,
      fixProjectForIpc: (projectRoot: unknown) =>
        args.fixProjectForIpc(args.deps.resolveProjectRootSafe(projectRoot)),
      explainPolicy: args.diagnostics.explainPolicy,
      redactionPreviewForIpc: args.diagnostics.redactionPreviewForIpc,
      diagnosticsPathsForIpc: args.deps.diagnosticsPathsForIpc,
      diagnosticsBundleDeps: args.diagnostics.diagnosticsBundleDeps,
      supportBundleForIpcWithSnapshot:
        args.diagnostics.supportBundleForIpcWithSnapshot,
      workspacePickForIpc: args.workspacePickForIpc,
      workspaceDefaultForIpc: args.workspaceDefaultForIpc,
    },
    registerTeamIpc: args.deps.registerTeamIpc,
    teamIpcDeps: {
      ipcMain: args.deps.ipcMain,
      accountPlanForIpc: args.team.accountPlanForIpc,
      teamWorkspaceCreateForIpc: args.team.teamWorkspaceCreateForIpc,
      teamWorkspaceGetForIpc: args.team.teamWorkspaceGetForIpc,
      teamInvitesListForIpc: args.team.teamInvitesListForIpc,
      teamInviteCreateForIpc: args.team.teamInviteCreateForIpc,
      teamInviteRevokeForIpc: args.team.teamInviteRevokeForIpc,
      teamAuditListForIpc: args.team.teamAuditListForIpc,
      teamBillingEnforcementForIpc: args.team.teamBillingEnforcementForIpc,
      loadTeamDb: args.team.loadTeamDb,
      saveTeamDb: args.team.saveTeamDb,
      normalizeRole: args.team.normalizeRole,
    },
    registerThemeHandlers: args.deps.registerThemeHandlers,
    ipcMain: args.deps.ipcMain,
    themeRegistryDeps: args.themeRegistryDeps,
    registerMemoryIpc: args.deps.registerMemoryIpc,
    memoryIpcDeps: args.memoryIpcDeps,
    registerUpdateIpc: args.deps.registerUpdateIpc,
    updateIpcDeps: args.updateIpcDeps,
  };
  return {
    registerTeamStateIpc() {
      args.deps.registerTeamStateIpc({
        ipcMain: args.deps.ipcMain,
        loadTeamDb: args.team.loadTeamDb,
        getCurrentRole: args.team.getCurrentRole,
      });
    },
    registerPostStartupIpcAndServices() {
      args.deps.registerPostStartupIpcAndServices(postStartupDeps);
    },
  };
}
