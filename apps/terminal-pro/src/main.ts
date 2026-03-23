// @ts-nocheck
// This file was converted from TypeScript to JavaScript during refactoring.
// The build expects a .ts file, but the content is JavaScript.
// TODO: Either convert back to TypeScript or set up separate JavaScript build pipeline.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, dialog, webContents } from 'electron/main';
import { shell } from 'electron/common';
const require = createRequire(import.meta.url);
import { verifyLicense } from './license.js';
import { getOrCreateDeviceId } from './main/license/deviceId.js';
import { getCachedEmail, setCachedEmail } from './main/license/emailStore.js';
import { createOwnerMemoryStore } from './main/memory/memoryStore.js';
import { registerThemeHandlers } from './main/themes/themeRegistry.js';
import { featureFlags } from './feature-flags.js';
import { StructuredSessionStore } from './structured-session.js';
import { PersonalityStore } from './personality.js';
import { redactText } from '@rinawarp/safety/redaction';
import { detectCommandBoundaries } from './prompt-boundary.js';
import { defaultProfileForProject, gateCommandRun, summarizeProfile } from './agent-profile.js';
import { loadProjectRules, rulesToSystemBlock } from './rules-loader.js';
import { scoreTextMatch } from './search-ranking.js';
import { riskFromPlanStep } from './plan-risk.js';
import { registerIpcHandlers, setDaemonFunctions, setLicenseFunctions, setAuthConfig, setCachedToken } from './main/ipc/index.js';
import { registerPtyHandlers } from './main/pty/ptyController.js';
import { registerSecureAgentIpc } from './main/ipc/secure-agent.js';
import { registerAgentExecutionIpc } from './main/ipc/registerAgentExecutionIpc.js';
import { registerMemoryIpc } from './main/ipc/registerMemoryIpc.js';
import { registerUpdateIpc } from './main/ipc/registerUpdateIpc.js';
import { resolveResourcePath as resolveMainResourcePath } from './main/resources.js';
import { createAgentdIpcWrappers } from './main/agentd/ipcWrappers.js';
import { createAgentdClient } from './main/agentd/client.js';
import { createLicenseState } from './main/license/licenseState.js';
import { createChatDoctorIpcHelpers } from './main/assistant/chatDoctorIpc.js';
import { createDoctorIpcHelpers } from './main/assistant/doctorIpc.js';
import { resolveMainPlaybooks } from './main/assistant/playbooks.js';
import { createRuntimeDiagnosticsHelpers } from './main/diagnostics/runtimeDiagnostics.js';
import { createPolicyGate } from './main/policy/gate.js';
import { createBuildPlanHelpers } from './main/planning/buildPlan.js';
import { createMiscIpcHelpers } from './main/assistant/miscIpc.js';
import { createPtyRuntimeHelpers } from './main/pty/runtime.js';
import { createRunsIpcHelpers } from './main/runs/runsIpc.js';
import { createSessionHelpers } from './main/session/sessionHelpers.js';
import { createRuntimeSessionState } from './main/session/runtimeState.js';
import { readJsonIfExists, writeJsonFile } from './main/shared/persistence.js';
import { createRuntimeUtils } from './main/shared/runtimeUtils.js';
import { createPlanExecutionHelpers } from './main/stream/planExecution.js';
import { createTeamAccess } from './main/team/access.js';
import { createWindowLifecycle } from './main/window/windowLifecycle.js';
import { createWorkspaceCodeHelpers } from './main/workspace/codeHelpers.js';
import { initAnalytics, trackEvent, trackFunnelStep } from './analytics.js';
import { handleRinaMessage, rinaController } from './rina/index.js';
import { thinkingStream } from './rina/thinking/thinkingStream.js';
import { listStructuredRunsFromSessionsRoot, readStructuredRunTailFromSessionsRoot, summarizeStructuredRunArtifactsFromSessionsRoot } from './main/runs/structuredRuns.js';
import { diagnosticsPathsForIpc, supportBundleForIpcWithSnapshot } from './main/diagnostics/supportBundle.js';
import { canonicalizePath, isWithinRoot, normalizeProjectRoot as normalizeProjectRootFromSecurity, resolveProjectRootSafe as resolveProjectRootSafeFromSecurity, } from './security/projectRoot.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_PROJECT_ROOT, '..', '..');
const ALLOWED_WORKSPACE_ROOTS = [];
function normalizeProjectRoot(input, workspaceRoot) {
    return normalizeProjectRootFromSecurity({
        input,
        workspaceRoot,
        allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
    });
}
function resolveProjectRootSafe(input) {
    return resolveProjectRootSafeFromSecurity({
        input,
        allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
    });
}
import { ExecutionEngine, } from '@rinawarp/core/enforcement/index.js';
import { createStandardRegistry } from '@rinawarp/core/tools/registry.js';
import { executeViaEngine } from '@rinawarp/core/adapters/unify-execution.js';
const registry = createStandardRegistry();
const engine = new ExecutionEngine(registry);
let structuredSessionStore = null;
const personalityStore = new PersonalityStore();
const ctx = {
    structuredSessionStore: null,
    lastLoadedThemePath: null,
    lastLoadedPolicyPath: null,
};
const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || 'http://127.0.0.1:5055';
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || '';
const IS_E2E = process.env.RINAWARP_E2E === '1';
if (IS_E2E && process.env.RINAWARP_E2E_USER_DATA_SUFFIX) {
    app.setPath('userData', path.join(app.getPath('temp'), `rinawarp-e2e-${process.env.RINAWARP_E2E_USER_DATA_SUFFIX}`));
}
if (app.isPackaged && process.env.ELECTRON_DISABLE_SANDBOX === '1') {
    console.warn('[security] Ignoring ELECTRON_DISABLE_SANDBOX in packaged builds.');
    delete process.env.ELECTRON_DISABLE_SANDBOX;
}
const TOP_CPU_CMD_SAFE = 'ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk3 | head -15 || ps aux | head -15';
const TOP_MEM_CMD_SAFE = 'ps -eo pid,pcpu,pmem,comm --sort=-pmem 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk4 | head -15 || ps aux | head -15';
const TOP_CPU_CMD_SAFE_SHORT = 'ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -10 || ps aux 2>/dev/null | sort -nrk3 | head -10 || ps aux | head -10';
const e2ePlanPayloads = new Map();
function resolveResourcePath(relPath, devBase) {
    return resolveMainResourcePath({
        relPath,
        devBase,
        repoRoot: REPO_ROOT,
        appProjectRoot: APP_PROJECT_ROOT,
        dirname: __dirname,
    });
}
function warnIfUnexpectedPackagedResource(resourceName, resolvedPath) {
    if (!app.isPackaged)
        return;
    const target = canonicalizePath(resolvedPath);
    const allowedBases = [app.getAppPath(), process.resourcesPath].map((p) => canonicalizePath(p));
    const allowed = allowedBases.some((base) => isWithinRoot(target, base));
    if (!allowed) {
        console.warn(`[security] Unexpected packaged ${resourceName} path outside app/resources: ${target}`);
    }
}
const { zipFiles, showSaveDialogForBundle, safeSend, importShellHistory } = createRuntimeUtils({
    app,
    dialog,
    path,
    crypto,
    process,
    os,
    fs,
    isE2E: IS_E2E,
});
const ENTITLEMENT_FILE = () => path.join(app.getPath('userData'), 'license-entitlement.json');
const licenseState = createLicenseState({
    app,
    fs,
    verifyLicense,
    writeJsonFile: (filePath, value) => writeJsonFile(fs, path, filePath, value),
    readJsonIfExists: (filePath) => readJsonIfExists(fs, filePath),
    entitlementFile: ENTITLEMENT_FILE,
});
const { applyVerifiedLicense, resetLicenseToStarter, getLicenseState, getCurrentLicenseCustomerId, getLicenseTier, getLicenseToken, refreshLicenseState, saveEntitlements, loadEntitlements, applyStoredEntitlement, isEntitlementStale, } = licenseState;
const ownerMemoryStore = createOwnerMemoryStore({
    app,
    path,
    readJsonIfExists: (filePath) => readJsonIfExists(fs, filePath),
    writeJsonFile: (filePath, value) => writeJsonFile(fs, path, filePath, value),
    getCurrentLicenseCustomerId,
    getCachedEmail,
    getDeviceId: getOrCreateDeviceId,
    listRecentRuns: (limit = 40) => listStructuredRunsFromSessionsRoot(path.join(app.getPath('userData'), 'structured-session-v1', 'sessions'), limit),
});
const { buildAgentdHeaders, agentdJson } = createAgentdClient({
    AGENTD_BASE_URL,
    AGENTD_AUTH_TOKEN,
    getLicenseToken,
});
function gateProfileCommand(args) {
    const profile = defaultProfileForProject(args.projectRoot);
    const result = gateCommandRun({
        profile,
        command: args.command,
        risk: args.risk,
        confirmed: args.confirmed,
        confirmationText: args.confirmationText,
    });
    if (!result.ok) {
        const errMsg = result.message;
        return { ok: false, message: `[profile] ${errMsg}` };
    }
    return { ok: true };
}
const PLAYBOOKS = resolveMainPlaybooks(TOP_CPU_CMD_SAFE, TOP_CPU_CMD_SAFE.replaceAll('head -15', 'head -20'), TOP_MEM_CMD_SAFE);
const sessionState = createRuntimeSessionState();
const { evaluatePolicyGate, explainPolicy } = createPolicyGate({
    fs,
    ctx,
    resolveResourcePath,
    warnIfUnexpectedPackagedResource,
    sessionState,
    getCurrentRole: () => getCurrentRole(),
});
const { withStructuredSessionWrite, ensureStructuredSession, sanitizeForPersistence, addTranscriptEntry, getSessionTranscript, exportTranscript, } = createSessionHelpers({
    redactText,
    getStructuredSessionStore: () => structuredSessionStore,
    sessionState,
});
const running = new Map();
const ptyStreamOwners = new Map();
const ptySessions = new Map();
const ptyResizeTimers = new Map();
let ptyModulePromise = null;
const TEAM_FILE = () => path.join(app.getPath('userData'), 'team-workspace.json');
const RENDERER_ERRORS_FILE = () => path.join(app.getPath('userData'), 'renderer-errors.ndjson');
const REDACT_BEFORE_PERSIST = true;
const REDACT_BEFORE_MODEL = true;
const { getCurrentRole, hasRoleAtLeast, loadTeamDb, saveTeamDb, normalizeRole } = createTeamAccess({
    fs,
    teamFile: TEAM_FILE,
});
ipcMain.removeHandler('team:state');
ipcMain.handle('team:state', async () => {
    try {
        const team = loadTeamDb();
        const members = Array.isArray(team?.members) ? team.members : [];
        const currentUser = String(team?.currentUser || 'owner@local');
        const currentRole = getCurrentRole();
        return {
            ok: true,
            workspaceId: String(team?.workspaceId || ''),
            currentUser,
            currentRole,
            members,
            seatsAllowed: Math.max(1, Number(team?.seatsAllowed || members.length || 1)),
            seatsUsed: members.length,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Could not load team state',
            workspaceId: '',
            currentUser: 'owner@local',
            currentRole: 'owner',
            members: [{ email: 'owner@local', role: 'owner' }],
            seatsAllowed: 1,
            seatsUsed: 1,
        };
    }
});
const diagnosticsBundleDeps = {
    appProjectRoot: APP_PROJECT_ROOT,
    resolveResourcePath,
    get lastLoadedThemePath() {
        return ctx.lastLoadedThemePath;
    },
    get lastLoadedPolicyPath() {
        return ctx.lastLoadedPolicyPath;
    },
    getDefaultPtyCwd() {
        return getDefaultPtyCwd();
    },
    showSaveDialogForBundle,
    zipFiles,
};
const { getDefaultPtyCwd, resolvePtyCwd, listProjectFilesSafe, readProjectFileSafe, workspacePickDirectoryForIpc, workspacePickForIpc, workspaceDefaultForIpc, codeListFilesForIpc, codeReadFileForIpc, } = createWorkspaceCodeHelpers({
    appProjectRoot: APP_PROJECT_ROOT,
    dialog,
    fs,
    path,
    ptySessions,
    normalizeProjectRoot,
    resolveProjectRootSafe,
    canonicalizePath,
    isWithinRoot,
});
const { redactChunkIfNeeded, forRendererDisplay, redactForModel, getPtyModule, getDefaultShell, shellToKind, finalizePtyBoundaries, closePtyForWebContents, createStreamId, createStableBoundaryStreamId, } = createPtyRuntimeHelpers({
    path,
    process,
    redactText,
    detectCommandBoundaries,
    getStructuredSessionStore: () => structuredSessionStore,
    ensureStructuredSession,
    withStructuredSessionWrite,
    addTranscriptEntry,
    safeSend,
    ptyStreamOwners,
    ptySessions,
    ptyResizeTimers,
    webContents,
});
const { runningPlanRuns, newPlanRunId, terminalWriteSafetyFields, pipeAgentdSseToRenderer, streamCancelForIpc, streamKillForIpc, planStopForIpc, } = createPlanExecutionHelpers({
    engine,
    executeViaEngine,
    getLicenseTier,
    normalizeProjectRoot,
    resolveProjectRootSafe,
    gateProfileCommand,
    evaluatePolicyGate,
    ensureStructuredSession,
    withStructuredSessionWrite,
    structuredSessionStore: () => structuredSessionStore,
    safeSend,
    redactChunkIfNeeded,
    forRendererDisplay,
    agentdJson,
    buildAgentdHeaders,
    AGENTD_BASE_URL,
    running,
    ptyStreamOwners,
    closePtyForWebContents,
    createStreamId,
    riskFromPlanStep,
    addTranscriptEntry,
    e2ePlanPayloads,
});
const { diagnoseHotLinux, runCommandOnceViaEngine, runCommandOnce, runGatherCommand } = createRuntimeDiagnosticsHelpers({
    os,
    process,
    topCpuCmdSafe: TOP_CPU_CMD_SAFE,
    getDefaultPtyCwd,
    terminalWriteSafetyFields,
    executeViaEngine,
    engine,
    getLicenseTier,
});
const { makePlan, detectBuildKind, buildStepsForKind } = createBuildPlanHelpers({
    fs,
    path,
    playbooks: PLAYBOOKS,
    topCpuCmdSafeShort: TOP_CPU_CMD_SAFE_SHORT,
});
const { runsListForIpc, openRunsFolderForIpc, revealRunReceiptForIpc, runsTailForIpc, runsArtifactsForIpc } = createRunsIpcHelpers({
    app,
    fs,
    path,
    shell,
    listStructuredRunsFromSessionsRoot,
    readStructuredRunTailFromSessionsRoot,
    summarizeStructuredRunArtifactsFromSessionsRoot,
});
const { pingForIpc, historyImportForIpc, diagnoseHotForIpc, planForIpc, playbooksGetForIpc, playbookExecuteForIpc, redactionPreviewForIpc, } = createMiscIpcHelpers({
    process,
    redactText,
    importShellHistory,
    diagnoseHotLinux,
    addTranscriptEntry,
    makePlan,
    playbooks: PLAYBOOKS,
});
const { daemonStatus, daemonTasks, daemonTaskAdd, daemonStart, daemonStop, fetchRemotePlanForIpc, executeRemotePlanForIpc, orchestratorIssueToPrForIpc, orchestratorGraphForIpc, orchestratorPrepareBranchForIpc, orchestratorCreatePrForIpc, orchestratorPrStatusForIpc, orchestratorWebhookAuditForIpc, orchestratorCiStatusForIpc, orchestratorReviewCommentForIpc, accountPlanForIpc, teamWorkspaceCreateForIpc, teamWorkspaceGetForIpc, teamInvitesListForIpc, teamInviteCreateForIpc, teamInviteRevokeForIpc, teamAuditListForIpc, teamBillingEnforcementForIpc, } = createAgentdIpcWrappers({
    agentdJson,
    isE2E: IS_E2E,
    makePlan,
    terminalWriteSafetyFields,
    e2ePlanPayloads,
    getCurrentRole,
    hasRoleAtLeast,
});
import { doctorInspect, doctorCollect, doctorInterpret, doctorVerify, doctorExecuteFix, doctorGetTranscript, doctorExportTranscript, } from './doctor-bridge.js';
import { chatRouter } from './chat-router.js';
const { doctorInspectForIpc, doctorCollectForIpc, doctorInterpretForIpc, doctorVerifyForIpc, doctorExecuteFixForIpc, } = createDoctorIpcHelpers({
    doctorInspect,
    doctorCollect,
    doctorInterpret,
    doctorVerify,
    doctorExecuteFix,
    evaluatePolicyGate,
    redactForModel,
    sanitizeForPersistence,
    resolveProjectRootSafe,
    getDefaultPtyCwd,
    gateProfileCommand,
});
const { doctorTranscriptGetForIpc, doctorTranscriptExportForIpc, getConversation, setConversation, classifyIntent, formatFindingsForChat, formatDiagnosisForChat, formatFixOptionsForChat, formatOutcomeForChat, chatSendForIpc, chatExportForIpc, summarizeRinaOutput, normalizeRinaResponse, doctorPlanForIpc, } = createChatDoctorIpcHelpers({
    redactText,
    resolveProjectRootSafe,
    getDefaultPtyCwd,
    defaultProfileForProject,
    loadProjectRules,
    rulesToSystemBlock,
    summarizeProfile,
    chatRouter,
    doctorGetTranscript,
    doctorExportTranscript,
    handleRinaMessage,
});
const { createWindow, devtoolsToggleForIpc } = createWindowLifecycle({
    BrowserWindow,
    path,
    __dirname,
    app,
    safeSend,
    thinkingStream,
    closePtyForWebContents,
    setDaemonFunctions,
    setLicenseFunctions,
    registerIpcHandlers,
    registerSecureAgentIpc,
    ipcMain,
    getLicenseTier,
    verifyLicense,
    applyVerifiedLicense,
    resetLicenseToStarter,
    saveEntitlements,
    refreshLicenseState,
    shell,
    getLicenseState,
    getCurrentLicenseCustomerId,
    getOrCreateDeviceId,
    getCachedEmail,
    setCachedEmail,
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
    handleRinaMessage,
    rinaController,
    resolveProjectRootSafe,
    normalizeRinaResponse,
});
app.whenReady().then(async () => {
    if (IS_E2E) {
        console.log('[boot] whenReady start');
    }
    // Configure auth API
    const AUTH_API_URL = process.env.RINAWARP_AUTH_URL || 'https://rinawarptech.com';
    setAuthConfig({
      apiBaseUrl: AUTH_API_URL,
      deviceId: getOrCreateDeviceId(),
    });

    // Load cached token if available
    try {
      const tokenFile = path.join(app.getPath('userData'), 'auth-token.json');
      const tokenData = readJsonIfExists(fs, tokenFile);
      if (tokenData?.token) {
        setCachedToken(tokenData.token);
      }
    } catch (e) {
      // Ignore errors loading cached token
    }
    const storedEntitlement = loadEntitlements();
    if (IS_E2E) {
        console.log('[boot] entitlements restored', !!storedEntitlement);
    }
    if (storedEntitlement) {
        applyStoredEntitlement(storedEntitlement);
        console.log(`[license] Restored ${storedEntitlement.tier} tier from persisted entitlement`);
        if (isEntitlementStale(storedEntitlement) && storedEntitlement.customerId) {
            console.log('[license] Entitlement stale (>24h), attempting soft refresh...');
            verifyLicense(storedEntitlement.customerId)
                .then((data) => {
                if (data?.ok) {
                    applyVerifiedLicense(data);
                    saveEntitlements();
                    console.log(`[license] Soft refresh successful: ${getLicenseTier()}`);
                }
            })
                .catch((err) => {
                console.warn('[license] Soft refresh failed (offline?):', err instanceof Error ? err.message : String(err));
            });
        }
    }
    createWindow();
    if (IS_E2E) {
        console.log('[boot] createWindow scheduled');
    }
    try {
        initAnalytics();
    }
    catch (error) {
        console.warn('[analytics] init failed:', error);
    }
    if (featureFlags.structuredSessionV1) {
        if (IS_E2E) {
            console.log('[boot] structuredSession init start');
        }
        const rootDir = path.join(app.getPath('userData'), 'structured-session-v1');
        structuredSessionStore = new StructuredSessionStore(rootDir, true);
        ctx.structuredSessionStore = structuredSessionStore;
        withStructuredSessionWrite(() => structuredSessionStore?.init());
        if (IS_E2E) {
            console.log('[boot] structuredSession init done');
        }
    }
    void (async () => {
        try {
            const daemonResult = await daemonStart();
            console.log('[daemon] Auto-start result:', daemonResult);
        }
        catch (err) {
            console.warn('[daemon] Auto-start failed:', err);
        }
    })();
    registerPtyHandlers({ resolvePtyCwd });
    registerAgentExecutionIpc({
        ipcMain,
        newPlanRunId,
        resolveProjectRootSafe,
        ensureStructuredSession,
        runningPlanRuns,
        safeSend,
        riskFromPlanStep,
        gateProfileCommand,
        evaluatePolicyGate,
        executeRemotePlan: executeRemotePlanForIpc,
        pipeAgentdSseToRenderer,
        createStreamId,
        streamCancel: streamCancelForIpc,
        streamKill: streamKillForIpc,
        planStop: planStopForIpc,
    });
    ipcMain.handle('analytics:trackEvent', async (_event, event, properties) => {
        try {
            const result = trackEvent(event, properties);
            return {
                ok: Boolean(result?.accepted),
                accepted: Boolean(result?.accepted),
                enabled: Boolean(result?.enabled),
                degraded: Boolean(result?.degraded),
                event: String(event || ''),
                error: result?.error,
            };
        }
        catch (error) {
            console.error('[Analytics] Failed to track event:', error);
            return {
                ok: false,
                accepted: false,
                enabled: true,
                degraded: true,
                event: String(event || ''),
                error: String(error),
            };
        }
    });
    ipcMain.handle('rina:analytics:funnel', async (_event, step, properties) => {
        try {
            const result = trackFunnelStep(step, properties);
            return {
                ok: Boolean(result?.accepted),
                accepted: Boolean(result?.accepted),
                enabled: Boolean(result?.enabled),
                degraded: Boolean(result?.degraded),
                event: `funnel:${String(step)}`,
                error: result?.error,
            };
        }
        catch (error) {
            console.error('[Analytics] Failed to track funnel step:', error);
            return {
                ok: false,
                accepted: false,
                enabled: true,
                degraded: true,
                event: `funnel:${String(step)}`,
                error: String(error),
            };
        }
    });
    ipcMain.removeHandler('rina:agent:plan');
    ipcMain.handle('rina:agent:plan', async (_event, args) => {
        try {
            const projectRoot = resolveProjectRootSafe(args?.projectRoot);
            const intentText = String(args?.intentText || '');
            if (/\b(scan yourself|check yourself|self-check|inspect current state|check the workbench|diagnose the app|what is broken right now)\b/i.test(intentText)) {
                return {
                    id: `plan_self_check_${Date.now()}`,
                    reasoning: 'Running Rina self-check against policy checklist.',
                    steps: [
                        {
                            stepId: 's1',
                            tool: 'selfCheck',
                            input: {
                                command: 'executeSelfCheck',
                                cwd: projectRoot,
                                timeoutMs: 60000,
                            },
                            risk: 'inspect',
                            risk_level: 'low',
                            requires_confirmation: false,
                            description: 'Run self-check tool',
                        },
                    ],
                };
            }
            return await fetchRemotePlanForIpc({
                intentText,
                projectRoot,
            });
        }
        catch (error) {
            return {
                id: `plan_error_${Date.now()}`,
                reasoning: error instanceof Error ? error.message : String(error),
                steps: [],
            };
        }
    });
    ipcMain.removeHandler('rina:openRunsFolder');
    ipcMain.handle('rina:openRunsFolder', async () => openRunsFolderForIpc());
    ipcMain.removeHandler('rina:revealRunReceipt');
    ipcMain.handle('rina:revealRunReceipt', async (_event, receiptId) => revealRunReceiptForIpc(receiptId));
    ipcMain.removeHandler('rina:policy:explain');
    ipcMain.handle('rina:policy:explain', async (_event, command) => explainPolicy(String(command || '')));
    ipcMain.removeHandler('rina:redaction:preview');
    ipcMain.handle('rina:redaction:preview', async (_event, text) => redactionPreviewForIpc(text));
    ipcMain.removeHandler('rina:diagnostics:paths');
    ipcMain.handle('rina:diagnostics:paths', async () => diagnosticsPathsForIpc(diagnosticsBundleDeps));
    ipcMain.removeHandler('rina:support:bundle');
    ipcMain.handle('rina:support:bundle', async (_event, snapshot) => supportBundleForIpcWithSnapshot(diagnosticsBundleDeps, snapshot));
    ipcMain.removeHandler('rina:workspace:pick');
    ipcMain.handle('rina:workspace:pick', async () => workspacePickForIpc());
    ipcMain.removeHandler('rina:workspace:default');
    ipcMain.handle('rina:workspace:default', async (event) => workspaceDefaultForIpc(event.sender.id));
    ipcMain.removeHandler('team:plan');
    ipcMain.handle('team:plan', async () => {
        return await accountPlanForIpc();
    });
    ipcMain.removeHandler('team:workspace:create');
    ipcMain.handle('team:workspace:create', async (_event, args) => {
        const created = await teamWorkspaceCreateForIpc(args || {});
        if (created?.workspace_id) {
            const existing = loadTeamDb();
            saveTeamDb({
                ...existing,
                workspaceId: String(created.workspace_id),
            });
        }
        return created;
    });
    ipcMain.removeHandler('team:workspace:set');
    ipcMain.handle('team:workspace:set', async (_event, workspaceId) => {
        const nextWorkspaceId = String(workspaceId || '').trim();
        if (!nextWorkspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        const existing = loadTeamDb();
        const next = saveTeamDb({
            ...existing,
            workspaceId: nextWorkspaceId,
        });
        return { ok: true, workspaceId: next.workspaceId };
    });
    ipcMain.removeHandler('team:workspace:get');
    ipcMain.handle('team:workspace:get', async (_event, workspaceId) => {
        const requested = String(workspaceId || '').trim() || String(loadTeamDb()?.workspaceId || '').trim();
        if (!requested) {
            return { ok: false, error: 'workspace_id_required' };
        }
        const workspace = await teamWorkspaceGetForIpc(requested);
        if (workspace?.id || workspace?.workspace_id) {
            const existing = loadTeamDb();
            saveTeamDb({
                ...existing,
                workspaceId: requested,
                seatsAllowed: Number(workspace?.seats_allowed || existing?.seatsAllowed || 1),
            });
        }
        return workspace;
    });
    ipcMain.removeHandler('team:invites:list');
    ipcMain.handle('team:invites:list', async (_event, workspaceId) => {
        const requested = String(workspaceId || '').trim() || String(loadTeamDb()?.workspaceId || '').trim();
        if (!requested) {
            return { ok: false, error: 'workspace_id_required', invites: [] };
        }
        return await teamInvitesListForIpc(requested);
    });
    ipcMain.removeHandler('team:invite:create');
    ipcMain.handle('team:invite:create', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        return await teamInviteCreateForIpc({
            workspaceId,
            email: String(args?.email || '').trim(),
            role: normalizeRole(args?.role),
            expiresInHours: Number(args?.expiresInHours || 72),
            sendEmail: args?.sendEmail === true,
        });
    });
    ipcMain.removeHandler('team:invite:revoke');
    ipcMain.handle('team:invite:revoke', async (_event, inviteId) => {
        return await teamInviteRevokeForIpc(inviteId);
    });
    ipcMain.removeHandler('team:audit:list');
    ipcMain.handle('team:audit:list', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required', entries: [] };
        }
        return await teamAuditListForIpc({
            workspaceId,
            type: args?.type,
            from: args?.from,
            to: args?.to,
            limit: args?.limit,
        });
    });
    ipcMain.removeHandler('team:billing:setEnforcement');
    ipcMain.handle('team:billing:setEnforcement', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        return await teamBillingEnforcementForIpc({
            workspaceId,
            requireActivePlan: args?.requireActivePlan === true,
        });
    });
    registerThemeHandlers(ipcMain, {
        resolveResourcePath,
        warnIfUnexpectedPackagedResource,
        readJsonIfExists: (filePath) => readJsonIfExists(fs, filePath),
        writeJsonFile: (filePath, value) => writeJsonFile(fs, path, filePath, value),
        setLastLoadedThemePath: (filePath) => {
            ctx.lastLoadedThemePath = filePath;
        },
    });
    registerMemoryIpc({
        ipcMain,
        getState: () => ownerMemoryStore.getState(),
        updateProfile: (input) => ownerMemoryStore.updateProfile(input),
        updateWorkspace: (workspaceId, input) => ownerMemoryStore.updateWorkspace(workspaceId, input),
        resetWorkspace: (workspaceId) => ownerMemoryStore.resetWorkspace(workspaceId),
        resetAll: () => ownerMemoryStore.resetAll(),
        setInferredMemoryStatus: (id, status) => ownerMemoryStore.setInferredMemoryStatus(id, status),
        deleteEntry: (input) => ownerMemoryStore.deleteEntry(input),
    });
    registerUpdateIpc({
        ipcMain,
        app,
        fs,
        path,
        shell,
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('before-quit', () => {
    for (const id of ptySessions.keys()) {
        closePtyForWebContents(id);
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
//# sourceMappingURL=main.js.map
