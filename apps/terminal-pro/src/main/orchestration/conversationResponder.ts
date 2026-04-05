import { hasSharedWorkspaceFile, readSharedWorkspaceTextFile } from '../runtime/runtimeAccess.js'
import { resolveDiagnosticContext, shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import type {
  BuildConversationReplyArgs,
  ConversationRunReference,
  RouteConversationTurnArgs,
} from './conversationTypes.js'

async function hasWorkspaceFile(workspaceRoot: string, candidate: string): Promise<boolean> {
  return hasSharedWorkspaceFile(workspaceRoot, candidate)
}

async function readWorkspaceTextFile(workspaceRoot: string, candidate: string): Promise<string | null> {
  return readSharedWorkspaceTextFile(workspaceRoot, candidate)
}

export async function detectDeployCapability(workspaceRoot: string | null): Promise<boolean> {
  if (!workspaceRoot) return false
  if (await hasWorkspaceFile(workspaceRoot, 'package.json')) {
    try {
      const packageJsonText = await readWorkspaceTextFile(workspaceRoot, 'package.json')
      if (packageJsonText) {
        const packageJson = JSON.parse(packageJsonText)
        if (packageJson.scripts && (packageJson.scripts.deploy || packageJson.scripts.publish)) return true
      }
    } catch {}
    if (
      (await hasWorkspaceFile(workspaceRoot, 'electron-builder.yml')) ||
      (await hasWorkspaceFile(workspaceRoot, 'electron-builder.json'))
    )
      return true
    if (
      (await hasWorkspaceFile(workspaceRoot, 'vercel.json')) ||
      (await hasWorkspaceFile(workspaceRoot, 'netlify.toml'))
    )
      return true
  }
  if (await hasWorkspaceFile(workspaceRoot, 'Dockerfile')) return true
  return false
}

export function resolveSelfCheckContext(args: RouteConversationTurnArgs): {
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

export async function buildConversationReply(
  args: BuildConversationReplyArgs
): Promise<{ intent: string; message: string }> {
  const { routedTurn, workspaceLabel, latestRun } = args
  const rawText = normalizeWhitespace(routedTurn.rawText || '').toLowerCase()

  switch (routedTurn.mode) {
    case 'self_check': {
      const ctx = resolveSelfCheckContext({
        rawText: routedTurn.rawText,
        workspaceId: routedTurn.workspaceId,
        latestRun,
      })
      if (shouldAskClarifyingQuestion(ctx)) {
        return {
          intent: 'self_check',
          message: 'I can scan the workspace, but I need to know which one. Which workspace should I check?',
        }
      }
      return {
        intent: 'self_check',
        message: "Scanning now. I'll check the state and let you know what needs attention.",
      }
    }
    case 'question':
      return {
        intent: 'question',
        message: /\b(how are you|how's it going|hows it going|what's up|whats up)\b/.test(rawText)
          ? buildChatReply(rawText, latestRun)
          : buildVerifiedRunSentence(latestRun, rawText),
      }
    case 'help':
      return {
        intent: 'help',
        message: buildHelpReply({
          workspaceLabel,
          canDeploy: await detectDeployCapability(routedTurn.workspaceId || null),
        }),
      }
    case 'inspect':
      return {
        intent: 'inspect',
        message: `I\'ll inspect first. Looking at ${workspaceLabel || 'the workspace'}${
          latestRun?.runId ? ' and the latest run' : ''
        }.`,
      }
    case 'mixed': {
      const constraintText =
        Array.isArray(routedTurn.constraints) && routedTurn.constraints.length > 0
          ? ` I\'ll keep ${routedTurn.constraints
              .map((constraint) =>
                constraint === 'do_not_touch_tests'
                  ? 'tests untouched'
                  : constraint === 'use_pnpm'
                    ? 'pnpm'
                    : constraint === 'prefer_concise'
                      ? 'this short'
                      : constraint.replace(/_/g, ' ')
              )
              .join(', ')}.`
          : ''
      return {
        intent: 'mixed',
        message: `Got it.${constraintText} I\'ll execute and show you what happens.`,
      }
    }
    case 'follow_up':
      return {
        intent: 'follow_up',
        message: latestRun?.runId
          ? 'Following up from the last run. I can inspect what happened or rerun it when you want.'
          : 'Following up from the last run. I can inspect first or rerun it.',
      }
    case 'recovery':
      return {
        intent: 'recovery',
        message: latestRun?.interrupted
          ? 'The last run was interrupted. I can show you what happened and resume from there.'
          : 'I can inspect the last run or the current workspace first.',
      }
    case 'settings':
      return {
        intent: 'settings',
        message: 'I can help you configure settings in the Settings panel.',
      }
    case 'memory_update':
      return {
        intent: 'memory_update',
        message: 'If you want to save a preference, I can store it in Settings > Memory.',
      }
    case 'chat':
      return {
        intent: 'chat',
        message: buildChatReply(rawText, latestRun),
      }
    case 'unclear':
      return {
        intent: 'unclear',
        message: `I need context first. I can inspect ${workspaceLabel || 'the current workspace'}${
          latestRun?.runId ? ' or the latest run' : ''
        }, then line up the next step.`,
      }
    default:
      return {
        intent: routedTurn.mode,
        message: `I understand you want to ${routedTurn.mode}. Let me help with that.`,
      }
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function buildChatReply(rawText: string, latestRun?: ConversationRunReference | null): string {
  if (/\b(how are you|how's it going|hows it going|what's up|whats up)\b/.test(rawText)) {
    if (latestRun?.interrupted) {
      return "I'm good. I recovered your last session. Want to continue from there?"
    }
    return "I'm good. Ready for the next thing."
  }

  if (/\b(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/.test(rawText)) {
    return latestRun?.interrupted ? 'Hi. I recovered your last session. Want to keep going?' : 'Hi. Ready when you are.'
  }

  return "I'm here and ready."
}

function buildVerifiedRunSentence(latestRun?: ConversationRunReference | null, rawText = ''): string {
  if (!latestRun?.runId) {
    if (/\b(why|what happened|what broke|what failed)\b/.test(rawText)) {
      return "Nothing has run yet. I can inspect the workspace now and tell you what's next."
    }
    return 'I can inspect the workspace now.'
  }
  if (latestRun.interrupted) {
    return 'The last run was interrupted. I can show you what happened.'
  }
  if (typeof latestRun.latestExitCode === 'number') {
    return latestRun.latestExitCode === 0
      ? 'The last run finished. I can show the details or move to the next step.'
      : 'The last run failed. I can show you what happened.'
  }
  return "The last run is still settling. I'll check the current state."
}

function buildHelpReply(args: { workspaceLabel?: string; canDeploy: boolean }): string {
  const workspaceText = args.workspaceLabel
    ? `In ${args.workspaceLabel}, I can help with project work, review runs, and keep changes grounded.`
    : 'I can help with project work, review runs, and stay grounded once you choose a workspace.'
  const deployText = args.canDeploy ? 'I can help build, test, deploy.' : 'I can help build and test.'
  return `${workspaceText} ${deployText} I can also scan the workspace or diagnosis issues.`
}
