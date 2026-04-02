import { createDiagnosticsService } from "../../../../../packages/runtime-feature-diagnostics/dist/index.js";
import { createLicensingService } from "../../../../../packages/runtime-feature-licensing/dist/index.js";
import {
    createAgentdRuntime,
    createFixProjectFlowDeps,
    createLicensingRuntimeAdapter,
    createJsonPersistenceHelpers,
    createRuntimeState,
    createTeamRuntimeHelpers,
    createThemeRegistryDeps,
    createUpdateIpcDeps,
} from "./runtimeBuilders.js";
import {
    buildRegistrationRuntime,
    buildRuntimeSurfaces,
} from "./runtimeAssembly.js";
import {
    createDiagnosticsBundleDeps,
    createTransientRuntimeLocals,
} from "./runtimeLocals.js";
import type {
    CreateMainRuntimeDeps,
    FlatMainRuntimeDeps,
    MainRuntime,
    MemoryIpcDeps,
    OwnerMemoryStore,
} from "./runtimeTypes.js";

export type {
    AgentdRuntime,
    ExecutionRuntime,
    JsonPersistenceHelpers,
    LicenseStateHelpers,
    LicensingRuntime,
    MainRuntime as MainRuntimeType,
    PersistenceDeps,
    RegistrationRuntime,
    RuntimeState,
    TeamDb,
    TeamRuntime,
    ThemeRegistryBuilderDeps,
    ThemeRegistryDeps,
    UpdateIpcBuilderDeps,
    UpdateIpcDeps,
    WindowsRuntime,
    StartupRuntime,
    DiagnosticsRuntime,
    RunsRuntime,
} from "./runtimeTypes.js";

function createMemoryIpcDeps(ipcMain: unknown, ownerMemoryStore: OwnerMemoryStore): MemoryIpcDeps {
    return {
        ipcMain,
        getState: () => ownerMemoryStore.getState(),
        updateProfile: (input) => ownerMemoryStore.updateProfile(input),
        updateWorkspace: (workspaceId, input) => ownerMemoryStore.updateWorkspace(workspaceId, input),
        resetWorkspace: (workspaceId) => ownerMemoryStore.resetWorkspace(workspaceId),
        resetAll: () => ownerMemoryStore.resetAll(),
        setInferredMemoryStatus: (id, status) => ownerMemoryStore.setInferredMemoryStatus(id, status),
        deleteEntry: (input) => ownerMemoryStore.deleteEntry(input),
    };
}

