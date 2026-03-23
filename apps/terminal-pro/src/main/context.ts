import type { StructuredSessionStore } from '../structured-session.js'

export type DiagnosticsFileInfo = {
  path: string
  exists: boolean
  sha256: string | null
  sizeBytes: number | null
}

export type DiagnosticsPayload = {
  app: {
    isPackaged: boolean
    appPath: string
    resourcesPath: string
    cwd: string
    platform: string
    arch: string
    versions: { electron?: string; chrome?: string; node?: string }
  }
  resolved: {
    main: DiagnosticsFileInfo
    preload: DiagnosticsFileInfo
    renderer: DiagnosticsFileInfo
    themeRegistry: DiagnosticsFileInfo
    policyYaml: DiagnosticsFileInfo
  }
  active: {
    themeRegistryPath: string | null
    policyYamlPath: string | null
  }
  notes: string[]
}

export type DiagnosticsRendererSnapshot = {
  appVersion?: string | null
  generatedAt?: string
  workspaceRoot?: string
  activeView?: {
    primary?: 'agent' | 'settings' | 'diagnostics'
    centerDrawer?: string | null
    rightPanel?: string | null
    settingsOpen?: boolean
  }
  mode?: string
  lastRun?: {
    id?: string | null
    status?: string | null
    exitCode?: number | null
    receiptId?: string | null
  }
  receiptId?: string | null
  featureFlags?: Record<string, unknown>
  recentEvents?: unknown[]
  recentIpcCalls?: unknown[]
  recentErrors?: unknown[]
  recentRuns?: unknown[]
  bugReceipt?: Record<string, unknown>
}

export type AppContext = {
  structuredSessionStore: StructuredSessionStore | null
  lastLoadedThemePath: string | null
  lastLoadedPolicyPath: string | null
}
