import type {
  PtySessionRegistry,
  StreamExecutionRegistry,
} from "./runtimeTypes.js";

type AnyFn = (...args: any[]) => any;

export function createTransientRuntimeLocals(createRuntimeSessionState: AnyFn) {
  return {
    sessionState: createRuntimeSessionState(),
    running: new Map() as StreamExecutionRegistry,
    ptyStreamOwners: new Map(),
    ptySessions: new Map() as PtySessionRegistry,
    ptyResizeTimers: new Map(),
  };
}

export function createDiagnosticsBundleDeps(args: {
  appProjectRoot: string;
  resolveResourcePath: AnyFn;
  runtimeState: {
    ctx: {
      lastLoadedThemePath: string | null;
      lastLoadedPolicyPath: string | null;
    };
  };
  workspaceService: { getDefaultCwd: () => string };
  showSaveDialogForBundle: AnyFn;
  zipFiles: AnyFn;
}) {
  return {
    appProjectRoot: args.appProjectRoot,
    resolveResourcePath: args.resolveResourcePath,
    get lastLoadedThemePath() {
      return args.runtimeState.ctx.lastLoadedThemePath;
    },
    get lastLoadedPolicyPath() {
      return args.runtimeState.ctx.lastLoadedPolicyPath;
    },
    getDefaultCwd() {
      return args.workspaceService.getDefaultCwd();
    },
    showSaveDialogForBundle: args.showSaveDialogForBundle,
    zipFiles: args.zipFiles,
  };
}
