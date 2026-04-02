import { buildConversationReply, routeConversationTurn } from '../orchestration/conversationRouter.js'
import type {
  DevtoolsToggleTarget,
  DevtoolsToggleResult,
  RunsListResult,
  WindowLifecycleDeps,
  WindowLifecycleHelpers,
} from '../startup/runtimeTypes.js'

type AgentMode = 'auto' | 'assist' | 'explain'

type AgentRunOptions = {
  workspaceRoot?: string
  mode?: AgentMode | string
}

type ControllerStatus = {
  workspaceRoot?: string
}

type ControllerStats = {
  conversation?: { entries?: number }
  commands?: { learned?: number }
  longterm?: { sessions?: number }
}

type RinaControllerLike = {
  setWorkspaceRoot(root: string): unknown
  setMode(mode: AgentMode): unknown
  getStatus(): ControllerStatus
  getStats(): ControllerStats
  getTools(): unknown
  isAgentRunning(): boolean
  getMode(): unknown
  getPlans(): unknown
}

function isAgentMode(mode: unknown): mode is AgentMode {
  return mode === 'auto' || mode === 'assist' || mode === 'explain'
}

function getLatestRun(runsResult: RunsListResult | { ok: boolean; runs: never[] }) {
  if ('runs' in runsResult && Array.isArray(runsResult.runs)) {
    return runsResult.runs[0] ?? null
  }
  return null
}

