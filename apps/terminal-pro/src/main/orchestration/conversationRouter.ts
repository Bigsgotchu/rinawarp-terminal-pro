import { shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import {
  buildConversationReply as buildConversationReplyImpl,
  detectDeployCapability,
  resolveSelfCheckContext,
} from './conversationResponder.js'
import type { BuildConversationReplyArgs, RouteConversationTurnArgs, RoutedTurn } from './conversationTypes.js'

export type { AllowedNextAction, BuildConversationReplyArgs, ConversationMode, ConversationRunReference, RouteConversationTurnArgs, RoutedTurn } from './conversationTypes.js'

export function buildConversationReply(args: BuildConversationReplyArgs): { intent: string; message: string } {
  return buildConversationReplyImpl(args)
}

const EXECUTION_KEYWORDS = /\b(build|test|tests|deploy|fix|repair|lint|analy[sz]e|diagnos(?:e|tics?))\b/i
const SELF_CHECK_TRIGGERS = /\b(scan yourself|check yourself|what needs fixed|diagnose the app|inspect current state|check the workbench|why are you not helping|what is broken right now)\b/i
const HELP_WORDS =
  /\b(what can u do|what can you do|what do you do|help me|help\b|what are your capabilities|what can rina do|show capabilities)\b/i
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

function stripAssistantPrefix(value: string): string {
  return value.replace(/^rina[\s,:-]*/i, '').trim()
}

function stripConversationalPrefix(value: string): string {
  return value
    .replace(/^(?:hey|hi|hello|yo|sup)[\s,!.-]*/i, '')
    .replace(/^rina[\s,:!-]*/i, '')
    .trim()
}

function isGreetingTurn(rawText: string): boolean {
  const normalized = stripAssistantPrefix(normalizeWhitespace(rawText).toLowerCase())
  if (!normalized) return false
  return /^(?:hey|hi|hello|yo|sup)(?:\s+(?:there|rina))?[!.?]*$/.test(normalized)
}

function classifyExecutionGoal(rawText: string): RoutedTurn['executionCandidate'] | null {
  const normalized = rawText.toLowerCase()
  if (/\bfix|repair\b/.test(normalized)) return { goal: 'fix', risk: 'medium' }
  if (/\bbuild\b/.test(normalized)) return { goal: 'build_project', risk: 'low' }
  if (/\btests?\b/.test(normalized)) return { goal: 'run_tests', risk: 'low' }
  if (/\bdeploy\b/.test(normalized)) return { goal: 'deploy_project', risk: 'medium' }
  if (/\bdiagnos(?:e|tics?)\b/.test(normalized)) return { goal: 'diagnose', risk: 'low' }
  if (/\blint|analy[sz]e\b/.test(normalized)) return { goal: 'inspect', risk: 'low' }
  return null
}

export function routeConversationTurn(args: RouteConversationTurnArgs): RoutedTurn {
  const rawText = normalizeWhitespace(String(args.rawText || ''))
  const conversationalText = stripConversationalPrefix(rawText)
  const lower = conversationalText.toLowerCase()
  const latestRun = args.latestRun || null

  if (SELF_CHECK_TRIGGERS.test(conversationalText)) {
    const ctx = resolveSelfCheckContext(args)
    if (shouldAskClarifyingQuestion(ctx)) {
      return {
        rawText,
        mode: 'self_check',
        confidence: 1.0,
        workspaceId: args.workspaceId,
        references: {},
        allowedNextAction: 'clarify',
        clarification: {
          required: true,
          reason: 'no_context',
          question: "I can run a self-check, but I don't see an active workspace. Which workspace should I inspect?",
        },
      }
    }
    return {
      rawText,
      mode: 'self_check',
      confidence: 1.0,
      workspaceId: args.workspaceId,
      references: { runId: ctx.lastRunId || undefined },
      allowedNextAction: 'execute',
      executionCandidate: { goal: 'self-check', risk: 'low' as const },
    }
  }

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

  if (isGreetingTurn(rawText) || isGreetingTurn(conversationalText)) {
    return {
      rawText,
      mode: 'chat',
      confidence: 0.95,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: 'reply_only',
    }
  }

  if (HELP_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'help',
      confidence: 0.96,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId },
      allowedNextAction: 'reply_only',
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
    const executionCandidate = classifyExecutionGoal(conversationalText || rawText)
    if (executionCandidate?.goal === 'deploy_project' && !detectDeployCapability(args.workspaceId || null)) {
      return {
        rawText,
        mode: 'execute',
        confidence: 0.86,
        workspaceId: args.workspaceId,
        references: { runId: latestRun?.runId },
        allowedNextAction: 'plan',
        executionCandidate: {
          ...executionCandidate,
          constraints: ['deployment_target_required'],
        },
      }
    }
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
