export type ConversationMode =
  | 'chat'
  | 'question'
  | 'inspect'
  | 'execute'
  | 'follow_up'
  | 'recovery'
  | 'settings'
  | 'memory_update'
  | 'unclear'

export type AllowedNextAction = 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'

export type RoutedTurn = {
  rawText: string
  mode: ConversationMode
  confidence: number
  workspaceId?: string
  references: {
    runId?: string
    priorMessageId?: string
    restoredSessionId?: string
  }
  allowedNextAction: AllowedNextAction
  clarification?: {
    required: boolean
    reason?: string
    question?: string
  }
  executionCandidate?: {
    goal: string
    target?: string
    constraints?: string[]
    risk: 'low' | 'medium' | 'high'
  }
}

export type ConversationRunReference = {
  runId?: string
  sessionId?: string
  latestCommand?: string
  latestExitCode?: number | null
  latestReceiptId?: string
  interrupted?: boolean
}

type RouteConversationTurnArgs = {
  rawText: string
  workspaceId?: string
  latestRun?: ConversationRunReference | null
}

type BuildConversationReplyArgs = {
  routedTurn: RoutedTurn
  workspaceLabel?: string
  latestRun?: ConversationRunReference | null
}

const EXECUTION_KEYWORDS = /\b(build|test|tests|deploy|fix|repair|lint|analy[sz]e|diagnos(?:e|tics?))\b/i
const QUESTION_WORDS = /^(why|what|how|did|does|is|are|can|could|would|should)\b/i
const SOCIAL_WORDS = /\b(lol|haha|fair|thanks|thank you|funny|nice|cool|okay|ok)\b/i
const VAGUE_WORK_WORDS = /\b(make this work|make it work|fix whatever is broken|this is broken|what failed|what's wrong|what is wrong|look into this|inspect this|check this)\b/i
const FOLLOW_UP_WORDS = /\b(again|last one|last thing|that run|open that run|other workspace|use the other one|make it like before)\b/i
const MEMORY_WORDS =
  /\b(remember i like|remember that i|be more concise|be less cheerful|stop being so cheerful|i like short answers|i prefer short answers|prefer concise|remember i prefer)\b/i
const SETTINGS_WORDS = /\b(settings|preferences|memory panel|theme|density|owner settings)\b/i
const RECOVERY_WORDS = /\b(resume|recover|restored|interrupted|pick up where we left off)\b/i
const OFF_BOUNDARY_WORDS = /\b(poem|horoscope|astrology|tell me a bedtime story)\b/i

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function classifyExecutionGoal(rawText: string): RoutedTurn['executionCandidate'] | null {
  const normalized = rawText.toLowerCase()
  if (/\bbuild\b/.test(normalized)) return { goal: 'build', risk: 'low' }
  if (/\btests?\b/.test(normalized)) return { goal: 'test', risk: 'low' }
  if (/\bdeploy\b/.test(normalized)) return { goal: 'deploy', risk: 'medium' }
  if (/\bfix|repair\b/.test(normalized)) return { goal: 'fix', risk: 'medium' }
  if (/\bdiagnos(?:e|tics?)\b/.test(normalized)) return { goal: 'diagnose', risk: 'low' }
  if (/\blint|analy[sz]e\b/.test(normalized)) return { goal: 'inspect', risk: 'low' }
  return null
}

export function routeConversationTurn(args: RouteConversationTurnArgs): RoutedTurn {
  const rawText = normalizeWhitespace(String(args.rawText || ''))
  const lower = rawText.toLowerCase()
  const latestRun = args.latestRun || null

  if (!rawText) {
    return {
      rawText,
      mode: 'unclear',
      confidence: 0.2,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'clarify',
      clarification: {
        required: true,
        reason: 'empty_turn',
        question: 'What do you want me to look at: the current workspace or the last run?',
      },
    }
  }

  if (MEMORY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'memory_update',
      confidence: 0.9,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
    }
  }

  if (SETTINGS_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'settings',
      confidence: 0.85,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
    }
  }

  if (RECOVERY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'recovery',
      confidence: 0.85,
      workspaceId: args.workspaceId,
      references: {
        runId: latestRun?.runId,
        restoredSessionId: latestRun?.interrupted ? latestRun.sessionId : undefined,
      },
      allowedNextAction: latestRun?.interrupted ? 'reply_only' : 'inspect',
    }
  }

  if (FOLLOW_UP_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'follow_up',
      confidence: 0.8,
      workspaceId: args.workspaceId,
      references: {
        runId: latestRun?.runId,
        restoredSessionId: latestRun?.interrupted ? latestRun.sessionId : undefined,
      },
      allowedNextAction: latestRun?.runId ? 'reply_only' : 'clarify',
      clarification: latestRun?.runId
        ? undefined
        : {
            required: true,
            reason: 'missing_reference_anchor',
            question: 'Do you mean the current workspace or the last run?',
          },
    }
  }

  if (OFF_BOUNDARY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'chat',
      confidence: 0.8,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
    }
  }

  if ((QUESTION_WORDS.test(lower) || /\bbe honest\b/.test(lower)) && EXECUTION_KEYWORDS.test(lower)) {
    return {
      rawText,
      mode: 'question',
      confidence: 0.9,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: 'reply_only',
      executionCandidate: classifyExecutionGoal(rawText) || undefined,
    }
  }

  if (VAGUE_WORK_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'inspect',
      confidence: 0.82,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: args.workspaceId ? 'inspect' : 'clarify',
      clarification: args.workspaceId
        ? undefined
        : {
            required: true,
            reason: 'missing_workspace_anchor',
            question: 'Do you want me to inspect the current workspace or the last run?',
          },
    }
  }

  if (SOCIAL_WORDS.test(lower) || /\bwhat do you think we should do next\b/.test(lower)) {
    return {
      rawText,
      mode: 'chat',
      confidence: 0.82,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: 'reply_only',
    }
  }

  if (QUESTION_WORDS.test(lower) || /\bexplain\b/.test(lower)) {
    return {
      rawText,
      mode: 'question',
      confidence: 0.76,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: 'reply_only',
      executionCandidate: classifyExecutionGoal(rawText) || undefined,
    }
  }

  if (EXECUTION_KEYWORDS.test(lower)) {
    const executionCandidate = classifyExecutionGoal(rawText)
    return {
      rawText,
      mode: 'execute',
      confidence: 0.86,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: executionCandidate?.risk === 'medium' ? 'plan' : 'execute',
      executionCandidate: executionCandidate || undefined,
    }
  }

  return {
    rawText,
    mode: 'unclear',
    confidence: 0.45,
    workspaceId: args.workspaceId,
    references: { runId: latestRun?.runId },
    allowedNextAction: args.workspaceId ? 'inspect' : 'clarify',
    clarification: args.workspaceId
      ? undefined
      : {
          required: true,
          reason: 'missing_anchor',
          question: 'I can help with that, but I need one anchor: do you mean the current workspace or the last run?',
        },
  }
}

