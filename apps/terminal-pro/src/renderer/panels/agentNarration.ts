import type { AgentTimelineEvent, ConversationMode } from '../../main/orchestration/conversationTypes.js'

type StepLike = {
  stepIndex?: number
  name?: string
  step?: { input?: { command?: string } }
  input?: { command?: string }
}

function readCommand(step: StepLike): string {
  return String(step.step?.input?.command || step.input?.command || '').trim()
}

function readCombinedText(step: StepLike): string {
  return `${String(step.name || '').trim()} ${readCommand(step)}`.toLowerCase()
}

function formatIntentLead(intent: ConversationMode): string | null {
  switch (intent) {
    case 'inspect':
    case 'question':
      return 'I’m starting with inspection before I change anything.'
    case 'execute':
      return 'I know what needs doing. I’m moving carefully.'
    default:
      return null
  }
}

export function describeAgentPlanStep(step: StepLike): string {
  const rawName = String(step.name || '').trim()
  const command = readCommand(step)
  const combined = readCombinedText(step)

  if (/\bgit status\b/.test(combined)) return 'I’m checking the workspace state first.'
  if (/^\s*(node|npm|pnpm|yarn|bun)\s+(-v|--version)\b/.test(command) || /\b(node -v|npm -v)\b/.test(combined)) {
    return 'I’m checking the toolchain first.'
  }
  if (/\bnpm test\b|\bpnpm test\b|\byarn test\b|\bbun test\b|\bpytest\b/.test(combined)) {
    return 'I’m running the tests to see what actually fails.'
  }
  if (/\bnpm run build\b|\bpnpm build\b|\byarn build\b|\bbun run build\b|\bnext build\b|\btsc\b/.test(combined)) {
    return 'I’m running the build to verify the current state.'
  }
  if (/\bnpm\s+(install|ci)\b|\bpnpm\s+install\b|\byarn\s+install\b|\bbun\s+install\b/.test(combined)) {
    return 'I’m installing the dependencies this project needs.'
  }
  if (/\beslint\b|\bnpm run lint\b|\bpnpm lint\b|\byarn lint\b/.test(combined)) {
    return 'I’m checking the obvious code issues first.'
  }
  if (/\bselfcheck\b|executeselfcheck/.test(combined)) return 'I’m checking the app and workspace health now.'
  if (/\binspect\b|\banaly[sz]e\b|\bdiagnos|\brg\b|\bfind\b|\bls\b|\bcat\b/.test(combined)) {
    return 'I’m inspecting the project first.'
  }
  if (/\bapply\b|\bedit\b|\bwrite\b|\bpatch\b|\bfix\b/.test(combined)) {
    return 'I found the likely issue. I’m applying the smallest safe fix now.'
  }
  if (rawName) return `I’m working through: ${rawName}.`
  if (command) return `I’m handling this next step now: ${command}.`
  return 'I’m working through the next step now.'
}

export function describeAgentTimelineEvent(event: AgentTimelineEvent): string | null {
  switch (event.type) {
    case 'agent.mode.changed':
      if (event.mode === 'planning') return 'I’m lining up the safest path first.'
      if (event.mode === 'executing') return 'I’m moving through the plan now.'
      if (event.mode === 'awaiting_permission') return 'I’m paused here until you approve the next move.'
      if (event.mode === 'thinking' || event.mode === 'responding' || event.mode === 'idle') return null
      return 'I’m still with you on this.'
    case 'intent.resolved':
      return formatIntentLead(event.intent)
    case 'memory.context.applied': {
      const backend = event.backend === 'json-fallback' ? 'JSON fallback' : 'SQLite'
      if (event.constraintCount <= 1) {
        return `I’m using one remembered constraint from ${backend} memory for this turn.`
      }
      return `I’m using ${event.constraintCount} remembered constraints from ${backend} memory for this turn.`
    }
    case 'plan.created':
      return `I’ve got a plan for ${event.goal || 'this task'}. ${event.stepCount || 0} step${event.stepCount === 1 ? '' : 's'}, starting with the safest checks.`
    case 'permission.required':
      return `I want your approval before I go further. ${event.reason || 'Review required before execution.'}`
    case 'task.completed':
      return event.summary || 'That part is done. I’m ready for the next move.'
    case 'task.failed':
      return event.error || 'That attempt failed. I can inspect it or try the next safe move.'
    case 'message.received':
      return null
    default:
      return null
  }
}
