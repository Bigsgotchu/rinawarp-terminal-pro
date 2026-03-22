import type { MessageBlock } from '../workbench/store.js'
import { buildCommandResultBlock, extractStructuredCommandReply, summarizeCommandReply } from './renderCommandReplies.js'
import { bubbleBlock, copyBlock, inlineActionsBlock, inlineCodeBlock, replyCardBlock, replyListBlock, statGridBlock } from './renderFragments.js'

export type RinaReplyResult = {
  text?: string
  error?: string
  intent?: string
  requiresConfirmation?: boolean
  rina?: {
    output?: unknown
    error?: string
    intent?: string
  }
}

export function buildRinaReplyContent(result: RinaReplyResult, options?: { leadText?: string | null }): MessageBlock[] {
  const output = result.rina?.output
  const commandReply = extractStructuredCommandReply(output)
  const text =
    options?.leadText?.trim() ||
    (commandReply && result.intent !== 'execute'
      ? summarizeCommandReply(commandReply)
      : result.text || result.error || 'Here is the latest status.')

  const blocks: MessageBlock[] = [bubbleBlock(text)]

  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>

    if (commandReply && result.intent !== 'execute') {
      blocks.push(buildCommandResultBlock(commandReply))
    }

    if (record.originalError && typeof record.originalError === 'string') {
      blocks.push(
        replyCardBlock({
          kind: 'fix-result',
          label: 'What I found',
          bodyBlocks: [inlineCodeBlock(String(record.originalError))],
        })
      )
    }

    if (Array.isArray(record.commands) && record.commands.length > 0) {
      blocks.push(
        replyCardBlock({
          kind: 'fix-result',
          label: 'Try next',
          bodyBlocks: [copyBlock('These follow-up commands are ready to send through the same trusted path.')],
        }),
        inlineActionsBlock(
          (record.commands as unknown[]).map((command) => ({
            label: String(command),
            prompt: String(command),
          }))
        )
      )
    }

    if (record.newCommands && typeof record.newCommands === 'object') {
      const items = Object.entries(record.newCommands as Record<string, unknown>)
        .map(([command, description]) => ({
          title: String(command),
          text: String(description),
          strongTitle: true,
        }))
      blocks.push(replyCardBlock({ kind: 'fix-result', label: 'What I can do from here', bodyBlocks: [replyListBlock(items)] }))
    }

    if (record.plan && typeof record.plan === 'object') {
      const plan = record.plan as Record<string, unknown>
      const steps = Array.isArray(plan.steps) ? (plan.steps as Array<Record<string, unknown>>) : []
      const stepItems = steps
        .slice(0, 6)
        .map((step, index) => {
          const title = typeof step.description === 'string' ? step.description : typeof step.id === 'string' ? step.id : `Step ${index + 1}`
          const command = typeof step.command === 'string' ? step.command : ''
          return {
            title,
            code: command || undefined,
          }
        })

      blocks.push(
        replyCardBlock({
          kind: 'plan',
          label: 'My plan',
          badge: result.requiresConfirmation ? 'Needs your approval' : 'Ready for review',
          bodyBlocks: [replyListBlock(stepItems, 'No plan steps returned.')],
          actions: [
            { label: 'Run the safe steps', prompt: 'Run the safe steps from the current fix plan.' },
            { label: 'Open Runs', tab: 'runs' },
          ],
        })
      )
    }

    if (
      !commandReply &&
      (
        typeof record.totalSteps === 'number' ||
        typeof record.successfulSteps === 'number' ||
        typeof record.failedSteps === 'number' ||
        typeof record.durationMs === 'number'
      )
    ) {
      blocks.push(
        replyCardBlock({
          kind: 'generic',
          label: 'What happened',
          bodyBlocks: [
            statGridBlock(
              [
                typeof record.totalSteps === 'number' ? { label: 'Steps', value: String(record.totalSteps) } : null,
                typeof record.successfulSteps === 'number' ? { label: 'Succeeded', value: String(record.successfulSteps) } : null,
                typeof record.failedSteps === 'number' ? { label: 'Failed', value: String(record.failedSteps) } : null,
                typeof record.durationMs === 'number'
                  ? { label: 'Duration', value: `${Math.round(Number(record.durationMs) / 1000)}s` }
                  : null,
              ].filter(Boolean) as Array<{ label: string; value: string }>
            ),
          ],
          actions: [{ label: 'Inspect receipts', tab: 'runs' }],
        })
      )
    }

    if (!commandReply && Array.isArray(record.results) && record.results.length > 0) {
      const items = (record.results as Array<Record<string, unknown>>)
        .slice(0, 6)
        .map((entry) => {
          const title = typeof entry.command === 'string' ? entry.command : typeof entry.stepId === 'string' ? entry.stepId : 'Step'
          const status = entry.success === true ? 'OK' : entry.success === false ? 'Failed' : 'Done'
          const outputText =
            typeof entry.output === 'string' && entry.output.trim() ? entry.output.trim().slice(0, 220) : ''
          return {
            title,
            badge: status,
            code: outputText || undefined,
            strongTitle: true,
          }
        })
      blocks.push(replyCardBlock({ kind: 'generic', label: 'What each step returned', bodyBlocks: [replyListBlock(items)] }))
    }
  }

    if (result.intent === 'execute') {
    blocks.push(
      inlineActionsBlock([
        { label: 'Inspect execution trace', tab: 'execution-trace' },
        { label: 'Inspect receipts', tab: 'runs' },
      ])
    )
  }

  return blocks
}