function formatLatestRunLabel(latestRun?: ConversationRunReference | null): string {
  const command = normalizeWhitespace(String(latestRun?.latestCommand || ''))
  return command || 'the last run in this workspace'
}

function buildVerifiedRunSentence(latestRun?: ConversationRunReference | null): string {
  if (!latestRun?.runId) {
    return "I don't have a verified run to anchor that to yet."
  }
  if (latestRun.interrupted) {
    return `The latest run was interrupted before it finished cleanly. I can inspect it or help you resume from there.`
  }
  if (typeof latestRun.latestExitCode === 'number') {
    return latestRun.latestExitCode === 0
      ? `The last verified run finished cleanly. I can show you the proof trail or rerun it on the trusted path if you want.`
      : `The last verified run failed. I can inspect the failure first and then line up the safest next fix.`
  }
  return `The latest run is still proof-pending. I can inspect the current state before we say anything stronger.`
}

export function buildConversationReply(args: BuildConversationReplyArgs): { intent: string; message: string } {
  const workspaceLabel = args.workspaceLabel || 'this workspace'
  const latestRunLabel = formatLatestRunLabel(args.latestRun)
  const { routedTurn } = args

  switch (routedTurn.mode) {
    case 'chat':
      if (OFF_BOUNDARY_WORDS.test(routedTurn.rawText.toLowerCase())) {
        return {
          intent: 'chat',
          message: `I can keep the tone human, but I am at my best around real work in ${workspaceLabel}. If you want, I can inspect the project, the latest run, or the next safe move.`,
        }
      }
      return {
        intent: 'chat',
        message: `Fair. I'm still anchored to ${workspaceLabel}. If you want a next move, I can inspect ${latestRunLabel} or line up the safest step from here.`,
      }
    case 'question':
      return {
        intent: 'question',
        message: buildVerifiedRunSentence(args.latestRun),
      }
    case 'inspect':
      return {
        intent: 'inspect',
        message: `I can inspect ${workspaceLabel} first and use ${latestRunLabel} as the starting clue, then I'll suggest the safest next step without guessing.`,
      }
    case 'follow_up':
      return {
        intent: 'follow_up',
        message: args.latestRun?.runId
          ? `I'm treating that as ${latestRunLabel}. If you want, I can rerun it on the trusted path or open the proof trail first.`
          : `I can help with that, but I need one anchor first: do you mean the current workspace or the last run?`,
      }
    case 'recovery':
      return {
        intent: 'recovery',
        message: args.latestRun?.interrupted
          ? `I still have the interrupted run in view. I can inspect the recovered state first, or you can ask me to resume ${latestRunLabel} when you're ready.`
          : `I don't have an active interrupted run to resume right now, but I can inspect the latest receipts and show you what is still relevant.`,
      }
    case 'settings':
      return {
        intent: 'settings',
        message: 'I can help with preferences and memory, but I keep those changes explicit and owner-visible. Open Settings and I will keep the path clean from there.',
      }
    case 'memory_update':
      return {
        intent: 'memory_update',
        message:
          "That sounds like an explicit preference. In this phase I keep memory changes owner-visible, so save it in Settings > Memory and I'll use it consistently from there.",
      }
    case 'unclear':
      return {
        intent: 'unclear',
        message:
          routedTurn.clarification?.question ||
          `I can help with that, but I need one anchor: do you mean ${workspaceLabel} or ${latestRunLabel}?`,
      }
    default:
      return {
        intent: 'chat',
        message: `I can help from ${workspaceLabel}. If you want, I can inspect the current state first and keep the next step grounded in proof.`,
      }
  }
}
