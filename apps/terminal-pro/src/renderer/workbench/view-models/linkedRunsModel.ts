import type { RunModel } from '../store.js'

export type LinkedRunButtonModel = {
  id: string
  label: string
  status: RunModel['status']
  restored: boolean
}

export type LinkedRunsModel =
  | {
      state: 'empty'
    }
  | {
      state: 'recovery'
      latestInterrupted?: LinkedRunButtonModel
      hiddenCount: number
      unresolvedCount: number
      messageId: string
    }
  | {
      state: 'thread'
      visibleRuns: LinkedRunButtonModel[]
      totalCount: number
      hiddenCount: number
      interruptedRunId?: string
      unresolvedCount: number
      messageId: string
    }

const MAX_VISIBLE_LINKED_RUNS = 3

function toLinkedRunButtonModel(run: RunModel, recovery = false): LinkedRunButtonModel {
  return {
    id: run.id,
    label: recovery ? run.command || run.title || run.id : `Run ${run.id}`,
    status: run.status,
    restored: Boolean(run.restored),
  }
}

export function buildLinkedRunsModel(messageId: string, linkedRuns: RunModel[], unresolvedRunIds: string[] = []): LinkedRunsModel {
  if (linkedRuns.length === 0 && unresolvedRunIds.length === 0) return { state: 'empty' }

  const isRecoveryMessage = messageId.startsWith('system:runs:restore:')
  if (isRecoveryMessage) {
    const latestInterrupted = linkedRuns.find((run) => run.status === 'interrupted') || linkedRuns[0]
    return {
      state: 'recovery',
      latestInterrupted: latestInterrupted ? toLinkedRunButtonModel(latestInterrupted, true) : undefined,
      hiddenCount: Math.max(0, linkedRuns.length - (latestInterrupted ? 1 : 0)),
      unresolvedCount: unresolvedRunIds.length,
      messageId,
    }
  }

  const visibleRuns = linkedRuns.slice(0, MAX_VISIBLE_LINKED_RUNS).map((run) => toLinkedRunButtonModel(run))
  const interruptedRun = linkedRuns.find((run) => run.status === 'interrupted')
  return {
    state: 'thread',
    visibleRuns,
    totalCount: linkedRuns.length,
    hiddenCount: Math.max(0, linkedRuns.length - visibleRuns.length),
    interruptedRunId: interruptedRun?.id,
    unresolvedCount: unresolvedRunIds.length,
    messageId,
  }
}
