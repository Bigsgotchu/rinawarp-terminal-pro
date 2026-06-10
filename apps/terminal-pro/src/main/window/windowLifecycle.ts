import { handleUnifiedConversationTurn } from '../orchestration/unifiedTurn.js'
import { inspectProjectWorkspace } from '../memory/projectInspector.js'
import { hydrateWorkspaceKnowledge, type WorkspaceKnowledgeSnapshot } from '../memory/workspaceKnowledge.js'
import { buildWorkspaceContext } from '../memory/workspaceContextBuilder.js'
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
    ownerMemoryStore,
    makePlan,
    getWorkspaceFactStore,
    handleRinaMessage,
    rinaController,
    resolveProjectRootSafe,
    normalizeRinaResponse,
  } = deps
  const controller = rinaController as unknown as RinaControllerLike

  const emptyWorkspaceKnowledgeSnapshot = (): WorkspaceKnowledgeSnapshot => ({
    architecture: [],
    dependencies: [],
    conventions: [],
    preferences: [],
    recurring_failures: [],
    runtime_facts: [],
    fact_count: 0,
    last_hydrated_at: new Date().toISOString(),
  })

  async function buildPlanningWorkspaceContext(projectRoot: string) {
    try {
      const inspection = await inspectProjectWorkspace(projectRoot)
      const factStore = getWorkspaceFactStore?.() || null
      const snapshot = factStore ? await hydrateWorkspaceKnowledge(factStore) : emptyWorkspaceKnowledgeSnapshot()
      return buildWorkspaceContext(snapshot, inspection)
    } catch (error) {
      console.warn('[workspace-context] planning context unavailable:', error instanceof Error ? error.message : String(error))
      return undefined
    }
  }

  async function makeContextAwarePlan(intentText: string, projectRoot: string) {
    return makePlan(intentText, projectRoot, await buildPlanningWorkspaceContext(projectRoot))
  }

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
        const workspaceId = controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || ''
        const resolvedLatestRun = latestRun
          ? {
              runId: latestRun.latestReceiptId || latestRun.sessionId,
              sessionId: latestRun.sessionId,
              latestCommand: latestRun.latestCommand,
              latestExitCode: latestRun.latestExitCode,
              latestReceiptId: latestRun.latestReceiptId,
              interrupted: Boolean(latestRun.interrupted),
            }
          : null
        const unified = await handleUnifiedConversationTurn({
          rawText: rawPrompt,
          workspaceId,
          latestRun: resolvedLatestRun,
          buildPlan: makeContextAwarePlan,
          memoryStore: ownerMemoryStore,
        })
        for (const event of unified.timelineEvents) {
          safeSend(win.webContents, 'rina:timeline:event', event)
        }
        if (!unified.turn.requiresAction || unified.turn.allowedNextAction === 'reply_only' || unified.turn.allowedNextAction === 'clarify') {
          return normalizeRinaResponse({
            ok: true,
            intent: unified.turn.mode,
            output: {
              message: unified.turn.assistantReply,
              routedTurn: unified.turn,
            },
          })
        }
        if (unified.turn.permissionRequest?.required || unified.turn.allowedNextAction === 'plan') {
          return normalizeRinaResponse({
            ok: true,
            intent: unified.turn.mode,
            requiresConfirmation: true,
            output: {
              message: unified.turn.assistantReply,
              plan: unified.turn.planPreview,
              routedTurn: unified.turn,
              permissionRequest: unified.turn.permissionRequest,
            },
          })
        }
        const legacyResult = await handleRinaMessage(rawPrompt)
        const legacySucceeded = (legacyResult as { ok?: boolean }).ok === true
        if (legacySucceeded) {
          ownerMemoryStore.recordTaskOutcome({
            workspaceId,
            taskTitle: rawPrompt,
            summary: unified.turn.assistantReply,
            success: legacySucceeded,
          })
          ownerMemoryStore.recordRepairCase?.({
            workspaceId,
            issueSummary: rawPrompt,
            failureSignature:
              resolvedLatestRun && Number.isFinite(Number(resolvedLatestRun.latestExitCode))
                ? `exit_code:${resolvedLatestRun.latestExitCode}`
                : undefined,
            commands: resolvedLatestRun?.latestCommand ? [resolvedLatestRun.latestCommand] : [],
            outcome: 'success',
            verification: 'Legacy handler returned ok=true',
            notes: unified.turn.assistantReply,
          })
          safeSend(win.webContents, 'rina:timeline:event', {
            id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            type: 'task.completed',
            sessionId: resolvedLatestRun?.sessionId || workspaceId || 'session_local',
            correlationId: unified.timelineEvents[0]?.correlationId || `corr_${Date.now()}`,
            timestamp: new Date().toISOString(),
            taskId: unified.result.task?.id,
            summary: unified.turn.assistantReply,
          })
        } else {
          ownerMemoryStore.recordRepairCase?.({
            workspaceId,
            issueSummary: rawPrompt,
            failureSignature:
              resolvedLatestRun && Number.isFinite(Number(resolvedLatestRun.latestExitCode))
                ? `exit_code:${resolvedLatestRun.latestExitCode}`
                : undefined,
            commands: resolvedLatestRun?.latestCommand ? [resolvedLatestRun.latestCommand] : [],
            outcome: 'failed',
            verification: 'Legacy handler returned ok=false',
            notes: String((legacyResult as { error?: string })?.error || 'Task failed.'),
          })
          safeSend(win.webContents, 'rina:timeline:event', {
            id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            type: 'task.failed',
            sessionId: resolvedLatestRun?.sessionId || workspaceId || 'session_local',
            correlationId: unified.timelineEvents[0]?.correlationId || `corr_${Date.now()}`,
            timestamp: new Date().toISOString(),
            taskId: unified.result.task?.id,
            error: String((legacyResult as { error?: string })?.error || 'Task failed.'),
          })
        }
        return normalizeRinaResponse(legacyResult)
      },
      conversationRoute: async (prompt: unknown, opts?: AgentRunOptions) => {
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc({ limit: 12 }) : { ok: false, runs: [] }
        const latestRun = getLatestRun(runsResult)
        const workspaceId = controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || ''
        const resolvedLatestRun = latestRun
          ? {
              runId: latestRun.latestReceiptId || latestRun.sessionId,
              sessionId: latestRun.sessionId,
              latestCommand: latestRun.latestCommand,
              latestExitCode: latestRun.latestExitCode,
              latestReceiptId: latestRun.latestReceiptId,
              interrupted: Boolean(latestRun.interrupted),
            }
          : null
        const unified = await handleUnifiedConversationTurn({
          rawText: String(prompt || ''),
          workspaceId,
          latestRun: resolvedLatestRun,
          buildPlan: makeContextAwarePlan,
          memoryStore: ownerMemoryStore,
        })
        for (const event of unified.timelineEvents) {
          safeSend(win.webContents, 'rina:timeline:event', event)
        }
        return unified.turn
      },
      handleConversationTurn: async (prompt: unknown, opts?: AgentRunOptions) => {
        const runsResult = typeof runsListForIpc === 'function' ? await runsListForIpc({ limit: 12 }) : { ok: false, runs: [] }
        const latestRun = getLatestRun(runsResult)
        const workspaceId = controller.getStatus()?.workspaceRoot || opts?.workspaceRoot || ''
        const resolvedLatestRun = latestRun
          ? {
              runId: latestRun.latestReceiptId || latestRun.sessionId,
              sessionId: latestRun.sessionId,
              latestCommand: latestRun.latestCommand,
              latestExitCode: latestRun.latestExitCode,
              latestReceiptId: latestRun.latestReceiptId,
              interrupted: Boolean(latestRun.interrupted),
            }
          : null
        const unified = await handleUnifiedConversationTurn({
          rawText: String(prompt || ''),
          workspaceId,
          latestRun: resolvedLatestRun,
          buildPlan: makeContextAwarePlan,
          memoryStore: ownerMemoryStore,
        })
        for (const event of unified.timelineEvents) {
          safeSend(win.webContents, 'rina:timeline:event', event)
        }
        return {
          ...unified.result,
          routedTurn: unified.turn,
        }
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

    ;(ipcMain as any).handle('rina:workspace:context', async (_event: any, args: { projectRoot?: string }) => {
      const projectRoot = args?.projectRoot ? resolveProjectRootSafe(args.projectRoot) : null
      if (!projectRoot) return null
      try {
        const inspection = await inspectProjectWorkspace(projectRoot)
        const factStore = getWorkspaceFactStore?.() || null
        const snapshot = factStore ? await hydrateWorkspaceKnowledge(factStore) : {
          architecture: [],
          dependencies: [],
          conventions: [],
          preferences: [],
          recurring_failures: [],
          runtime_facts: [],
          fact_count: 0,
          last_hydrated_at: new Date().toISOString(),
        }
        return buildWorkspaceContext(snapshot, inspection)
      } catch (error) {
        console.warn('[main] workspace context failed:', error instanceof Error ? error.message : String(error))
        return null
      }
    })

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
