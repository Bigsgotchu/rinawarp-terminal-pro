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
        message: buildVerifiedRunSentence(latestRun),
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
        message: 'Hi. I’m here and ready. I can talk through the workspace, explain the latest run, or help line up the next move.',
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

function buildVerifiedRunSentence(latestRun?: ConversationRunReference | null): string {
  if (!latestRun?.runId) {
    return "I don't have proof yet because no verified run exists. If you want, I can inspect the code directly in the workspace or line up a plan without pretending a run already happened."
  }
  if (latestRun.interrupted) {
    return 'The latest run was interrupted before it finished cleanly. I can inspect it or help you resume from there.'
  }
  if (typeof latestRun.latestExitCode === 'number') {
    return latestRun.latestExitCode === 0
      ? 'The last verified run finished cleanly. I can show you the proof trail or rerun it on the trusted path if you want.'
      : 'The last verified run failed. I can inspect the failure first and then line up the safest next fix.'
  }
  return 'The latest run is still proof-pending. I can inspect the current state before we say anything stronger.'
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
