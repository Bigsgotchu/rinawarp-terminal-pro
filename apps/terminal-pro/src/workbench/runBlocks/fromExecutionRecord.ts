import type { RinaExecutionEvent, RinaExecutionRecord } from '@rinawarp/rina-core'
import type { ExecutionReceipt } from '@rinawarp/rina-contracts'
import type { VerificationStatus } from '../../structured-session-types.js'
import { cognitionLabelForIngressEvent } from './cognitionStream.js'
import type { RunBlock, RunBlockStatus, RuntimeTimelineEvent } from './types.js'
import {
  getReceiptArtifacts,
  getReceiptCommands,
  getReceiptFileChanges,
  getReceiptId,
  getReceiptVerificationChecks,
  getReceiptVerificationStatus,
} from './receiptCompat.js'

function mapStatus(record: RinaExecutionRecord): RunBlockStatus {
  const rolledBack =
    record.events.some((event) => event.type === 'transaction.rolled_back') ||
    record.outcome?.transactionOutcome === 'rolled_back'
  if (rolledBack) return 'rolled_back'

  const failed = record.events.some((event) => event.type === 'execution.failed')
  const completed = record.events.some((event) => event.type === 'execution.completed')
  const started = record.events.some((event) => event.type === 'execution.started')

  if (failed) return 'failed'
  if (completed) return 'success'
  if (started) return 'running'
  return 'planned'
}

function timelineFromRecord(record: RinaExecutionRecord, startedAt: number): RuntimeTimelineEvent[] {
  return record.events.map((event, index) => {
    const cognitionLabel = cognitionLabelForIngressEvent(event as RinaExecutionEvent)
    return {
      ...(event as RinaExecutionEvent),
      at: startedAt + index,
      cognitionLabel: cognitionLabel || undefined,
    }
  })
}

function intentTitle(record: RinaExecutionRecord, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim()
  const payload = record.intent.payload
  if (payload && typeof payload === 'object' && typeof (payload as { prompt?: unknown }).prompt === 'string') {
    return String((payload as { prompt: string }).prompt)
  }
  return record.intent.target
}

function runtimeVerificationFields(record: RinaExecutionRecord): {
  verificationStatus?: VerificationStatus
  evidenceCount?: number
} {
  const runtimeRecord = record as RinaExecutionRecord & {
    verification_status?: VerificationStatus
    evidence_count?: number
  }
  return {
    verificationStatus: runtimeRecord.verification_status,
    evidenceCount: typeof runtimeRecord.evidence_count === 'number' ? runtimeRecord.evidence_count : undefined,
  }
}

export function runBlockFromExecutionRecord(
  record: RinaExecutionRecord,
  opts?: { title?: string; workspaceRoot?: string }
): RunBlock {
  const startedAt = record.intent.createdAt || Date.now()
  const status = mapStatus(record)
  const receipt = record.receipts[0]
  const failed = record.events.find((event) => event.type === 'execution.failed')
  const pendingPayload = record.outcome?.pendingApproval?.payload as { path?: string } | undefined
  const verification = runtimeVerificationFields(record)

  const fileChanges = getReceiptFileChanges(receipt)
  if (pendingPayload?.path) {
    fileChanges.push({ path: String(pendingPayload.path), changeType: 'modified' })
  }

  const memoryNote =
    record.memoryDelta?.updated && record.memoryDelta.note
      ? record.memoryDelta.note
      : record.memoryDelta?.updated
        ? 'Using prior successful fix pattern from this workspace.'
        : undefined

  return {
    id: record.runId,
    runId: record.runId,
    transactionId: record.transactions[0]?.id,
    title: intentTitle(record, opts?.title),
    summary: record.outcome?.explanation || record.plan?.summary,
    command: typeof record.outcome?.command === 'string' ? record.outcome.command : undefined,
    cwd: opts?.workspaceRoot,
    status,
    startedAt,
    completedAt: status === 'running' ? undefined : Date.now(),
    exitCode: receipt?.exitCode ?? (failed ? 1 : status === 'success' ? 0 : undefined),
    receipts: receipt
      ? [{ id: getReceiptId(receipt), label: receipt.summary || 'execution receipt' }]
      : [{ id: record.runId, label: 'proof pending' }],
    timeline: timelineFromRecord(record, startedAt),
    fileChanges,
    verificationStatus: verification.verificationStatus,
    evidenceCount: verification.evidenceCount,
  }
}

export function receiptSummaryLine(record: RinaExecutionRecord): string | null {
  const receipt = record.receipts[0]
  const commands = getReceiptCommands(receipt)
  if (!commands.length) return null
  return `Receipt: exit ${receipt?.exitCode}, commands ${commands.map((c) => c.command).join(' · ') || 'n/a'}`
}

export function executionReceiptFromRecord(record: RinaExecutionRecord): ExecutionReceipt {
  const receipt = record.receipts[0]
  const startedAt = record.intent.createdAt || Date.now()
  const commands = getReceiptCommands(receipt)
  const fileChanges = getReceiptFileChanges(receipt)
  const verificationChecks = getReceiptVerificationChecks(receipt)
  const verificationStatus = getReceiptVerificationStatus(receipt)
  const receiptId = getReceiptId(receipt)
  const plan = record.plan
  const planId = plan && 'id' in plan && typeof plan.id === 'string' ? plan.id : receiptId
  const artifacts = getReceiptArtifacts(receipt)

  return {
    id: receiptId,
    sessionId: record.requestId,
    workspaceId: '',
    userIntent: record.intent.target,
    planId,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    status: receipt?.exitCode === 0 ? 'succeeded' : 'failed',
    commands,
    fileChanges,
    mcpCalls: [],
    artifacts,
    verification: {
      status: verificationStatus,
      checks: verificationChecks,
      conclusion: receipt?.summary || '',
      recoverySuggested: false,
    },
    risk: {
      level: 'low',
      reasons: [],
      approvals: [],
    },
    summary: receipt?.summary || record.plan?.summary || '',
  }
}