export function createMainRuntime(runtimeDeps: CreateMainRuntimeDeps): MainRuntime {
    const deps: FlatMainRuntimeDeps = {
        ...runtimeDeps.platform,
        ...runtimeDeps.config,
        ...runtimeDeps.security,
        ...runtimeDeps.factories,
        ...runtimeDeps.analytics,
        ...runtimeDeps.doctorChat,
        ...runtimeDeps.diagnostics,
        ...runtimeDeps.execution,
        ...runtimeDeps.registration,
    };
    const runtimeState = createRuntimeState();
    const persistence = createJsonPersistenceHelpers(deps);
    const registry = deps.createStandardRegistry();
    const engine = new deps.ExecutionEngine(registry);
    const { zipFiles, showSaveDialogForBundle, safeSend, importShellHistory } = deps.createRuntimeUtils({
        app: deps.app,
        dialog: deps.dialog,
        path: deps.path,
        crypto: deps.crypto,
        process: deps.process,
        os: deps.os,
        fs: deps.fs,
        isE2E: deps.IS_E2E,
    });
    const ENTITLEMENT_FILE = () => deps.path.join(deps.app.getPath('userData'), 'license-entitlement.json');
    const licensingService = createLicensingService({
        isPackaged: deps.app.isPackaged,
        verifyLicense: deps.verifyLicense,
        writeJsonFile: persistence.writeJson,
        readJsonIfExists: persistence.readJson,
        deleteFile: (filePath: string) => {
            try {
                deps.fs.unlinkSync(filePath);
            }
            catch {
            }
        },
        entitlementFile: ENTITLEMENT_FILE,
    });
    const {
        applyVerifiedLicense,
        resetLicenseToStarter,
        getLicenseState,
        getCurrentLicenseCustomerId,
        getLicenseTier,
        getLicenseToken,
        refreshLicenseState,
        saveEntitlements,
        loadEntitlements,
        applyStoredEntitlement,
        isEntitlementStale,
    } = createLicensingRuntimeAdapter(licensingService);
    const ownerMemoryStore = deps.createOwnerMemoryStore({
        app: deps.app,
        path: deps.path,
        readJsonIfExists: persistence.readJson,
        writeJsonFile: persistence.writeJson,
        getCurrentLicenseCustomerId,
        getCachedEmail: deps.getCachedEmail,
        getDeviceId: deps.getOrCreateDeviceId,
        listRecentRuns: (limit = 40) => deps.listStructuredRunsFromSessionsRoot(deps.path.join(deps.app.getPath('userData'), 'structured-session-v1', 'sessions'), limit),
    });
    const { buildAgentdHeaders, agentdJson } = deps.createAgentdClient({
        AGENTD_BASE_URL: deps.AGENTD_BASE_URL,
        AGENTD_AUTH_TOKEN: deps.AGENTD_AUTH_TOKEN,
        getLicenseToken,
    });
    const {
        sessionState,
        running,
        ptyStreamOwners,
        ptySessions,
        ptyResizeTimers,
    } = createTransientRuntimeLocals(deps.createRuntimeSessionState);
    const { evaluatePolicyGate, explainPolicy } = deps.createPolicyGate({
        fs: deps.fs,
        ctx: runtimeState.ctx,
        resolveResourcePath: deps.resolveResourcePath,
        warnIfUnexpectedPackagedResource: deps.warnIfUnexpectedPackagedResource,
        sessionState,
        getCurrentRole: () => getCurrentRole(),
    });
    const { withStructuredSessionWrite, ensureStructuredSession, sanitizeForPersistence, addTranscriptEntry, getSessionTranscript, exportTranscript, } = deps.createSessionHelpers({
        redactText: deps.redactText,
        getStructuredSessionStore: () => runtimeState.structuredSessionStore,
        sessionState,
    });
    const { getCurrentRole, hasRoleAtLeast, loadTeamDb, saveTeamDb, normalizeRole } = createTeamRuntimeHelpers({
        readJsonIfExists: persistence.readJson,
        writeJsonFile: persistence.writeJson,
        teamFile: () => deps.path.join(deps.app.getPath('userData'), 'team-workspace.json'),
    });
    const { workspaceService, codeListFilesForIpc, codeReadFileForIpc, } = deps.createWorkspaceRuntimeHelpers({
        appProjectRoot: deps.APP_PROJECT_ROOT,
        normalizeProjectRoot: deps.normalizeProjectRoot,
        resolveProjectRootSafe: deps.resolveProjectRootSafe,
        canonicalizePath: deps.canonicalizePath,
        isWithinRoot: deps.isWithinRoot,
    });
    const diagnosticsBundleDeps = createDiagnosticsBundleDeps({
        appProjectRoot: deps.APP_PROJECT_ROOT,
        resolveResourcePath: deps.resolveResourcePath,
        runtimeState,
        workspaceService,
        showSaveDialogForBundle,
        zipFiles,
    });
    const { workspacePickForIpc, workspaceDefaultForIpc } = deps.createWorkspaceElectronIpcHelpers({
        dialog: deps.dialog,
        ptySessions,
        getDefaultCwd: () => workspaceService.getDefaultCwd(),
    });
    const { redactChunkIfNeeded, forRendererDisplay, redactForModel, getPtyModule, getDefaultShell, shellToKind, finalizePtyBoundaries, closePtyForWebContents, createStreamId, createStableBoundaryStreamId, } = deps.createPtyRuntimeHelpers({
        path: deps.path,
        process: deps.process,
        redactText: deps.redactText,
        detectCommandBoundaries: deps.detectCommandBoundaries,
        getStructuredSessionStore: () => runtimeState.structuredSessionStore,
        ensureStructuredSession,
        withStructuredSessionWrite,
        addTranscriptEntry,
        safeSend,
        ptyStreamOwners,
        ptySessions,
        ptyResizeTimers,
        webContents: deps.webContents,
    });
    const { runningPlanRuns, newPlanRunId, terminalWriteSafetyFields, pipeAgentdSseToRenderer, streamCancelForIpc, streamKillForIpc, planStopForIpc, } = deps.createPlanExecutionHelpers({
        engine,
        executeViaEngine: deps.executeViaEngine,
        getLicenseTier,
        normalizeProjectRoot: deps.normalizeProjectRoot,
        resolveProjectRootSafe: deps.resolveProjectRootSafe,
        gateProfileCommand: deps.gateProfileCommand,
        evaluatePolicyGate,
        ensureStructuredSession,
        withStructuredSessionWrite,
        structuredSessionStore: () => runtimeState.structuredSessionStore,
        safeSend,
        redactChunkIfNeeded,
        forRendererDisplay,
        agentdJson,
        buildAgentdHeaders,
        AGENTD_BASE_URL: deps.AGENTD_BASE_URL,
        running,
        ptyStreamOwners,
        closePtyForWebContents,
        createStreamId,
        riskFromPlanStep: deps.riskFromPlanStep,
        addTranscriptEntry,
        e2ePlanPayloads: deps.e2ePlanPayloads,
    });
    const { diagnoseHotLinux, runCommandOnceViaEngine, runCommandOnce, runGatherCommand } = createDiagnosticsService({
        os: deps.os as {
            cpus(): Array<{ model?: string; }>;
            loadavg?(): number[];
            totalmem(): number;
            freemem(): number;
        },
        process: deps.process,
        topCpuCmdSafe: deps.TOP_CPU_CMD_SAFE,
        getDefaultCwd: () => workspaceService.getDefaultCwd(),
        terminalWriteSafetyFields,
        executeViaEngine: deps.executeViaEngine,
        engine,
        getLicenseTier,
    });
    const { makePlan, detectBuildKind, buildStepsForKind } = deps.createBuildPlanHelpers({
        fs: deps.fs,
        path: deps.path,
        playbooks: deps.PLAYBOOKS,
        topCpuCmdSafeShort: deps.TOP_CPU_CMD_SAFE_SHORT,
    });
    const { runsListForIpc, openRunsFolderForIpc, revealRunReceiptForIpc, runsTailForIpc, runsArtifactsForIpc } = deps.createRunsIpcHelpers({
        app: deps.app,
        fs: deps.fs,
        path: deps.path,
        shell: deps.shell,
        listStructuredRunsFromSessionsRoot: deps.listStructuredRunsFromSessionsRoot,
        readStructuredRunTailFromSessionsRoot: deps.readStructuredRunTailFromSessionsRoot,
        summarizeStructuredRunArtifactsFromSessionsRoot: deps.summarizeStructuredRunArtifactsFromSessionsRoot,
    });
    const { pingForIpc, historyImportForIpc, diagnoseHotForIpc, planForIpc, playbooksGetForIpc, playbookExecuteForIpc, redactionPreviewForIpc, } = deps.createMiscIpcHelpers({
        process: deps.process,
        redactText: deps.redactText,
        importShellHistory,
        diagnoseHotLinux,
        addTranscriptEntry,
        makePlan,
        playbooks: deps.PLAYBOOKS,
    });
    const { daemonStatus, daemonTasks, daemonTaskAdd, daemonStart, daemonStop, fetchRemotePlanForIpc, executeRemotePlanForIpc, orchestratorIssueToPrForIpc, orchestratorGraphForIpc, orchestratorPrepareBranchForIpc, orchestratorCreatePrForIpc, orchestratorPrStatusForIpc, orchestratorWebhookAuditForIpc, orchestratorCiStatusForIpc, orchestratorReviewCommentForIpc, accountPlanForIpc, teamWorkspaceCreateForIpc, teamWorkspaceGetForIpc, teamInvitesListForIpc, teamInviteCreateForIpc, teamInviteRevokeForIpc, teamAuditListForIpc, teamBillingEnforcementForIpc, } = createAgentdRuntime({
        createAgentdIpcWrappers: deps.createAgentdIpcWrappers,
        agentdJson,
        isE2E: deps.IS_E2E,
        makePlan,
        terminalWriteSafetyFields,
        e2ePlanPayloads: deps.e2ePlanPayloads,
        getCurrentRole,
        hasRoleAtLeast,
    });
    const fixProjectForIpc = deps.createFixProjectFlow(createFixProjectFlowDeps({
        fetchRemotePlanForIpc,
        evaluatePolicyGate,
    }));
    const { doctorInspectForIpc, doctorCollectForIpc, doctorInterpretForIpc, doctorVerifyForIpc, doctorExecuteFixForIpc, } = deps.createDoctorIpcHelpers({
        doctorInspect: deps.doctorInspect,
        doctorCollect: deps.doctorCollect,
        doctorInterpret: deps.doctorInterpret,
        doctorVerify: deps.doctorVerify,
        doctorExecuteFix: deps.doctorExecuteFix,
        evaluatePolicyGate,
        redactForModel,
        sanitizeForPersistence,
        resolveProjectRootSafe: deps.resolveProjectRootSafe,
        getDefaultCwd: () => workspaceService.getDefaultCwd(),
        gateProfileCommand: deps.gateProfileCommand,
    });
    const { doctorTranscriptGetForIpc, doctorTranscriptExportForIpc, getConversation, setConversation, classifyIntent, formatFindingsForChat, formatDiagnosisForChat, formatFixOptionsForChat, formatOutcomeForChat, chatSendForIpc, chatExportForIpc, summarizeRinaOutput, normalizeRinaResponse, doctorPlanForIpc, } = deps.createChatDoctorIpcHelpers({
        redactText: deps.redactText,
        resolveProjectRootSafe: deps.resolveProjectRootSafe,
        getDefaultCwd: () => workspaceService.getDefaultCwd(),
        defaultProfileForProject: deps.defaultProfileForProject,
        loadProjectRules: deps.loadProjectRules,
        rulesToSystemBlock: deps.rulesToSystemBlock,
        summarizeProfile: deps.summarizeProfile,
        chatRouter: deps.chatRouter,
        doctorGetTranscript: deps.doctorGetTranscript,
        doctorExportTranscript: deps.doctorExportTranscript,
        handleRinaMessage: deps.handleRinaMessage,
    });
    const { createWindow, devtoolsToggleForIpc } = deps.createWindowLifecycle({
        BrowserWindow: deps.BrowserWindow,
        path: deps.path,
        __dirname: deps.__dirname,
        app: deps.app,
        safeSend,
        thinkingStream: deps.thinkingStream,
        closePtyForWebContents,
        setDaemonFunctions: deps.setDaemonFunctions,
        setLicenseFunctions: deps.setLicenseFunctions,
        registerIpcHandlers: deps.registerIpcHandlers,
        registerSecureAgentIpc: deps.registerSecureAgentIpc,
        ipcMain: deps.ipcMain,
        getLicenseTier,
        verifyLicense: deps.verifyLicense,
        applyVerifiedLicense,
        resetLicenseToStarter,
        saveEntitlements,
        refreshLicenseState,
        shell: deps.shell,
        getLicenseState,
        getCurrentLicenseCustomerId,
        getOrCreateDeviceId: deps.getOrCreateDeviceId,
        getCachedEmail: deps.getCachedEmail,
        setCachedEmail: deps.setCachedEmail,
        daemonStatus,
        daemonTasks,
        daemonTaskAdd,
        daemonStart,
        daemonStop,
        runsListForIpc,
        runsTailForIpc,
        runsArtifactsForIpc,
        codeListFilesForIpc,
        codeReadFileForIpc,
        handleRinaMessage: deps.handleRinaMessage,
        rinaController: deps.rinaController,
        resolveProjectRootSafe: deps.resolveProjectRootSafe,
        normalizeRinaResponse,
    });
    const bootstrapAuth = deps.createAuthBootstrap({
        app: deps.app,
        fs: deps.fs,
        path: deps.path,
        readJsonIfExists: deps.readJsonIfExists,
        setAuthConfig: deps.setAuthConfig,
        setCachedToken: deps.setCachedToken,
        getOrCreateDeviceId: deps.getOrCreateDeviceId,
        authApiUrl: deps.process.env.RINAWARP_AUTH_URL || 'https://rinawarptech.com',
    });
    const restoreEntitlements = deps.createEntitlementRestore({
        loadEntitlements,
        applyStoredEntitlement,
        isEntitlementStale,
        verifyLicense: deps.verifyLicense,
        applyVerifiedLicense,
        saveEntitlements,
        getLicenseTier,
        isE2E: deps.IS_E2E,
    });
    const initializeAnalyticsSession = deps.createAnalyticsSessionInitializer({
        initAnalytics: deps.initAnalytics,
        featureFlags: deps.featureFlags,
        isE2E: deps.IS_E2E,
        app: deps.app,
        path: deps.path,
        StructuredSessionStore: deps.StructuredSessionStore,
        ctx: runtimeState.ctx,
        withStructuredSessionWrite,
    });
    const maybeAutoStartDaemon = deps.createDaemonAutoStarter({
        daemonStart,
    });
    const { startup, windows, agentd, licensing, diagnostics, execution, runs, team } = buildRuntimeSurfaces({
        bootstrapAuth,
        restoreEntitlements,
        initializeAnalyticsSession,
        maybeAutoStartDaemon,
        createWindow,
        devtoolsToggleForIpc,
        closePtyForWebContents,
        ptySessions,
        buildAgentdHeaders,
        agentdJson,
        daemonStatus,
        daemonTasks,
        daemonTaskAdd,
        daemonStart,
        daemonStop,
        fetchRemotePlanForIpc,
        executeRemotePlanForIpc,
        getLicenseState,
        getLicenseToken,
        applyVerifiedLicense,
        resetLicenseToStarter,
        refreshLicenseState,
        diagnoseHotLinux,
        runCommandOnce,
        runGatherCommand,
        diagnosticsBundleDeps,
        explainPolicy,
        redactionPreviewForIpc,
        supportBundleForIpcWithSnapshot: deps.supportBundleForIpcWithSnapshot,
        engine,
        executeViaEngine: deps.executeViaEngine,
        terminalWriteSafetyFields,
        getLicenseTier,
        openRunsFolderForIpc,
        revealRunReceiptForIpc,
        runsListForIpc,
        runsTailForIpc,
        runsArtifactsForIpc,
        getCurrentRole,
        hasRoleAtLeast,
        loadTeamDb,
        saveTeamDb,
        normalizeRole,
        accountPlanForIpc,
        teamWorkspaceCreateForIpc,
        teamWorkspaceGetForIpc,
        teamInvitesListForIpc,
        teamInviteCreateForIpc,
        teamInviteRevokeForIpc,
        teamAuditListForIpc,
        teamBillingEnforcementForIpc,
    });
    const themeRegistryDeps = createThemeRegistryDeps({ ...deps, persistence }, runtimeState);
    const memoryIpcDeps = createMemoryIpcDeps(deps.ipcMain, ownerMemoryStore);
    const updateIpcDeps = createUpdateIpcDeps(deps.ipcMain, deps);
    const registration = buildRegistrationRuntime({
        deps,
        team,
        runs,
        diagnostics,
        agentd,
        themeRegistryDeps,
        memoryIpcDeps,
        updateIpcDeps,
        workspacePickForIpc,
        workspaceDefaultForIpc,
        fixProjectForIpc,
        newPlanRunId,
        ensureStructuredSession,
        runningPlanRuns,
        safeSend,
        evaluatePolicyGate,
        pipeAgentdSseToRenderer,
        createStreamId,
        streamCancelForIpc,
        streamKillForIpc,
        planStopForIpc,
    });
    return {
        state: runtimeState,
        startup,
        windows,
        licensing,
        agentd,
        diagnostics,
        execution,
        runs,
        team,
        registration,
    };
}
