import type { IpcMain } from 'electron'
import type { AppContext } from '../context.js'
import { trackFunnelStep, trackEvent } from '../../analytics.js'

type PtySessionRecord = {
  proc: {
    write(data: string): void
    resize(cols: number, rows: number): void
    kill(): void
    onData(listener: (data: string) => void): void
    onExit(listener: (event: { exitCode: number; signal?: number }) => void): void
  }
  cols: number
  rows: number
  cwd: string
  shell: string
  shellKind: unknown
  transcriptBuffer: string
  finalizedBoundaryCount: number
  pendingInput: string
  metrics: {
    startedAt: string
    bytesIn: number
    bytesOut: number
    resizeCount: number
    blockedCommands: number
  }
}

export function registerSystemIpc(args: {
  ipcMain: IpcMain
  ctx: AppContext
  ptySessions: Map<number, PtySessionRecord>
  ptyResizeTimers: Map<number, NodeJS.Timeout>
  getPtyModule: () => Promise<{
    spawn(
      file: string,
      args: string[],
      options: {
        name: string
        cols: number
        rows: number
        cwd: string
        env: NodeJS.ProcessEnv
      }
    ): PtySessionRecord['proc']
  } | null>
  getDefaultShell: () => string
  resolvePtyCwd: (input?: string) => string
  safeEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv
  shellToKind: (shell: string) => unknown
  finalizePtyBoundaries: (webContents: Electron.WebContents, session: PtySessionRecord, flushAll?: boolean) => void
  closePtyForWebContents: (webContentsId: number) => void
  safeSend: (target: Electron.WebContents | null | undefined, channel: string, payload?: unknown) => boolean
  forRendererDisplay: (text: string) => string
  explainPolicy: (command: string) => {
    env: string
    action: string
    approval: string
    message: string
    typedPhrase?: string
    matchedRuleId?: string
  }
  operationalMemory: {
    getRecent: (category: string) => any[]
    set: (category: string, key: string, value: string) => void
  }
  addTranscriptEntry: (entry: {
    type: 'memory'
    timestamp: string
    category: string
    key: string
    value: string
  }) => void
  runUnifiedSearch: (query: string, limit?: number) => unknown
  detectCommandBoundaries: (transcript: string, shellHint?: unknown) => unknown
  getSessionTranscript: () => unknown
  exportTranscript: (format: 'json' | 'text') => string
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
  readTailLines: (filePath: string, maxLines: number) => string
  rendererErrorsFile: () => string
  currentPolicyEnv: () => string
  getCurrentRole: () => string
  explainPolicyGate: (
    command: string,
    confirmed: boolean,
    confirmationText: string
  ) => { ok: boolean; message?: string }
  listFiles: (payload?: { projectRoot?: string; limit?: number }) => Promise<{
    ok: boolean
    files?: string[]
    error?: string
  }>
  readFile: (payload?: { projectRoot?: string; relativePath?: string; maxBytes?: number }) => Promise<{
    ok: boolean
    content?: string
    relativePath?: string
    truncated?: boolean
    error?: string
  }>
  importHistory: (limit?: number) => Promise<unknown>
}) {
  const { ipcMain } = args

  // Remove existing handlers to prevent duplicates during hot reload
  ipcMain.removeHandler('rina:pty:start')
  ipcMain.removeHandler('rina:pty:write')
  ipcMain.removeHandler('rina:pty:resize')
  ipcMain.removeHandler('rina:pty:metrics')
  ipcMain.removeHandler('rina:pty:stop')
  ipcMain.removeHandler('rina:memory:get')
  ipcMain.removeHandler('rina:memory:set')
  ipcMain.removeHandler('rina:diagnostics:readTailLines')
  ipcMain.removeHandler('rina:diagnostics:rendererErrors')
  ipcMain.removeHandler('rina:diagnostics:sessionTranscript')
  ipcMain.removeHandler('rina:diagnostics:exportTranscript')
  ipcMain.removeHandler('rina:diagnostics:zipFiles')
  ipcMain.removeHandler('rina:diagnostics:showSaveDialog')
  ipcMain.removeHandler('rina:search:run')
  ipcMain.removeHandler('rina:search:detectBoundaries')
  ipcMain.removeHandler('rina:code:listFiles')
  ipcMain.removeHandler('rina:code:readFile')
  ipcMain.removeHandler('rina:history:import')

  ipcMain.handle('rina:pty:start', async (event, payload?: { cols?: number; rows?: number; cwd?: string }) => {
    const webContentsId = event.sender.id
    const existing = args.ptySessions.get(webContentsId)
    if (existing) {
      return { ok: true, shell: existing.shell, cwd: existing.cwd, cols: existing.cols, rows: existing.rows }
    }

    const ptyModule = await args.getPtyModule()
    if (!ptyModule) {
      return { ok: false, error: 'node-pty is not installed. Run npm install to enable terminal mode.' }
    }

    const cols = Math.max(40, Math.min(400, Number(payload?.cols || 120)))
    const rows = Math.max(10, Math.min(200, Number(payload?.rows || 30)))
    const cwd = args.resolvePtyCwd(payload?.cwd)
    const shell = args.getDefaultShell()

    const proc = ptyModule.spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: args.safeEnv(process.env),
    })

    args.ptySessions.set(webContentsId, {
      proc,
      cols,
      rows,
      cwd,
      shell,
      shellKind: args.shellToKind(shell),
      transcriptBuffer: '',
      finalizedBoundaryCount: 0,
      pendingInput: '',
      metrics: {
        startedAt: new Date().toISOString(),
        bytesIn: 0,
        bytesOut: 0,
        resizeCount: 0,
        blockedCommands: 0,
      },
    })

    // Track first terminal session for conversion funnel
    trackFunnelStep('first_run', { shell, cwd })
    trackEvent('terminal_session_start', { shell, cwd })

    proc.onData((data: string) => {
      const session = args.ptySessions.get(webContentsId)
      if (session) {
        session.metrics.bytesOut += Buffer.byteLength(String(data || ''), 'utf8')
        session.transcriptBuffer += String(data || '')
        args.finalizePtyBoundaries(event.sender, session, false)
        args.ptySessions.set(webContentsId, session)
      }
      args.safeSend(event.sender, 'rina:pty:data', args.forRendererDisplay(data))
    })

    proc.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
      const session = args.ptySessions.get(webContentsId)
      if (session) {
        args.finalizePtyBoundaries(event.sender, session, true)
      }
      args.ptySessions.delete(webContentsId)
      args.safeSend(event.sender, 'rina:pty:exit', { exitCode, signal })
    })

    return { ok: true, shell, cwd, cols, rows }
  })

  ipcMain.handle('rina:pty:write', async (event, data: string) => {
    const session = args.ptySessions.get(event.sender.id)
    if (!session) return { ok: false, error: 'PTY not started' }
    const raw = String(data ?? '')
    if (!raw) return { ok: true }
    session.metrics.bytesIn += Buffer.byteLength(raw, 'utf8')

    if (raw.includes('\n') || raw.includes('\r')) {
      const merged = `${session.pendingInput}${raw}`
      const normalized = merged.replace(/\r/g, '\n')
      const parts = normalized.split('\n')
      const completed = parts.slice(0, -1)
      session.pendingInput = parts[parts.length - 1] || ''

      for (const line of completed) {
        const cmd = String(line || '').trim()
        if (!cmd) {
          session.proc.write('\n')
          continue
        }
        const ex = args.explainPolicy(cmd)
        if (ex.action !== 'allow') {
          session.metrics.blockedCommands += 1
          session.proc.write('\u0003')
          args.safeSend(
            event.sender,
            'rina:pty:data',
            `\n[policy] blocked interactive command: ${cmd}\n[policy] ${ex.message}\n` +
              '[policy] Use Run/Plan execution so approvals can be recorded.\n'
          )
          // Track first block for conversion funnel
          trackFunnelStep('first_block', { command: cmd, reason: ex.message })
          trackEvent('command_blocked', { command: cmd, reason: ex.message })
          return { ok: false, error: ex.message || 'Blocked by policy.' }
        }
        session.proc.write(`${line}\n`)
      }
      return { ok: true }
    }

    if (raw === '\u007f') {
      session.pendingInput = session.pendingInput.slice(0, -1)
      session.proc.write(raw)
      return { ok: true }
    }
    if (raw >= ' ' || raw === '\t') {
      session.pendingInput += raw
    }
    session.proc.write(raw)
    return { ok: true }
  })

  ipcMain.handle('rina:pty:resize', async (event, cols: number, rows: number) => {
    const session = args.ptySessions.get(event.sender.id)
    if (!session) return { ok: false, error: 'PTY not started' }
    session.metrics.resizeCount += 1
    const safeCols = Math.max(40, Math.min(400, Number(cols || session.cols)))
    const safeRows = Math.max(10, Math.min(200, Number(rows || session.rows)))
    session.cols = safeCols
    session.rows = safeRows
    const existing = args.ptyResizeTimers.get(event.sender.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      try {
        session.proc.resize(safeCols, safeRows)
      } catch {
        // no-op
      } finally {
        args.ptyResizeTimers.delete(event.sender.id)
      }
    }, 80)
    args.ptyResizeTimers.set(event.sender.id, timer)
    return { ok: true }
  })

  ipcMain.handle('rina:pty:metrics', async (event) => {
    const session = args.ptySessions.get(event.sender.id)
    if (!session) return { ok: false, error: 'PTY not started' }
    return {
      ok: true,
      metrics: {
        ...session.metrics,
        durationSec: Math.max(0, Math.floor((Date.now() - Date.parse(session.metrics.startedAt)) / 1000)),
        boundaries: session.finalizedBoundaryCount,
        cwd: session.cwd,
        shell: session.shell,
      },
    }
  })

  ipcMain.handle('rina:pty:stop', async (event) => {
    const webContentsId = event.sender.id
    const session = args.ptySessions.get(webContentsId)
    if (session) args.finalizePtyBoundaries(event.sender, session, true)
    args.closePtyForWebContents(webContentsId)
    return { ok: true }
  })

  ipcMain.handle('rina:memory:get', async (_event, category: string) => args.operationalMemory.getRecent(category))

  ipcMain.handle('rina:memory:set', async (_event, category: string, key: string, value: string) => {
    args.operationalMemory.set(category, key, value)
    args.addTranscriptEntry({ type: 'memory', timestamp: new Date().toISOString(), category, key, value })
  })

  ipcMain.handle('rina:diagnostics:readTailLines', async (_event, filePath: string, maxLines: number) =>
    args.readTailLines(filePath, maxLines)
  )

  ipcMain.handle('rina:diagnostics:rendererErrors', async () => args.rendererErrorsFile())

  ipcMain.handle('rina:diagnostics:sessionTranscript', async () => args.getSessionTranscript())

  ipcMain.handle('rina:diagnostics:exportTranscript', async (_event, format: 'json' | 'text') =>
    args.exportTranscript(format)
  )

  ipcMain.handle('rina:diagnostics:zipFiles', async (_event, files: Array<{ name: string; data: Buffer }>) =>
    args.zipFiles(files)
  )

  ipcMain.handle('rina:diagnostics:showSaveDialog', async (_event, defaultPath: string) =>
    args.showSaveDialogForBundle(defaultPath)
  )

  ipcMain.handle('rina:search:run', async (_event, query: string, limit?: number) =>
    args.runUnifiedSearch(query, limit)
  )

  ipcMain.handle('rina:search:detectBoundaries', async (_event, transcript: string, shellHint?: unknown) =>
    args.detectCommandBoundaries(transcript, shellHint)
  )

  ipcMain.handle('rina:code:listFiles', async (_event, payload?: { projectRoot?: string; limit?: number }) =>
    args.listFiles(payload)
  )

  ipcMain.handle(
    'rina:code:readFile',
    async (
      _event,
      payload?: {
        projectRoot?: string
        relativePath?: string
        maxBytes?: number
      }
    ) => args.readFile(payload)
  )

  ipcMain.handle('rina:history:import', async (_event, limit?: number) => args.importHistory(limit))
}
