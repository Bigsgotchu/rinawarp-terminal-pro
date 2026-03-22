export {}

declare global {
  type DiagnosticsFileInfo = {
    path: string
    exists: boolean
    sha256?: string | null
    sizeBytes?: number | null
  }

  type DiagnosticsPaths = {
    app: {
      isPackaged: boolean
      appPath: string
      resourcesPath: string
      cwd: string
      platform: string
      arch: string
      versions?: Record<string, string | undefined>
    }
    resolved: {
      main?: DiagnosticsFileInfo
      preload?: DiagnosticsFileInfo
      renderer?: DiagnosticsFileInfo
      themeRegistry?: DiagnosticsFileInfo
      policyYaml?: DiagnosticsFileInfo
    }
    active: {
      themeRegistryPath?: string | null
      policyYamlPath?: string | null
    }
    notes?: string[]
  }

  var RW_DEV: boolean | undefined
  var RW_SESSION: string | undefined
}
