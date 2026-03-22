import type { MessageBlock, ReplyAction, ReplyCardKind, ReplyListItem, StatGridItem } from '../workbench/store.js'

export function bubbleBlock(text: string): MessageBlock {
  return { type: 'bubble', text }
}

export function sectionLabelBlock(text: string): MessageBlock {
  return { type: 'section-label', text }
}

export function agentStepBlock(statusClass: 'start' | 'running' | 'end', text: string): MessageBlock {
  return { type: 'agent-step', statusClass, text }
}

export function replyCardBlock(args: {
  kind?: ReplyCardKind
  label: string
  badge?: string
  bodyBlocks?: MessageBlock[]
  className?: string
  actions?: ReplyAction[]
}): MessageBlock {
  return {
    type: 'reply-card',
    kind: args.kind,
    label: args.label,
    badge: args.badge,
    className: args.className,
    bodyBlocks: args.bodyBlocks,
    actions: args.actions,
  }
}

export function inlineActionsBlock(actions: ReplyAction[]): MessageBlock {
  return { type: 'inline-actions', actions }
}

export function copyBlock(text: string, tone: 'default' | 'muted' = 'default', className?: string): MessageBlock {
  return { type: 'copy', text, tone, className }
}

export function inlineCodeBlock(text: string, className?: string): MessageBlock {
  return { type: 'inline-code', text, className }
}

export function replyListBlock(items: ReplyListItem[], emptyText?: string): MessageBlock {
  return { type: 'reply-list', items, emptyText }
}

export function statGridBlock(items: StatGridItem[]): MessageBlock {
  return { type: 'stat-grid', items }
}

export function proofSummaryBlock(
  items: Array<{ label: string; value: string; emphasis?: 'code' | 'strong' }>
): MessageBlock {
  return { type: 'proof-summary', items }
}
