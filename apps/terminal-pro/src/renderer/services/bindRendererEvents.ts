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
  const trackedProofRunIds = new Set<string>()

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
      const stepPayload = payload as { runId?: string; streamId?: string }
      const streamId = String(stepPayload?.streamId || '')
      const runId = String(stepPayload?.runId || '')
      if (streamId && runId) {
        liveRunIdByStreamId.set(streamId, runId)
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
          store.dispatch({
            type: 'fix/upsert',
            fix: {
              ...fix,
              exitCode: typeof res.code === 'number' ? res.code : fix.exitCode,
              status: res.ok === false ? 'error' : typeof res.code === 'number' && res.code === 0 ? 'done' : 'error',
              error:
                res.ok === false
                  ? res.error || 'The fix run failed before proof completed.'
                  : typeof res.code === 'number' && res.code === 0
                    ? undefined
                    : 'The fix run finished without successful proof.',
            },
          })
        }
        if (res.streamId) liveRunIdByStreamId.delete(res.streamId)
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
    window.rina.onPlanStepStart((step: unknown) => {
      fixBlockManager.recordPlanStepStart(step)
    }),
  ]

  return () => {
    cleanup.forEach((unsubscribe) => unsubscribe())
  }
}
