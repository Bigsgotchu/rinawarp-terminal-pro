import type { MessageBlock } from '../workbench/store.js'
import { copyBlock, inlineActionsBlock, replyCardBlock } from './renderFragments.js'

export function humanizeHaltReason(reason?: string): string {
  const normalized = String(reason || '').trim()
  if (!normalized) return 'The plan halted before a proof-backed run could start.'
  if (/confirmation/i.test(normalized) || /typed YES/i.test(normalized)) {
    return 'The plan is paused waiting for confirmation before Rina can run anything.'
  }
  if (/profile/i.test(normalized) || /interactive/i.test(normalized)) {
    return 'The plan was blocked by the current execution profile before a trusted run could start.'
  }
  if (/policy/i.test(normalized) || /blocked/i.test(normalized)) {
    return 'The plan was blocked by policy before a trusted run could start.'
  }
  return normalized
}

export function buildExecutionHaltContent(prompt: string, reason: string | undefined, options?: { introText?: string }): MessageBlock[] {
  const summary = humanizeHaltReason(reason)
  const actions =
    /confirmation/i.test(String(reason || '')) || /typed YES/i.test(String(reason || ''))
      ? [{ label: 'Open Runs', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }]
      : [{ label: 'Inspect receipts', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }]

  return [
    ...(options?.introText?.trim() ? [copyBlock(options.introText.trim())] : []),
    replyCardBlock({
      kind: 'execution-halt',
      label: 'Execution halted',
      badge: 'Proof not started',
      className: 'rw-command-result halted',
      bodyBlocks: [copyBlock(summary), copyBlock(`Prompt: ${prompt}`, 'muted')],
    }),
    inlineActionsBlock(actions),
  ]
}
