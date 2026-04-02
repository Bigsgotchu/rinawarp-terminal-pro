export type CenterView = 'execution-trace' | 'runs' | 'marketplace' | 'code' | 'brain' | 'receipt'
export type RightView = 'agent' | 'diagnostics'
export type TabKey = CenterView | RightView | 'settings'
export type DrawerView = Exclude<CenterView | RightView, 'agent'>
export type LicenseTier = 'starter' | 'pro' | 'creator' | 'pioneer' | 'enterprise'

export type ReplyAction = {
  label: string
  className?: string
  tab?: string
  prompt?: string
  executePlan?: string
  executePlanPrompt?: string
  executePlanWorkspaceRoot?: string
  agentTopTab?: string
  capabilityInstall?: string
  capabilityRun?: string
  capabilityActionId?: string
  planUpgrade?: string
  runResume?: string
  runRerun?: string
  runFix?: string
  runDiff?: string
  runCopy?: string
  openRunsPanel?: string
  runReveal?: string
  runArtifacts?: string
}

export type RunArtifactSummary = {
  stdoutChunks: number
  stderrChunks: number
  metaChunks: number
  stdoutPreview: string
  stderrPreview: string
  metaPreview: string
  changedFiles: string[]
  diffHints: string[]
}

export type DeploymentStatus = 'idle' | 'planning' | 'running' | 'deployed' | 'verified' | 'failed' | 'interrupted'
export type DeploymentVerificationState = 'not-run' | 'pending' | 'passed'
export type DeploymentRollbackState = 'unknown' | 'provider-supported' | 'manual' | 'unsupported'
export type DeploymentTargetKind = 'cloudflare' | 'vercel' | 'netlify' | 'docker' | 'vps' | 'unknown' | null

export type DeploymentState = {
  target: DeploymentTargetKind
  detectedTarget: DeploymentTargetKind
  detectedSignals: string[]
  recommendedPackKey: string | null
  targetIdentity: string | null
  targetIdentitySource: 'provider-output' | 'workspace-signal' | 'inferred' | 'unknown'
  targetIdentityEvidence: string[]
  status: DeploymentStatus
  verification: DeploymentVerificationState
  rollback: DeploymentRollbackState
  latestRunId: string | null
  latestReceiptId: string | null
  targetUrl: string | null
  artifact: string | null
  buildId: string | null
  verificationEvidence: string[]
  rollbackEvidence: string[]
  summary: string
  verificationSummary: string
  rollbackSummary: string
  nextActionLabel: string
  updatedAt: string | null
  source: 'none' | 'run' | 'receipt'
}

export type ReplyListItem = {
  title: string
  text?: string
  code?: string
  badge?: string
  strongTitle?: boolean
}

export type StatGridItem = {
  label: string
  value: string
}

export type ReplyCopyBlock = {
  text: string
  tone?: 'default' | 'muted'
  className?: string
}

export type ProofSummaryItem = {
  label: string
  value: string
  emphasis?: 'code' | 'strong'
}

export type ReplyCardKind =
  | 'generic'
  | 'plan'
  | 'capability'
  | 'build-result'
  | 'test-result'
  | 'deploy-result'
  | 'fix-result'
  | 'recovery'
  | 'execution-halt'

export type MessageBlock =
  | { type: 'bubble'; text: string }
  | { type: 'section-label'; text: string }
  | {
      type: 'reply-card'
      kind?: ReplyCardKind
      label: string
      badge?: string
      className?: string
      bodyBlocks?: MessageBlock[]
      actions?: ReplyAction[]
    }
  | { type: 'agent-step'; statusClass: 'start' | 'running' | 'end'; text: string }
  | { type: 'inline-actions'; actions: ReplyAction[] }
  | { type: 'copy'; text: string; tone?: 'default' | 'muted'; className?: string }
  | { type: 'inline-code'; text: string; className?: string }
  | { type: 'reply-list'; items: ReplyListItem[]; emptyText?: string }
  | { type: 'stat-grid'; items: StatGridItem[] }
  | { type: 'proof-summary'; items: ProofSummaryItem[] }

export type ChatMessage = {
  id: string
  role: 'user' | 'rina' | 'system'
  content?: MessageBlock[]
  ts: number
  workspaceKey: string
  runIds?: string[]
}

export type ExecutionTraceBlock = {
  id: string
  cmd?: string
  status: 'running' | 'success' | 'failed' | 'info'
  runId?: string
  exitCode?: number | null
  output: string
  ts: number
}

