export type CenterView = 'execution-trace' | 'runs' | 'marketplace' | 'code' | 'brain' | 'settings'
export type RightView = 'agent' | 'diagnostics'
export type TabKey = CenterView | RightView | 'settings'
export type DrawerView = Exclude<CenterView | RightView, 'agent' | 'settings'>
export type LicenseTier = 'starter' | 'pro' | 'creator' | 'pioneer' | 'enterprise'

export type MessageBlock =
  | { type: 'bubble'; text: string }
  | { type: 'reply-card'; label: string; badge?: string; className?: string; bodyHtml: string }
  | { type: 'agent-step'; statusClass: 'start' | 'running' | 'end'; text: string }
  | { type: 'markup'; html: string }

export type ChatMessage = {
  id: string
  role: 'user' | 'rina' | 'system'
  html?: string
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
}

export type FixBlockModel = {
  id: string
  runId: string
  streamId: string
  command: string
  cwd: string
  exitCode?: number | null
  applyRunId?: string
  status: 'planning' | 'ready' | 'running' | 'done' | 'error'
  whatBroke: string
  whySafe: string
  steps: FixStepModel[]
  ts: number
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
  endedAt?: string | null
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
    showAllRuns: boolean
    scopeRunsToWorkspace: boolean
    openDrawer: DrawerView | null
    statusSummaryText: string | null
  }
  runOutputTailByRunId: Record<string, string>
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

type Listener = (state: WorkbenchState) => void

function boundedTail(prev: string, chunk: string, maxChars = 24_000): string {
  const next = prev + chunk
  if (next.length <= maxChars) return next
  return next.slice(next.length - maxChars)
}

export class WorkbenchStore {
  private state: WorkbenchState
  private listeners = new Set<Listener>()

  constructor(initial: WorkbenchState) {
    this.state = initial
  }

  getState(): WorkbenchState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispatch(action: WorkbenchAction): void {
    this.state = reduce(this.state, action)
    for (const listener of this.listeners) listener(this.state)
  }
}

