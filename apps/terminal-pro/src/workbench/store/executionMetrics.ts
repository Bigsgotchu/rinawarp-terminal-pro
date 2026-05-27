import type { ExecutionReceipt } from '../runBlocks/types.js'
import type { RunBlock } from '../runBlocks/types.js'

export type ExecutionMetrics = {
  runsCompleted: number
  totalDurationMs: number
  rollbackCount: number
  verificationPassCount: number
  verificationFailCount: number
  buildSuccessCount: number
  buildFailureCount: number
  mutationApprovalCount: number
}

export const EMPTY_EXECUTION_METRICS: ExecutionMetrics = {
  runsCompleted: 0,
  totalDurationMs: 0,
  rollbackCount: 0,
  verificationPassCount: 0,
  verificationFailCount: 0,
  buildSuccessCount: 0,
  buildFailureCount: 0,
  mutationApprovalCount: 0,
}

function isBuildIntent(title?: string, commands?: string[]): boolean {
  const haystack = `${title || ''} ${(commands || []).join(' ')}`.toLowerCase()
  return /\bbuild\b|pnpm build|npm run build|vite build/.test(haystack)
}

function isMutationIntent(title?: string): boolean {
  return /\bpatch\b|mutat|approv/i.test(title || '')
}

export function recordExecutionMetrics(
  metrics: ExecutionMetrics,
  receipt: ExecutionReceipt,
  runBlock?: RunBlock,
): ExecutionMetrics {
  const duration = Math.max(0, receipt.completedAt - receipt.startedAt)
  const verifiedPass = receipt.exitCode === 0 && !receipt.rollbackOccurred
  const verifiedFail = receipt.rollbackOccurred || receipt.exitCode !== 0
  const buildIntent = isBuildIntent(runBlock?.title, receipt.commandsExecuted)
  const mutationIntent = isMutationIntent(runBlock?.title)

  return {
    runsCompleted: metrics.runsCompleted + 1,
    totalDurationMs: metrics.totalDurationMs + duration,
    rollbackCount: metrics.rollbackCount + (receipt.rollbackOccurred ? 1 : 0),
    verificationPassCount: metrics.verificationPassCount + (verifiedPass ? 1 : 0),
    verificationFailCount: metrics.verificationFailCount + (verifiedFail ? 1 : 0),
    buildSuccessCount: metrics.buildSuccessCount + (buildIntent && verifiedPass ? 1 : 0),
    buildFailureCount: metrics.buildFailureCount + (buildIntent && verifiedFail ? 1 : 0),
    mutationApprovalCount:
      metrics.mutationApprovalCount + (mutationIntent && verifiedPass && !receipt.rollbackOccurred ? 1 : 0),
  }
}

export function averageRunDurationMs(metrics: ExecutionMetrics): number {
  if (metrics.runsCompleted <= 0) return 0
  return Math.round(metrics.totalDurationMs / metrics.runsCompleted)
}

export function verificationSuccessRate(metrics: ExecutionMetrics): number {
  const total = metrics.verificationPassCount + metrics.verificationFailCount
  if (total <= 0) return 0
  return Math.round((metrics.verificationPassCount / total) * 100)
}
