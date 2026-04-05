import type { ConversationOutcome, InteractionType } from './conversationTypes.js'

export const RINA_ELITE_PERSONALITY_PROMPT = `
You are Rina, an AI terminal teammate.

Your personality:
- calm, sharp, grounded
- concise by default
- warm but not chatty
- confident but never bluffing
- technically fluent
- proactive without being controlling
- trustworthy over impressive

How you speak:
- natural, direct, clear
- no robotic phrasing
- no internal system jargon
- no defensive wording
- no exaggerated enthusiasm
- no fake emotions
- no filler

Behavior rules:
- respond like a competent teammate first, a system second
- if the user is casual, respond naturally and briefly
- if the user wants work done, acknowledge and move into action
- if something is uncertain, say what you know and what you are checking
- if approval is needed, explain why in plain language
- if you remember a preference or constraint, honor it naturally
- never mention internal classifiers, receipts, routing, policies, or hidden state directly
- never claim a fix succeeded until it has been verified
- prefer momentum: inspect, explain, or proceed when safe

Style rules:
- short sentences
- precise verbs
- minimal hedging
- no corporate tone
- no motivational fluff
`.trim()

export type RinaMood =
  | 'steady'
  | 'warm'
  | 'focused'
  | 'careful'
  | 'reassuring'

export type InteractionMode =
  | 'social'
  | 'operator'
  | 'analyst'
  | 'constraint'
  | 'recovery'

export interface PersonalityContext {
  mode: InteractionMode
  mood: RinaMood
  hasActiveTask: boolean
  recoveredSession: boolean
  lastTaskStatus?: 'running' | 'failed' | 'completed'
  rememberedPreferences: string[]
  rememberedConstraints: string[]
  tonePreference?: 'concise' | 'balanced' | 'detailed'
}

export interface PersonalityAdapter {
  generate(input: PersonalityDraftInput): string
}

export interface PersonalityDraftInput {
  userMessage: string
  systemReply?: string
  context: PersonalityContext
}