function reduce(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'tab/set':
      return { ...state, activeTab: action.tab }

    case 'view/centerSet':
      return {
        ...state,
        activeCenterView: action.view,
        activeTab: action.view === 'settings' ? 'settings' : 'agent',
        activeRightView: 'agent',
        ui: {
          ...state.ui,
          openDrawer:
            action.view === 'execution-trace' || action.view === 'runs' || action.view === 'marketplace' || action.view === 'code' || action.view === 'brain'
              ? action.view
              : null,
        },
      }

    case 'view/rightSet':
      return {
        ...state,
        activeRightView: action.view,
        activeTab: action.view === 'diagnostics' ? 'agent' : 'agent',
        ui: {
          ...state.ui,
          openDrawer: action.view === 'diagnostics' ? 'diagnostics' : state.ui.openDrawer,
        },
      }

    case 'ui/toggleRunLinks': {
      const prev = state.ui.expandedRunLinksByMessageId[action.messageId] ?? false
      const nextExpanded = typeof action.expanded === 'boolean' ? action.expanded : !prev
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedRunLinksByMessageId: {
            ...state.ui.expandedRunLinksByMessageId,
            [action.messageId]: nextExpanded,
          },
        },
      }
    }

    case 'ui/toggleRunOutput': {
      const prev = state.ui.expandedRunOutputByRunId[action.runId] ?? false
      const nextExpanded = typeof action.expanded === 'boolean' ? action.expanded : !prev
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedRunOutputByRunId: {
            ...state.ui.expandedRunOutputByRunId,
            [action.runId]: nextExpanded,
          },
        },
      }
    }

    case 'ui/setShowAllRuns':
      return {
        ...state,
        ui: {
          ...state.ui,
          showAllRuns: action.showAllRuns,
        },
      }

    case 'ui/setScopeRunsToWorkspace':
      return {
        ...state,
        ui: {
          ...state.ui,
          scopeRunsToWorkspace: action.scopeRunsToWorkspace,
        },
      }

    case 'ui/openDrawer':
      return {
        ...state,
        activeTab: 'agent',
        activeCenterView:
          action.view === 'execution-trace' || action.view === 'runs' || action.view === 'marketplace' || action.view === 'code' || action.view === 'brain'
            ? action.view
            : state.activeCenterView,
        activeRightView: action.view === 'diagnostics' ? 'diagnostics' : 'agent',
        ui: {
          ...state.ui,
          openDrawer: action.view,
        },
      }

    case 'ui/closeDrawer':
      return {
        ...state,
        activeTab: 'agent',
        activeRightView: 'agent',
        ui: {
          ...state.ui,
          openDrawer: null,
        },
      }

    case 'ui/setStatusSummary':
      return {
        ...state,
        ui: {
          ...state.ui,
          statusSummaryText: action.text,
        },
      }

    case 'workspace/set':
      return { ...state, workspaceKey: action.workspaceKey }

    case 'license/set':
      return { ...state, license: { tier: action.tier, lastCheckedAt: action.lastCheckedAt ?? null } }

    case 'chat/add':
      return { ...state, chat: [...state.chat, action.msg].slice(-200) }

    case 'chat/removeByPrefix':
      return {
        ...state,
        chat: state.chat.filter((message) => !message.id.startsWith(action.prefix)),
      }

    case 'chat/linkRun': {
      return {
        ...state,
        chat: state.chat.map((message) =>
          message.id === action.messageId
            ? {
                ...message,
                runIds: [...new Set([...(message.runIds || []), action.runId])],
              }
            : message
        ),
      }
    }

    case 'executionTrace/blockUpsert': {
      const index = state.executionTrace.blocks.findIndex((block) => block.id === action.block.id)
      const blocks = [...state.executionTrace.blocks]
      if (index >= 0) blocks[index] = action.block
      else blocks.push(action.block)
      blocks.sort((a, b) => a.ts - b.ts)
      return {
        ...state,
        executionTrace: { blocks: blocks.slice(-200) },
        runOutputTailByRunId:
          action.block.runId && action.block.output
            ? {
                ...state.runOutputTailByRunId,
                [action.block.runId]: boundedTail(state.runOutputTailByRunId[action.block.runId] || '', action.block.output),
              }
            : state.runOutputTailByRunId,
      }
    }

    case 'executionTrace/appendOutput': {
      let touchedRunId: string | null = null
      const blocks = state.executionTrace.blocks.map((block) => {
        if (block.id !== action.blockId) return block
        touchedRunId = block.runId || null
        return { ...block, output: boundedTail(block.output, action.chunk) }
      })
      return {
        ...state,
        executionTrace: { blocks },
        runOutputTailByRunId:
          touchedRunId
            ? {
                ...state.runOutputTailByRunId,
                [touchedRunId]: boundedTail(state.runOutputTailByRunId[touchedRunId] || '', action.chunk),
              }
            : state.runOutputTailByRunId,
      }
    }

    case 'fix/upsert': {
      const index = state.fixBlocks.findIndex((fix) => fix.id === action.fix.id)
      const fixBlocks = [...state.fixBlocks]
      if (index >= 0) fixBlocks[index] = action.fix
      else fixBlocks.unshift(action.fix)
      return { ...state, fixBlocks: fixBlocks.slice(0, 50) }
    }

    case 'runs/set': {
      const previousById = new Map(state.runs.map((run) => [run.id, run]))
      const incomingRuns = action.runs
        .map((run) => {
          const previous = previousById.get(run.id)
          return previous ? { ...previous, ...run, originMessageId: run.originMessageId || previous.originMessageId } : run
        })
      const missingActiveRuns = state.runs.filter(
        (run) =>
          !incomingRuns.some((incoming) => incoming.id === run.id) &&
          (run.status === 'running' || run.originMessageId || (run.updatedAt && Date.now() - new Date(run.updatedAt).getTime() < 60_000))
      )
      const prioritizedRuns = [...missingActiveRuns, ...incomingRuns].filter(
        (run, index, runs) => runs.findIndex((candidate) => candidate.id === run.id) === index
      )
      const nextRuns = prioritizedRuns.slice(0, 50)
      const nextChat = state.chat.map((message) => {
        const linkedIds = nextRuns
          .filter((run) => run.originMessageId === message.id)
          .map((run) => run.id)
        if (linkedIds.length === 0) return message
        return {
          ...message,
          runIds: [...new Set([...(message.runIds || []), ...linkedIds])],
        }
      })
      return {
        ...state,
        chat: nextChat,
        runs: nextRuns,
      }
    }

    case 'runs/upsert': {
      const index = state.runs.findIndex((run) => run.id === action.run.id)
      const runs = [...state.runs]
      if (index >= 0) runs[index] = { ...runs[index], ...action.run }
      else runs.unshift(action.run)
      return { ...state, runs: runs.slice(0, 50) }
    }

    case 'runs/appendOutputTail':
      return {
        ...state,
        runOutputTailByRunId: {
          ...state.runOutputTailByRunId,
          [action.runId]: boundedTail(state.runOutputTailByRunId[action.runId] || '', action.chunk),
        },
      }

    case 'runs/setOutputTail':
      return {
        ...state,
        runOutputTailByRunId: {
          ...state.runOutputTailByRunId,
          [action.runId]: action.tail,
        },
      }

    case 'code/setFiles':
      return { ...state, code: { files: action.files.slice(0, 200) } }

    case 'diagnostics/set':
      return { ...state, diagnostics: action.diagnostics }

    case 'analytics/track': {
      if (action.event === 'starter_intent_selected') {
        return {
          ...state,
          analytics: {
            ...state.analytics,
            starterIntentCount: state.analytics.starterIntentCount + 1,
            lastStarterIntent: action.label || state.analytics.lastStarterIntent,
            firstStarterIntentAt: state.analytics.firstStarterIntentAt ?? Date.now(),
          },
        }
      }
      if (action.event === 'inspector_opened') {
        return {
          ...state,
          analytics: {
            ...state.analytics,
            inspectorOpenCount: state.analytics.inspectorOpenCount + 1,
            lastInspector: action.label || state.analytics.lastInspector,
          },
        }
      }
      if (action.event === 'run_output_expanded') {
        return {
          ...state,
          analytics: {
            ...state.analytics,
            runOutputExpandCount: state.analytics.runOutputExpandCount + 1,
          },
        }
      }
      return {
        ...state,
        analytics: {
          ...state.analytics,
          proofBackedRunCount: state.analytics.proofBackedRunCount + 1,
          firstProofBackedRunAt: state.analytics.firstProofBackedRunAt ?? Date.now(),
        },
      }
    }

    case 'brain/setStats':
      return { ...state, brain: { ...state.brain, stats: action.stats } }

    case 'brain/addEvent':
      return {
        ...state,
        brain: {
          ...state.brain,
          events: [...state.brain.events, action.event].slice(-12),
        },
      }

    case 'thinking/set':
      return {
        ...state,
        thinking: {
          active: action.active,
          message: action.message,
          stream: action.stream ?? state.thinking.stream,
        },
      }

    case 'runtime/set':
      return { ...state, runtime: action.runtime }

    case 'marketplace/setLoading':
      return { ...state, marketplace: { ...state.marketplace, loading: action.loading } }

    case 'marketplace/setError':
      return { ...state, marketplace: { ...state.marketplace, error: action.error } }

    case 'marketplace/setAgents':
      return {
        ...state,
        marketplace: { ...state.marketplace, agents: action.agents.slice(0, 100), error: undefined },
      }

    case 'marketplace/setInstalled':
      return { ...state, marketplace: { ...state.marketplace, installed: action.installed.slice(0, 200) } }

    case 'capabilities/setLoading':
      return { ...state, capabilities: { ...state.capabilities, loading: action.loading } }

    case 'capabilities/setError':
      return { ...state, capabilities: { ...state.capabilities, error: action.error } }

    case 'capabilities/setPacks':
      return {
        ...state,
        capabilities: {
          ...state.capabilities,
          packs: action.packs.slice(0, 100),
          error: undefined,
        },
      }

    default:
      return state
  }
}
