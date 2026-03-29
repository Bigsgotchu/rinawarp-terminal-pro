import type { RunModel, WorkbenchState } from '../store.js'
import { formatExitState, formatProofBadge, formatRunDate, formatRunDuration, formatRunStatus } from '../renderers/format.js'
import { analyzeFailure, formatFailureNarrative, getRecoveryGuidance } from '../renderers/runIntelligence.js'
import { currentMode } from '../renderers/runtime.js'
import { getWorkspaceContextState, lastRelevantRun } from '../renderers/selectors.js'
import { hasRunProof, isRunSuccessWithProof } from '../proof.js'
import { type StarterPromptViewModel } from './suggestedActionsViewModel.js'

export type AgentHeroViewModel = {
  heading: string
  copy: string
  workspaceDisplay: string
  modeLabel: string
  runLabel: string
  weakWorkspace: boolean
  weakWorkspaceReason?: string
  actions: Array<{ label: string; className: string; dataset: Record<string, string | undefined> }>
}

export type AgentEmptyCardViewModel = {
  sectionKey?: string
  label: string
  title: string
  copy: string
  className?: string
  actions?: Array<{ label: string; className: string; dataset: Record<string, string | undefined> }>
  stats?: Array<{ label: string; value: string }>
  prompts?: StarterPromptViewModel[]
  footerCopy?: string
}

export type RecoveryStripViewModel = {
  restoredCount: number
  summary: string
  expanded: boolean
  compact: boolean
  actions: Array<{ label: string; className: string; dataset: Record<string, string | undefined> }>
}

export type InlineRunViewModel = {
  id: string
  title: string
  command: string
  cwd: string
  status: RunModel['status']
  proofBadge: string
  exitSummary: string
  receiptId: string
  restored: boolean
  expanded: boolean
  hasOutput: boolean
  outputText: string
  outputPlaceholder: string
  banner?: { tone: 'running' | 'attention' | 'verifying'; text: string }
  nextLabel?: string
  topActions: Array<{ label: string; className: string; dataset: Record<string, string | undefined> }>
  bottomActions: Array<{ label: string; className: string; dataset: Record<string, string | undefined> }>
  overflowActions: Array<{ label: string; dataset: Record<string, string | undefined> }>
}

function actionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  return 'rw-inline-action is-subtle'
}

export function buildAgentHeroViewModel(state: WorkbenchState): AgentHeroViewModel {
  const workspaceState = getWorkspaceContextState(state)
  const lastRun = lastRelevantRun(state)
  const restoredRuns = state.runs.filter((run) => run.restored)
  const heading =
    workspaceState.status === 'missing'
      ? 'Start by choosing the project or folder you want Rina to work in.'
      : workspaceState.status === 'weak'
        ? 'This folder may not be the project root yet.'
        : restoredRuns.length > 0
          ? 'Ready when you are. I recovered the thread of what was happening and kept the proof nearby.'
          : lastRun && isRunSuccessWithProof(lastRun)
            ? 'Ready when you are. I know the workspace, and the last verified run ended cleanly.'
            : lastRun
              ? 'Ready when you are. I know where we are, and I can pick up from the last run without pretending.'
              : 'What should we work on?'
  const copy =
    workspaceState.status === 'missing'
      ? 'Choose a workspace first so build, test, fix, and deploy actions happen in the right place from the start.'
      : workspaceState.status === 'weak'
        ? workspaceState.reason
        : restoredRuns.length > 0
          ? `There ${restoredRuns.length === 1 ? 'is' : 'are'} ${restoredRuns.length} recovered run${restoredRuns.length === 1 ? '' : 's'} ready to inspect or resume. Pick a lane and I’ll keep it clean.`
          : lastRun
            ? `I can build, test, deploy, or inspect what just happened in ${workspaceState.displayValue}. No drama, just proof when it counts.`
            : `Build, test, fix, or ship in ${workspaceState.displayValue}.`

  const actions =
    workspaceState.status === 'project'
      ? []
      : [
          { label: 'Choose workspace', className: actionClass('primary'), dataset: { pickWorkspace: 'hero' } },
          {
            label: 'Learn how workspaces work',
            className: actionClass('secondary'),
            dataset: { agentPrompt: 'Explain how workspaces work and how I should choose the right project folder.' },
          },
        ]

  return {
    heading,
    copy,
    workspaceDisplay: workspaceState.displayValue,
    modeLabel: currentMode(state),
    runLabel:
      restoredRuns.length > 0
        ? `Recovery · ${restoredRuns.length} items restored`
        : lastRun
          ? `Last run · ${formatRunStatus(lastRun)}`
          : 'Last run · none yet',
    weakWorkspace: workspaceState.status === 'weak',
    weakWorkspaceReason: workspaceState.reason,
    actions,
  }
}

