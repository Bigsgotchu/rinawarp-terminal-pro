import type { ConversationOutcome, InteractionType } from './conversationTypes.js'

export interface PersonalityContext {
  interaction: InteractionType
  hasActiveTask: boolean
  lastTaskStatus?: 'running' | 'failed' | 'completed'
  recoveredSession?: boolean
  memory: string[]
  constraints?: string[]
  tonePreference?: 'concise' | 'balanced' | 'detailed'
}

export interface PersonalityAdapter {
  generate(input: {
    userMessage: string
    systemReply?: string
    context: PersonalityContext
  }): string
}

export function classifyInteraction(input: string): InteractionType {
  const text = String(input || '').toLowerCase()
  const hasSmallTalk = /\b(how are you|what's up|whats up|hello|hi|hey|yo|good morning|good afternoon|good evening)\b/.test(text)
  const hasStatusCheck = /\b(status|what's going on|whats going on|what are you doing|where are we|are you still working)\b/.test(text)
  const hasControl = /\b(don't|do not|stop|avoid|never|ask before)\b/.test(text)
  const hasTaskRequest = /\b(fix|run|install|resume|retry|rerun|deploy|build|test|inspect)\b/.test(text)
  const hasQuestion = /\b(why|what happened|what broke|what failed|explain|how did)\b/.test(text)

  if (hasSmallTalk) {
    return 'small_talk'
  }
  if (hasStatusCheck) {
    return 'status_check'
  }
  if (hasTaskRequest && (hasControl || hasQuestion)) {
    return 'mixed'
  }
  if (hasControl) {
    return 'control'
  }
  if (hasTaskRequest) {
    return 'task_request'
  }
  if (hasQuestion) {
    return 'question'
  }

  return 'mixed'
}

export function mapOutcomeToTaskStatus(outcome?: ConversationOutcome | null): PersonalityContext['lastTaskStatus'] {
  switch (outcome) {
    case 'running':
      return 'running'
    case 'failed':
    case 'interrupted':
      return 'failed'
    case 'succeeded':
      return 'completed'
    default:
      return undefined
  }
}

function sanitizeSystemReply(systemReply?: string): string | undefined {
  if (!systemReply) return undefined
  return systemReply
    .replace(/I don['’]t have proof yet because no verified run exists\./gi, 'I haven’t run anything here yet.')
    .replace(/If you want, I can inspect the code directly in the workspace or line up a plan without pretending a run already happened\./gi, 'If you want, I can inspect the workspace and line up the safest next step.')
    .replace(/no verified run exists/gi, 'nothing has run yet')
    .replace(/proof-pending/gi, 'still settling')
    .replace(/proof trail/gi, 'details')
    .replace(/receipt trail/gi, 'details')
    .trim()
}

function buildConstraintLine(constraints: string[], memory: string[]): string {
  const lines: string[] = []
  if (constraints.includes('do_not_touch_tests') || memory.some((entry) => /\btests?\b/i.test(entry) && /\b(approval|avoid|don.t modify|do not modify)\b/i.test(entry))) {
    lines.push('I’ll avoid touching tests unless you say so.')
  }
  if (constraints.includes('use_pnpm') || memory.some((entry) => /\bpnpm\b/i.test(entry))) {
    lines.push('I’ll use pnpm.')
  }
  if (constraints.includes('prefer_concise') || memory.some((entry) => /\bconcise|keep responses short|keep it short\b/i.test(entry))) {
    lines.push('I’ll keep it short.')
  }
  return lines.join(' ')
}

export class RinaPersonalityAdapter implements PersonalityAdapter {
  generate(input: {
    userMessage: string
    systemReply?: string
    context: PersonalityContext
  }): string {
    const { interaction, hasActiveTask, lastTaskStatus, recoveredSession, memory, constraints = [], tonePreference } = input.context
    const systemReply = sanitizeSystemReply(input.systemReply)
    const constraintLine = buildConstraintLine(constraints, memory)

    if (interaction === 'small_talk') {
      if (recoveredSession) {
        return 'I’m good. I recovered your last session successfully. Want to continue where we left off?'
      }
      return 'I’m good. Ready when you are.'
    }

    if (interaction === 'status_check') {
      if (lastTaskStatus === 'failed') {
        return 'The last run failed, but everything is still intact. We can fix it or resume from where it stopped.'
      }
      if (hasActiveTask || lastTaskStatus === 'running') {
        return 'I’m working through the current task. I can walk you through what I’m doing if you want.'
      }
      return 'Nothing running right now. Want me to take a look at something?'
    }

    if (interaction === 'control') {
      return constraintLine || 'Understood. I’ll keep that in mind.'
    }

    if (interaction === 'question') {
      return systemReply ?? 'Let me take a look and explain what’s going on.'
    }

    if (interaction === 'task_request') {
      const base = 'Got it. I’ll take care of that.'
      return [base, constraintLine].filter(Boolean).join(' ').trim()
    }

    if (interaction === 'mixed') {
      const base = hasActiveTask ? 'Got it. I’m on it.' : 'Got it. I’ll take care of that.'
      return [base, constraintLine, systemReply && !/^(got it|alright|i’m good|i am good)\b/i.test(systemReply) ? systemReply : '']
        .filter(Boolean)
        .join(' ')
        .trim()
    }

    const fallback = systemReply ?? 'Alright, I’m on it.'
    if (tonePreference === 'concise') {
      return [fallback, constraintLine].filter(Boolean).join(' ').trim()
    }
    return [fallback, constraintLine].filter(Boolean).join(' ').trim()
  }
}

export function createRinaPersonalityAdapter(): PersonalityAdapter {
  return new RinaPersonalityAdapter()
}
