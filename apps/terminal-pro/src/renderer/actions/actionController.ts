import {
  type MessageBlock,
  type RunModel,
  type WorkbenchState,
  WorkbenchStore,
} from '../workbench/store.js'
import { createClipboardActionHandler } from './bindClipboardActions.js'
import { createCapabilityActionHandler } from './bindCapabilityActions.js'
import { createFixActionHandler } from './bindFixActions.js'
import { createNavigationActionHandler } from './bindNavigationActions.js'
import { createRunActionHandler } from './bindRunActions.js'

export type WorkbenchActionCleanup = () => void

export type WorkbenchActionControllerDeps<TFixBlockManager extends WorkbenchActionFixBlockManager = WorkbenchActionFixBlockManager> = {
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
  sendPromptToRina: (store: WorkbenchStore, prompt: string) => Promise<void>
  scrollToRun: (runId: string) => void
  scrollToMessage: (messageId: string) => void
  autoApplyFixFromStore: (
    store: WorkbenchStore,
    fixId: string,
    fixBlockManager: TFixBlockManager
  ) => Promise<void>
  runFixStepFromStore: (store: WorkbenchStore, fixId: string, index: number) => Promise<void>
  refreshMarketplace: (store: WorkbenchStore) => Promise<void>
  refreshCapabilityPacks: (store: WorkbenchStore) => Promise<void>
  getAgentWorkspaceRoot: () => string | null
  normalizePlanSteps: (plan: any[]) => any[]
  resolvePlanCapabilityRequirements: (state: WorkbenchState, planSteps: any[]) => any[]
  buildExecutionPlanContent: (
    prompt: string,
    plan: any,
    requirements?: any[]
  ) => MessageBlock[]
  commitStartedExecutionResult: (
    store: WorkbenchStore,
    context: {
      messageId: string
      prompt: string
      workspaceRoot: string
      planSteps: any[]
      title?: string
      command?: string
    },
    result: any
  ) => boolean
  buildExecutionHaltContent: (prompt: string, reason: string) => MessageBlock[]
  buildInterruptedRunRecoveryPrompt: (run: RunModel) => string
  buildTrustSnapshot: (store: WorkbenchStore) => string
  setTransientStatusSummary: (store: WorkbenchStore, message: string) => void
  getWorkspaceKey: () => string
}

export type WorkbenchActionFixBlockManager = {
  promptUpgradeToPro: () => Promise<void>
  ensureProAccess: () => Promise<unknown>
}

export interface ActionsController {
  mount(): void
  unmount(): void
}

export function bindWorkbenchActions<TFixBlockManager extends WorkbenchActionFixBlockManager>(
  root: Document | HTMLElement,
  store: WorkbenchStore,
  fixBlockManager: TFixBlockManager,
  deps: WorkbenchActionControllerDeps<TFixBlockManager>
): WorkbenchActionCleanup {
  const submitComposer = async () => {
    const input = root.querySelector<HTMLTextAreaElement>('#agent-input')
    if (!input) return
    const prompt = input.value.trim()
    if (!prompt) return
    input.value = ''
    await deps.sendPromptToRina(store, prompt)
  }
  const handleNavigationAction = createNavigationActionHandler(store, {
    trackRendererEvent: deps.trackRendererEvent,
    scrollToRun: deps.scrollToRun,
    scrollToMessage: deps.scrollToMessage,
    sendPromptToRina: deps.sendPromptToRina,
  })
  const handleClipboardAction = createClipboardActionHandler(store, {
    buildTrustSnapshot: deps.buildTrustSnapshot,
    setTransientStatusSummary: deps.setTransientStatusSummary,
  })
  const handleRunAction = createRunActionHandler(store, {
    trackRendererEvent: deps.trackRendererEvent,
    sendPromptToRina: deps.sendPromptToRina,
    buildInterruptedRunRecoveryPrompt: deps.buildInterruptedRunRecoveryPrompt,
  })
  const handleFixAction = createFixActionHandler(store, fixBlockManager, {
    autoApplyFixFromStore: deps.autoApplyFixFromStore,
    runFixStepFromStore: deps.runFixStepFromStore,
  })
  const handleCapabilityAction = createCapabilityActionHandler(store, fixBlockManager, {
    refreshMarketplace: deps.refreshMarketplace,
    refreshCapabilityPacks: deps.refreshCapabilityPacks,
    getAgentWorkspaceRoot: deps.getAgentWorkspaceRoot,
    normalizePlanSteps: deps.normalizePlanSteps,
    resolvePlanCapabilityRequirements: deps.resolvePlanCapabilityRequirements,
    buildExecutionPlanContent: deps.buildExecutionPlanContent,
    commitStartedExecutionResult: deps.commitStartedExecutionResult,
    buildExecutionHaltContent: deps.buildExecutionHaltContent,
    setTransientStatusSummary: deps.setTransientStatusSummary,
    getWorkspaceKey: deps.getWorkspaceKey,
  })
  const clickHandlers = [
    handleNavigationAction,
    handleRunAction,
    handleFixAction,
    handleCapabilityAction,
    handleClipboardAction,
  ]

  const onClick = async (event: Event) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (target.closest('#agent-send')) {
      await submitComposer()
      return
    }

    for (const handleClickAction of clickHandlers) {
      if (await handleClickAction(target)) return
    }
  }

  const onKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return
    const target = event.target as HTMLElement | null
    if (!(target instanceof HTMLTextAreaElement)) return
    if (target.id !== 'agent-input') return
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void submitComposer()
  }

  root.addEventListener('click', onClick)
  root.addEventListener('keydown', onKeyDown)
  return () => {
    root.removeEventListener('click', onClick)
    root.removeEventListener('keydown', onKeyDown)
  }
}

export function createActionsController<TFixBlockManager extends WorkbenchActionFixBlockManager>(args: {
  root?: Document | HTMLElement
  store: WorkbenchStore
  fixBlockManager: TFixBlockManager
  deps: WorkbenchActionControllerDeps<TFixBlockManager>
}): ActionsController {
  let cleanup: WorkbenchActionCleanup | null = null

  return {
    mount(): void {
      if (cleanup) return
      cleanup = bindWorkbenchActions(args.root ?? document, args.store, args.fixBlockManager, args.deps)
    },

    unmount(): void {
      cleanup?.()
      cleanup = null
    },
  }
}
