// @ts-nocheck
// Main-process composition root.
// This file remains in the TypeScript build, but type-checking is temporarily
// disabled while the composition/setup refactor is being completed.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const electron = require('electron/main') as typeof import('electron');
const { app, BrowserWindow, ipcMain, dialog, webContents, shell } = electron;
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
import { registerAnalyticsIpc } from './main/ipc/registerAnalyticsIpc.js';
import { registerUpdateIpc } from './main/ipc/registerUpdateIpc.js';
import { resolveResourcePath as resolveMainResourcePath } from './main/resources.js';
import { createAgentdIpcWrappers } from './main/agentd/ipcWrappers.js';
import { createAgentdClient } from './main/agentd/client.js';
import { createChatDoctorIpcHelpers } from './main/assistant/chatDoctorIpc.js';
import { createDoctorIpcHelpers } from './main/assistant/doctorIpc.js';
import { createFixProjectFlow } from './main/assistant/fixProjectFlow.js';
import { registerRinaIpc } from './main/assistant/registerRinaIpc.js';
import { registerRinaPlanIpc } from './main/assistant/registerRinaPlanIpc.js';
import { resolveMainPlaybooks } from './main/assistant/playbooks.js';
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
import { registerTeamIpc } from './main/team/registerTeamIpc.js';
import { registerTeamStateIpc } from './main/team/registerTeamStateIpc.js';
import { createWindowLifecycle } from './main/window/windowLifecycle.js';
import { createWorkspaceRuntimeHelpers } from './main/workspace/runtimeWorkspace.js';
import { createWorkspaceElectronIpcHelpers } from './main/workspace/electronIpc.js';
import { disableUsageTracking, enableUsageTracking, getUsageStatus, initAnalytics, isUsageTrackingEnabled, trackAISuggestionUsed, trackCommandExecuted, trackEvent, trackFunnelStep, trackSelfHealingRun, trackTerminalSessionStart, } from './analytics.js';
import { handleRinaMessage, rinaController } from './rina/index.js';
import { thinkingStream } from './rina/thinking/thinkingStream.js';
import { listStructuredRunsFromSessionsRoot, readStructuredRunTailFromSessionsRoot, summarizeStructuredRunArtifactsFromSessionsRoot } from './main/runs/structuredRuns.js';
import { diagnosticsPathsForIpc, supportBundleForIpcWithSnapshot } from './main/diagnostics/supportBundle.js';
import { bindAppLifecycle } from './main/startup/appLifecycleBinder.js';
import { bootstrapFrameworkRuntime } from './main/startup/bootstrapFrameworkRuntime.js';
import { createMainRuntime } from './main/startup/createMainRuntime.js';
import { registerPostStartupIpcAndServices } from './main/startup/registerPostStartupIpcAndServices.js';
import { createAnalyticsSessionInitializer, createAuthBootstrap, createDaemonAutoStarter, createEntitlementRestore, runStartupSequence, } from './main/startup/startupSequence.js';
import { canonicalizePath, isWithinRoot, normalizeProjectRoot as normalizeProjectRootFromSecurity, resolveProjectRootSafe as resolveProjectRootSafeFromSecurity, } from './security/projectRoot.js';
import { setFrameworkRuntime } from './main/runtime/runtimeAccess.js';
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
const personalityStore = new PersonalityStore();
const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || 'http://127.0.0.1:5055';
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || '';
const IS_E2E = process.env.RINAWARP_E2E === '1';
if (IS_E2E) {
    process.env.RINAWARP_E2E_MAIN_LOADED = '1';
}
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
const bootMilestones: string[] = [];
function markBootMilestone(label: string): void {
    if (!IS_E2E)
        return;
    bootMilestones.push(label);
    globalThis.__RINA_BOOT_MILESTONES = [...bootMilestones];
    app.__rinaBootMilestones = [...bootMilestones];
    process.env.RINAWARP_E2E_BOOT_MILESTONES = bootMilestones.join(' > ');
    console.log(`[boot] ${label}`);
    console.error(`[boot] ${label}`);
}
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
const RENDERER_ERRORS_FILE = () => path.join(app.getPath('userData'), 'renderer-errors.ndjson');
const REDACT_BEFORE_PERSIST = true;
const REDACT_BEFORE_MODEL = true;
import { doctorInspect, doctorCollect, doctorInterpret, doctorVerify, doctorExecuteFix, doctorGetTranscript, doctorExportTranscript, } from './doctor-bridge.js';
import { chatRouter } from './chat-router.js';
const runtime = createMainRuntime({
    platform: {
        app,
        BrowserWindow,
        ipcMain,
        dialog,
        webContents,
        shell,
        fs,
        path,
        os,
        crypto,
        process,
        __dirname,
    },
    config: {
        APP_PROJECT_ROOT,
        AGENTD_BASE_URL,
        AGENTD_AUTH_TOKEN,
        IS_E2E,
        TOP_CPU_CMD_SAFE,
        TOP_CPU_CMD_SAFE_SHORT,
        PLAYBOOKS,
        e2ePlanPayloads,
        StructuredSessionStore,
        featureFlags,
    },
    security: {
        verifyLicense,
        getOrCreateDeviceId,
        getCachedEmail,
        setCachedEmail,
        setAuthConfig,
        setCachedToken,
        defaultProfileForProject,
        loadProjectRules,
        rulesToSystemBlock,
        summarizeProfile,
        riskFromPlanStep,
        normalizeProjectRoot,
        resolveProjectRootSafe,
        resolveResourcePath,
        warnIfUnexpectedPackagedResource,
        canonicalizePath,
        isWithinRoot,
        gateProfileCommand,
        redactText,
        detectCommandBoundaries,
    },
    factories: {
        createOwnerMemoryStore,
        createAgentdIpcWrappers,
        createAgentdClient,
        createChatDoctorIpcHelpers,
        createDoctorIpcHelpers,
        createFixProjectFlow,
        createPolicyGate,
        createBuildPlanHelpers,
        createMiscIpcHelpers,
        createPtyRuntimeHelpers,
        createRunsIpcHelpers,
        createSessionHelpers,
        createRuntimeSessionState,
        readJsonIfExists,
        writeJsonFile,
        createRuntimeUtils,
        createPlanExecutionHelpers,
        createWindowLifecycle,
        createWorkspaceRuntimeHelpers,
        createWorkspaceElectronIpcHelpers,
        createAnalyticsSessionInitializer,
        createAuthBootstrap,
        createDaemonAutoStarter,
        createEntitlementRestore,
        createStandardRegistry,
        ExecutionEngine,
        executeViaEngine,
    },
    analytics: {
        initAnalytics,
        trackEvent,
        trackFunnelStep,
        getUsageStatus,
        isUsageTrackingEnabled,
        enableUsageTracking,
        disableUsageTracking,
        trackCommandExecuted,
        trackAISuggestionUsed,
        trackSelfHealingRun,
        trackTerminalSessionStart,
    },
    doctorChat: {
        handleRinaMessage,
        rinaController,
        thinkingStream,
        chatRouter,
        doctorInspect,
        doctorCollect,
        doctorInterpret,
        doctorVerify,
        doctorExecuteFix,
        doctorGetTranscript,
        doctorExportTranscript,
    },
    diagnostics: {
        listStructuredRunsFromSessionsRoot,
        readStructuredRunTailFromSessionsRoot,
        summarizeStructuredRunArtifactsFromSessionsRoot,
        diagnosticsPathsForIpc,
        supportBundleForIpcWithSnapshot,
    },
    execution: {
        executeViaEngine,
    },
    registration: {
        setDaemonFunctions,
        setLicenseFunctions,
        registerIpcHandlers,
        registerPtyHandlers,
        registerSecureAgentIpc,
        registerAgentExecutionIpc,
        registerMemoryIpc,
        registerAnalyticsIpc,
        registerUpdateIpc,
        registerRinaIpc,
        registerRinaPlanIpc,
        registerTeamIpc,
        registerTeamStateIpc,
        registerThemeHandlers,
        registerPostStartupIpcAndServices,
    },
});
runtime.registration.registerTeamStateIpc();
let frameworkRuntime = null;
app.whenReady().then(async () => {
    try {
        markBootMilestone('whenReady start');
        frameworkRuntime = await bootstrapFrameworkRuntime({
            environment: app.isPackaged ? 'production' : 'development',
            appName: 'RinaWarp Terminal Pro',
            appVersion: app.getVersion(),
            execution: runtime.execution,
            app,
            fs,
            path,
            agentdBaseUrl: AGENTD_BASE_URL,
            agentdAuthToken: AGENTD_AUTH_TOKEN,
            fetchImpl: fetch,
            verifyLicense,
            writeJsonFile: (filePath, value) => writeJsonFile(fs, path, filePath, value),
            readJsonIfExists: (filePath) => readJsonIfExists(fs, filePath),
            appProjectRoot: APP_PROJECT_ROOT,
            os,
            process,
            topCpuCmdSafe: TOP_CPU_CMD_SAFE,
            normalizeProjectRoot,
            resolveProjectRootSafe,
            canonicalizePath,
            isWithinRoot,
            ipcMain,
        });
        markBootMilestone('framework bootstrapped');
        const startup = await runStartupSequence(runtime.startup);
        markBootMilestone('startup sequence complete');
        await frameworkRuntime.start();
        markBootMilestone('framework started');
        setFrameworkRuntime(frameworkRuntime);
        runtime.state.structuredSessionStore = startup.structuredSessionStore;
        runtime.registration.registerPostStartupIpcAndServices();
        markBootMilestone('post-startup IPC registered');
        runtime.windows.createWindow();
        markBootMilestone('createWindow scheduled');
    }
    catch (error) {
        markBootMilestone(`boot failed: ${error instanceof Error ? error.message : String(error)}`);
        console.error('[boot] startup failed', error);
    }
});
bindAppLifecycle({
    app,
    BrowserWindow,
    createWindow: runtime.windows.createWindow,
    ptySessions: runtime.windows.ptySessions,
    closePtyForWebContents: runtime.windows.closePtyForWebContents,
    platform: process.platform,
});
app.on('before-quit', () => {
    setFrameworkRuntime(null);
    if (frameworkRuntime?.stop) {
        void frameworkRuntime.stop().catch((error) => {
            console.error('[frameworkRuntime.stop] failed', error);
        });
    }
});
//# sourceMappingURL=main.js.map
