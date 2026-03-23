import { resolveDiagnosticContext, shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import * as fs from 'fs'
import * as path from 'path'

function detectDeployCapability(workspaceRoot: string | null): boolean {
  if (!workspaceRoot) return false
  const has = (p: string) => fs.existsSync(path.join(workspaceRoot, p))
  if (has('package.json')) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'))
      if (packageJson.scripts && (packageJson.scripts.deploy || packageJson.scripts.publish)) return true
    } catch {}
    if (has('electron-builder.yml') || has('electron-builder.json')) return true
    if (has('vercel.json') || has('netlify.toml')) return true
  }
  if (has('Dockerfile')) return true
  return false
}

export type ConversationMode =
  | 'chat'
  | 'help'
  | 'question'
  | 'inspect'
  | 'execute'
  | 'self_check'
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

export function buildConversationReply(args: BuildConversationReplyArgs): { intent: string; message: string } {
  const { routedTurn, workspaceLabel, latestRun } = args

  switch (routedTurn.mode) {
    case 'self_check':
      const ctx = resolveSelfCheckContext({ rawText: routedTurn.rawText, workspaceId: routedTurn.workspaceId, latestRun: latestRun })
      if (shouldAskClarifyingQuestion(ctx)) {
        return {
          intent: 'self_check',
          message: "I can run a self-check, but I don't see an active workspace. Which workspace should I inspect?",
        }
      }
      return {
        intent: 'self_check',
        message: `I’m checking the current workspace and app state now. I’ll verify workspace, IPC, renderer, recovery, updater, and last-run integrity, then report what needs attention.`,
      }
    case 'question':
      return {
        intent: 'question',
        message: buildVerifiedRunSentence(latestRun),
      }
    case 'help':
      return {
        intent: 'help',
        message: buildHelpReply({ workspaceLabel, canDeploy: detectDeployCapability(routedTurn.workspaceId || null) }),
      }
    case 'inspect':
      return {
        intent: 'inspect',
        message: `I’ll stay inspect-first here. I can look through ${workspaceLabel || 'the current workspace'}${latestRun?.runId ? ' with the latest run proof alongside it' : ''} before we change anything.`,
      }
    case 'follow_up':
      return {
        intent: 'follow_up',
        message: latestRun?.runId
          ? `I’m treating that as a follow-up to the last run, not an automatic rerun. I can inspect the proof trail first or rerun it on the trusted path when you want.`
          : `I’m treating that as a follow-up to the last run, but I won’t auto-rerun anything. I can inspect the latest run first or rerun it on the trusted path when you confirm.`,
      }
    case 'recovery':
      return {
        intent: 'recovery',
        message: latestRun?.interrupted
          ? `The latest run looks interrupted. I can inspect the receipt, explain what likely happened, and line up the safest next recovery step before we resume anything.`
          : `I don’t see an interrupted run yet, so the safest move is to inspect the latest run or the current workspace first.`,
      }
    case 'settings':
      return {
        intent: 'settings',
        message: `That sounds like a settings change. I can point you to Settings or help inspect what is already configured before we change anything.`,
      }
    case 'memory_update':
      return {
        intent: 'memory_update',
        message: `I’m treating that as an explicit preference, not a hidden write. If you want it saved, make it owner-visible in Settings > Memory so it stays reviewable.`,
      }
    case 'chat':
      return {
        intent: 'chat',
        message: `Hi. I’m here and ready. I can talk through the workspace, explain the latest run, or help line up the next move.`,
      }
    case 'unclear':
      return {
        intent: 'unclear',
        message: `I need one anchor before I act. I can inspect ${workspaceLabel || 'the current workspace'}${latestRun?.runId ? ' or the latest run proof' : ''}, then line up the safest next step.`,
      }
    default:
      return {
        intent: routedTurn.mode,
        message: `I understand you want to ${routedTurn.mode}. Let me help with that.`,
      }
  }
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

/**
 * Resolves self-check context from routing args (no full WorkbenchState available).
 */
function resolveSelfCheckContext(args: RouteConversationTurnArgs): {
  workspaceRoot: string | null
  sessionId: string | null
  lastRunId: string | null
} {
  return resolveDiagnosticContext({
    workspaceRoot: args.workspaceId || null,
    sessionId: args.latestRun?.sessionId || null,
    lastRunId: args.latestRun?.runId || null,
  })
}

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

function formatLatestRunLabel(latestRun?: ConversationRunReference | null): string {
  const command = normalizeWhitespace(String(latestRun?.latestCommand || ''))
  return command || 'the last run in this workspace'
}

function buildVerifiedRunSentence(latestRun?: ConversationRunReference | null): string {
  if (!latestRun?.runId) {
    return "I don't have proof yet. If you want, I can inspect the workspace or line up a plan without pretending a run already happened."
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

function buildHelpReply(args: { workspaceLabel?: string; canDeploy: boolean }): string {
  const workspaceText = args.workspaceLabel
    ? `In ${args.workspaceLabel}, I can help with project work, explain runs, inspect receipts, and keep changes grounded in the current workspace.`
    : `I can help with project work, explain runs, inspect receipts, and stay grounded once you choose a workspace.`
  const deployText = args.canDeploy
    ? `I can help build, test, and deploy when the project is ready.`
    : `I can help build and test now, and I can help line up deployment once we confirm the target.`
  return `${workspaceText} ${deployText} I can also scan myself, explain the latest run, and help you choose the safest next step without kicking off extra work just to answer a help question.`
}
