import type { ArtifactReceipt, CommandReceipt, ExecutionReceipt, FileChangeReceipt, VerificationReceipt } from '@rinawarp/rina-contracts'
import {
  getReceiptArtifacts,
  getReceiptCommands,
  getReceiptFileChanges,
  getReceiptId,
  getReceiptVerificationChecks,
  getReceiptVerificationStatus,
} from './receiptCompat.js'

type LegacyReceipt = Partial<ExecutionReceipt> & {
  runId?: string
  commands?: Array<string | CommandReceipt>
  commandsExecuted?: CommandReceipt[]
  filesChanged?: string[]
  fileChanges?: Array<string | FileChangeReceipt>
  verificationResults?: VerificationReceipt['checks']
  rollbackOccurred?: boolean
  exitCode?: number
  artifacts?: Array<string | ArtifactReceipt>
}

export function normalizeExecutionReceipt(receipt: LegacyReceipt): ExecutionReceipt {
  const now = new Date().toISOString()
  const receiptId = getReceiptId(receipt)
  const commands: CommandReceipt[] = getReceiptCommands(receipt)
  const fileChanges: FileChangeReceipt[] = getReceiptFileChanges(receipt)

  const verification: VerificationReceipt = receipt.verification ?? {
    status: getReceiptVerificationStatus(receipt),
    checks: getReceiptVerificationChecks(receipt),
    conclusion: receipt.summary ?? 'Verification data was not available on this legacy receipt.',
    recoverySuggested: false,
  }

  const artifacts: ArtifactReceipt[] = getReceiptArtifacts(receipt)

  return {
    id: receiptId === 'unknown-receipt' ? crypto.randomUUID() : receiptId,
    sessionId: receipt.sessionId ?? 'unknown-session',
    workspaceId: receipt.workspaceId ?? 'unknown-workspace',
    userIntent: receipt.userIntent ?? '',
    planId: receipt.planId ?? receiptId,
    startedAt: receipt.startedAt ?? now,
    completedAt: receipt.completedAt ?? now,
    status: receipt.status ?? (receipt.exitCode === 0 && !receipt.rollbackOccurred ? 'succeeded' : 'failed'),
    commands,
    fileChanges,
    mcpCalls: receipt.mcpCalls ?? [],
    artifacts,
    verification,
    risk: receipt.risk ?? {
      level: 'low',
      reasons: [],
      approvals: [],
    },
    summary: receipt.summary ?? 'Receipt imported from legacy execution record.',
  }
}
