import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron/main'
import type { DiagnosticsRendererSnapshot } from '../context.js'

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
  const rendererCandidates = [
    deps.resolveResourcePath('dist-electron/renderer/renderer.html', 'app'),
    deps.resolveResourcePath('dist-electron/renderer.html', 'app'),
    deps.resolveResourcePath('renderer.html', 'app'),
  ]
  const rendererPath = rendererCandidates.find((candidate) => fileInfo(candidate).exists) || rendererCandidates[0]
  const themeRegistryPath = deps.resolveResourcePath('themes/themes.json', 'app')
  const policyPath = deps.resolveResourcePath('policy/rinawarp-policy.yaml', 'repo')
  const notes: string[] = []
  if (!fileInfo(rendererPath).exists) {
    notes.push(`Renderer asset not found at expected packaged paths: ${rendererCandidates.join(', ')}`)
  }
  return {
    app: {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      cwd: deps.appProjectRoot,
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
    notes,
  }
}

export async function supportBundleForIpc(deps: DiagnosticsBundleDeps) {
  return supportBundleForIpcWithSnapshot(deps, undefined)
}

function sanitizeSnapshot(snapshot?: DiagnosticsRendererSnapshot | null): DiagnosticsRendererSnapshot | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const asRecord = snapshot as Record<string, unknown>
  return {
    appVersion: typeof asRecord.appVersion === 'string' ? asRecord.appVersion : null,
    generatedAt: typeof asRecord.generatedAt === 'string' ? asRecord.generatedAt : undefined,
    workspaceRoot: typeof asRecord.workspaceRoot === 'string' ? asRecord.workspaceRoot : undefined,
    activeView:
      typeof asRecord.activeView === 'object' && asRecord.activeView
        ? (asRecord.activeView as DiagnosticsRendererSnapshot['activeView'])
        : undefined,
    mode: typeof asRecord.mode === 'string' ? asRecord.mode : undefined,
    lastRun: typeof asRecord.lastRun === 'object' && asRecord.lastRun ? (asRecord.lastRun as DiagnosticsRendererSnapshot['lastRun']) : undefined,
    receiptId: typeof asRecord.receiptId === 'string' ? asRecord.receiptId : null,
    featureFlags: typeof asRecord.featureFlags === 'object' && asRecord.featureFlags ? (asRecord.featureFlags as Record<string, unknown>) : undefined,
    recentEvents: Array.isArray(asRecord.recentEvents) ? asRecord.recentEvents.slice(-100) : undefined,
    recentIpcCalls: Array.isArray(asRecord.recentIpcCalls) ? asRecord.recentIpcCalls.slice(-100) : undefined,
    recentErrors: Array.isArray(asRecord.recentErrors) ? asRecord.recentErrors.slice(-50) : undefined,
    recentRuns: Array.isArray(asRecord.recentRuns) ? asRecord.recentRuns.slice(-10) : undefined,
    bugReceipt: typeof asRecord.bugReceipt === 'object' && asRecord.bugReceipt ? (asRecord.bugReceipt as Record<string, unknown>) : undefined,
  }
}

export async function supportBundleForIpcWithSnapshot(
  deps: DiagnosticsBundleDeps,
  rendererSnapshot?: DiagnosticsRendererSnapshot | null
) {
  const diagnostics = diagnosticsPathsForIpc(deps)
  const snapshot = sanitizeSnapshot(rendererSnapshot)
  const defaultPath = path.join(app.getPath('downloads'), `rinawarp-support-bundle-${Date.now()}.zip`)
  const save = await deps.showSaveDialogForBundle(defaultPath)
  if (save.canceled || !save.filePath) {
    return { ok: false, error: 'Canceled' }
  }

  const files: Array<{ name: string; data: Buffer }> = [
    {
      name: 'app-info.json',
      data: Buffer.from(JSON.stringify(diagnostics, null, 2), 'utf8'),
    },
    {
      name: 'summary.txt',
      data: Buffer.from(
        [
          `Workspace root: ${String(snapshot?.workspaceRoot || deps.getDefaultPtyCwd() || '')}`,
          `App path: ${diagnostics.app.appPath}`,
          `Resources path: ${diagnostics.app.resourcesPath}`,
          `App version: ${snapshot?.appVersion || app.getVersion()}`,
          `Active view: ${String(snapshot?.activeView || 'unknown')}`,
          `Mode: ${String(snapshot?.mode || 'unknown')}`,
          `Last run: ${String(snapshot?.lastRun?.id || 'none')} ${String(snapshot?.lastRun?.status || 'unknown')}`,
          `Policy path: ${String(diagnostics.active.policyYamlPath || 'unknown')}`,
          `Theme path: ${String(diagnostics.active.themeRegistryPath || 'unknown')}`,
        ].join('\n'),
        'utf8',
      ),
    },
  ]

  if (snapshot) {
    files.push({
      name: 'renderer-debug.json',
      data: Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'),
    })
    if (snapshot.bugReceipt) {
      files.push({
        name: 'bug-receipt.json',
        data: Buffer.from(JSON.stringify(snapshot.bugReceipt, null, 2), 'utf8'),
      })
    }
    if (snapshot.recentEvents) {
      files.push({
        name: 'recent-events.json',
        data: Buffer.from(JSON.stringify(snapshot.recentEvents, null, 2), 'utf8'),
      })
    }
    if (snapshot.recentIpcCalls) {
      files.push({
        name: 'ipc-trace.json',
        data: Buffer.from(JSON.stringify(snapshot.recentIpcCalls, null, 2), 'utf8'),
      })
    }
    if (snapshot.recentRuns) {
      files.push({
        name: 'recent-runs.json',
        data: Buffer.from(JSON.stringify(snapshot.recentRuns, null, 2), 'utf8'),
      })
    }
  }

  const bundle = deps.zipFiles(files)

  fs.mkdirSync(path.dirname(save.filePath), { recursive: true })
  fs.writeFileSync(save.filePath, bundle)
  return { ok: true, path: save.filePath, bytes: bundle.byteLength }
}
