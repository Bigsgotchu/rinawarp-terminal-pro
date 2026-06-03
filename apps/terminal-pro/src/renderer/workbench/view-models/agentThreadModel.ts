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
  title: string
  badge: string
  meta?: string
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
  cognitionLines: Array<{ label: string; eventType: string }>
  memoryNote?: string
  verificationSummary?: string
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
      ? 'Ask Rina to inspect, explain, plan, or build.'
      : workspaceState.status === 'weak'
        ? 'This folder may not be the project root yet.'
        : restoredRuns.length > 0
          ? 'Previous work is ready to review.'
          : lastRun && isRunSuccessWithProof(lastRun)
            ? 'Ready. Workspace is known and the last verified run ended cleanly.'
            : lastRun
              ? 'Ready. I can pick up from the last run without guessing.'
              : 'Open a project and start with a build, test, or fix plan.'
  const copy =
    workspaceState.status === 'missing'
      ? 'Open a project, then run one focused action.'
      : workspaceState.status === 'weak'
        ? workspaceState.reason
        : restoredRuns.length > 0
          ? 'Want to continue where you left off?'
          : lastRun
            ? `Build, test, plan, or inspect what happened in ${workspaceState.displayValue}.`
            : `Build, test, inspect, or plan a safe fix in ${workspaceState.displayValue}.`

  const actions =
    workspaceState.status === 'project'
      ? [
          {
            label: 'Plan a fix',
            className: actionClass('primary'),
            dataset: {
              agentPrompt: 'Diagnose the project and propose a safe fix plan. Do not edit files without approval.',
              intentKey: 'fix',
              tierHint: 'Review first',
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
    modeLabel: 'Agent Shell',
    runLabel:
      restoredRuns.length > 0
        ? 'Recovered work is ready'
        : lastRun
          ? `Last run · ${formatRunStatus(lastRun)}`
          : 'Ready for the first fix',
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
      label: 'Project ready',
      title: 'Ask Rina what you want done.',
      copy: 'Rina can inspect, plan, run commands, propose safe fixes, verify results, and attach proof.',
      className: 'rw-agent-onboarding-card',
      actions: [],
      stats: undefined,
      footerCopy: `Current project: ${workspaceState.displayValue}`,
    }
  }
  return {
    sectionKey: 'workspace-setup',
    label: workspaceState.status === 'missing' ? 'Welcome' : 'Workspace check',
    title:
      workspaceState.status === 'missing'
        ? 'Choose a project folder and tell Rina what you want done.'
        : 'Choose the project root first.',
    copy:
      workspaceState.status === 'missing'
        ? 'Rina can inspect, plan, run commands, propose safe fixes, verify results, and attach proof.'
        : workspaceState.reason,
    className: `rw-agent-workspace-setup rw-agent-onboarding-card is-${workspaceState.status}`,
    actions: [
      { label: 'Choose project', className: actionClass('primary'), dataset: { pickWorkspace: 'workspace-setup' } },
    ],
    stats: undefined,
    footerCopy: workspaceState.rootMarkers.length > 0 ? `Detected project markers: ${workspaceState.rootMarkers.join(', ')}` : 'After choosing a project, ask Rina to build, test, inspect, explain, or plan a fix.',
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
  const canonicalBlock = state.runBlocksById[run.id]
  const persistedReceipt = state.executionReceiptsByRunId[run.id]
  const liveCognition = state.liveCognitionByRunId[run.id] || []
  const cognitionLines = [
    ...(canonicalBlock?.timeline
      .filter((event) => event.cognitionLabel)
      .map((event) => ({ label: String(event.cognitionLabel), eventType: String(event.type) })) || []),
    ...liveCognition.map((line) => ({ label: line.label, eventType: line.eventType })),
  ].filter((line, index, lines) => lines.findIndex((entry) => entry.eventType === line.eventType && entry.label === line.label) === index)

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
      text: 'The command finished, but proof is still incomplete. Treat this as verifying until evidence and exit state agree.',
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
        ? 'Running. Output will appear here.'
        : 'No output saved for this run yet.'
      : run.status === 'running'
        ? 'Running. Expand to see output when available.'
        : 'Output is hidden until you inspect it.',
    cognitionLines,
    memoryNote: canonicalBlock?.memoryNote,
    verificationSummary: persistedReceipt?.verificationResults.join(' · '),
    banner,
    nextLabel: run.status === 'failed' || run.status === 'interrupted' ? recovery.bestNextActionLabel : undefined,
    topActions: [
      { label: 'View logs', className: 'rw-link-btn', dataset: { runToggleOutput: run.id } },
      { label: 'View proof', className: 'rw-link-btn', dataset: { runReveal: receiptId } },
      ...(run.status === 'interrupted'
        ? [{ label: recovery.resumeLabel, className: 'rw-link-btn', dataset: { runResume: run.id } }]
        : []),
      { label: 'Replay run', className: 'rw-link-btn', dataset: { runRerun: run.id } },
      ...(run.status === 'failed' || run.status === 'interrupted'
        ? [{ label: 'Plan fix & retry', className: 'rw-link-btn', dataset: { runFix: run.id } }]
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
        ? [{ label: 'Plan fix & retry', className: actionClass('attention'), dataset: { runFix: run.id } }]
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
      { label: 'View diff', dataset: { runDiff: run.id } },
      { label: 'View proof', dataset: { runReveal: receiptId } },
      { label: 'View logs', dataset: { runToggleOutput: run.id } },
      { label: 'Open workspace folder', dataset: { runFolder: run.projectRoot || run.cwd || '' } },
      { label: 'Replay run', dataset: { runRerun: run.id } },
    ],
  }
}
