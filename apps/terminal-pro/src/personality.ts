export type SmallTalkIntent = 'greeting' | 'thanks' | 'frustration' | 'goodbye' | 'compliment' | 'checkin' | 'unknown'

export type Tone = 'professional' | 'friendly' | 'playful' | 'snarky-lite'

export interface PersonaConfig {
  name: string
  tone: Tone
  emojiLevel: 0 | 1 | 2
  humorLevel: 0 | 1 | 2
  verbosity: 0 | 1 | 2
  smallTalkMaxPer10Turns: number
  smallTalkCooldownMs: number
  allowSmallTalkDuringTasks: boolean
  bannedPhrases: string[]
}

export interface UserPersonalityState {
  lastSmallTalkAt?: number
  turnsSinceSmallTalk: number
  lastIntents: SmallTalkIntent[]
  recentPhrases: string[]
  smallTalkCountInLast10Turns: number
  turnWindow: number
  seriousMode: boolean
}

export interface TurnContext {
  userId: string
  userMessage: string
  assistantLastMessage?: string
  isTaskContext: boolean
  now?: number
}

export interface PersonalityResult {
  shouldSmallTalk: boolean
  intent: SmallTalkIntent
  text?: string
  meta: {
    reason: string
    usedTemplate?: boolean
  }
}

export class PersonalityStore {
  private state = new Map<string, UserPersonalityState>()

  get(userId: string): UserPersonalityState {
    const existing = this.state.get(userId)
    if (existing) return existing
    const fresh: UserPersonalityState = {
      turnsSinceSmallTalk: 999,
      lastIntents: [],
      recentPhrases: [],
      smallTalkCountInLast10Turns: 0,
      turnWindow: 0,
      seriousMode: false,
    }
    this.state.set(userId, fresh)
    return fresh
  }

  set(userId: string, s: UserPersonalityState) {
    this.state.set(userId, s)
  }
}

