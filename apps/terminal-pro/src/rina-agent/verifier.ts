import type { RinaTaskKind, RinaTaskResult } from './types.js'

export function verifyTaskResult(input: {
  taskId: string
  kind: RinaTaskKind
  evidence: Record<string, unknown>
  needsApproval?: boolean
  failed?: boolean
  summary: string
}): RinaTaskResult {
  return {
    taskId: input.taskId,
    status: input.failed ? 'failed' : input.needsApproval ? 'needs_approval' : 'completed',
    summary: input.summary,
    evidence: input.evidence,
  }
}
