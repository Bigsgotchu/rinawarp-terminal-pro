import type { RunBlock } from './types.js'
import type { ExecutionReceipt } from '@rinawarp/rina-contracts'

function formatDurationMs(startedAt: string | number, completedAt: string | number): string {
  const start = typeof startedAt === 'string' ? parseInt(startedAt, 10) : startedAt
  const complete = typeof completedAt === 'string' ? parseInt(completedAt, 10) : completedAt
  const seconds = Math.max(1, Math.round((complete - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

export function buildRollbackFailureStory(receipt: ExecutionReceipt, runBlock?: RunBlock): string {
  const duration = formatDurationMs(receipt.startedAt, receipt.completedAt)
  const files = receipt.fileChanges?.length || 0
  const commands = receipt.commands?.length || 0
  const verify = receipt.verification?.conclusion || 'Verification did not pass.'
  const changed =
    files > 0
      ? `I attempted changes across ${files} file${files === 1 ? '' : 's'}`
      : commands > 0
        ? `I ran ${commands} command${commands === 1 ? '' : 's'}`
        : 'I attempted the requested operation'
  return `${changed}, but ${verify.toLowerCase().replace(/\.$/, '')}. I restored the previous workspace state in ${duration}. Nothing unverified remains applied.`
}

export function buildExecutionSummaryText(receipt: ExecutionReceipt, runBlock?: RunBlock): string {
  if (receipt.status === 'cancelled' || runBlock?.status === 'rolled_back') {
    return buildRollbackFailureStory(receipt, runBlock)
  }

  const duration = formatDurationMs(receipt.startedAt, receipt.completedAt)
  const fileCount = receipt.fileChanges?.length || 0
  const commandCount = receipt.commands?.length || 0
  const verify = receipt.verification?.conclusion || ''

  if (receipt.status === 'failed') {
    const checked =
      commandCount > 0
        ? `I ran ${commandCount} command${commandCount === 1 ? '' : 's'}`
        : 'I executed the requested checks'
    const changed =
      fileCount > 0 ? `, touched ${fileCount} file${fileCount === 1 ? '' : 's'}` : ''
    const outcome = verify || 'The run failed before verification could pass.'
    return `${checked}${changed}, and stopped after ${duration}. ${outcome}`
  }

  const parts: string[] = []
  if (commandCount > 0) {
    parts.push(`ran ${commandCount} command${commandCount === 1 ? '' : 's'}`)
  }
  if (fileCount > 0) {
    parts.push(`updated ${fileCount} file${fileCount === 1 ? '' : 's'}`)
  }
  const actionLine =
    parts.length > 0 ? `I ${parts.join(', ')}` : 'I completed the requested work'
  const verifyLine =
    verify.length > 0
      ? verify
      : runBlock?.status === 'success'
        ? 'Verification passed.'
        : 'Execution finished with proof attached.'
  return `${actionLine} in ${duration}, and ${verifyLine.charAt(0).toLowerCase()}${verifyLine.slice(1)}`
}

export function buildMemorySurfaceText(note: string): string {
  const trimmed = note.trim()
  if (!trimmed) return 'Using prior successful recovery pattern from this workspace.'
  if (/^using prior/i.test(trimmed)) return trimmed
  return `Using prior context: ${trimmed}`
}