const REWRITE_RULES: Array<[RegExp, string]> = [
  [/\bI do not have proof yet\b/gi, 'I haven’t checked that yet'],
  [/\bI don['’]t have proof yet\b/gi, 'I haven’t checked that yet'],
  [/\bNo run exists\b/gi, 'Nothing has run yet'],
  [/\bCannot proceed\b/gi, 'I need to pause here'],
  [/\bverification\b/gi, 'check'],
  [/\breceipt\b/gi, 'result'],
  [/\bintent\b/gi, 'request'],
  [/\bpolicy\b/gi, 'approval'],
  [/\bsystem state\b/gi, 'context'],
  [/\bproof trail\b/gi, 'details'],
  [/\breceipt trail\b/gi, 'details'],
  [/\bproof-pending\b/gi, 'still settling'],
  [/\bno verified run exists\b/gi, 'nothing has run yet'],
  [/^I understand you want to execute\.\s*Let me help with that\./i, 'Got it. I’m on it.'],
  [/^I understand you want to [^.]+\.\s*Let me help with that\./i, 'Got it. I’m on it.'],
]

function normalize(text: string): string {
  return String(text || '').trim().toLowerCase()
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)))
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function classifyInteraction(input: string): InteractionType {
  const text = normalize(input)
  const hasSmallTalk = hasAny(text, [
    /\b(how are you|what's up|whats up|hello|hi|hey|yo|good morning|good afternoon|good evening)\b/,
  ])
  const hasStatusCheck = hasAny(text, [
    /\b(status|what's going on|whats going on|what are you doing|where are we|are you still working)\b/,
  ])
  const hasControl = hasAny(text, [/\b(don't|do not|stop|avoid|never|ask before)\b/])
  const hasTaskRequest = hasAny(text, [/\b(fix|run|install|resume|retry|rerun|deploy|build|test|inspect)\b/])
  const hasQuestion = hasAny(text, [/\b(why|what happened|what broke|what failed|explain|how did)\b/])

  if (hasSmallTalk) return 'small_talk'
  if (hasStatusCheck) return 'status_check'
  if (hasTaskRequest && (hasControl || hasQuestion)) return 'mixed'
  if (hasControl) return 'control'
  if (hasTaskRequest) return 'task_request'
  if (hasQuestion) return 'question'
  return 'mixed'
}

export function selectInteractionMode(input: {
  message: string
  recoveredSession: boolean
  requiresAction: boolean
}): InteractionMode {
  const text = normalize(input.message)
  const hasConstraintLanguage = /don't |do not |avoid |never |ask before|use pnpm|use yarn|keep it short/.test(text)
  const hasActionLanguage = /fix|run|install|resume|retry|rerun|deploy|build|test|inspect/.test(text)

  if (/^(hi|hello|hey|yo)\b/.test(text) || /how are you|what's up|whats up/.test(text)) {
    return 'social'
  }

  if (hasConstraintLanguage && !input.requiresAction && !hasActionLanguage) {
    return 'constraint'
  }

  if (/what happened|why|explain|what broke|how did/.test(text)) {
    return 'analyst'
  }

  if (input.recoveredSession && /resume|continue|rerun|recover/.test(text)) {
    return 'recovery'
  }

  if (input.requiresAction) {
    return 'operator'
  }

  return input.recoveredSession ? 'recovery' : 'analyst'
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

function inferRememberedPreferences(memory: string[], constraints: string[], tonePreference?: PersonalityContext['tonePreference']): string[] {
  const remembered: string[] = []
  if (constraints.includes('use_pnpm') || memory.some((entry) => /\bpnpm\b/i.test(entry))) remembered.push('pnpm')
  if (constraints.includes('prefer_concise') || tonePreference === 'concise' || memory.some((entry) => /\bconcise|keep responses short|keep it short\b/i.test(entry))) {
    remembered.push('concise')
  }
  return unique(remembered)
}

function inferRememberedConstraints(memory: string[], constraints: string[]): string[] {
  const remembered: string[] = []
  if (constraints.includes('do_not_touch_tests') || memory.some((entry) => /\btests?\b/i.test(entry) && /\b(approval|avoid|unless you say so|without asking)\b/i.test(entry))) {
    remembered.push('test_approval')
  }
  return unique(remembered)
}

export function buildConstraintSentence(input: {
  rememberedPreferences: string[]
  rememberedConstraints: string[]
}): string | null {
  const parts: string[] = []

  if (input.rememberedPreferences.includes('pnpm')) {
    parts.push('use pnpm')
  }

  if (input.rememberedPreferences.includes('concise')) {
    parts.push('keep this short')
  }

  if (input.rememberedConstraints.includes('test_approval')) {
    parts.push('avoid touching tests without asking')
  }

  if (!parts.length) return null

  if (parts.length === 1) {
    return `I’ll ${parts[0]}.`
  }

  const last = parts.pop()
  return `I’ll ${parts.join(', ')}, and ${last}.`
}

export function naturalizeReply(text: string): string {
  return REWRITE_RULES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text)
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeSystemReply(systemReply?: string): string | undefined {
  if (!systemReply) return undefined
  return naturalizeReply(systemReply)
}

function selectMood(input: {
  recoveredSession: boolean
  lastTaskStatus?: PersonalityContext['lastTaskStatus']
  hasActiveTask: boolean
}): RinaMood {
  if (input.recoveredSession) return 'reassuring'
  if (input.lastTaskStatus === 'failed') return 'careful'
  if (input.hasActiveTask || input.lastTaskStatus === 'running') return 'focused'
  return 'steady'
}

export class RinaEliteAdapter implements PersonalityAdapter {
  generate(input: PersonalityDraftInput): string {
    const { context } = input
    const systemReply = sanitizeSystemReply(input.systemReply)

    switch (context.mode) {
      case 'social':
        if (context.recoveredSession) {
          return 'I’m good. I recovered your last session cleanly. Want to continue where we left off?'
        }
        return 'I’m good. Ready when you are.'

      case 'recovery':
        if (context.lastTaskStatus === 'failed') {
          return 'I recovered the last session and kept the context intact. We can resume from there or inspect the failure first.'
        }
        return 'Your last session is back and ready. We can continue from where it stopped.'

      case 'constraint':
        return systemReply ?? 'Understood. I’ll follow that.'

      case 'operator':
        return systemReply ?? 'Got it. I’m on it.'

      case 'analyst':
      default:
        return systemReply ?? 'Let me take a look.'
    }
  }
}

export function composeRinaReply(input: {
  userMessage: string
  systemReply?: string
  requiresAction: boolean
  recoveredSession: boolean
  lastTaskStatus?: 'running' | 'failed' | 'completed'
  rememberedPreferences: string[]
  rememberedConstraints: string[]
  hasActiveTask: boolean
  tonePreference?: PersonalityContext['tonePreference']
}): string {
  const mode = selectInteractionMode({
    message: input.userMessage,
    recoveredSession: input.recoveredSession,
    requiresAction: input.requiresAction,
  })

  const adapter = new RinaEliteAdapter()

  const draft = adapter.generate({
    userMessage: input.userMessage,
    systemReply: input.systemReply,
    context: {
      mode,
      mood: selectMood({
        recoveredSession: input.recoveredSession,
        lastTaskStatus: input.lastTaskStatus,
        hasActiveTask: input.hasActiveTask,
      }),
      hasActiveTask: input.hasActiveTask,
      recoveredSession: input.recoveredSession,
      lastTaskStatus: input.lastTaskStatus,
      rememberedPreferences: input.rememberedPreferences,
      rememberedConstraints: input.rememberedConstraints,
      tonePreference: input.tonePreference,
    },
  })

  const constraintLine = buildConstraintSentence({
    rememberedPreferences: input.rememberedPreferences,
    rememberedConstraints: input.rememberedConstraints,
  })

  const merged = constraintLine && mode !== 'social'
    ? `${draft} ${constraintLine}`
    : draft

  return naturalizeReply(merged)
}

export function composeRinaReplyFromMemory(input: {
  userMessage: string
  systemReply?: string
  requiresAction: boolean
  recoveredSession: boolean
  lastTaskStatus?: 'running' | 'failed' | 'completed'
  memory: string[]
  constraints?: string[]
  hasActiveTask: boolean
  tonePreference?: PersonalityContext['tonePreference']
}): string {
  const rememberedPreferences = inferRememberedPreferences(input.memory, input.constraints || [], input.tonePreference)
  const rememberedConstraints = inferRememberedConstraints(input.memory, input.constraints || [])

  return composeRinaReply({
    userMessage: input.userMessage,
    systemReply: input.systemReply,
    requiresAction: input.requiresAction,
    recoveredSession: input.recoveredSession,
    lastTaskStatus: input.lastTaskStatus,
    rememberedPreferences,
    rememberedConstraints,
    hasActiveTask: input.hasActiveTask,
    tonePreference: input.tonePreference,
  })
}

export function createRinaPersonalityAdapter(): PersonalityAdapter {
  return new RinaEliteAdapter()
}
