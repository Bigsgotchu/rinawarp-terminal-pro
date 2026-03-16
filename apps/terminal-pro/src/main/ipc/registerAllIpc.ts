import type { IpcMain } from 'electron'
import type { PersonalityStore } from '../../personality.js'
import type { AppContext } from '../context.js'
import type { LicenseVerifyResponse } from '../../license.js'
import type { ShellKind } from '../../prompt-boundary.js'
import { rinaController } from '../../rina/index.js'
import type { AgentPlan } from './agent.js'
import { registerDiagnosticsIpc } from '../diagnostics.js'
import { registerAgentIpc } from './agent.js'
import { registerChatIpc } from './chat.js'
import { registerSystemIpc } from './system.js'
import { registerDevIpc } from './dev.js'
import { registerLicenseIpc } from './registerLicenseIpc.js'
import { registerMemoryIpc } from './registerMemoryIpc.js'
import { registerThemesIpc, type ThemeSpec } from './registerThemesIpc.js'
import { registerUpdatesIpc } from './registerUpdatesIpc.js'
import { registerAgentPlanningIpc } from './registerAgentPlanningIpc.js'
import { registerAgentExecutionIpc } from './registerAgentExecutionIpc.js'
import { registerOrchestratorIpc } from './registerOrchestratorIpc.js'
import { registerDoctorIpc } from './registerDoctorIpc.js'
import { registerWorkspaceIpc } from './registerWorkspaceIpc.js'
import { registerCodeIpc } from './registerCodeIpc.js'
import { registerHistoryIpc } from './registerHistoryIpc.js'
import { registerShareIpc } from './registerShareIpc.js'
import { registerTeamIpc } from './registerTeamIpc.js'
import { registerExportIpc } from './registerExportIpc.js'
import { registerAnalyticsIpc } from './registerAnalyticsIpc.js'
import { registerPersonalityIpc } from './registerPersonalityIpc.js'
import { registerPolicyIpc } from './registerPolicyIpc.js'
import { registerSessionIpc } from './registerSessionIpc.js'
import { registerPtyIpc } from './registerPtyIpc.js'
import { registerUtilityIpc } from './registerUtilityIpc.js'
import { registerSecureAgentIpc } from './secure-agent.js'
import { registerTerminalIpc } from './registerTerminalIpc.js'
import { registerTelemetryIpc } from './registerTelemetryIpc.js'

// Runtime guard to prevent double-registration (e.g., during hot reload)
declare global {
  var __rinaIpcRegistered: boolean | undefined
}

