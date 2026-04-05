import type { RunModel, WorkbenchState } from '../store.js'
import { formatExitState, formatProofBadge, formatRunDate, formatRunDuration, formatRunStatus } from '../renderers/format.js'
import { analyzeFailure, formatFailureNarrative, getRecoveryGuidance } from '../renderers/runIntelligence.js'
import { currentMode } from '../renderers/runtime.js'
import { getWorkspaceContextState, lastRelevantRun } from '../renderers/selectors.js'
import { hasRunProof, isRunSuccessWithProof } from '../proof.js'
import { getRetentionSummary } from '../../services/retentionLoop.js'
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
  listItems?: Array<{ label: string; value: string; tone?: 'success' | 'warning' | 'default' }>
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
      ? 'Fix your broken project automatically.'
      : workspaceState.status === 'weak'
        ? 'This folder may not be the project root yet.'
        : restoredRuns.length > 0
          ? 'Ready when you are. I recovered the thread of what was happening and kept the proof nearby.'
          : lastRun && isRunSuccessWithProof(lastRun)
            ? 'Ready when you are. I know the workspace, and the last verified run ended cleanly.'
            : lastRun
              ? 'Ready when you are. I know where we are, and I can pick up from the last run without pretending.'
              : 'Open a project and click Fix Project.'
  const copy =
    workspaceState.status === 'missing'
      ? 'Open a project and click Fix Project. RinaWarp reads the code, repairs the safest issues first, and verifies the result.'
      : workspaceState.status === 'weak'
        ? workspaceState.reason
        : restoredRuns.length > 0
          ? `There ${restoredRuns.length === 1 ? 'is' : 'are'} ${restoredRuns.length} recovered run${restoredRuns.length === 1 ? '' : 's'} ready to inspect or resume. Pick a lane and I’ll keep it clean.`
          : lastRun
            ? `I can build, test, deploy, or inspect what just happened in ${workspaceState.displayValue}. No drama, just proof when it counts.`
            : `Build, test, fix, or ship in ${workspaceState.displayValue}.`

  const actions =
    workspaceState.status === 'project'
      ? [
          {
            label: 'Fix Project',
            className: actionClass('primary'),
            dataset: {
              agentPrompt: 'Figure out what is broken and fix the safest parts first.',
              intentKey: 'fix',
              tierHint: 'Start here',
              tierTone: 'available',
            },
          },
        ]
      : [
          { label: 'Open Project', className: actionClass('primary'), dataset: { pickWorkspace: 'hero' } },
          { label: 'Try Demo Project', className: actionClass('secondary'), dataset: { loadDemoProject: 'hero' } },
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
  if (workspaceState.status === 'project') {
    return {
      sectionKey: 'guided-fix',
      label: 'Start here',
      title: 'Click Fix Project to repair this project.',
      copy: 'No setup tour. No settings maze. Start the guided repair and watch RinaWarp analyze, fix, and verify the project in one flow.',
      className: 'rw-agent-onboarding-card',
      actions: [
        {
          label: 'Fix Project',
          className: actionClass('primary'),
          dataset: {
            agentPrompt: 'Figure out what is broken and fix the safest parts first.',
            intentKey: 'fix',
            tierHint: 'Guided fix',
            tierTone: 'available',
          },
        },
        {
          label: 'Check project health',
          className: actionClass('secondary'),
          dataset: {
            agentPrompt: 'Check this project health. Find outdated dependencies, configuration risks, and the safest next fixes without changing files yet.',
            healthCheck: 'guided-fix',
          },
        },
        { label: 'Open another project', className: actionClass('secondary'), dataset: { pickWorkspace: 'guided-fix' } },
      ],
      stats: [
        { label: '1', value: 'Open project' },
        { label: '2', value: 'Click Fix Project' },
        { label: '3', value: 'Watch it verify' },
      ],
      footerCopy: `Current project: ${workspaceState.displayValue}`,
    }
  }
  return {
    sectionKey: 'workspace-setup',
    label: workspaceState.status === 'missing' ? 'First launch' : 'Workspace check',
    title:
      workspaceState.status === 'missing'
        ? 'Fix your broken project automatically.'
        : `${workspaceState.displayValue} may not be the right project folder.`,
    copy:
      workspaceState.status === 'missing'
        ? 'Open your own project or try a demo project. The fastest path to understanding RinaWarp is watching one successful fix.'
        : workspaceState.reason,
    className: `rw-agent-workspace-setup rw-agent-onboarding-card is-${workspaceState.status}`,
    actions: [
      { label: 'Open Project', className: actionClass('primary'), dataset: { pickWorkspace: 'workspace-setup' } },
      { label: 'Try Demo Project', className: actionClass('secondary'), dataset: { loadDemoProject: 'workspace-setup' } },
    ],
    stats:
      workspaceState.status === 'missing'
        ? [
            { label: '30 sec', value: 'First fix target' },
            { label: 'Live', value: 'Execution proof' },
            { label: 'Verified', value: 'Success summary' },
          ]
        : undefined,
    footerCopy: workspaceState.rootMarkers.length > 0 ? `Detected project markers: ${workspaceState.rootMarkers.join(', ')}` : 'You can switch projects later. The goal is just to get to the first successful fix quickly.',
  }
}

export function buildRetentionLoopCardModel(state: WorkbenchState): AgentEmptyCardViewModel | null {
  const workspaceState = getWorkspaceContextState(state)
  const retention = getRetentionSummary(state.workspaceKey)
  if (retention.trackedProjects === 0 && workspaceState.status !== 'project') return null

  return {
    sectionKey: 'retention-loop',
    label: 'Come back here first',
    title:
      workspaceState.status === 'project'
        ? 'Keep this project healthy between fixes.'
        : 'Recent projects and proof stay ready for the next breakage.',
    copy:
      workspaceState.status === 'project'
        ? 'Run a quick health check before things drift. The best habit is opening RinaWarp before a small issue becomes a broken build.'
        : 'RinaWarp remembers what you fixed, what looked healthy, and where to jump back in when something breaks again.',
    className: 'rw-agent-retention-card',
    actions:
      workspaceState.status === 'project'
        ? [
            {
              label: 'Check my project health',
              className: actionClass('primary'),
              dataset: {
                agentPrompt: 'Check this project health. Find outdated dependencies, configuration risks, and the safest next fixes without changing files yet.',
                healthCheck: 'retention-card',
              },
            },
            { label: 'Review runs', className: actionClass('secondary'), dataset: { tab: 'runs' } },
          ]
        : [{ label: 'Open project', className: actionClass('primary'), dataset: { pickWorkspace: 'retention-card' } }],
    stats: [
      { label: `${retention.totalMinutesSaved} min`, value: 'Estimated time saved' },
      { label: String(retention.totalSuccessfulFixes), value: 'Verified fixes' },
      { label: String(retention.trackedProjects), value: 'Projects remembered' },
    ],
    listItems: retention.recentProjects.map((project) => ({
      label: project.name,
      value: project.active ? `${project.statusLabel} · current project` : project.statusLabel,
      tone: project.statusTone,
    })),
    footerCopy:
      workspaceState.status === 'project'
        ? 'Open app, check health, fix fast, move on. That is the loop.'
        : 'Recent projects appear here automatically after you open or fix them.',
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