const TEMPLATES: Record<SmallTalkIntent, Record<Tone, string[]>> = {
  greeting: {
    professional: ['Hi. What are we working on today?', 'Hello. How can I help?', 'Hey. What do you want to tackle?'],
    friendly: [
      'Hey. Good to see you. What are we working on?',
      'Hi. Want to chat or work on something?',
      'Hello. What do you want to do next?',
    ],
    playful: [
      'Hey hey. What are we building today?',
      'Yo. What chaos are we debugging today?',
      'Hi. Point me at it and we will fix it.',
    ],
    'snarky-lite': [
      'Hey. Let us make computers behave.',
      'Hi. Tell me what is broken.',
      'Hello. I am ready for the next fire.',
    ],
  },
  thanks: {
    professional: ['You are welcome.', 'Happy to help.', 'Anytime.'],
    friendly: ['Of course. Want to keep going?', 'Glad that helped.', 'Anytime. What is next?'],
    playful: ['Anytime. Want to ship it now?', 'Nice progress. What is next?', 'You got it.'],
    'snarky-lite': ['No problem. I accept payment in solved bugs.', 'Sure. What is next?', 'Anytime.'],
  },
  frustration: {
    professional: [
      'Fair. Let us narrow it down. What error are you seeing?',
      'Understood. Paste the exact error and we will fix it.',
      'Let us go step by step. What changed last?',
    ],
    friendly: [
      'Yeah, that is annoying. Show me the error and we will untangle it.',
      'I have you. What is the exact message?',
      'Let us get you unstuck. What happened?',
    ],
    playful: [
      'That is cursed. Let us fix it. What is the error?',
      'Computers are fast and wrong. Paste the logs.',
      'All right. Time to squash this bug. What do you see?',
    ],
    'snarky-lite': [
      'Yeah, not ideal. Drop the error.',
      'Classic. What does the stack trace say?',
      'Show me what it is complaining about.',
    ],
  },
  goodbye: {
    professional: ['Sounds good. I am here when you need me.', 'Goodbye.', 'Take care.'],
    friendly: ['See you. Ping me anytime.', 'Later.', 'Catch you next time.'],
    playful: ['All right, go ship something.', 'Bye. May your builds stay green.', 'Later.'],
    'snarky-lite': ['Later. Try not to summon new errors.', 'Bye.', 'Cool. Go refactor something.'],
  },
  compliment: {
    professional: ['Thanks. What is next?', 'Glad it helped. Want to improve it further?', 'Thank you.'],
    friendly: ['Thanks. Want to keep going?', 'Appreciate it. What is next?', 'Nice. Let us keep momentum.'],
    playful: ['Nice. Let us keep rolling.', 'Good energy. What is next?', 'Love it. What do we hit next?'],
    'snarky-lite': ['Compliments noted. What is the next fire?', 'Thanks. Staying useful.', 'Appreciated.'],
  },
  checkin: {
    professional: [
      'How is it going. Anything you want to improve?',
      'Are we on track with your goal?',
      'Continue this task or switch?',
    ],
    friendly: [
      'How is it going? Keep going or pivot?',
      'We good? Anything still weird?',
      'What should we do next?',
      'Sure, we can chat. What is on your mind?',
    ],
    playful: [
      'Status check. Are we winning?',
      'How are we feeling?',
      'Keep grinding or take a quick win lap?',
      'Chat mode on. What are we talking about?',
    ],
    'snarky-lite': [
      'So, did it work?',
      'We still alive over there?',
      'Okay. What is next?',
      'Talk mode or task mode, your call.',
    ],
  },
  unknown: {
    professional: [
      'Got it. How can I help?',
      'Understood. Want to chat or work on a task?',
      'I am here. Tell me what you want to do.',
    ],
    friendly: [
      'I am here with you. We can chat, or we can work on something.',
      'Sure. Want to talk for a minute, or jump into a task?',
      'Yep. Tell me what kind of help you want right now.',
    ],
    playful: [
      'I am here. Want to chat or ship something?',
      'Say the word. We can talk, plan, or execute.',
      'Cool. Chat mode is on unless you want work mode.',
    ],
    'snarky-lite': [
      'Sure. Want conversation or execution?',
      'Got it. Talk mode or work mode?',
      'Fine by me. What are we doing next?',
    ],
  },
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pick<T>(arr: T[], avoid: Set<T>): T {
  const candidates = arr.filter((x) => !avoid.has(x))
  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : arr[Math.floor(Math.random() * arr.length)]
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

export function detectIntent(userMessage: string): SmallTalkIntent {
  const m = normalize(userMessage)
  if (/\b(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/.test(m)) return 'greeting'
  if (/\b(chat|talk|just chat|wanna chat|let'?s chat)\b/.test(m)) return 'checkin'
  if (/\b(thanks|thank you|thx|appreciate it)\b/.test(m)) return 'thanks'
  if (/\b(bye|goodbye|see you|later|cya|good night)\b/.test(m)) return 'goodbye'
  if (/\b(nice|great|awesome|love it|you rock|genius|amazing)\b/.test(m)) return 'compliment'
  if (/\b(how are you|how's it going|hows it going|what's up|whats up)\b/.test(m)) return 'checkin'
  if (/\b(this sucks|wtf|ugh|annoying|stuck|frustrat|angry|mad)\b/.test(m)) return 'frustration'
  return 'unknown'
}

function wantsSeriousMode(userMessage: string): boolean | null {
  const m = normalize(userMessage)
  if (/\b(no small talk|stop small talk|be serious|serious mode)\b/.test(m)) return true
  if (/\b(small talk is fine|be more playful|more personality|joke more)\b/.test(m)) return false
  return null
}

/**
 * Check if the intent represents a small talk interaction
 */
function isSmallTalkIntent(intent: SmallTalkIntent, isTaskContext: boolean): boolean {
  const smallTalkIntents: SmallTalkIntent[] = ['greeting', 'thanks', 'goodbye', 'compliment', 'checkin', 'frustration']
  return smallTalkIntents.includes(intent) || (!isTaskContext && intent === 'unknown')
}

/**
 * Check rate limiting for small talk injection
 */
function checkSmallTalkRateLimit(
  state: UserPersonalityState,
  persona: PersonaConfig,
  now: number
): { ok: boolean; reason: string } {
  const lastAt = state.lastSmallTalkAt ?? 0
  if (now - lastAt < persona.smallTalkCooldownMs) return { ok: false, reason: 'cooldown' }
  if (state.smallTalkCountInLast10Turns >= persona.smallTalkMaxPer10Turns) return { ok: false, reason: 'turn_throttle' }
  return { ok: true, reason: 'ok' }
}

function shouldInjectSmallTalk(args: {
  persona: PersonaConfig
  state: UserPersonalityState
  intent: SmallTalkIntent
  ctx: TurnContext
}): { ok: boolean; reason: string } {
  const { persona, state, intent, ctx } = args
  const now = ctx.now ?? Date.now()

  if (state.seriousMode) return { ok: false, reason: 'serious_mode' }
  if (!isSmallTalkIntent(intent, ctx.isTaskContext)) return { ok: false, reason: 'user_not_smalltalking' }
  if (ctx.isTaskContext && !persona.allowSmallTalkDuringTasks && intent !== 'frustration') {
    return { ok: false, reason: 'task_context' }
  }

  return checkSmallTalkRateLimit(state, persona, now)
}

function updateStateAfterTurn(args: {
  state: UserPersonalityState
  injectedSmallTalk: boolean
  intent: SmallTalkIntent
  generatedText?: string
  ctx: TurnContext
}): UserPersonalityState {
  const { state, injectedSmallTalk, intent, generatedText, ctx } = args
  const now = ctx.now ?? Date.now()
  const nextWindow = (state.turnWindow + 1) % 10
  let smallTalkCount = state.smallTalkCountInLast10Turns
  if (nextWindow === 0) smallTalkCount = 0

  const next: UserPersonalityState = { ...state, turnWindow: nextWindow }
  const pref = wantsSeriousMode(ctx.userMessage)
  if (pref !== null) next.seriousMode = pref

  if (injectedSmallTalk) {
    next.lastSmallTalkAt = now
    next.turnsSinceSmallTalk = 0
    next.smallTalkCountInLast10Turns = clamp(smallTalkCount + 1, 0, 10)
    next.lastIntents = [intent, ...next.lastIntents].slice(0, 8)
    if (generatedText) next.recentPhrases = [generatedText, ...next.recentPhrases].slice(0, 20)
  } else {
    next.turnsSinceSmallTalk = clamp(next.turnsSinceSmallTalk + 1, 0, 999)
    next.smallTalkCountInLast10Turns = smallTalkCount
  }
  return next
}

export async function generatePersonalityReply(args: {
  persona: PersonaConfig
  store: PersonalityStore
  ctx: TurnContext
}): Promise<PersonalityResult> {
  const { persona, store, ctx } = args
  const state = store.get(ctx.userId)
  const intent = detectIntent(ctx.userMessage)

  const gate = shouldInjectSmallTalk({ persona, state, intent, ctx })
  if (!gate.ok) {
    const nextState = updateStateAfterTurn({ state, injectedSmallTalk: false, intent, ctx })
    store.set(ctx.userId, nextState)
    return { shouldSmallTalk: false, intent, meta: { reason: gate.reason } }
  }

  const avoid = new Set<string>([...state.recentPhrases, ...persona.bannedPhrases].slice(0, 30))
  const maxChars = persona.verbosity === 0 ? 120 : persona.verbosity === 1 ? 220 : 360
  const templates = TEMPLATES[intent]?.[persona.tone] ?? TEMPLATES.unknown[persona.tone]
  let text = pick(templates, avoid)

  if (persona.emojiLevel === 0)
    text = text
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  if (text.length > maxChars) text = text.slice(0, maxChars - 1).trimEnd() + '...'

  const nextState = updateStateAfterTurn({ state, injectedSmallTalk: true, intent, generatedText: text, ctx })
  store.set(ctx.userId, nextState)

  return {
    shouldSmallTalk: true,
    intent,
    text,
    meta: { reason: 'generated', usedTemplate: true },
  }
}

export async function generatePersonalityPrefix(args: {
  persona: PersonaConfig
  store: PersonalityStore
  ctx: TurnContext
}): Promise<{ prefix?: string; reason: string }> {
  const { persona, store, ctx } = args
  const state = store.get(ctx.userId)
  if (state.seriousMode) {
    return { reason: 'serious_mode' }
  }

  const lastAt = state.lastSmallTalkAt ?? 0
  const minGapMs = Math.max(90_000, persona.smallTalkCooldownMs)
  if ((ctx.now ?? Date.now()) - lastAt < minGapMs) {
    return { reason: 'cooldown' }
  }

  const microByTone: Record<Tone, string[]> = {
    professional: ['Got it. Here is the clean path.', 'Understood. Next steps:', 'Okay. Let us do this right.'],
    friendly: ['Got you. Let us fix this.', 'Alright, we can do this.', 'Yep. Let us make it work.'],
    playful: ['Alright, let us ship this.', 'Okay, we cook now.', 'Cool. Time to squash this.'],
    'snarky-lite': ['Fine. Let us fix it.', 'Yep. Here we go.', 'Alright. Show me the damage.'],
  }

  const avoid = new Set<string>([...state.recentPhrases, ...persona.bannedPhrases].slice(0, 30))
  let text = pick(microByTone[persona.tone], avoid)
  if (persona.emojiLevel === 0)
    text = text
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  if (text.length > 90) text = text.slice(0, 89).trimEnd() + '...'

  const nextState = updateStateAfterTurn({
    state,
    injectedSmallTalk: true,
    intent: detectIntent(ctx.userMessage),
    generatedText: text,
    ctx,
  })
  store.set(ctx.userId, nextState)
  return { prefix: text, reason: 'generated' }
}

export const DEFAULT_PERSONA: PersonaConfig = {
  name: 'Rina',
  tone: 'friendly',
  emojiLevel: 1,
  humorLevel: 1,
  verbosity: 1,
  smallTalkMaxPer10Turns: 4,
  smallTalkCooldownMs: 5_000,
  allowSmallTalkDuringTasks: false,
  bannedPhrases: ['Great question', 'As an AI language model'],
}
