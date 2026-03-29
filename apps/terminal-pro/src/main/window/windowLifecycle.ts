// @ts-nocheck
import { buildConversationReply, routeConversationTurn } from '../orchestration/conversationRouter.js'

export function createWindowLifecycle(deps) {
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

  function createWindow() {
    const win = new BrowserWindow({
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

    setDaemonFunctions({
      daemonStatus,
      daemonTasks,
      daemonTaskAdd,
      daemonStart,
      daemonStop,
      runAgent: async (prompt, opts) => {
        const rawPrompt = String(prompt || '')
        if (opts?.workspaceRoot) {
          try {
            rinaController.setWorkspaceRoot(resolveProjectRootSafe(String(opts.workspaceRoot)))
          } catch {}
        }
        if (opts?.mode === 'auto' || opts?.mode === 'assist' || opts?.mode === 'explain') {
          rinaController.setMode(opts.mode)
        }
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc(12) : { ok: false, runs: [] }
        const latestRun = Array.isArray(runsResult?.runs) ? runsResult.runs[0] : null
        const routedTurn = routeConversationTurn({
          rawText: rawPrompt,
          workspaceId: rinaController.getStatus()?.workspaceRoot || opts?.workspaceRoot || '',
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
          return normalizeRinaResponse({
            ok: true,
            intent: routedTurn.mode,
            output: {
              message: buildConversationReply({
                routedTurn,
                workspaceLabel: rinaController.getStatus()?.workspaceRoot || opts?.workspaceRoot || 'this workspace',
                latestRun,
              }).message,
              routedTurn,
            },
          })
        }
        return normalizeRinaResponse(await handleRinaMessage(rawPrompt))
      },
      conversationRoute: async (prompt, opts) => {
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc(12) : { ok: false, runs: [] }
        const latestRun = Array.isArray(runsResult?.runs) ? runsResult.runs[0] : null
        return routeConversationTurn({
          rawText: String(prompt || ''),
          workspaceId: rinaController.getStatus()?.workspaceRoot || opts?.workspaceRoot || '',
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
        const stats = rinaController.getStats()
        return {
          ...rinaController.getStatus(),
          tools: rinaController.getTools(),
          agentRunning: rinaController.isAgentRunning(),
          memoryStats: {
            conversationCount: stats.conversation?.entries ?? 0,
            learnedCommandsCount: stats.commands?.learned ?? 0,
            projectsCount: stats.longterm?.sessions ?? 0,
          },
        }
      },
      getMode: async () => rinaController.getMode(),
      setMode: async (mode) => {
        if (mode === 'auto' || mode === 'assist' || mode === 'explain') {
          return rinaController.setMode(mode)
        }
        return { ok: false, error: `Invalid mode: ${String(mode)}` }
      },
      getPlans: async () => rinaController.getPlans(),
      getTools: async () => rinaController.getTools(),
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

    const webContentsId = win.webContents.id
    win.loadFile(path.join(__dirname, 'renderer', 'renderer.html'))
    win.once('closed', () => {
      try {
        closePtyForWebContents(webContentsId)
      } catch {}
    })

    thinkingStream.on('thinking', (step) => {
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

  async function devtoolsToggleForIpc(wc) {
    if (wc.isDestroyed()) return { ok: false, error: 'window destroyed' }
    try {
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools()
        return { ok: true, open: false }
      }
      wc.openDevTools({ mode: 'detach' })
      return { ok: true, open: true }
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : 'failed to toggle devtools' }
    }
  }

  return {
    createWindow,
    devtoolsToggleForIpc,
  }
}
