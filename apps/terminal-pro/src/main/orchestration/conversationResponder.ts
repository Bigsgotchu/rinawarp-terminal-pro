import { hasSharedWorkspaceFile, readSharedWorkspaceTextFile } from '../runtime/runtimeAccess.js'
import { resolveDiagnosticContext, shouldAskClarifyingQuestion } from '../utils/diagnosticContext.js'
import { buildWorkspaceKnowledgeInspection } from '../memory/workspaceKnowledge.js'
import type {
  BuildConversationReplyArgs,
  ConversationRunReference,
  RouteConversationTurnArgs,
  WorkspaceKnowledgeInspectionSnapshot,
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
  const { routedTurn, workspaceLabel, latestRun, workspaceKnowledge } = args
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
        message: isGeneralQuestion(rawText)
          ? buildGeneralQuestionReply(rawText, latestRun)
          : buildWorkspaceResponse(rawText, latestRun, workspaceKnowledge),
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
    case 'follow_up':
      return {
        intent: 'follow_up',
        message: buildWorkspaceResponse(rawText, latestRun, workspaceKnowledge),
      }
    case 'recovery':
      return {
        intent: 'recovery',
        message: buildActionResponse(rawText, latestRun),
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
        message: routedTurn.mode === 'execute' ? buildActionResponse(rawText, latestRun) : `I understand you want to ${routedTurn.mode}. Let me help with that.`,
      }
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isGeneralQuestion(rawText: string): boolean {
  if (!rawText) return false
  if (/\b(how are you|how's it going|hows it going|what's up|whats up)\b/.test(rawText)) return true
  if (/\b(what knowledge do you have|what do you know|who are you|what are you|tell me about yourself)\b/.test(rawText)) {
    return !/\b(project|workspace|repo|repository|codebase|run|receipt|files?|logs?|task|history|last run|changed|modified|what happened|what failed|what broke)\b/.test(rawText)
  }
  return false
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

function buildGeneralQuestionReply(rawText: string, latestRun?: ConversationRunReference | null): string {
  if (/\b(what knowledge do you have|what do you know|who are you|what are you|tell me about yourself)\b/.test(rawText)) {
    return 'I have general coding and reasoning knowledge, plus whatever is visible in this workspace. I do not automatically know uninspected files or hidden run details.'
  }
  return buildChatReply(rawText, latestRun)
}

function isWorkspaceKnowledgeQuestion(rawText: string): boolean {
  return (
    /\b(what knowledge do you have|what do you know|what do you know about this project|what do you know about the project)\b/.test(rawText) &&
    /\b(project|workspace|repo|repository|codebase)\b/.test(rawText)
  )
}

function buildWorkspaceResponse(
  rawText: string,
  latestRun?: ConversationRunReference | null,
  workspaceKnowledge?: WorkspaceKnowledgeInspectionSnapshot | null
): string {
  if (isWorkspaceKnowledgeQuestion(rawText)) {
    if (workspaceKnowledge) return buildWorkspaceKnowledgeInspection(workspaceKnowledge)
    return `Workspace Knowledge

Architecture
- None

Dependencies
- None

Conventions
- None

Preferences
- None

Recurring Failures
- None

Runtime Facts
- None

Confidence
- 0 high
- 0 medium
- 0 low`
  }

  const known: string[] = []
  const unknown: string[] = []

  if (latestRun?.runId) {
    known.push(`Last run ID is ${latestRun.runId}`)
    if (latestRun.interrupted) {
      known.push('The last run was interrupted')
    } else if (typeof latestRun.latestExitCode === 'number') {
      known.push(latestRun.latestExitCode === 0 ? 'Last run finished successfully' : 'Last run failed')
    }
    if (latestRun.latestReceiptId) {
      known.push('A Proof reference exists for the run')
    }
  } else {
    known.push('No verified run is available yet')
  }

  if (/\b(why|what happened|what failed|what broke|last run|changed)\b/.test(rawText)) {
    unknown.push('Exact root cause and stack trace details')
    if (!latestRun?.latestReceiptId) unknown.push('Proof-level execution details')
  } else {
    unknown.push('Current workspace state beyond visible run metadata')
  }

  const nextMove = latestRun?.latestReceiptId
    ? 'Open the latest Proof first, then inspect logs for the exact failure path.'
    : latestRun?.runId
      ? 'Inspect the latest run logs to confirm the failure cause and next fix.'
      : 'Run an inspect pass on the workspace to establish a verified baseline.'

  return `What I can see:
- ${known.join('\n- ')}

What I haven't verified yet:
- ${unknown.join('\n- ')}

Best next move:
- ${nextMove}`
}

function buildActionResponse(rawText: string, latestRun?: ConversationRunReference | null): string {
  const verificationResponse = buildVerificationActionResponse(rawText)
  if (verificationResponse) return verificationResponse

  const resumeIntent = /\b(resume|continue|pick up where we left off)\b/.test(rawText)
  const rerunIntent = /\b(rerun|run again|retry)\b/.test(rawText)
  const receiptIntent = /\b(open receipt|show receipt|receipt|open proof|show proof|proof)\b/.test(rawText)

  if (receiptIntent) {
    return `Action:
- Open Proof

Risk:
- Low risk; read-only verification of prior actions

Recommendation:
- Open the latest Proof first to verify what already ran before taking any new action.`
  }

  if (rerunIntent) {
    return `Action:
- Rerun previous task

Risk:
- Rerunning may duplicate work or side effects

Recommendation:
- Check the latest Proof first; rerun only after confirming duplicate effects are acceptable.`
  }

  if (resumeIntent || latestRun?.interrupted) {
    return `Action:
- Resume previous task

Risk:
- May repeat steps if earlier execution had side effects

Recommendation:
- Resume if the task was local and idempotent; otherwise check the Proof first.`
  }

  return `Action:
- Perform requested workspace action

Risk:
- May change workspace or repeat prior operations depending on command scope

Recommendation:
- Start with inspection or Proof review, then execute the smallest safe next step.`
}

function buildVerificationActionResponse(rawText: string): string | null {
  const normalized = rawText.toLowerCase()
  if (!/\b(build|test|tests|lint|typecheck|type check|tsc)\b/.test(normalized)) return null
  const action = /\b(typecheck|type check|tsc)\b/.test(normalized)
    ? 'run the typecheck verification'
    : /\blint\b/.test(normalized)
      ? 'run the lint verification'
      : /\btests?\b/.test(normalized) && !/\bbuild\b/.test(normalized)
        ? 'run the test verification'
        : 'build the selected workspace'
  return `Understanding
- I'll ${action} and capture the output.

Plan
1. Inspect package scripts
2. Detect the package manager
3. Run the matching verification command
4. Capture stdout, stderr, and exit code
5. Summarize what failed or passed
6. Create Proof for the run`
}

function buildHelpReply(args: { workspaceLabel?: string; canDeploy: boolean }): string {
  const workspaceText = args.workspaceLabel
    ? `In ${args.workspaceLabel}, I can help with project work, review runs, and keep changes grounded.`
    : 'I can help with project work, review runs, and stay grounded once you choose a workspace.'
  const deployText = args.canDeploy ? 'I can help build, test, deploy.' : 'I can help build and test.'
  return `${workspaceText} ${deployText} I can also scan the workspace or diagnosis issues.`
}
