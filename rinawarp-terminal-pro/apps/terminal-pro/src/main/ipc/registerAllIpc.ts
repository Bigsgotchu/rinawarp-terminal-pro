import type { IpcMain } from "electron";
import type { PersonalityStore } from "../../personality.js";
import type { AppContext } from "../context.js";
import { registerDiagnosticsIpc } from "../diagnostics.js";
import type { LicenseVerifyResponse } from "../../license.js";
import type { ShellKind } from "../../prompt-boundary.js";
import { registerLicenseIpc } from "./registerLicenseIpc.js";
import { registerMemoryIpc } from "./registerMemoryIpc.js";
import { registerPtyIpc } from "./registerPtyIpc.js";
import { registerPersonalityIpc } from "./registerPersonalityIpc.js";
import { registerPolicyIpc } from "./registerPolicyIpc.js";
import { registerSessionIpc } from "./registerSessionIpc.js";
import { registerThemesIpc, type ThemeSpec } from "./registerThemesIpc.js";
import { registerUpdatesIpc } from "./registerUpdatesIpc.js";

// Runtime guard to prevent double-registration (e.g., during hot reload)
declare global {
  var __rinaIpcRegistered: boolean | undefined;
}

// eslint-disable-next-line max-lines-per-function
export function registerAllIpc(args: {
  ipcMain: IpcMain;
  app: Electron.App;
  ctx: AppContext;
  mainPath: string;
  repoRoot: string;
  appProjectRoot: string;
  dirname: string;
  loadThemeRegistryMerged: () => { themes: ThemeSpec[] };
  loadSelectedThemeId: () => string;
  saveSelectedThemeId: (id: string) => void;
  loadCustomThemeRegistry: () => { themes: ThemeSpec[] };
  validateTheme: (theme: ThemeSpec) => { ok: boolean; error?: string };
  writeJsonFile: (p: string, value: unknown) => void;
  customThemesFile: () => string;
  operationalMemory: {
    getRecent: (category: string) => any[];
    set: (category: string, key: string, value: string) => void;
  };
  addTranscriptEntry: (entry: { type: "memory"; timestamp: string; category: string; key: string; value: string }) => void;
  personalityStore: PersonalityStore;
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>;
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string;
  resetLicenseToStarter: () => void;
  saveEntitlements: () => void;
  shell: { openExternal: (url: string) => Promise<void> };
  getLicenseState: () => {
    tier: string;
    has_token: boolean;
    expires_at: number | null;
    customer_id: string | null;
    status: string;
  };
  getCurrentLicenseCustomerId: () => string | null;
  currentPolicyEnv: () => string;
  getCurrentRole: () => string;
  explainPolicy: (command: string) => {
    env: string;
    action: string;
    approval: string;
    message: string;
    typedPhrase?: string;
    matchedRuleId?: string;
  };
  readTailLines: (filePath: string, maxLines: number) => string;
  rendererErrorsFile: () => string;
  getSessionTranscript: () => unknown;
  exportTranscript: (format: "json" | "text") => string;
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer;
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>;
  runUnifiedSearch: (query: string, limit?: number) => unknown;
  detectCommandBoundaries: (transcript: string, shellHint?: ShellKind) => unknown;
  ptySessions: Map<number, any>;
  ptyResizeTimers: Map<number, NodeJS.Timeout>;
  getPtyModule: () => Promise<any>;
  getDefaultShell: () => string;
  resolvePtyCwd: (input?: string) => string;
  safeEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  shellToKind: (shell: string) => unknown;
  finalizePtyBoundaries: (webContents: Electron.WebContents, session: any, flushAll?: boolean) => void;
  closePtyForWebContents: (webContentsId: number) => void;
  safeSend: (target: Electron.WebContents | null | undefined, channel: string, payload?: unknown) => boolean;
  forRendererDisplay: (text: string) => string;
  isE2E: boolean;
}) {
  // Runtime guard: prevent double-registration during hot reload
  if (globalThis.__rinaIpcRegistered) {
    console.log("[IPC] Handlers already registered, skipping...");
    return;
  }
  globalThis.__rinaIpcRegistered = true;

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
  });

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
  });

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
  });

  registerMemoryIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    operationalMemory: args.operationalMemory,
    addTranscriptEntry: args.addTranscriptEntry,
  });

  registerPersonalityIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    personalityStore: args.personalityStore,
  });

  registerPolicyIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    currentPolicyEnv: args.currentPolicyEnv,
    getCurrentRole: args.getCurrentRole,
    explainPolicy: args.explainPolicy,
  });

  registerSessionIpc({
    ipcMain: args.ipcMain,
    ctx: args.ctx,
    getSessionTranscript: args.getSessionTranscript,
    exportTranscript: args.exportTranscript,
    addTranscriptEntry: args.addTranscriptEntry,
    runUnifiedSearch: args.runUnifiedSearch,
    detectCommandBoundaries: args.detectCommandBoundaries,
  });

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
  });

  registerUpdatesIpc({
    ipcMain: args.ipcMain,
    app: args.app,
    shell: args.shell,
    isE2E: args.isE2E,
  });
}
