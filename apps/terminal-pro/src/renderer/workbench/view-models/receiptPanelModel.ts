import { formatRunDate } from '../renderers/format.js'
import { analyzeFailure, classifyRunIntent, extractUrls, formatRunIntentLabel } from '../renderers/runIntelligence.js'
import type { WorkbenchState } from '../store.js'

type StructuredReceipt = {
  kind?: string
  id?: string
  sessionId?: string
  session?: { id?: string | null; updatedAt?: string | null; projectRoot?: string | null; source?: string | null; platform?: string | null }
  command?: { input?: string | null; cwd?: string | null; startedAt?: string | null; endedAt?: string | null; exitCode?: number | null; ok?: boolean | null; cancelled?: boolean; error?: string | null }
  artifacts?: { stdoutChunks?: number; stderrChunks?: number; metaChunks?: number; stdoutPreview?: string; stderrPreview?: string; metaPreview?: string; changedFiles?: string[]; diffHints?: string[]; urls?: string[] }
}

export type ReceiptPanelModel =
  | { state: 'empty' }
  | { state: 'raw'; payload: unknown }
  | {
      state: 'structured'
      receiptId: string
      intentLabel: string
      statusLabel: string
      command: string
      cwd: string
      chipRows: Array<{ label: string; value: string }>
      summaryRows: Array<{ label: string; value: string }>
      deployRows?: Array<{ label: string; value: string }>
      guidanceTitle: string
      guidanceCards: Array<{ label: string; value: string }>
      failureClues: string[]
      artifactRows: Array<{ label: string; value: string }>
      changedFiles: string[]
      diffHints: string[]
      urls: string[]
      previews: Array<{ label: string; value: string }>
    }

function formatNullableDate(value?: string | null): string {
  return value ? formatRunDate(value) : 'not recorded'
}

export function buildReceiptPanelModel(state: WorkbenchState): ReceiptPanelModel {
  if (!state.receipt) return { state: 'empty' }
  const receipt = state.receipt as StructuredReceipt
  if (receipt.kind !== 'structured_command_receipt' || !receipt.command) {
    return { state: 'raw', payload: state.receipt }
  }

  const command = receipt.command.input || 'Unknown command'
  const intent = classifyRunIntent(command)
  const intentLabel = formatRunIntentLabel(intent)
  const cwd = receipt.command.cwd || receipt.session?.projectRoot || 'No workspace path recorded'
  const urls = Array.from(new Set([...(receipt.artifacts?.urls || []), ...extractUrls(receipt.command.error || ''), ...extractUrls(receipt.artifacts?.stdoutPreview || '')]))
  const previewText = [receipt.artifacts?.stderrPreview, receipt.artifacts?.stdoutPreview, receipt.artifacts?.metaPreview, receipt.command?.error].filter(Boolean).join('\n')
  const failure = analyzeFailure({
    command,
    exitCode: receipt.command.exitCode,
    outputText: previewText,
    interrupted: Boolean(receipt.command.cancelled),
    changedFiles: receipt.artifacts?.changedFiles || [],
    diffHints: receipt.artifacts?.diffHints || [],
    metaText: receipt.artifacts?.metaPreview || '',
  })
  const statusLabel =
    receipt.command.cancelled ? 'Interrupted' : receipt.command.ok === true ? 'Completed' : receipt.command.ok === false || typeof receipt.command.exitCode === 'number' ? 'Failed' : 'In progress'

  return {
    state: 'structured',
    receiptId: receipt.id || 'Receipt',
    intentLabel,
    statusLabel,
    command,
    cwd,
    chipRows: [
      { label: 'Intent', value: intentLabel },
      { label: 'Status', value: statusLabel },
      { label: 'Exit', value: receipt.command.exitCode === null || receipt.command.exitCode === undefined ? 'pending' : String(receipt.command.exitCode) },
      { label: 'Session', value: receipt.sessionId || receipt.session?.id || 'unknown' },
      { label: 'Confidence', value: failure.confidence },
    ],
    summaryRows: [
      { label: 'Intent', value: intentLabel },
      { label: 'Outcome', value: statusLabel },
      { label: 'Command', value: command },
      { label: 'CWD', value: cwd },
      { label: 'Started', value: formatNullableDate(receipt.command.startedAt) },
      { label: 'Ended', value: formatNullableDate(receipt.command.endedAt) },
      { label: 'Updated', value: formatNullableDate(receipt.session?.updatedAt) },
      { label: 'Exit code', value: receipt.command.exitCode === null || receipt.command.exitCode === undefined ? 'pending' : String(receipt.command.exitCode) },
      { label: 'Receipt ID', value: receipt.id || 'unknown' },
      { label: 'Session ID', value: receipt.sessionId || receipt.session?.id || 'unknown' },
      { label: 'Project root', value: receipt.session?.projectRoot || 'none recorded' },
      { label: 'Source', value: receipt.session?.source || 'unknown' },
      { label: 'Platform', value: receipt.session?.platform || 'unknown' },
    ],
    deployRows:
      intent === 'deploy'
        ? [
            { label: 'Target', value: receipt.artifacts?.metaPreview?.match(/\b(cloudflare|vercel|netlify|docker|vps|ssh)\b/i)?.[1] || urls[0] || 'unknown' },
            { label: 'Verification', value: receipt.command.ok === true && urls.length > 0 ? 'passed' : receipt.command.ok === true ? 'pending' : 'not cleared' },
            { label: 'Rollback', value: /cloudflare|vercel|netlify/i.test(previewText) ? 'provider-backed or receipt-required' : 'manual or unsupported' },
            { label: 'Next move', value: failure.nextActionLabel },
          ]
        : undefined,
    guidanceTitle: receipt.command.ok === true && !receipt.command.cancelled ? 'Outcome Guidance' : 'Failure Guidance',
    guidanceCards: [
      {
        label: 'Summary',
        value:
          receipt.command.cancelled
            ? 'This receipt is partial proof because the run stopped early. Start with the receipt, then decide whether resume or rerun is safer.'
            : receipt.command.ok === true
              ? 'The run completed, but the receipt still keeps the evidence and safest follow-up visible if you need to inspect or repeat it.'
              : 'This receipt narrows down what most likely broke, why that call is credible, and what to do next without guessing.',
      },
      { label: 'Likely cause', value: failure.likelyCause },
      { label: 'Best next action', value: failure.nextActionLabel },
      { label: 'Next safe action', value: failure.safestNextMove },
      { label: 'Confidence', value: `${failure.confidence} confidence` },
      { label: 'Confidence basis', value: failure.confidenceReason },
      { label: 'What changed', value: failure.whatChanged },
    ],
    failureClues: failure.failureClues,
    artifactRows: [
      { label: 'Stdout chunks', value: String(receipt.artifacts?.stdoutChunks || 0) },
      { label: 'Stderr chunks', value: String(receipt.artifacts?.stderrChunks || 0) },
      { label: 'Meta chunks', value: String(receipt.artifacts?.metaChunks || 0) },
      { label: 'Changed files', value: receipt.artifacts?.changedFiles?.length ? String(receipt.artifacts.changedFiles.length) : 'none' },
      { label: 'URLs', value: urls.length ? String(urls.length) : 'none' },
    ],
    changedFiles: receipt.artifacts?.changedFiles || [],
    diffHints: receipt.artifacts?.diffHints || [],
    urls,
    previews: [
      { label: 'stderr', value: receipt.artifacts?.stderrPreview || '' },
      { label: 'stdout', value: receipt.artifacts?.stdoutPreview || '' },
      { label: 'meta', value: receipt.artifacts?.metaPreview || '' },
    ],
  }
}