export type FixStepModel = {
  title: string
  command: string
  cwd: string
  risk: 'safe' | 'moderate' | 'dangerous'
  status?: 'pending' | 'running' | 'done' | 'error'
}

export type FixIssueModel = {
  kind: string
  summary: string
  evidence: string
  proposedFixes?: string[]
}

export type FixNarrationLevel = 'info' | 'progress' | 'success' | 'warning' | 'error'

export type FixNarrationItem = {
  id: string
  title: string
  description?: string
  level: FixNarrationLevel
  timestamp: number
}

export type FixConfidenceLevel = 'high' | 'medium' | 'low'

export type FixConfidenceSignals = {
  stepsSucceeded: number
  stepsFailed: number
  verificationPassed: boolean
  partialVerification: boolean
  highImpactSkipped: number
  errorsDetected: number
}

export type FixConfidenceScore = {
  level: FixConfidenceLevel
  score: number
  reasons: string[]
  signals: FixConfidenceSignals
}

export type FixSummary = {
  title: string
  highlights: string[]
  result: string
  remainingIssues?: string[]
  confidence: string
}

export type FixBlockModel = {
  id: string
  runId: string
  streamId: string
  command: string
  cwd: string
  exitCode?: number | null
  applyRunId?: string
  applyPlanRunId?: string
  status: 'planning' | 'ready' | 'running' | 'done' | 'error'
  phase?: 'detecting' | 'planning' | 'executing' | 'verifying' | 'done' | 'error'
  whatBroke: string
  whySafe: string
  steps: FixStepModel[]
  ts: number
  statusText?: string
  latestOutput?: string
  verificationText?: string
  verificationStatus?: 'pending' | 'passed' | 'failed'
  verificationChecks?: string[]
  issues?: FixIssueModel[]
  narration?: FixNarrationItem[]
  changedFiles?: string[]
  diffHints?: string[]
  confidence?: FixConfidenceScore
  summary?: FixSummary
  explanation?: string
  error?: string
}

export type RunModel = {
  id: string
  sessionId: string
  title: string
  command: string
  cwd: string
  status: 'running' | 'ok' | 'failed' | 'interrupted'
  startedAt: string
  updatedAt: string
  endedAt: string | null
  exitCode?: number | null
  commandCount: number
  failedCount: number
  latestReceiptId?: string
  projectRoot?: string
  source?: string
  platform?: string
  originMessageId?: string
  restored?: boolean
}

export type ReceiptData = {
  id: string
  [key: string]: any
}

export type CapabilityPackModel = {
  key: string
  title: string
  description: string
  category: 'system' | 'deploy' | 'device' | 'security' | 'workspace'
  source: 'builtin' | 'marketplace' | 'installed'
  tier: 'starter' | 'pro' | 'paid'
  installState: 'builtin' | 'available' | 'installed' | 'upgrade-required'
  permissions: Array<'read-only' | 'workspace-write' | 'network' | 'cloud' | 'device'>
  actions: Array<{
    id: string
    label: string
    tool: string
    risk: 'read' | 'safe-write' | 'high-impact'
    proof: Array<'run' | 'receipt' | 'log' | 'artifact' | 'diff'>
    requiresConfirmation?: boolean
  }>
  tags?: string[]
  price?: number
  commands?: string[]
}