export function createWindowLifecycle(
  deps: WindowLifecycleDeps,
): WindowLifecycleHelpers {
  const {
    BrowserWindow,
    path,
    __dirname,
    app,
    safeSend,
    thinkingStream,
    closePtyForWebContents,
    setDaemonFunctions,
    setLicenseFunctions,
    registerIpcHandlers,
    registerSecureAgentIpc,
    ipcMain,
    getLicenseTier,
    verifyLicense,
    applyVerifiedLicense,
    resetLicenseToStarter,
    saveEntitlements,
    refreshLicenseState,
    shell,
    getLicenseState,
    getCurrentLicenseCustomerId,
    getOrCreateDeviceId,
    getCachedEmail,
    setCachedEmail,
    daemonStatus,
    daemonTasks,
    daemonTaskAdd,
    daemonStart,
    daemonStop,
    runsListForIpc,
    runsTailForIpc,
    runsArtifactsForIpc,
    codeListFilesForIpc,
    codeReadFileForIpc,
    handleRinaMessage,
    rinaController,
    resolveProjectRootSafe,
    normalizeRinaResponse,
  } = deps
  const controller = rinaController as unknown as RinaControllerLike

  function createWindow() {
    let win
    try {
      if (process.env.RINAWARP_E2E === '1') {
        process.env.RINAWARP_E2E_WINDOW_PHASE = 'creating'
      }
      win = new BrowserWindow({
        width: 1400,
        height: 800,
        icon: path.join(__dirname, '../../assets/icon.png'),
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      })
      if (process.env.RINAWARP_E2E === '1') {
        process.env.RINAWARP_E2E_WINDOW_PHASE = 'created'
      }
    } catch (error) {
      if (process.env.RINAWARP_E2E === '1') {
        process.env.RINAWARP_E2E_WINDOW_PHASE = `error:${error instanceof Error ? error.message : String(error)}`
      }
      throw error
    }

    setDaemonFunctions({
      daemonStatus,
      daemonTasks,
      daemonTaskAdd,
      daemonStart,
      daemonStop,
      runAgent: async (prompt: unknown, opts?: AgentRunOptions) => {
        const rawPrompt = String(prompt || '')
        if (opts?.workspaceRoot) {
          try {
            controller.setWorkspaceRoot(resolveProjectRootSafe(String(opts.workspaceRoot)))
          } catch {}
        }
        if (isAgentMode(opts?.mode)) {
          controller.setMode(opts.mode)
        }
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc({ limit: 12 }) : { ok: false, runs: [] }
        const latestRun = getLatestRun(runsResult)
        const routedTurn = routeConversationTurn({
          rawText: rawPrompt,
          workspaceId: controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || '',
          latestRun: latestRun
            ? {
                runId: latestRun.latestReceiptId || latestRun.sessionId,
                sessionId: latestRun.sessionId,
                latestCommand: latestRun.latestCommand,
                latestExitCode: latestRun.latestExitCode,
                latestReceiptId: latestRun.latestReceiptId,
                interrupted: Boolean(latestRun.interrupted),
              }
            : null,
        })
        if (routedTurn.allowedNextAction !== 'execute' && routedTurn.allowedNextAction !== 'plan') {
          const reply = await buildConversationReply({
            routedTurn,
            workspaceLabel: controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || 'this workspace',
            latestRun,
          })
          return normalizeRinaResponse({
            ok: true,
            intent: routedTurn.mode,
            output: {
              message: reply.message,
              routedTurn,
            },
          })
        }
        return normalizeRinaResponse(await handleRinaMessage(rawPrompt))
      },
      conversationRoute: async (prompt: unknown, opts?: AgentRunOptions) => {
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc({ limit: 12 }) : { ok: false, runs: [] }
        const latestRun = getLatestRun(runsResult)
        return routeConversationTurn({
          rawText: String(prompt || ''),
          workspaceId: controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || '',
          latestRun: latestRun
            ? {
                runId: latestRun.latestReceiptId || latestRun.sessionId,
                sessionId: latestRun.sessionId,
                latestCommand: latestRun.latestCommand,
                latestExitCode: latestRun.latestExitCode,
                latestReceiptId: latestRun.latestReceiptId,
                interrupted: Boolean(latestRun.interrupted),
              }
            : null,
        })
      },
      getStatus: async () => {
        const stats = controller.getStats()
        return {
          ...controller.getStatus(),
          tools: controller.getTools(),
          agentRunning: controller.isAgentRunning(),
          memoryStats: {
            conversationCount: stats.conversation?.entries ?? 0,
            learnedCommandsCount: stats.commands?.learned ?? 0,
            projectsCount: stats.longterm?.sessions ?? 0,
          },
        }
      },
      getMode: async () => controller.getMode(),
      setMode: async (mode: unknown) => {
        if (isAgentMode(mode)) {
          return controller.setMode(mode)
        }
        return { ok: false, error: `Invalid mode: ${String(mode)}` }
      },
      getPlans: async () => controller.getPlans(),
      getTools: async () => controller.getTools(),
      runsList: runsListForIpc,
      runsTail: runsTailForIpc,
      runsArtifacts: runsArtifactsForIpc,
      codeListFiles: codeListFilesForIpc,
      codeReadFile: codeReadFileForIpc,
    })

    setLicenseFunctions({
      verifyLicense,
      applyVerifiedLicense,
      resetLicenseToStarter,
      saveEntitlements,
      refreshLicenseState,
      shell,
      getLicenseState,
      getCurrentLicenseCustomerId,
      getDeviceId: getOrCreateDeviceId,
      getCachedEmail,
      setCachedEmail,
    })

    registerIpcHandlers(win)
    registerSecureAgentIpc(ipcMain, { getLicenseTier })

    const webContentsId = win.webContents.id ?? -1
    win.loadFile(path.join(__dirname, 'renderer', 'renderer.html'))
    win.once('closed', () => {
      try {
        closePtyForWebContents(webContentsId)
      } catch {}
    })

    thinkingStream.on('thinking', (step: unknown) => {
      safeSend(win.webContents, 'rina:thinking', step)
    })

    if (app.isPackaged) {
      try {
        if (!win.webContents.isDestroyed()) {
          win.webContents.closeDevTools()
        }
      } catch {}
    }
  }

  async function devtoolsToggleForIpc(
    wc: DevtoolsToggleTarget,
  ): Promise<DevtoolsToggleResult> {
    if (wc.isDestroyed()) return { ok: false, error: 'window destroyed' }
    try {
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools()
        return { ok: true, open: false }
      }
      wc.openDevTools({ mode: 'detach' })
      return { ok: true, open: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'failed to toggle devtools',
      }
    }
  }

  return {
    createWindow,
    devtoolsToggleForIpc,
  }
}
