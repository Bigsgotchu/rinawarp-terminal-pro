import { appendNarration, describeFixStep, interpretExecutionOutput } from '../fixes/fixNarration.js'
import { hasRunProof } from '../workbench/proof.js'
import { type WorkbenchState, WorkbenchStore } from '../workbench/store.js'

type RendererEventCleanup = () => void

function computeProofLatencyMs(startedAt?: string, endedAt?: string | null): number | null {
  const startMs = Date.parse(String(startedAt || ''))
  const endMs = endedAt ? Date.parse(String(endedAt)) : Date.now()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null
  return Math.max(0, endMs - startMs)
}

type RendererEventFixBlockManager = {
  recordChunk: (chunk: unknown) => void
  recordStreamEnd: (result: unknown) => Promise<void>
  recordPlanStepStart: (step: unknown) => void
}

type RendererEventTracePanel = {
  appendOutput: (output: string, className?: string) => void
}

export function bindRendererEvents(args: {
  store: WorkbenchStore
  fixBlockManager: RendererEventFixBlockManager
  executionTracePanel: RendererEventTracePanel
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
  trackRendererFunnel: (step: 'first_run' | 'first_block', properties?: Record<string, unknown>) => Promise<void>
  refreshRuns: (store: WorkbenchStore, options?: { markRestored?: boolean }) => Promise<void>
  refreshDiagnostics: (store: WorkbenchStore) => Promise<void>
  refreshCode: (store: WorkbenchStore) => Promise<void>
}): RendererEventCleanup {
  const { store, fixBlockManager, executionTracePanel, trackRendererEvent, trackRendererFunnel, refreshRuns, refreshDiagnostics, refreshCode } = args
  const liveRunIdByStreamId = new Map<string, string>()
  const fixIdByStreamId = new Map<string, string>()
  const lastNarrationTitleByStreamId = new Map<string, string>()
  const trackedProofRunIds = new Set<string>()

  async function hydrateFixArtifactsFromRun(runId: string): Promise<void> {
    if (!window.rina.runsArtifacts) return

    const run = store.getState().runs.find((entry) => entry.id === runId)
    if (!run?.sessionId) return

    try {
      const result = await window.rina.runsArtifacts({ runId, sessionId: run.sessionId })
      if (!result?.ok || !result.summary) return

      const changedFiles = Array.isArray(result.summary.changedFiles) ? result.summary.changedFiles.filter(Boolean) : []
      const diffHints = Array.isArray(result.summary.diffHints) ? result.summary.diffHints.filter(Boolean) : []

      if (changedFiles.length === 0 && diffHints.length === 0) return

      const fixes = store.getState().fixBlocks.filter((entry) => entry.applyRunId === runId)
      for (const fix of fixes) {
        store.dispatch({
          type: 'fix/upsert',
          fix: {
            ...fix,
            changedFiles,
            diffHints,
          },
        })
      }
    } catch {
      // Keep artifact loading best-effort so proof UI never blocks on it.
    }
  }

  const cleanup = [
    window.rina.onThinking((step) => {
      store.dispatch({
        type: 'thinking/set',
        active: true,
        message: step.message || 'Rina is tracing through it',
        stream: step.message || '',
      })
    }),
    window.rina.onBrainEvent((event) => {
      store.dispatch({
        type: 'brain/addEvent',
        event: {
          type: event.type || 'event',
          message: event.message || '',
          progress: typeof event.progress === 'number' ? event.progress : undefined,
        },
      })
    }),
    window.rina.onPlanStepStart((payload: unknown) => {
      const stepPayload = payload as { runId?: string; streamId?: string; step?: { stepId?: string; input?: { command?: string } } }
      const streamId = String(stepPayload?.streamId || '')
      const runId = String(stepPayload?.runId || '')
      if (streamId && runId) {
        liveRunIdByStreamId.set(streamId, runId)
        const command = String(stepPayload?.step?.input?.command || '').trim()
        const fixes = store.getState().fixBlocks.filter((entry) => entry.applyRunId === runId)
        for (const fix of fixes) {
          const matchedStep = fix.steps.find((step) => command && step.command === command)
          const narration = matchedStep ? describeFixStep(matchedStep) : null
          const nextSteps = fix.steps.map((step) =>
            command && step.command === command
              ? { ...step, status: 'running' as const }
              : step.status === 'running'
                ? { ...step, status: 'pending' as const }
                : step
          )
          store.dispatch({
            type: 'fix/upsert',
            fix: {
              ...fix,
              status: 'running',
              phase: 'executing',
              statusText: command ? `Running: ${command}` : 'Executing repair step…',
              latestOutput: '',
              narration: narration ? appendNarration(fix.narration, narration, fix.id) : fix.narration,
              steps: nextSteps,
              error: undefined,
            },
          })
          if (respectiveTitle(narration)) lastNarrationTitleByStreamId.set(streamId, narration.title)
          fixIdByStreamId.set(streamId, fix.id)
        }
        const run = store.getState().runs.find((entry) => entry.id === runId)
        if (run) {
          store.dispatch({
            type: 'runs/upsert',
            run: {
              ...run,
              status: 'running',
              updatedAt: new Date().toISOString(),
            },
          })
        }
      }
    }),
    window.rina.onStreamChunk((chunk: unknown) => {
      fixBlockManager.recordChunk(chunk)
      const data = chunk as { streamId?: string; data?: string; stream?: string }
      const fixId = data.streamId ? fixIdByStreamId.get(data.streamId) : undefined
      if (fixId && data.data) {
        const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
        if (fix) {
          const narration = interpretExecutionOutput(data.data)
          const shouldAppendNarration = narration && lastNarrationTitleByStreamId.get(String(data.streamId || '')) !== narration.title
          store.dispatch({
            type: 'fix/upsert',
            fix: {
              ...fix,
              latestOutput: `${fix.latestOutput || ''}${data.data}`.slice(-6000),
              narration: shouldAppendNarration ? appendNarration(fix.narration, narration, fix.id) : fix.narration,
            },
          })
          if (shouldAppendNarration && data.streamId) {
            lastNarrationTitleByStreamId.set(data.streamId, narration.title)
          }
        }
      }
      if ((data?.stream === 'stdout' || data?.stream === 'stderr') && data.streamId) {
        const blockId = `stream:${data.streamId}`
        const existing = store.getState().executionTrace.blocks.find((block) => block.id === blockId)
        if (!existing) {
          store.dispatch({
            type: 'executionTrace/blockUpsert',
            block: {
              id: blockId,
              runId: data.streamId,
              status: 'running',
              output: '',
              ts: Date.now(),
            },
          })
        }
        store.dispatch({ type: 'executionTrace/appendOutput', blockId, chunk: data.data || '' })
        const linkedRunId = liveRunIdByStreamId.get(data.streamId)
        if (linkedRunId && data.data) {
          store.dispatch({ type: 'runs/appendOutputTail', runId: linkedRunId, chunk: data.data })
        }
      }
      if (data?.data) {
        store.dispatch({
          type: 'thinking/set',
          active: store.getState().thinking.active,
          message: store.getState().thinking.message,
          stream: data.data.slice(-400),
        })
      }
    }),
    window.rina.onStreamEnd((result: unknown) => {
      void fixBlockManager.recordStreamEnd(result)
      const res = result as { ok?: boolean; error?: string; streamId?: string; code?: number | null }
      const linkedRunId = res.streamId ? liveRunIdByStreamId.get(res.streamId) : undefined
      const fixId = res.streamId ? fixIdByStreamId.get(res.streamId) : undefined
      const blockId = res.streamId ? `stream:${res.streamId}` : null
      if (blockId) {
        const existing = store.getState().executionTrace.blocks.find((block) => block.id === blockId)
        if (existing) {
          store.dispatch({
            type: 'executionTrace/blockUpsert',
            block: {
              ...existing,
              status: res.ok === false ? 'failed' : 'success',
              exitCode: typeof res.code === 'number' ? res.code : existing.exitCode,
            },
          })
        }
      }
      if (linkedRunId) {
        const run = store.getState().runs.find((entry) => entry.id === linkedRunId)
        if (run) {
          const updatedRun = {
            ...run,
            status: (res.ok === false ? 'failed' : 'ok') as WorkbenchState['runs'][number]['status'],
            exitCode: typeof res.code === 'number' ? res.code : run.exitCode,
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          store.dispatch({
            type: 'runs/upsert',
            run: updatedRun,
          })
          if (!trackedProofRunIds.has(updatedRun.id) && hasRunProof(updatedRun)) {
            trackedProofRunIds.add(updatedRun.id)
            const proofLatencyMs = computeProofLatencyMs(updatedRun.startedAt, updatedRun.endedAt)
            store.dispatch({ type: 'analytics/track', event: 'proof_backed_run_seen' })
            void trackRendererEvent('proof_backed_run_seen', {
              run_id: updatedRun.id,
              status: updatedRun.status,
              exit_code: updatedRun.exitCode,
              workspace_key: store.getState().workspaceKey,
              proof_latency_ms: proofLatencyMs,
            })
            if (proofLatencyMs != null) {
              void trackRendererEvent('proof_latency_sampled', {
                run_id: updatedRun.id,
                status: updatedRun.status,
                exit_code: updatedRun.exitCode,
                workspace_key: store.getState().workspaceKey,
                proof_latency_ms: proofLatencyMs,
                run_title: updatedRun.title,
              })
            }
            void trackRendererFunnel('first_block', {
              run_id: updatedRun.id,
              status: updatedRun.status,
              workspace_key: store.getState().workspaceKey,
            })
          }
          if (res.error) {
            store.dispatch({ type: 'runs/appendOutputTail', runId: linkedRunId, chunk: `\n${res.error}` })
          }
        }
        const affectedFixes = store.getState().fixBlocks.filter((fix) => fix.applyRunId === linkedRunId)
        for (const fix of affectedFixes) {
          const completionNarration =
            res.ok === false
              ? {
                  title: 'Repair step failed',
                  description: res.error || 'The command stopped before the repair could clear.',
                  level: 'error' as const,
                }
              : {
                  title: 'Repair step completed',
                  description: 'That repair step finished. I’m verifying the result now.',
                  level: 'success' as const,
                }
          store.dispatch({
            type: 'fix/upsert',
            fix: {
              ...fix,
              exitCode: typeof res.code === 'number' ? res.code : fix.exitCode,
              status: res.ok === false ? 'error' : typeof res.code === 'number' && res.code === 0 ? 'done' : 'error',
              phase: res.ok === false ? 'error' : typeof res.code === 'number' && res.code === 0 ? 'verifying' : 'error',
              statusText:
                res.ok === false
                  ? 'A repair step failed before the proof could clear.'
                  : typeof res.code === 'number' && res.code === 0
                    ? 'Repair steps completed. Running final verification now…'
                    : 'This streamed step ended without enough proof to clear the repair.',
              error:
                res.ok === false
                  ? res.error || 'The fix run failed before proof completed.'
                  : typeof res.code === 'number' && res.code === 0
                    ? undefined
                    : 'The fix run finished without successful proof.',
              steps: fix.steps.map((step) =>
                step.status === 'running'
                  ? { ...step, status: res.ok === false ? 'error' as const : 'done' as const }
                  : step
              ),
              narration: appendNarration(fix.narration, completionNarration, fix.id),
            },
          })
        }
        if (res.streamId) {
          liveRunIdByStreamId.delete(res.streamId)
          lastNarrationTitleByStreamId.delete(res.streamId)
        }
        void hydrateFixArtifactsFromRun(linkedRunId)
      }
      if (fixId && res.streamId) {
        fixIdByStreamId.delete(res.streamId)
      }
      if (res?.error) {
        executionTracePanel.appendOutput(`Error: ${res.error}`, 'error')
      } else if (res?.ok === false) {
        executionTracePanel.appendOutput('Command failed — Fix Block added in the Agent panel', 'error')
      }
      store.dispatch({ type: 'thinking/set', active: false, message: '', stream: '' })
      void refreshRuns(store)
      void refreshDiagnostics(store)
      void refreshCode(store)
    }),
    window.rina.onPlanRunEnd((payload: { planRunId: string; ok: boolean; haltedBecause?: string }) => {
      const fixes = store.getState().fixBlocks.filter((entry) => entry.applyPlanRunId === payload.planRunId)
      for (const fix of fixes) {
        const verificationNarration = payload.ok
          ? {
              title: 'Verification passed',
              description: 'Verification passed. The repair looks solid.',
              level: 'success' as const,
            }
          : {
              title: 'Verification needs review',
              description: payload.haltedBecause || 'The repair stopped before I could fully clear it.',
              level: 'warning' as const,
            }
        store.dispatch({
          type: 'fix/upsert',
          fix: {
            ...fix,
            status: payload.ok ? 'done' : 'error',
            phase: payload.ok ? 'done' : 'error',
            statusText: payload.ok ? 'Project repaired with verification proof attached.' : `Repair halted: ${payload.haltedBecause || 'unknown reason'}`,
            verificationStatus: payload.ok ? 'passed' : 'failed',
            verificationText: payload.ok
              ? 'Verification passed. This workspace cleared the repair run.'
              : payload.haltedBecause || 'Repair stopped before I could clear the result.',
            narration: appendNarration(fix.narration, verificationNarration, fix.id),
          },
        })
      }
    }),
    window.rina.onPlanStepStart((step: unknown) => {
      fixBlockManager.recordPlanStepStart(step)
    }),
  ]

  return () => {
    cleanup.forEach((unsubscribe) => unsubscribe())
  }
}

function respectiveTitle(
  narration: { title: string } | null
): narration is { title: string } {
  return Boolean(narration?.title)
}
