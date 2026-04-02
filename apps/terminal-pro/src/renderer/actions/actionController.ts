import {
  type MessageBlock,
  type RunModel,
  type WorkbenchState,
  WorkbenchStore,
} from '../workbench/store.js'
import { createClipboardActionHandler } from './bindClipboardActions.js'
import { createCapabilityActionHandler } from './bindCapabilityActions.js'
import { createUserTurnSubmitter, type UserTurnSource } from './conversationOwner.js'
import { createFixActionHandler } from './bindFixActions.js'
import { createNavigationActionHandler } from './bindNavigationActions.js'
import { createRunActionHandler } from './bindRunActions.js'

export type WorkbenchActionCleanup = () => void

export type WorkbenchActionControllerDeps<TFixBlockManager extends WorkbenchActionFixBlockManager = WorkbenchActionFixBlockManager> = {
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
  sendPromptToRina: (store: WorkbenchStore, prompt: string) => Promise<void>
  startFixProjectFlow: (
    store: WorkbenchStore,
    args: {
      workspaceRoot: string
      workspaceKey: string
      mountPendingFixBlock: (projectRoot: string) => string
      mountFixBlock: (result: any, projectRoot: string, fixId?: string) => string
    }
  ) => Promise<boolean>
  mountPendingFixProjectBlock: (projectRoot: string) => string
  mountFixProjectBlock: (result: any, projectRoot: string, fixId?: string) => string
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
    requirements?: any[],
    options?: { introText?: string; reviewOnly?: boolean; planActionPrompt?: string; workspaceRoot?: string }
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
  const submitUserTurn = createUserTurnSubmitter(store, {
    sendPromptToRina: deps.sendPromptToRina,
    trackRendererEvent: deps.trackRendererEvent,
  })

  const submitComposer = async (source: UserTurnSource) => {
    const input = root.querySelector<HTMLTextAreaElement>('#agent-input')
    if (!input) return
    const prompt = input.value.trim()
    if (!prompt) return
    const submitted = await submitUserTurn(prompt, source)
    if (submitted) {
      input.value = ''
    }
  }
  const handleNavigationAction = createNavigationActionHandler(store, {
    trackRendererEvent: deps.trackRendererEvent,
    scrollToRun: deps.scrollToRun,
    scrollToMessage: deps.scrollToMessage,
    submitUserTurn,
    startFixProjectFlow: deps.startFixProjectFlow,
    mountPendingFixProjectBlock: deps.mountPendingFixProjectBlock,
    mountFixProjectBlock: deps.mountFixProjectBlock,
  })
  const handleClipboardAction = createClipboardActionHandler(store, {
    buildTrustSnapshot: deps.buildTrustSnapshot,
    setTransientStatusSummary: deps.setTransientStatusSummary,
  })
  const handleRunAction = createRunActionHandler(store, {
    trackRendererEvent: deps.trackRendererEvent,
    submitUserTurn,
    buildInterruptedRunRecoveryPrompt: deps.buildInterruptedRunRecoveryPrompt,
    normalizePlanSteps: deps.normalizePlanSteps,
    commitStartedExecutionResult: deps.commitStartedExecutionResult,
    buildExecutionHaltContent: deps.buildExecutionHaltContent,
    getWorkspaceKey: deps.getWorkspaceKey,
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

    const recoveryToggle = target.closest<HTMLElement>('[data-recovery-toggle]')
    if (recoveryToggle) {
      const current = store.getState().ui.recoveryExpanded
      const next =
        recoveryToggle.dataset.recoveryToggle === 'expand'
          ? true
          : recoveryToggle.dataset.recoveryToggle === 'collapse'
            ? false
            : !current
      store.dispatch({ type: 'ui/setRecoveryExpanded', expanded: next })
      return
    }

    if (target.closest('#agent-send')) {
      await submitComposer('button')
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
    void submitComposer('keyboard')
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