export type WorkbenchState = {
  activeTab: TabKey
  activeCenterView: CenterView
  activeRightView: RightView
  ui: {
    expandedRunLinksByMessageId: Record<string, boolean>
    expandedRunOutputByRunId: Record<string, boolean>
    recoveryExpanded: boolean
    showAllRuns: boolean
    scopeRunsToWorkspace: boolean
    openDrawer: DrawerView | null
    statusSummaryText: string | null
  }
  runOutputTailByRunId: Record<string, string>
  runArtifactSummaryByRunId: Record<string, RunArtifactSummary>
  workspaceKey: string
  license: {
    tier: LicenseTier
    lastCheckedAt?: number | null
  }
  chat: ChatMessage[]
  executionTrace: {
    blocks: ExecutionTraceBlock[]
  }
  fixBlocks: FixBlockModel[]
  runs: RunModel[]
  receipt: ReceiptData | null
  deployment: DeploymentState
  code: {
    files: string[]
  }
  diagnostics: {
    mode: string
    toolsCount: number
    agentRunning: boolean
    conversationCount: number
    learnedCommandsCount: number
  }
  analytics: {
    starterIntentCount: number
    inspectorOpenCount: number
    runOutputExpandCount: number
    proofBackedRunCount: number
    lastStarterIntent?: string
    lastInspector?: string
    firstStarterIntentAt?: number
    firstProofBackedRunAt?: number
  }
  brain: {
    stats: {
      total: number
      intent: number
      planning: number
      reasoning: number
      tool: number
      memory: number
      action: number
      result: number
      error: number
    } | null
    events: Array<{
      type: string
      message: string
      progress?: number
    }>
  }
  thinking: {
    active: boolean
    message: string
    stream: string
  }
  runtime: {
    mode: string
    autonomyEnabled: boolean
    autonomyLevel: string
    ipcCanonicalReady: boolean
    rendererCanonicalReady: boolean
  }
  marketplace: {
    loading: boolean
    error?: string
    agents: Array<{
      name: string
      description: string
      author: string
      version: string
      commands: unknown[]
      downloads?: number
      price?: number
      rating?: number | null
    }>
    installed: string[]
  }
  capabilities: {
    loading: boolean
    error?: string
    packs: CapabilityPackModel[]
  }
}

export type WorkbenchAction =
  | { type: 'tab/set'; tab: TabKey }
  | { type: 'view/centerSet'; view: CenterView }
  | { type: 'view/rightSet'; view: RightView }
  | { type: 'ui/toggleRunLinks'; messageId: string; expanded?: boolean }
  | { type: 'ui/toggleRunOutput'; runId: string; expanded?: boolean }
  | { type: 'ui/setRecoveryExpanded'; expanded: boolean }
  | { type: 'ui/setShowAllRuns'; showAllRuns: boolean }
  | { type: 'ui/setScopeRunsToWorkspace'; scopeRunsToWorkspace: boolean }
  | { type: 'ui/openDrawer'; view: DrawerView }
  | { type: 'ui/closeDrawer' }
  | { type: 'ui/setStatusSummary'; text: string | null }
  | { type: 'workspace/set'; workspaceKey: string }
  | { type: 'license/set'; tier: LicenseTier; lastCheckedAt?: number | null }
  | { type: 'chat/add'; msg: ChatMessage }
  | { type: 'chat/removeByPrefix'; prefix: string }
  | { type: 'chat/linkRun'; messageId: string; runId: string }
  | { type: 'executionTrace/blockUpsert'; block: ExecutionTraceBlock }
  | { type: 'executionTrace/appendOutput'; blockId: string; chunk: string }
  | { type: 'fix/upsert'; fix: FixBlockModel }
  | { type: 'runs/set'; runs: WorkbenchState['runs'] }
  | { type: 'runs/upsert'; run: RunModel }
  | { type: 'runs/appendOutputTail'; runId: string; chunk: string }
  | { type: 'runs/setOutputTail'; runId: string; tail: string }
  | { type: 'runs/setArtifactSummary'; runId: string; summary: RunArtifactSummary }
  | { type: 'deployment/set'; deployment: DeploymentState }
  | { type: 'code/setFiles'; files: string[] }
  | {
      type: 'diagnostics/set'
      diagnostics: WorkbenchState['diagnostics']
    }
  | {
      type: 'analytics/track'
      event: 'starter_intent_selected' | 'inspector_opened' | 'run_output_expanded' | 'proof_backed_run_seen'
      label?: string
    }
  | { type: 'brain/setStats'; stats: NonNullable<WorkbenchState['brain']['stats']> }
  | { type: 'brain/addEvent'; event: WorkbenchState['brain']['events'][number] }
  | { type: 'thinking/set'; active: boolean; message: string; stream?: string }
  | { type: 'runtime/set'; runtime: WorkbenchState['runtime'] }
  | { type: 'marketplace/setLoading'; loading: boolean }
  | { type: 'marketplace/setError'; error?: string }
  | { type: 'marketplace/setAgents'; agents: WorkbenchState['marketplace']['agents'] }
  | { type: 'marketplace/setInstalled'; installed: string[] }
  | { type: 'capabilities/setLoading'; loading: boolean }
  | { type: 'capabilities/setError'; error?: string }
  | { type: 'capabilities/setPacks'; packs: CapabilityPackModel[] }
  | { type: 'receipt/set'; receipt: ReceiptData | null }
