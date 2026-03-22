export type {
  CapabilityPackModel,
  CenterView,
  ChatMessage,
  DrawerView,
  ExecutionTraceBlock,
  FixBlockModel,
  FixStepModel,
  LicenseTier,
  MessageBlock,
  ProofSummaryItem,
  ReplyAction,
  ReplyCardKind,
  ReplyCopyBlock,
  ReplyListItem,
  RightView,
  RunArtifactSummary,
  RunModel,
  StatGridItem,
  TabKey,
  WorkbenchAction,
  WorkbenchState,
} from './types.js'

import type { WorkbenchAction, WorkbenchState } from './types.js'

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
        activeTab: 'agent',
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
        activeTab: 'agent',
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

    case 'ui/setRecoveryExpanded':
      return {
        ...state,
        ui: {
          ...state.ui,
          recoveryExpanded: action.expanded,
        },
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

    case 'chat/linkRun':
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
      const incomingRuns = action.runs.map((run) => {
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
        const linkedIds = nextRuns.filter((run) => run.originMessageId === message.id).map((run) => run.id)
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

    case 'runs/setArtifactSummary':
      return {
        ...state,
        runArtifactSummaryByRunId: {
          ...state.runArtifactSummaryByRunId,
          [action.runId]: action.summary,
        },
      }

    case 'code/setFiles':
      return { ...state, code: { files: action.files.slice(0, 200) } }

    case 'diagnostics/set':
      return { ...state, diagnostics: action.diagnostics }

    case 'analytics/track':
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