// eslint-disable-next-line max-lines-per-function
export function registerAllIpc(args: {
  ipcMain: IpcMain
  app: Electron.App
  ctx: AppContext
  mainPath: string
  repoRoot: string
  appProjectRoot: string
  dirname: string
  loadThemeRegistryMerged: () => { themes: ThemeSpec[] }
  loadSelectedThemeId: () => string
  saveSelectedThemeId: (id: string) => void
  loadCustomThemeRegistry: () => { themes: ThemeSpec[] }
  validateTheme: (theme: ThemeSpec) => { ok: boolean; error?: string }
  writeJsonFile: (p: string, value: unknown) => void
  customThemesFile: () => string
  operationalMemory: {
    getRecent: (category: string) => any[]
    set: (category: string, key: string, value: string) => void
  }
  addTranscriptEntry: (entry: {
    type: 'memory'
    timestamp: string
    category: string
    key: string
    value: string
  }) => void
  personalityStore: PersonalityStore
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string
  resetLicenseToStarter: () => void
  saveEntitlements: () => void
  shell: { openExternal: (url: string) => Promise<void> }
  getLicenseState: () => {
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }
  getCurrentLicenseCustomerId: () => string | null
  currentPolicyEnv: () => string
  getCurrentRole: () => string
  explainPolicy: (command: string) => {
    env: string
    action: string
    approval: string
    message: string
    typedPhrase?: string
    matchedRuleId?: string
  }
  readTailLines: (filePath: string, maxLines: number) => string
  rendererErrorsFile: () => string
  getSessionTranscript: () => unknown
  exportTranscript: (format: 'json' | 'text') => string
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
  runUnifiedSearch: (query: string, limit?: number) => unknown
  detectCommandBoundaries: (transcript: string, shellHint?: ShellKind) => unknown
  ptySessions: Map<number, any>
  ptyResizeTimers: Map<number, NodeJS.Timeout>
  getPtyModule: () => Promise<any>
  getDefaultShell: () => string
  resolvePtyCwd: (input?: string) => string
  safeEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv
  shellToKind: (shell: string) => unknown
  finalizePtyBoundaries: (webContents: Electron.WebContents, session: any, flushAll?: boolean) => void
  closePtyForWebContents: (webContentsId: number) => void
  safeSend: (target: Electron.WebContents | null | undefined, channel: string, payload?: unknown) => boolean
  forRendererDisplay: (text: string) => string
  isE2E: boolean
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: {
    status?: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
    deadLetter?: boolean
  }) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
  makePlan: (intent: string, projectRoot?: string) => any
  redactTextForPlan: (text: string) => { redactedText: string }
  fetchRemotePlan: (payload: { intentText: string; projectRoot: string }) => Promise<any>
  allowLocalEngineFallback: boolean
  newPlanRunId: () => string
  resolveProjectRootSafe: (input?: string) => string
  ensureStructuredSession: (args: { source: string; projectRoot: string; preferredId?: string }) => void
  runningPlanRuns: Map<string, { stopped: boolean; currentStreamId?: string; agentdPlanRunId?: string }>
  riskFromPlanStep: (step: any) => 'read' | 'safe-write' | 'high-impact'
  gateProfileCommand: (args: {
    projectRoot: string
    command: string
    risk: 'read' | 'safe-write' | 'high-impact'
    confirmed: boolean
    confirmationText: string
  }) => { ok: true } | { ok: false; message: string }
  evaluatePolicyGate: (
    command: string,
    confirmed: boolean,
    confirmationText: string
  ) => { ok: boolean; message?: string }
  executeRemotePlan: (payload: {
    plan: any[]
    projectRoot: string
    confirmed: boolean
    confirmationText: string
  }) => Promise<{ ok: true; planRunId: string }>
  pipeAgentdSseToRenderer: (args: {
    eventSender: Electron.WebContents
    localPlanRunId: string
    agentdPlanRunId: string
    runId: string
  }) => Promise<string | undefined>
  createStreamId: () => string
  startStreamingStepViaEngine: (args: {
    webContents: Electron.WebContents
    streamId: string
    step: { id: string; tool: 'terminal'; command: string; risk: 'read' | 'safe-write' | 'high-impact' }
    confirmed: boolean
    confirmationText: string
    projectRoot: string
  }) => Promise<unknown>
  haltReasonFromFallbackStep: (result: any) => string | null
  executeStepStreamForIpc: (args: {
    eventSender: Electron.WebContents
    step: any
    confirmed: boolean
    confirmationText: string
    projectRoot: string
  }) => Promise<{ streamId: string }>
  streamCancelForIpc: (streamId: string) => Promise<unknown>
  streamKillForIpc: (streamId: string) => Promise<unknown>
  planStopForIpc: (planRunId: string) => Promise<unknown>
  orchestratorIssueToPrForIpc: (args: {
    issueId: string
    repoPath: string
    branchName?: string
    command?: string
    repoSlug?: string
    push?: boolean
    prDryRun?: boolean
    baseBranch?: string
    prTitle?: string
    prBody?: string
    commitMessage?: string
  }) => Promise<any>
  orchestratorGraphForIpc: () => Promise<any>
  orchestratorPrepareBranchForIpc: (args: { repoPath: string; issueId?: string; branchName?: string }) => Promise<any>
  orchestratorCreatePrForIpc: (args: {
    repoSlug: string
    head: string
    base?: string
    title: string
    body?: string
    draft?: boolean
    dryRun?: boolean
    workflowId?: string
    issueId?: string
    branchName?: string
  }) => Promise<any>
  orchestratorPrStatusForIpc: (args: {
    workflowId: string
    status: 'planned' | 'opened' | 'merged' | 'closed' | 'failed'
    issueId?: string
    branchName?: string
    repoSlug?: string
    mode?: 'dry_run' | 'live'
    number?: number
    url?: string
    error?: string
  }) => Promise<any>
  orchestratorWebhookAuditForIpc: (args?: {
    limit?: number
    outcome?: 'accepted' | 'rejected'
    mapped?: 'pr_status' | 'ci_status' | 'review_revision'
  }) => Promise<any>
  orchestratorCiStatusForIpc: (args: {
    workflowId: string
    provider: string
    status: 'queued' | 'running' | 'passed' | 'failed'
    url?: string
    autoRetry?: boolean
    repoPath?: string
    issueId?: string
    branchName?: string
    command?: string
    repoSlug?: string
    baseBranch?: string
    prDryRun?: boolean
  }) => Promise<any>
  orchestratorReviewCommentForIpc: (args: {
    workflowId: string
    repoPath: string
    issueId: string
    branchName: string
    comment: string
    command?: string
    repoSlug?: string
    baseBranch?: string
    prDryRun?: boolean
  }) => Promise<any>
  chatSendForIpc: (text: string, projectRoot?: string) => Promise<unknown>
  chatExportForIpc: () => Promise<string>
  doctorPlanForIpc: (args: { projectRoot: string; symptom: string }) => Promise<unknown>
  doctorInspectForIpc: (intent: string) => Promise<unknown>
  doctorCollectForIpc: (steps: any[], streamCallback?: unknown) => Promise<unknown>
  doctorInterpretForIpc: (payload: { intent: string; evidence: any }) => Promise<unknown>
  doctorVerifyForIpc: (payload: { intent: string; before: any; after: any; diagnosis?: any }) => Promise<unknown>
  doctorExecuteFixForIpc: (plan: any, confirmed: boolean, confirmationText: string) => Promise<unknown>
  doctorTranscriptGetForIpc: () => Promise<unknown>
  doctorTranscriptExportForIpc: (format: 'json' | 'text') => Promise<unknown>
  workspacePickDirectoryForIpc: () => Promise<string | null>
  workspacePickForIpc: () => Promise<{ ok: boolean; path?: string }>
  workspaceDefaultForIpc: (senderId: number) => Promise<{ ok: boolean; path: string }>
  codeListFilesForIpc: (payload?: { projectRoot?: string; limit?: number }) => Promise<{
    ok: boolean
    files?: string[]
    error?: string
  }>
  codeReadFileForIpc: (payload?: {
    projectRoot?: string
    relativePath?: string
    maxBytes?: number
  }) => Promise<{ ok: boolean; content?: string; relativePath?: string; truncated?: boolean; error?: string }>
  historyImportForIpc: (limit?: number) => Promise<unknown>
  sharePreviewForIpc: (payload: { content: string }) => Promise<unknown>
  shareCreateForIpc: (payload: {
    title?: string
    content?: string
    expiresDays?: number
    requiredRole?: 'owner' | 'operator' | 'viewer'
    previewId?: string
  }) => Promise<unknown>
  shareListForIpc: () => Promise<unknown>
  shareGetForIpc: (id: string) => Promise<unknown>
  shareRevokeForIpc: (id: string) => Promise<unknown>
  teamGetForIpc: () => Promise<unknown>
  teamActivityForIpc: (args?: { limit?: number }) => Promise<unknown>
  teamCreateInviteForIpc: (args: {
    email?: string
    role?: 'owner' | 'operator' | 'viewer'
    expiresHours?: number
  }) => Promise<unknown>
  teamListInvitesForIpc: (args?: { includeSecrets?: boolean }) => Promise<unknown>
  teamAcceptInviteForIpc: (args: { inviteCode?: string }) => Promise<unknown>
  teamRevokeInviteForIpc: (id: string) => Promise<unknown>
  teamSetCurrentUserForIpc: (email: string) => Promise<unknown>
  teamUpsertMemberForIpc: (member: { email: string; role: 'owner' | 'operator' | 'viewer' }) => Promise<unknown>
  teamRemoveMemberForIpc: (email: string) => Promise<unknown>
  exportPreviewForIpc: (payload: { kind: 'runbook_markdown' | 'audit_json'; sessionId?: string }) => Promise<unknown>
  exportPublishForIpc: (payload: {
    previewId?: string
    typedConfirm?: string
    expectedHash?: string
  }) => Promise<unknown>
  auditExportForIpc: () => Promise<unknown>
  devtoolsToggleForIpc: (sender: Electron.WebContents) => Promise<unknown>
  pingForIpc: () => Promise<unknown>
  diagnoseHotForIpc: () => Promise<unknown>
  planForIpc: (intent: string) => Promise<unknown>
  playbooksGetForIpc: () => Promise<unknown>
  playbookExecuteForIpc: (playbookId: string, fixIndex: number) => Promise<unknown>
  redactionPreviewForIpc: (text: string) => Promise<unknown>
}) {
  // Runtime guard: prevent double-registration during hot reload
  if (globalThis.__rinaIpcRegistered) {
    console.log('[IPC] Handlers already registered, skipping...')
    return
  }
  globalThis.__rinaIpcRegistered = true

  registerDiagnosticsIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    mainPath: args.mainPath,
    repoRoot: args.repoRoot,
    appProjectRoot: args.appProjectRoot,
    dirname: args.dirname,
    readTailLines: args.readTailLines,
    rendererErrorsFile: args.rendererErrorsFile,
    getSessionTranscript: args.getSessionTranscript,
    exportTranscript: args.exportTranscript,
    currentPolicyEnv: args.currentPolicyEnv,
    zipFiles: args.zipFiles,
    showSaveDialogForBundle: args.showSaveDialogForBundle,
  })

  registerLicenseIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    verifyLicense: args.verifyLicense,
    applyVerifiedLicense: args.applyVerifiedLicense,
    resetLicenseToStarter: args.resetLicenseToStarter,
    saveEntitlements: args.saveEntitlements,
    shell: args.shell,
    getLicenseState: args.getLicenseState,
    getCurrentLicenseCustomerId: args.getCurrentLicenseCustomerId,
  })

  registerThemesIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    loadThemeRegistryMerged: args.loadThemeRegistryMerged,
    loadSelectedThemeId: args.loadSelectedThemeId,
    saveSelectedThemeId: args.saveSelectedThemeId,
    loadCustomThemeRegistry: args.loadCustomThemeRegistry,
    validateTheme: args.validateTheme,
    writeJsonFile: args.writeJsonFile,
    customThemesFile: args.customThemesFile,
  })

  registerMemoryIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    operationalMemory: args.operationalMemory,
    addTranscriptEntry: args.addTranscriptEntry,
  })

  registerPersonalityIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    personalityStore: args.personalityStore,
  })

  registerPolicyIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    currentPolicyEnv: args.currentPolicyEnv,
    getCurrentRole: args.getCurrentRole,
    explainPolicy: args.explainPolicy,
  })

  registerSessionIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    getSessionTranscript: args.getSessionTranscript,
    exportTranscript: args.exportTranscript,
    addTranscriptEntry: args.addTranscriptEntry,
    runUnifiedSearch: args.runUnifiedSearch,
    detectCommandBoundaries: args.detectCommandBoundaries,
  })

  registerPtyIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    ptySessions: args.ptySessions,
    ptyResizeTimers: args.ptyResizeTimers,
    getPtyModule: args.getPtyModule,
    getDefaultShell: args.getDefaultShell,
    resolvePtyCwd: args.resolvePtyCwd,
    safeEnv: args.safeEnv,
    shellToKind: args.shellToKind,
    finalizePtyBoundaries: args.finalizePtyBoundaries,
    closePtyForWebContents: args.closePtyForWebContents,
    safeSend: args.safeSend,
    forRendererDisplay: args.forRendererDisplay,
    explainPolicy: args.explainPolicy,
  })

  registerUpdatesIpc({
    ipcMain: args.ipcMain,
    app: args.app,
    shell: args.shell,
    isE2E: args.isE2E,
  })

  registerAgentIpc({
    ipcMain: args.ipcMain,
    daemonStatus: args.daemonStatus,
    daemonTasks: args.daemonTasks,
    daemonTaskAdd: args.daemonTaskAdd,
    daemonStart: args.daemonStart,
    daemonStop: args.daemonStop,
    rinaStatus: () => ({
      isRunning: rinaController.isAgentRunning(),
      progress: rinaController.getAgentProgress(),
      mode: rinaController.getMode(),
      tools: rinaController.getTools(),
    }),
    rinaSetMode: (mode: 'auto' | 'assist' | 'explain') => rinaController.setMode(mode),
    rinaGetTools: () => rinaController.getTools(),
    rinaExecutePlan: async (planId: string) => {
      try {
        const plans = rinaController.getPlans()
        const plan = plans.find((p) => p.id === planId)
        if (!plan) {
          return { ok: false, message: `Plan '${planId}' not found` }
        }
        await rinaController.runAgent(plan)
        return { ok: true, message: `Plan '${planId}' executed` }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) }
      }
    },
    rinaLoadSession: async (id: string) => {
      return { ok: true, message: `Session ${id} loaded` }
    },
    rinaInterpret: async (input: string) => {
      const { handleRinaMessage } = await import('../../rina/index.js')
      const rina = await handleRinaMessage(input)
      return { actions: [], rina }
    },
    rinaGetSessions: () => [
      { id: '1', name: 'Main Session', status: 'active' as const },
      { id: '2', name: 'Debug Session', status: 'idle' as const },
    ],
    rinaGetPlans: () => rinaController.getPlans() as unknown as AgentPlan[],
  })

  registerAgentPlanningIpc({
    ipcMain: args.ipcMain,
    makePlan: args.makePlan,
    redactText: args.redactTextForPlan,
    fetchRemotePlan: args.fetchRemotePlan,
    allowLocalEngineFallback: args.allowLocalEngineFallback,
  })

  registerAgentExecutionIpc({
    ipcMain: args.ipcMain,
    newPlanRunId: args.newPlanRunId,
    resolveProjectRootSafe: args.resolveProjectRootSafe,
    ensureStructuredSession: args.ensureStructuredSession,
    runningPlanRuns: args.runningPlanRuns,
    safeSend: args.safeSend,
    riskFromPlanStep: args.riskFromPlanStep,
    gateProfileCommand: args.gateProfileCommand,
    evaluatePolicyGate: args.evaluatePolicyGate,
    executeRemotePlan: args.executeRemotePlan,
    pipeAgentdSseToRenderer: args.pipeAgentdSseToRenderer,
    allowLocalEngineFallback: args.allowLocalEngineFallback,
    createStreamId: args.createStreamId,
    startStreamingStepViaEngine: args.startStreamingStepViaEngine,
    haltReasonFromFallbackStep: args.haltReasonFromFallbackStep,
    executeStepStream: args.executeStepStreamForIpc,
    streamCancel: args.streamCancelForIpc,
    streamKill: args.streamKillForIpc,
    planStop: args.planStopForIpc,
  })

  registerOrchestratorIpc({
    ipcMain: args.ipcMain,
    issueToPr: args.orchestratorIssueToPrForIpc,
    workspaceGraph: args.orchestratorGraphForIpc,
    prepareBranch: args.orchestratorPrepareBranchForIpc,
    createPr: args.orchestratorCreatePrForIpc,
    prStatus: args.orchestratorPrStatusForIpc,
    webhookAudit: args.orchestratorWebhookAuditForIpc,
    ciStatus: args.orchestratorCiStatusForIpc,
    reviewComment: args.orchestratorReviewCommentForIpc,
  })

  registerChatIpc({
    ipcMain: args.ipcMain,
    sendChat: args.chatSendForIpc,
    exportChatTranscript: args.chatExportForIpc,
  })

  registerDoctorIpc({
    ipcMain: args.ipcMain,
    plan: args.doctorPlanForIpc,
    inspect: args.doctorInspectForIpc,
    collect: args.doctorCollectForIpc,
    interpret: args.doctorInterpretForIpc,
    verify: args.doctorVerifyForIpc,
    executeFix: args.doctorExecuteFixForIpc,
    transcriptGet: args.doctorTranscriptGetForIpc,
    transcriptExport: args.doctorTranscriptExportForIpc,
  })

  registerWorkspaceIpc({
    ipcMain: args.ipcMain,
    pickDirectory: args.workspacePickDirectoryForIpc,
    pickWorkspace: args.workspacePickForIpc,
    defaultWorkspace: args.workspaceDefaultForIpc,
  })

  registerCodeIpc({
    ipcMain: args.ipcMain,
    listFiles: args.codeListFilesForIpc,
    readFile: args.codeReadFileForIpc,
  })

  registerHistoryIpc({
    ipcMain: args.ipcMain,
    importHistory: args.historyImportForIpc,
  })

  registerShareIpc({
    ipcMain: args.ipcMain,
    preview: args.sharePreviewForIpc,
    create: args.shareCreateForIpc,
    list: args.shareListForIpc,
    get: args.shareGetForIpc,
    revoke: args.shareRevokeForIpc,
  })

  registerTeamIpc({
    ipcMain: args.ipcMain,
    getTeam: args.teamGetForIpc,
    getActivity: args.teamActivityForIpc,
    createInvite: args.teamCreateInviteForIpc,
    listInvites: args.teamListInvitesForIpc,
    acceptInvite: args.teamAcceptInviteForIpc,
    revokeInvite: args.teamRevokeInviteForIpc,
    setCurrentUser: args.teamSetCurrentUserForIpc,
    upsertMember: args.teamUpsertMemberForIpc,
    removeMember: args.teamRemoveMemberForIpc,
  })

  registerExportIpc({
    ipcMain: args.ipcMain,
    preview: args.exportPreviewForIpc,
    publish: args.exportPublishForIpc,
    auditExport: args.auditExportForIpc,
  })

  registerUtilityIpc({
    ipcMain: args.ipcMain,
    devtoolsToggle: args.devtoolsToggleForIpc,
    ping: args.pingForIpc,
    diagnoseHot: args.diagnoseHotForIpc,
    plan: args.planForIpc,
    playbooksGet: args.playbooksGetForIpc,
    playbookExecute: args.playbookExecuteForIpc,
    redactionPreview: args.redactionPreviewForIpc,
  })

  registerAnalyticsIpc()

  // Register terminal IPC for CLI block execution
  registerTerminalIpc()

  // Register secure agent IPC (permissions, sandbox, signature verification)
  registerSecureAgentIpc(args.ipcMain)

  // Register telemetry IPC for session and action tracking
  registerTelemetryIpc()
}
