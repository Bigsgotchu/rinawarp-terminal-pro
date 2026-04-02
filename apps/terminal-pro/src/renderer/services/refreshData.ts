import { bubbleBlock, copyBlock, inlineCodeBlock, replyCardBlock } from '../replies/renderFragments.js'
import { type WorkbenchState, WorkbenchStore } from '../workbench/store.js'
import { formatRecoveryNarrative, getRecoveryGuidance } from '../workbench/renderers/runIntelligence.js'

type RefreshDeps = {
  getWorkspaceKey: (store: WorkbenchStore) => string
  getAgentWorkspaceRoot: (store: WorkbenchStore) => string | null
}

export function createRefreshActions(deps: RefreshDeps) {
  const rina = window.rina as any
  const STALE_RECOVERY_MS = 24 * 60 * 60 * 1000

  const refreshRuns = async (store: WorkbenchStore, options?: { markRestored?: boolean }): Promise<void> => {
    if (typeof rina.runsList !== 'function') return
    try {
      const result = await rina.runsList(80)
      if (!result?.ok || !Array.isArray(result.runs)) return
      const previousRuns = new Map(store.getState().runs.map((run: WorkbenchState['runs'][number]) => [run.id, run]))
      const mappedRuns: WorkbenchState['runs'] = result.runs.map((run: any) => {
        const runId = run.latestReceiptId || run.sessionId
        const updatedAtMs = new Date(run.updatedAt).getTime()
        const staleRecoveredShell =
          Boolean(options?.markRestored) &&
          !String(run.latestCommand || '').trim() &&
          Number.isFinite(updatedAtMs) &&
          Date.now() - updatedAtMs > STALE_RECOVERY_MS
        const status: WorkbenchState['runs'][number]['status'] = run.interrupted
          ? 'interrupted'
          : run.failedCount > 0
            ? 'failed'
            : staleRecoveredShell
              ? 'interrupted'
            : run.latestExitCode === null || run.latestExitCode === undefined
              ? 'running'
              : 'ok'

        return {
          id: runId,
          sessionId: run.sessionId,
          title: run.latestCommand || (Boolean(options?.markRestored) ? 'Recovered session activity' : 'Session activity'),
          command: run.latestCommand || '',
          cwd: run.latestCwd || run.projectRoot || '',
          status,
          startedAt: run.latestStartedAt || run.createdAt,
          updatedAt: run.updatedAt,
          endedAt: run.latestEndedAt ?? (run.latestExitCode === null || run.latestExitCode === undefined ? null : run.updatedAt),
          exitCode: run.latestExitCode,
          commandCount: run.commandCount,
          failedCount: run.failedCount,
          latestReceiptId: run.latestReceiptId,
          projectRoot: run.projectRoot,
          source: run.source,
          platform: run.platform,
          restored: previousRuns.has(runId) ? previousRuns.get(runId)?.restored : Boolean(options?.markRestored),
        }
      })
      store.dispatch({
        type: 'runs/set',
        runs: mappedRuns,
      })
      if (options?.markRestored) {
        const restoredRuns = mappedRuns.filter((run) => run.restored)
        if (restoredRuns.length > 0) {
          const interruptedRuns = restoredRuns.filter((run) => run.status === 'interrupted')
          const latestInterrupted = interruptedRuns[0] || restoredRuns[0]
          const recovery = latestInterrupted ? getRecoveryGuidance(latestInterrupted) : null
          store.dispatch({ type: 'chat/removeByPrefix', prefix: 'system:runs:restore:' })
          store.dispatch({ type: 'chat/removeByPrefix', prefix: 'rina:runs:resume:' })
          store.dispatch({
            type: 'chat/add',
            msg: {
              id: `system:runs:restore:${Date.now()}`,
              role: 'rina',
              content: latestInterrupted
                ? [
                    replyCardBlock({
                      kind: 'recovery',
                      label: 'I recovered your last session safely',
                      badge: `${restoredRuns.length} runs restored`,
                      className: 'rw-recovery-card',
                      bodyBlocks:
                        latestInterrupted.command || latestInterrupted.title
                          ? [
                              copyBlock(
                                `Your receipts are intact. I restored ${restoredRuns.length} recent run${restoredRuns.length === 1 ? '' : 's'} and kept the safest next move visible.`
                              ),
                              inlineCodeBlock(
                                recovery
                                  ? formatRecoveryNarrative(recovery, { prefix: 'Recovered task' })
                                  : `${latestInterrupted.command || latestInterrupted.title || latestInterrupted.id}\nInspect the receipt before deciding whether to resume or rerun.`,
                                'rw-recovery-latest'
                              ),
                            ]
                          : [
                              copyBlock(
                                `Your receipts are intact. I restored ${restoredRuns.length} recent run${restoredRuns.length === 1 ? '' : 's'} from your last session and can pick up the latest interrupted task when you are ready.`
                              ),
                            ],
                      actions: [
                        ...(latestInterrupted && recovery?.resumeSafe
                          ? [{ label: recovery.resumeLabel, runResume: latestInterrupted.id, className: 'is-primary' }]
                          : []),
                        ...(latestInterrupted
                          ? [
                              {
                                label: recovery?.rerunLabel || 'Rerun task',
                                runRerun: latestInterrupted.id,
                                className: recovery?.resumeSafe ? 'is-secondary' : 'is-primary',
                              },
                            ]
                          : []),
                        ...(latestInterrupted
                          ? [
                              {
                                label: recovery?.receiptLabel || 'Open receipt',
                                runReveal: latestInterrupted.latestReceiptId || latestInterrupted.id,
                                className: 'is-secondary',
                              },
                            ]
                          : []),
                        { label: 'Review recovered runs', openRunsPanel: 'system:runs:restore', className: 'is-subtle' },
                        { label: 'Dismiss for now', tab: 'runs', className: 'is-subtle' },
                      ],
                    }),
                  ]
                : [bubbleBlock(`Restored ${restoredRuns.length} recent run${restoredRuns.length === 1 ? '' : 's'} to the Runs inspector.`)],
              ts: Date.now(),
              workspaceKey: deps.getWorkspaceKey(store),
              runIds: latestInterrupted ? [latestInterrupted.id] : [],
            },
          })
        }
      }
    } catch (error) {
      console.warn('Failed to refresh runs:', error)
    }
  }

  const refreshCode = async (store: WorkbenchStore): Promise<void> => {
    try {
      const workspaceRoot = deps.getAgentWorkspaceRoot(store)
      const request: CodeListFilesArgs = { projectRoot: workspaceRoot ?? '', limit: 100 }
      const files = (await rina.codeListFiles?.(request)) as CodeListFilesResult | undefined
      if (files && Array.isArray(files.files)) {
        store.dispatch({ type: 'code/setFiles', files: files.files })
      }
    } catch (error) {
      console.warn('Failed to refresh code panel:', error)
    }
  }

  const refreshDiagnostics = async (store: WorkbenchStore): Promise<void> => {
    try {
      const stats = (await rina.getStatus()) as {
        mode?: string
        tools?: unknown[]
        agentRunning?: boolean
        memoryStats?: {
          conversationCount?: number
          learnedCommandsCount?: number
        }
      }
      store.dispatch({
        type: 'diagnostics/set',
        diagnostics: {
          mode: String(stats?.mode || 'unknown'),
          toolsCount: Array.isArray(stats?.tools) ? stats.tools.length : 0,
          agentRunning: Boolean(stats?.agentRunning),
          conversationCount: Number(stats?.memoryStats?.conversationCount || 0),
          learnedCommandsCount: Number(stats?.memoryStats?.learnedCommandsCount || 0),
        },
      })
    } catch (error) {
      console.warn('Failed to refresh diagnostics:', error)
    }
  }

  const refreshBrainStats = async (store: WorkbenchStore): Promise<void> => {
    try {
      const stats = await rina.getBrainStats()
      store.dispatch({ type: 'brain/setStats', stats })
    } catch (error) {
      console.warn('Failed to refresh brain stats:', error)
    }
  }

  const refreshRuntimeStatus = async (store: WorkbenchStore): Promise<void> => {
    try {
      const mode = await rina.getMode()
      store.dispatch({
        type: 'runtime/set',
        runtime: {
          mode: String(mode || 'explain'),
          autonomyEnabled: Boolean(rina.autonomy?.enabled),
          autonomyLevel: String(rina.autonomy?.level || 'off'),
          ipcCanonicalReady: true,
          rendererCanonicalReady: true,
        },
      })
    } catch (error) {
      console.warn('Failed to refresh runtime status:', error)
      store.dispatch({
        type: 'runtime/set',
        runtime: {
          ...store.getState().runtime,
          ipcCanonicalReady: false,
        },
      })
    }
  }

  const refreshMarketplace = async (store: WorkbenchStore): Promise<void> => {
    if (typeof rina.marketplaceList !== 'function' || typeof rina.installedAgents !== 'function') return
    store.dispatch({ type: 'marketplace/setLoading', loading: true })
    try {
      const [marketplace, installed] = await Promise.all([rina.marketplaceList(), rina.installedAgents()])
      if (!marketplace?.ok) {
        store.dispatch({ type: 'marketplace/setError', error: marketplace?.error || 'Failed to load marketplace' })
        return
      }
      store.dispatch({ type: 'marketplace/setAgents', agents: Array.isArray(marketplace.agents) ? marketplace.agents : [] })
      store.dispatch({
        type: 'marketplace/setInstalled',
        installed: Array.isArray(installed?.agents) ? installed.agents.map((agent: { name: string }) => agent.name) : [],
      })
    } catch (error) {
      store.dispatch({
        type: 'marketplace/setError',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      store.dispatch({ type: 'marketplace/setLoading', loading: false })
    }
  }

  const refreshCapabilityPacks = async (store: WorkbenchStore): Promise<void> => {
    if (typeof rina.capabilityPacks !== 'function') return
    store.dispatch({ type: 'capabilities/setLoading', loading: true })
    try {
      const result = await rina.capabilityPacks()
      if (!result?.ok) {
        store.dispatch({ type: 'capabilities/setError', error: result?.error || 'Failed to load capabilities' })
        return
      }
      store.dispatch({
        type: 'capabilities/setPacks',
        packs: Array.isArray(result.capabilities) ? result.capabilities : [],
      })
    } catch (error) {
      store.dispatch({
        type: 'capabilities/setError',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      store.dispatch({ type: 'capabilities/setLoading', loading: false })
    }
  }

  return {
    refreshRuns,
    refreshCode,
    refreshDiagnostics,
    refreshBrainStats,
    refreshRuntimeStatus,
    refreshMarketplace,
    refreshCapabilityPacks,
  }
}
import type { CodeListFilesArgs, CodeListFilesResult } from '../../main/startup/runtimeTypes.js'