export function buildWorkspaceSetupCardModel(state: WorkbenchState): AgentEmptyCardViewModel | null {
  const workspaceState = getWorkspaceContextState(state)
  if (workspaceState.status === 'project') return null
  return {
    sectionKey: 'workspace-setup',
    label: workspaceState.status === 'missing' ? 'Choose workspace' : 'Workspace check',
    title:
      workspaceState.status === 'missing'
        ? 'Start by choosing the project or folder you want Rina to work in.'
        : `${workspaceState.displayValue} may not be the right project folder.`,
    copy:
      workspaceState.status === 'missing'
        ? 'Without a real workspace, Rina cannot safely build, test, fix, or deploy for you yet.'
        : workspaceState.reason,
    className: `rw-agent-workspace-setup is-${workspaceState.status}`,
    actions: [
      { label: 'Choose workspace', className: actionClass('primary'), dataset: { pickWorkspace: 'workspace-setup' } },
      { label: 'Open workspace settings', className: actionClass('secondary'), dataset: { openSettingsTab: 'general' } },
      {
        label: 'Learn how workspaces work',
        className: actionClass('quiet'),
        dataset: { agentPrompt: 'Explain how workspaces work and how I should choose the right project folder.' },
      },
    ],
    footerCopy: workspaceState.rootMarkers.length > 0 ? `Detected project markers: ${workspaceState.rootMarkers.join(', ')}` : undefined,
  }
}

export function buildInlineRunViewModel(state: WorkbenchState, run: RunModel): InlineRunViewModel {
  const expanded = state.ui.expandedRunOutputByRunId[run.id] ?? false
  const tail = state.runOutputTailByRunId[run.id] ?? ''
  const hasTail = tail.trim().length > 0
  const artifactSummary = state.runArtifactSummaryByRunId[run.id] || null
  const receiptId = run.latestReceiptId || run.sessionId || run.id
  const recovery = getRecoveryGuidance(run)

  let banner: InlineRunViewModel['banner']
  if (run.status === 'running') {
    banner = { tone: 'running', text: 'Rina is working through this now. I’ll keep this thread updated as output comes in.' }
  } else if (run.status === 'failed' || run.status === 'interrupted') {
    const analysis = analyzeFailure({
      command: run.command || '',
      exitCode: run.exitCode,
      outputText: tail,
      interrupted: run.status === 'interrupted',
      changedFiles: artifactSummary?.changedFiles || [],
      diffHints: artifactSummary?.diffHints || [],
      metaText: artifactSummary?.metaPreview || '',
    })
    banner = { tone: 'attention', text: formatFailureNarrative(analysis) }
  } else if (!hasRunProof(run)) {
    banner = {
      tone: 'verifying',
      text: 'The command finished, but proof is still incomplete. Treat this as verifying until the receipt and exit state agree.',
    }
  }

  return {
    id: run.id,
    title: run.title || 'Run',
    command: run.command || 'No command captured',
    cwd: run.cwd || run.projectRoot || 'No workspace path recorded',
    status: run.status,
    proofBadge: formatProofBadge(run),
    exitSummary: formatExitState(run),
    receiptId,
    restored: Boolean(run.restored),
    expanded,
    hasOutput: hasTail,
    outputText: tail,
    outputPlaceholder: expanded
      ? run.status === 'running'
        ? 'Still waiting on the first output…'
        : 'There is no saved output for this run yet.'
      : run.status === 'running'
        ? 'Live proof is coming in. Expand this when you want to inspect it.'
        : 'Output is tucked away until you want to inspect it.',
    banner,
    nextLabel: run.status === 'failed' || run.status === 'interrupted' ? recovery.bestNextActionLabel : undefined,
    topActions: [
      ...(run.status === 'interrupted'
        ? [{ label: recovery.resumeLabel, className: 'rw-link-btn', dataset: { runResume: run.id } }]
        : []),
      { label: recovery.rerunLabel, className: 'rw-link-btn', dataset: { runRerun: run.id } },
      ...(run.status === 'failed' || run.status === 'interrupted'
        ? [{ label: 'Fix & retry', className: 'rw-link-btn', dataset: { runFix: run.id } }]
        : []),
      { label: expanded ? 'Collapse' : 'Inspect output', className: 'rw-link-btn', dataset: { runToggleOutput: run.id } },
    ],
    bottomActions: [
      { label: 'Copy command', className: actionClass('quiet'), dataset: { runCopy: run.id } },
      ...(run.status === 'interrupted'
        ? [{ label: recovery.resumeLabel, className: actionClass('primary'), dataset: { runResume: run.id } }]
        : []),
      {
        label: recovery.rerunLabel,
        className: actionClass(run.status === 'interrupted' ? 'secondary' : 'primary'),
        dataset: { runRerun: run.id },
      },
      ...(run.status === 'failed' || run.status === 'interrupted'
        ? [{ label: 'Fix & retry', className: actionClass('attention'), dataset: { runFix: run.id } }]
        : []),
      {
        label: expanded ? 'Collapse output' : 'Inspect output',
        className: actionClass('secondary'),
        dataset: { runToggleOutput: run.id },
      },
      { label: recovery.receiptLabel, className: actionClass('secondary'), dataset: { runReveal: receiptId } },
      { label: 'Show diff', className: actionClass('secondary'), dataset: { runDiff: run.id } },
      { label: 'Inspect run', className: actionClass('quiet'), dataset: { openRun: run.id } },
    ],
    overflowActions: [
      { label: 'Open receipt', dataset: { runReveal: receiptId } },
      { label: 'Open runs folder', dataset: { runFolder: '' } },
      { label: 'Show diff', dataset: { runDiff: run.id } },
    ],
  }
}
