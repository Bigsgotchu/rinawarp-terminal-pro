import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron/main'

type FileInfo = {
  path: string
  exists: boolean
  sha256: string | null
  sizeBytes: number | null
}

type DiagnosticsBundleDeps = {
  appProjectRoot: string
  resolveResourcePath: (relPath: string, devBase: 'app' | 'repo') => string
  lastLoadedThemePath: string | null
  lastLoadedPolicyPath: string | null
  getDefaultPtyCwd: () => string
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer
}

function fileInfo(filePath: string): FileInfo {
  const normalizedPath = String(filePath || '')
  try {
    if (!normalizedPath || !fs.existsSync(normalizedPath)) {
      return { path: normalizedPath, exists: false, sha256: null, sizeBytes: null }
    }
    const content = fs.readFileSync(normalizedPath)
    return {
      path: normalizedPath,
      exists: true,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
      sizeBytes: content.byteLength,
    }
  } catch {
    return { path: normalizedPath, exists: false, sha256: null, sizeBytes: null }
  }
}

export function diagnosticsPathsForIpc(deps: DiagnosticsBundleDeps) {
  const mainPath = path.join(deps.appProjectRoot, 'dist-electron', 'main.js')
  const preloadPath = path.join(deps.appProjectRoot, 'dist-electron', 'preload.cjs')
  const rendererPath = deps.resolveResourcePath('renderer.html', 'app')
  const themeRegistryPath = deps.resolveResourcePath('themes/themes.json', 'app')
  const policyPath = deps.resolveResourcePath('policy/rinawarp-policy.yaml', 'repo')
  return {
    app: {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      cwd: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
      },
    },
    resolved: {
      main: fileInfo(mainPath),
      preload: fileInfo(preloadPath),
      renderer: fileInfo(rendererPath),
      themeRegistry: fileInfo(themeRegistryPath),
      policyYaml: fileInfo(policyPath),
    },
    active: {
      themeRegistryPath: deps.lastLoadedThemePath,
      policyYamlPath: deps.lastLoadedPolicyPath,
    },
    notes: [],
  }
}

export async function supportBundleForIpc(deps: DiagnosticsBundleDeps) {
  const diagnostics = diagnosticsPathsForIpc(deps)
  const defaultPath = path.join(app.getPath('downloads'), `rinawarp-support-bundle-${Date.now()}.zip`)
  const save = await deps.showSaveDialogForBundle(defaultPath)
  if (save.canceled || !save.filePath) {
    return { ok: false, error: 'Canceled' }
  }

  const bundle = deps.zipFiles([
    {
      name: 'diagnostics.json',
      data: Buffer.from(JSON.stringify(diagnostics, null, 2), 'utf8'),
    },
    {
      name: 'summary.txt',
      data: Buffer.from(
        [
          `Workspace root: ${String(deps.getDefaultPtyCwd() || '')}`,
          `App path: ${diagnostics.app.appPath}`,
          `Resources path: ${diagnostics.app.resourcesPath}`,
          `Policy path: ${String(diagnostics.active.policyYamlPath || 'unknown')}`,
          `Theme path: ${String(diagnostics.active.themeRegistryPath || 'unknown')}`,
        ].join('\n'),
        'utf8',
      ),
    },
  ])

  fs.mkdirSync(path.dirname(save.filePath), { recursive: true })
  fs.writeFileSync(save.filePath, bundle)
  return { ok: true, path: save.filePath, bytes: bundle.byteLength }
}
