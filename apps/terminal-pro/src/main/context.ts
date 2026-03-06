import type { StructuredSessionStore } from "../structured-session.js";

export type DiagnosticsFileInfo = {
  path: string;
  exists: boolean;
  sha256: string | null;
  sizeBytes: number | null;
};

export type DiagnosticsPayload = {
  app: {
    isPackaged: boolean;
    appPath: string;
    resourcesPath: string;
    cwd: string;
    platform: string;
    arch: string;
    versions: { electron?: string; chrome?: string; node?: string };
  };
  resolved: {
    main: DiagnosticsFileInfo;
    preload: DiagnosticsFileInfo;
    renderer: DiagnosticsFileInfo;
    themeRegistry: DiagnosticsFileInfo;
    policyYaml: DiagnosticsFileInfo;
  };
  active: {
    themeRegistryPath: string | null;
    policyYamlPath: string | null;
  };
  notes: string[];
};

export type AppContext = {
  structuredSessionStore: StructuredSessionStore | null;
  lastLoadedThemePath: string | null;
  lastLoadedPolicyPath: string | null;
};
