import { shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import {
  buildConversationReply as buildConversationReplyImpl,
  detectDeployCapability,
  resolveSelfCheckContext,
} from './conversationResponder.js'
import type {
  BuildConversationReplyArgs,
  ConversationContext,
  ConversationRunIntent,
  ConversationOutcome,
  ReplyMode,
  RouteConversationTurnArgs,
  RoutedTurn,
  Tone,
  TurnType,
} from './conversationTypes.js'

export type { AllowedNextAction, BuildConversationReplyArgs, ConversationMode, ConversationRunReference, RouteConversationTurnArgs, RoutedTurn } from './conversationTypes.js'

export async function buildConversationReply(args: BuildConversationReplyArgs): Promise<{ intent: string; message: string }> {
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
const MIXED_ACTION_WORDS = /\b(and explain|explain what happened|tell me what happened|what happened|what broke|why it broke|why it failed)\b/i
const TEST_BOUNDARY_WORDS = /\b(don't touch tests|do not touch tests|don't edit tests|do not edit tests|without touching tests|without editing tests)\b/i
const PACKAGE_MANAGER_WORDS = /\b(use pnpm|prefer pnpm|use npm|prefer npm|use yarn|prefer yarn|use bun|prefer bun)\b/i
const VERBOSITY_WORDS = /\b(keep responses short|keep it short|be concise|prefer concise|short answers)\b/i

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

function extractConstraints(rawText: string): string[] {
  const normalized = rawText.toLowerCase()
  const constraints = new Set<string>()
  if (TEST_BOUNDARY_WORDS.test(normalized)) constraints.add('do_not_touch_tests')
  if (VERBOSITY_WORDS.test(normalized)) constraints.add('prefer_concise')
  if (PACKAGE_MANAGER_WORDS.test(normalized)) {
    if (normalized.includes('pnpm')) constraints.add('use_pnpm')
    if (/\buse npm\b|\bprefer npm\b/.test(normalized)) constraints.add('use_npm')
    if (normalized.includes('yarn')) constraints.add('use_yarn')
    if (normalized.includes('bun')) constraints.add('use_bun')
  }
  return Array.from(constraints)
}

function classifyTurnType(rawText: string, lower: string, latestRun?: RouteConversationTurnArgs['latestRun'] | null): TurnType {
  if (SELF_CHECK_TRIGGERS.test(rawText)) return 'diagnose'
  if (!rawText) return 'clarify_needed'
  if (isGreetingTurn(rawText)) return 'greeting'
  if (HELP_WORDS.test(lower)) return 'help'
  if (RECOVERY_WORDS.test(lower) || FOLLOW_UP_WORDS.test(lower)) return 'follow_up'
  if (MEMORY_WORDS.test(lower) || SETTINGS_WORDS.test(lower)) return 'clarify_needed'
  if (/\b(stuck|frustrated|annoyed|why are you not helping|this is useless|this sucks)\b/i.test(lower)) return 'frustration'
  if (QUESTION_WORDS.test(lower) || /\bexplain\b/.test(lower)) return 'explain'
  if (EXECUTION_KEYWORDS.test(lower)) return 'action'
  if (latestRun?.runId && SOCIAL_WORDS.test(lower)) return 'follow_up'
  return 'clarify_needed'
}

function classifyLatestIntent(latestRun?: RouteConversationTurnArgs['latestRun'] | null): ConversationRunIntent {
  const command = String(latestRun?.latestCommand || '').toLowerCase()
  if (!command) return latestRun?.runId ? 'unknown' : 'unknown'
  if (/\bself-check\b/.test(command)) return 'self_check'
  if (/\bdeploy\b/.test(command)) return 'deploy'
  if (/\btest/.test(command)) return 'test'
  if (/\bbuild\b/.test(command)) return 'build'
  if (/\bfix|repair\b/.test(command)) return 'fix'
  if (/\binspect|analy[sz]e|lint\b/.test(command)) return 'inspect'
  return 'command'
}

function classifyLatestOutcome(latestRun?: RouteConversationTurnArgs['latestRun'] | null): ConversationOutcome {
  if (!latestRun?.runId) return 'none'
  if (latestRun.interrupted) return 'interrupted'
  if (typeof latestRun.latestExitCode === 'number') return latestRun.latestExitCode === 0 ? 'succeeded' : 'failed'
  return 'unknown'
}

function buildConversationContext(args: RouteConversationTurnArgs): ConversationContext {
  return {
    workspaceRoot: args.workspaceId || null,
    latestRunId: args.latestRun?.runId || null,
    latestReceiptId: args.latestRun?.latestReceiptId || null,
    latestRecoverySessionId: args.latestRun?.interrupted ? args.latestRun?.sessionId || null : null,
    latestIntent: classifyLatestIntent(args.latestRun),
    latestOutcome: classifyLatestOutcome(args.latestRun),
    latestActionSummary: args.latestRun?.latestCommand || null,
    hasVerifiedRun: Boolean(args.latestRun?.runId),
    hasAnyAnchor: Boolean(args.workspaceId || args.latestRun?.runId),
  }
}

function buildReplyPlan(args: {
  turnType: TurnType
  mode: ReplyMode
  workspaceId?: string
  latestRun?: RouteConversationTurnArgs['latestRun'] | null
  shouldStartRun: boolean
  tone?: Tone
}) {
  return {
    turnType: args.turnType,
    anchor: {
      workspaceRoot: args.workspaceId || null,
      runId: args.latestRun?.runId || null,
      receiptId: args.latestRun?.latestReceiptId || null,
    },
    mode: args.mode,
    tone: args.tone || 'normal',
    shouldStartRun: args.shouldStartRun,
  }
}

export function routeConversationTurn(args: RouteConversationTurnArgs): RoutedTurn {
  const rawText = normalizeWhitespace(String(args.rawText || ''))
  const conversationalText = stripConversationalPrefix(rawText)
  const lower = conversationalText.toLowerCase()
  const latestRun = args.latestRun || null
  const context = buildConversationContext(args)
  const turnType = classifyTurnType(conversationalText || rawText, lower, latestRun)
  const constraints = extractConstraints(conversationalText || rawText)
  const executionCandidate = classifyExecutionGoal(conversationalText || rawText)

  if (EXECUTION_KEYWORDS.test(lower) && MIXED_ACTION_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'mixed',
      turnType: 'action',
      confidence: 0.9,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: executionCandidate?.risk === 'medium' ? 'plan' : 'execute',
      requiresAction: true,
      userGoal: conversationalText || rawText,
      constraints,
      executionCandidate: executionCandidate || undefined,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'action',
        mode: executionCandidate?.risk === 'medium' ? 'plan' : 'run',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: executionCandidate?.risk !== 'medium',
        tone: 'supportive',
      }),
    }
  }

  if (SELF_CHECK_TRIGGERS.test(conversationalText)) {
    const ctx = resolveSelfCheckContext(args)
    if (shouldAskClarifyingQuestion(ctx)) {
      return {
        rawText,
        mode: 'self_check',
        turnType: 'diagnose',
        confidence: 1.0,
        workspaceId: args.workspaceId,
        references: {},
        allowedNextAction: 'clarify',
        requiresAction: false,
        constraints,
        clarification: {
          required: true,
          reason: 'no_context',
          question: "I can run a self-check, but I don't see an active workspace. Which workspace should I inspect?",
        },
        context,
        replyPlan: buildReplyPlan({
          turnType: 'diagnose',
          mode: 'ask_once',
          workspaceId: args.workspaceId,
          latestRun,
          shouldStartRun: false,
          tone: 'supportive',
        }),
      }
    }
    return {
      rawText,
      mode: 'self_check',
      turnType: 'diagnose',
      confidence: 1.0,
      workspaceId: args.workspaceId,
      references: { runId: ctx.lastRunId || undefined, receiptId: latestRun?.latestReceiptId || undefined },
      allowedNextAction: 'execute',
      requiresAction: true,
      userGoal: conversationalText || rawText,
      constraints,
      executionCandidate: { goal: 'self-check', risk: 'low' as const },
      context,
      replyPlan: buildReplyPlan({
        turnType: 'diagnose',
        mode: 'run',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: true,
      }),
    }
  }

  if (!rawText) {
    return {
      rawText,
      mode: 'unclear',
      turnType: 'clarify_needed',
      confidence: 0.2,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'clarify',
      requiresAction: false,
      constraints,
      clarification: {
        required: true,
          reason: 'empty_turn',
          question: 'What do you want me to look at: the current workspace or the last run?',
        },
      context,
      replyPlan: buildReplyPlan({
        turnType: 'clarify_needed',
        mode: 'ask_once',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (isGreetingTurn(rawText) || isGreetingTurn(conversationalText)) {
    return {
      rawText,
      mode: 'chat',
      turnType: 'greeting',
      confidence: 0.95,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'greeting',
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (HELP_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'help',
      turnType: 'help',
      confidence: 0.96,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'help',
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (MEMORY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'memory_update',
      turnType,
      confidence: 0.9,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType,
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (SETTINGS_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'settings',
      turnType,
      confidence: 0.85,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType,
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (RECOVERY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'recovery',
      turnType: 'follow_up',
      confidence: 0.85,
      workspaceId: args.workspaceId,
      references: {
        runId: latestRun?.runId,
        receiptId: latestRun?.latestReceiptId,
        restoredSessionId: latestRun?.interrupted ? latestRun.sessionId : undefined,
      },
      allowedNextAction: latestRun?.interrupted ? 'reply_only' : 'inspect',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'follow_up',
        mode: latestRun?.interrupted ? 'explain_verified' : 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
        tone: latestRun?.interrupted ? 'supportive' : 'normal',
      }),
    }
  }

  if (FOLLOW_UP_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'follow_up',
      turnType: 'follow_up',
      confidence: 0.8,
      workspaceId: args.workspaceId,
      references: {
        runId: latestRun?.runId,
        receiptId: latestRun?.latestReceiptId,
        restoredSessionId: latestRun?.interrupted ? latestRun.sessionId : undefined,
      },
      allowedNextAction: latestRun?.runId ? 'reply_only' : 'clarify',
      requiresAction: false,
      constraints,
      clarification: latestRun?.runId
        ? undefined
        : {
            required: true,
            reason: 'missing_reference_anchor',
            question: 'Do you mean the current workspace or the last run?',
          },
      context,
      replyPlan: buildReplyPlan({
        turnType: 'follow_up',
        mode: latestRun?.runId ? 'reply_only' : 'ask_once',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (OFF_BOUNDARY_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'chat',
      turnType: 'clarify_needed',
      confidence: 0.8,
      workspaceId: args.workspaceId,
      references: {},
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'clarify_needed',
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if ((QUESTION_WORDS.test(lower) || /\bbe honest\b/.test(lower)) && EXECUTION_KEYWORDS.test(lower)) {
    return {
      rawText,
      mode: 'question',
      turnType: 'explain',
      confidence: 0.9,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      executionCandidate: executionCandidate || undefined,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'explain',
        mode: 'explain_verified',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (VAGUE_WORK_WORDS.test(lower)) {
    return {
      rawText,
      mode: 'inspect',
      turnType: 'clarify_needed',
      confidence: 0.82,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: args.workspaceId ? 'inspect' : 'clarify',
      requiresAction: false,
      constraints,
      clarification: args.workspaceId
        ? undefined
        : {
            required: true,
            reason: 'missing_workspace_anchor',
            question: 'Do you want me to inspect the current workspace or the last run?',
          },
      context,
      replyPlan: buildReplyPlan({
        turnType: 'clarify_needed',
        mode: args.workspaceId ? 'reply_only' : 'ask_once',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
      }),
    }
  }

  if (SOCIAL_WORDS.test(lower) || /\bwhat do you think we should do next\b/.test(lower)) {
    return {
      rawText,
      mode: 'chat',
      turnType: latestRun?.runId ? 'follow_up' : 'greeting',
      confidence: 0.82,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      context,
      replyPlan: buildReplyPlan({
        turnType: latestRun?.runId ? 'follow_up' : 'greeting',
        mode: 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
        tone: latestRun?.runId ? 'supportive' : 'normal',
      }),
    }
  }

  if (QUESTION_WORDS.test(lower) || /\bexplain\b/.test(lower)) {
    return {
      rawText,
      mode: 'question',
      turnType: turnType === 'frustration' ? 'frustration' : 'explain',
      confidence: 0.76,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: 'reply_only',
      requiresAction: false,
      constraints,
      executionCandidate: executionCandidate || undefined,
      context,
      replyPlan: buildReplyPlan({
        turnType: turnType === 'frustration' ? 'frustration' : 'explain',
        mode: latestRun?.runId ? 'explain_verified' : 'reply_only',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: false,
        tone: turnType === 'frustration' ? 'supportive' : 'normal',
      }),
    }
  }

  if (EXECUTION_KEYWORDS.test(lower)) {
    if (executionCandidate?.goal === 'deploy_project' && !detectDeployCapability(args.workspaceId || null)) {
      return {
        rawText,
        mode: 'execute',
        turnType: 'action',
        confidence: 0.86,
        workspaceId: args.workspaceId,
        references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
        allowedNextAction: 'plan',
        requiresAction: true,
        userGoal: conversationalText || rawText,
        constraints,
        executionCandidate: {
          ...executionCandidate,
          constraints: ['deployment_target_required', ...constraints],
        },
        context,
        replyPlan: buildReplyPlan({
          turnType: 'action',
          mode: 'plan',
          workspaceId: args.workspaceId,
          latestRun,
          shouldStartRun: false,
        }),
      }
    }
    return {
      rawText,
      mode: 'execute',
      turnType: 'action',
      confidence: 0.86,
      workspaceId: args.workspaceId,
      references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
      allowedNextAction: executionCandidate?.risk === 'medium' ? 'plan' : 'execute',
      requiresAction: true,
      userGoal: conversationalText || rawText,
      constraints,
      executionCandidate: executionCandidate || undefined,
      context,
      replyPlan: buildReplyPlan({
        turnType: 'action',
        mode: executionCandidate?.risk === 'medium' ? 'plan' : 'run',
        workspaceId: args.workspaceId,
        latestRun,
        shouldStartRun: executionCandidate?.risk !== 'medium',
      }),
    }
  }

  return {
    rawText,
    mode: 'unclear',
    turnType: 'clarify_needed',
    confidence: 0.45,
    workspaceId: args.workspaceId,
    references: { runId: latestRun?.runId, receiptId: latestRun?.latestReceiptId },
    allowedNextAction: args.workspaceId ? 'inspect' : 'clarify',
    requiresAction: false,
    constraints,
    clarification: args.workspaceId
      ? undefined
      : {
          required: true,
          reason: 'missing_anchor',
          question: 'I can help with that, but I need one anchor: do you mean the current workspace or the last run?',
        },
    context,
    replyPlan: buildReplyPlan({
      turnType: 'clarify_needed',
      mode: args.workspaceId ? 'reply_only' : 'ask_once',
      workspaceId: args.workspaceId,
      latestRun,
      shouldStartRun: false,
    }),
  }
}
