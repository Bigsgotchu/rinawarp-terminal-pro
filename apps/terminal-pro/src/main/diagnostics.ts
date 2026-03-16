import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { redactText } from '@rinawarp/safety/redaction'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electron = require('electron')
const { app } = electron
import type { IpcMain } from 'electron'
import type { AppContext, DiagnosticsPayload } from './context.js'
import { fileInfoIfExists, resolveResourcePath } from './resources.js'

export function buildDiagnosticsPathsPayload(args: {
  ctx: AppContext
  mainPath: string
  repoRoot: string
  appProjectRoot: string
  dirname: string
}): DiagnosticsPayload {
  const themePath = resolveResourcePath({
    relPath: 'themes/themes.json',
    devBase: 'app',
    repoRoot: args.repoRoot,
    appProjectRoot: args.appProjectRoot,
    dirname: args.dirname,
  })

  const policyPath = resolveResourcePath({
    relPath: 'policy/rinawarp-policy.yaml',
    devBase: 'repo',
    repoRoot: args.repoRoot,
    appProjectRoot: args.appProjectRoot,
    dirname: args.dirname,
  })

  const preloadPath = resolveResourcePath({
    relPath: 'preload.cjs',
    devBase: 'app',
    repoRoot: args.repoRoot,
    appProjectRoot: args.appProjectRoot,
    dirname: args.dirname,
  })

  const rendererPath = resolveResourcePath({
    relPath: 'renderer.html',
    devBase: 'app',
    repoRoot: args.repoRoot,
    appProjectRoot: args.appProjectRoot,
    dirname: args.dirname,
  })

  const notes: string[] = []
  if (!args.ctx.lastLoadedThemePath) {
    notes.push('Theme registry active path is not yet recorded; open themes or load theme list once.')
  }
  if (!args.ctx.lastLoadedPolicyPath) {
    notes.push('Policy active path is not yet recorded; run any policy-evaluated action once.')
  }
  if (!app.isPackaged) notes.push('Running in development mode (app.isPackaged=false).')

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
      main: fileInfoIfExists(args.mainPath),
      preload: fileInfoIfExists(preloadPath),
      renderer: fileInfoIfExists(rendererPath),
      themeRegistry: fileInfoIfExists(themePath),
      policyYaml: fileInfoIfExists(policyPath),
    },
    active: {
      themeRegistryPath: args.ctx.lastLoadedThemePath,
      policyYamlPath: args.ctx.lastLoadedPolicyPath,
    },
    notes,
  }
}

export function registerDiagnosticsIpc(args: {
  ipcMain: IpcMain
  ctx: AppContext
  mainPath: string
  repoRoot: string
  appProjectRoot: string
  dirname: string
  readTailLines: (filePath: string, maxLines: number) => string
  rendererErrorsFile: () => string
  getSessionTranscript: () => unknown
  exportTranscript: (format: 'json' | 'text') => string
  currentPolicyEnv: () => string
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
}) {
  args.ipcMain.handle('rina:diagnostics:paths', async () => {
    return buildDiagnosticsPathsPayload({
      ctx: args.ctx,
      mainPath: args.mainPath,
      repoRoot: args.repoRoot,
      appProjectRoot: args.appProjectRoot,
      dirname: args.dirname,
    })
  })

  args.ipcMain.handle(
    'rina:renderer:error',
    async (_event, payload: { kind?: string; message?: string; extra?: string }) => {
      try {
        fs.appendFileSync(
          args.rendererErrorsFile(),
          `${JSON.stringify({
            timestamp: new Date().toISOString(),
            kind: String(payload?.kind || 'renderer_error'),
            message: String(payload?.message || ''),
            extra: String(payload?.extra || ''),
          })}\n`,
          'utf-8'
        )
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  args.ipcMain.handle('rina:support:bundle', async () => {
    const diagnostics = buildDiagnosticsPathsPayload({
      ctx: args.ctx,
      mainPath: args.mainPath,
      repoRoot: args.repoRoot,
      appProjectRoot: args.appProjectRoot,
      dirname: args.dirname,
    })
    const transcriptJson = redactText(JSON.stringify(args.getSessionTranscript(), null, 2)).redactedText
    const transcriptText = args.exportTranscript('text')
    const rendererErrors = redactText(args.readTailLines(args.rendererErrorsFile(), 200)).redactedText
    const generatedAt = new Date().toISOString()
    const fileName = `rinawarp-support-bundle-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.zip`

    const files = [
      {
        name: 'bundle-meta.json',
        data: Buffer.from(
          JSON.stringify(
            {
              generatedAt,
              appVersion: app.getVersion(),
              env: args.currentPolicyEnv(),
            },
            null,
            2
          ),
          'utf8'
        ),
      },
      { name: 'diagnostics.json', data: Buffer.from(JSON.stringify(diagnostics, null, 2), 'utf8') },
      { name: 'transcript.json', data: Buffer.from(transcriptJson, 'utf8') },
      { name: 'transcript.txt', data: Buffer.from(transcriptText, 'utf8') },
      { name: 'renderer-errors.ndjson', data: Buffer.from(rendererErrors, 'utf8') },
    ]
    const zip = args.zipFiles(files)

    const saved = await args.showSaveDialogForBundle(path.join(app.getPath('downloads'), fileName))
    if (saved.canceled || !saved.filePath) return { ok: false, error: 'cancelled' }

    fs.writeFileSync(saved.filePath, zip)
    return { ok: true, path: saved.filePath, bytes: zip.length }
  })
}
