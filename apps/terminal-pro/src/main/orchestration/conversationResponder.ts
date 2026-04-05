import { resolveDiagnosticContext, shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import { hasSharedWorkspaceFile, readSharedWorkspaceTextFile } from '../runtime/runtimeAccess.js'
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
    ) return true
    if ((await hasWorkspaceFile(workspaceRoot, 'vercel.json')) || (await hasWorkspaceFile(workspaceRoot, 'netlify.toml'))) return true
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

export async function buildConversationReply(args: BuildConversationReplyArgs): Promise<{ intent: string; message: string }> {
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
          message: "I can run a self-check, but I don't see an active workspace. Which workspace should I inspect?",
        }
      }
      return {
        intent: 'self_check',
        message:
          'I’m checking the current workspace and app state now. I’ll verify workspace, IPC, renderer, recovery, updater, and last-run integrity, then report what needs attention.',
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
        message: `I’ll stay inspect-first here. I can look through ${workspaceLabel || 'the current workspace'}${
          latestRun?.runId ? ' with the latest run proof alongside it' : ''
        } before we change anything.`,
      }
    case 'mixed': {
      const constraintText = Array.isArray(routedTurn.constraints) && routedTurn.constraints.length > 0
        ? ` I’m keeping ${routedTurn.constraints
            .map((constraint) =>
              constraint === 'do_not_touch_tests'
                ? 'tests out of scope'
                : constraint === 'use_pnpm'
                  ? 'pnpm as the package-manager default'
                  : constraint === 'prefer_concise'
                    ? 'the reply concise'
                    : constraint.replace(/_/g, ' ')
            )
            .join(', ')}.`
        : ''
      return {
        intent: 'mixed',
        message: `I can handle that.${constraintText} I’ll explain what I’m seeing, line up the safest execution path, and keep the timeline visible as I go.`,
      }
    }
    case 'follow_up':
      return {
        intent: 'follow_up',
        message: latestRun?.runId
          ? 'I’m treating that as a follow-up to the last run, not an automatic rerun. I can inspect the proof trail first or rerun it on the trusted path when you want.'
          : 'I’m treating that as a follow-up to the last run, but I won’t auto-rerun anything. I can inspect the latest run first or rerun it on the trusted path when you confirm.',
      }
    case 'recovery':
      return {
        intent: 'recovery',
        message: latestRun?.interrupted
          ? 'The latest run looks interrupted. I can inspect the receipt, explain what likely happened, and line up the safest next recovery step before we resume anything.'
          : 'I don’t see an interrupted run yet, so the safest move is to inspect the latest run or the current workspace first.',
      }
    case 'settings':
      return {
        intent: 'settings',
        message:
          'That sounds like a settings change. I can point you to Settings or help inspect what is already configured before we change anything.',
      }
    case 'memory_update':
      return {
        intent: 'memory_update',
        message:
          'I’m treating that as an explicit preference, not a hidden write. If you want it saved, make it owner-visible in Settings > Memory so it stays reviewable.',
      }
    case 'chat':
      return {
        intent: 'chat',
        message: buildChatReply(rawText, latestRun),
      }
    case 'unclear':
      return {
        intent: 'unclear',
        message: `I need one anchor before I act. I can inspect ${workspaceLabel || 'the current workspace'}${
          latestRun?.runId ? ' or the latest run proof' : ''
        }, then line up the safest next step.`,
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
      return 'I’m good. I recovered the last session cleanly, and we can continue from there whenever you want.'
    }
    return 'I’m good. I’m here with you. Want to keep chatting, or should I pick up the workspace from where we left off?'
  }

  if (/\b(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/.test(rawText)) {
    return latestRun?.interrupted
      ? 'Hi. I recovered the last session successfully. Want me to continue where we left off?'
      : 'Hi. I’m here and ready. Want to talk something through or jump into the next task?'
  }

  return 'I’m here and ready. We can talk through the workspace, review what happened last, or line up the next move together.'
}

function buildVerifiedRunSentence(latestRun?: ConversationRunReference | null, rawText = ''): string {
  if (!latestRun?.runId) {
    if (/\b(why|what happened|what broke|what failed)\b/.test(rawText)) {
      return 'I haven’t run anything here yet, so I can’t tell you what broke from a real run. I can inspect the workspace now and tell you the safest next step.'
    }
    return 'I haven’t run anything here yet, but I can inspect the workspace now and tell you what looks safest before we change anything.'
  }
  if (latestRun.interrupted) {
    return 'The last run was interrupted before it finished cleanly. I can walk you through what happened or help you resume from there.'
  }
  if (typeof latestRun.latestExitCode === 'number') {
    return latestRun.latestExitCode === 0
      ? 'The last run finished cleanly. If you want, I can show the details or help you move on to the next step.'
      : 'The last run failed. I can inspect what happened first and then line up the safest fix.'
  }
  return 'The last run is still settling. I can inspect the current state before we say anything stronger.'
}

function buildHelpReply(args: { workspaceLabel?: string; canDeploy: boolean }): string {
  const workspaceText = args.workspaceLabel
    ? `In ${args.workspaceLabel}, I can help with project work, explain runs, inspect receipts, and keep changes grounded in the current workspace.`
    : 'I can help with project work, explain runs, inspect receipts, and stay grounded once you choose a workspace.'
  const deployText = args.canDeploy
    ? 'I can help build, test, and deploy when the project is ready.'
    : 'I can help build and test now, and I can help line up deployment once we confirm the target.'
  return `${workspaceText} ${deployText} I can also scan myself, explain the latest run, and help you choose the safest next step without kicking off extra work just to answer a help question.`
}
