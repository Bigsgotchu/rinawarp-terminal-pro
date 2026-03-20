import {
  type MessageBlock,
  type RunModel,
  type WorkbenchState,
  WorkbenchStore,
} from '../workbench/store.js'

export type WorkbenchActionCleanup = () => void

export type CapabilityExecutionResult = {
  ok?: boolean
  runId?: string
  planRunId?: string
  packKey?: string
  actionId?: string
  prompt?: string
  reasoning?: string
  plan?: unknown[]
  haltedStepId?: string | null
  haltReason?: string
  error?: string
  code?: string
  retrySuggestion?: string
}

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

  const onClick = async (event: Event) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (target.closest('#agent-send')) {
      await submitComposer()
      return
    }

    const tab = target.closest<HTMLElement>('[data-tab]')
    if (tab?.dataset.tab) {
      const view = tab.dataset.tab
      const openDrawer = store.getState().ui.openDrawer
      if (view === 'agent') {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        return
      }
      if (view === 'settings') {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/centerSet', view: 'settings' })
        return
      }
      if (view === 'execution-trace' || view === 'runs') {
        store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: view })
        void deps.trackRendererEvent('inspector_opened', {
          inspector: view,
          source: 'sidebar_tab',
          workspace_key: store.getState().workspaceKey,
        })
      }
      if (view === 'execution-trace' || view === 'runs' || view === 'marketplace' || view === 'code' || view === 'brain' || view === 'settings') {
        if (openDrawer === view) store.dispatch({ type: 'ui/closeDrawer' })
        else store.dispatch({ type: 'view/centerSet', view })
      } else if (view === 'agent' || view === 'diagnostics') {
        if (view === 'diagnostics' && openDrawer === 'diagnostics') store.dispatch({ type: 'ui/closeDrawer' })
        else store.dispatch({ type: 'view/rightSet', view })
      }
      return
    }

    if (target.closest('[data-close-drawer]')) {
      store.dispatch({ type: 'ui/closeDrawer' })
      return
    }

    const promptChip = target.closest<HTMLElement>('[data-agent-prompt]')
    if (promptChip?.dataset.agentPrompt) {
      const label = promptChip.textContent?.trim() || promptChip.dataset.agentPrompt
      store.dispatch({ type: 'analytics/track', event: 'starter_intent_selected', label })
      void deps.trackRendererEvent('starter_intent_selected', {
        label,
        prompt: promptChip.dataset.agentPrompt,
        workspace_key: store.getState().workspaceKey,
        source: 'starter_chip',
      })
      await deps.sendPromptToRina(store, promptChip.dataset.agentPrompt)
      return
    }

    const planUpgradeBtn = target.closest<HTMLElement>('[data-plan-upgrade]')
    if (planUpgradeBtn?.dataset.planUpgrade === 'pro') {
      await fixBlockManager.promptUpgradeToPro()
      return
    }

    if (target.closest('[data-plan-pricing]')) {
      if (window.electronAPI?.shell?.openExternal) {
        await window.electronAPI.shell.openExternal('https://rinawarptech.com/pricing')
      }
      return
    }

    const openRunBtn = target.closest<HTMLElement>('[data-open-run]')
    if (openRunBtn?.dataset.openRun) {
      store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: 'runs' })
      void deps.trackRendererEvent('inspector_opened', {
        inspector: 'runs',
        source: 'inline_run_link',
        run_id: openRunBtn.dataset.openRun,
        workspace_key: store.getState().workspaceKey,
      })
      store.dispatch({ type: 'view/centerSet', view: 'runs' })
      deps.scrollToRun(openRunBtn.dataset.openRun)
      return
    }

    const openRunsPanelBtn = target.closest<HTMLElement>('[data-open-runs-panel]')
    if (openRunsPanelBtn?.dataset.openRunsPanel) {
      store.dispatch({ type: 'analytics/track', event: 'inspector_opened', label: 'runs' })
      void deps.trackRendererEvent('inspector_opened', {
        inspector: 'runs',
        source: 'thread_runs_link',
        message_id: openRunsPanelBtn.dataset.openRunsPanel,
        workspace_key: store.getState().workspaceKey,
      })
      store.dispatch({ type: 'ui/setShowAllRuns', showAllRuns: false })
      store.dispatch({ type: 'ui/setScopeRunsToWorkspace', scopeRunsToWorkspace: true })
      store.dispatch({ type: 'view/centerSet', view: 'runs' })
      return
    }

    const toggleRunsVisibilityBtn = target.closest<HTMLElement>('[data-toggle-runs-visibility]')
    if (toggleRunsVisibilityBtn) {
      store.dispatch({ type: 'ui/setShowAllRuns', showAllRuns: !store.getState().ui.showAllRuns })
      return
    }

    const toggleRunsScopeBtn = target.closest<HTMLElement>('[data-toggle-runs-scope]')
    if (toggleRunsScopeBtn) {
      store.dispatch({
        type: 'ui/setScopeRunsToWorkspace',
        scopeRunsToWorkspace: !store.getState().ui.scopeRunsToWorkspace,
      })
      return
    }

    const toggleRunOutputBtn = target.closest<HTMLElement>('[data-run-toggle-output]')
    if (toggleRunOutputBtn?.dataset.runToggleOutput) {
      const runId = toggleRunOutputBtn.dataset.runToggleOutput
      store.dispatch({ type: 'ui/toggleRunOutput', runId })
      const expanded = store.getState().ui.expandedRunOutputByRunId[runId] ?? false
      if (expanded) {
        store.dispatch({ type: 'analytics/track', event: 'run_output_expanded' })
        void deps.trackRendererEvent('run_output_expanded', {
          run_id: runId,
          workspace_key: store.getState().workspaceKey,
        })
      }
      const hasTail = Boolean((store.getState().runOutputTailByRunId[runId] || '').trim())
      if (expanded && !hasTail) {
        const run = store.getState().runs.find((entry) => entry.id === runId)
        if (run?.sessionId && typeof window.rina.runsTail === 'function') {
          const result = await window.rina.runsTail({
            runId,
            sessionId: run.sessionId,
            maxLines: 200,
            maxBytes: 256 * 1024,
          })
          if (result?.ok && typeof result.tail === 'string') {
            store.dispatch({ type: 'runs/setOutputTail', runId, tail: result.tail })
          } else if (!result?.ok && result?.error) {
            store.dispatch({ type: 'runs/setOutputTail', runId, tail: `Error loading output: ${result.error}` })
          }
        }
      }
      return
    }

    const openMessageBtn = target.closest<HTMLElement>('[data-open-message]')
    if (openMessageBtn?.dataset.openMessage) {
      store.dispatch({ type: 'ui/closeDrawer' })
      store.dispatch({ type: 'view/rightSet', view: 'agent' })
      deps.scrollToMessage(openMessageBtn.dataset.openMessage)
      return
    }

    const autoBtn = target.closest<HTMLElement>('.fix-auto-apply')
    if (autoBtn?.dataset.fixId) {
      await deps.autoApplyFixFromStore(store, autoBtn.dataset.fixId, fixBlockManager)
      return
    }

    const runStepBtn = target.closest<HTMLElement>('[data-run-step]')
    if (runStepBtn?.dataset.fixId) {
      const index = Number(runStepBtn.dataset.runStep || '0')
      await deps.runFixStepFromStore(store, runStepBtn.dataset.fixId, index)
      return
    }

    const revealBtn = target.closest<HTMLElement>('[data-fix-reveal]')
    if (revealBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === revealBtn.dataset.fixId)
      if (fix) await window.rina.revealRunReceipt(fix.runId)
      return
    }

    if (target.closest('[data-fix-folder]')) {
      await window.rina.openRunsFolder()
      return
    }

    const runRevealBtn = target.closest<HTMLElement>('[data-run-reveal]')
    if (runRevealBtn) {
      const receiptId = String(runRevealBtn.dataset.runReveal || '')
      if (receiptId) await window.rina.revealRunReceipt(receiptId)
      return
    }

    if (target.closest('[data-run-folder]')) {
      await window.rina.openRunsFolder()
      return
    }

    const rerunBtn = target.closest<HTMLElement>('[data-run-rerun]')
    if (rerunBtn?.dataset.runRerun) {
      const run = store.getState().runs.find((entry) => entry.id === rerunBtn.dataset.runRerun)
      if (run?.command) {
        await deps.sendPromptToRina(store, run.command)
      }
      return
    }

    const resumeRunBtn = target.closest<HTMLElement>('[data-run-resume]')
    if (resumeRunBtn?.dataset.runResume) {
      const run = store.getState().runs.find((entry) => entry.id === resumeRunBtn.dataset.runResume)
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.sendPromptToRina(store, deps.buildInterruptedRunRecoveryPrompt(run))
      }
      return
    }

    const copyRunBtn = target.closest<HTMLElement>('[data-run-copy]')
    if (copyRunBtn?.dataset.runCopy) {
      const run = store.getState().runs.find((entry) => entry.id === copyRunBtn.dataset.runCopy)
      if (run?.command) {
        await navigator.clipboard.writeText(run.command)
        deps.setTransientStatusSummary(store, 'Run command copied')
      }
      return
    }

    const installBtn = target.closest<HTMLElement>('[data-market-install]')
    if (installBtn) {
      const agentName = String(installBtn.dataset.marketInstall || '')
      if (!agentName) return

      const premiumLocked = store.getState().license.tier === 'starter'
        && store.getState().marketplace.agents.find((agent) => agent.name === agentName)?.price
      if (premiumLocked) {
        await fixBlockManager.ensureProAccess()
        return
      }

      try {
        const cached = await window.rina.licenseCachedEmail?.()
        const result = await window.rina.installMarketplaceAgent?.({ name: agentName, userEmail: cached?.email || undefined })
        if (!result?.ok) {
          store.dispatch({
            type: 'marketplace/setError',
            error: result?.error || `Failed to install ${agentName}`,
          })
        } else {
          store.dispatch({ type: 'marketplace/setError', error: undefined })
          await deps.refreshMarketplace(store)
          await deps.refreshCapabilityPacks(store)
        }
      } catch (error) {
        store.dispatch({
          type: 'marketplace/setError',
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return
    }

    const capabilityInstallBtn = target.closest<HTMLElement>('[data-capability-install]')
    if (capabilityInstallBtn?.dataset.capabilityInstall) {
      const packKey = capabilityInstallBtn.dataset.capabilityInstall
      try {
        const cached = await window.rina.licenseCachedEmail?.()
        const result = await window.rina.installMarketplaceAgent?.({ name: packKey, userEmail: cached?.email || undefined })
        if (!result?.ok) {
          store.dispatch({
            type: 'capabilities/setError',
            error: result?.error || `Failed to install ${packKey}`,
          })
        } else {
          store.dispatch({ type: 'capabilities/setError', error: undefined })
          await deps.refreshMarketplace(store)
          await deps.refreshCapabilityPacks(store)
        }
      } catch (error) {
        store.dispatch({
          type: 'capabilities/setError',
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return
    }

    const capabilityUpgradeBtn = target.closest<HTMLElement>('[data-capability-upgrade]')
    if (capabilityUpgradeBtn?.dataset.capabilityUpgrade) {
      await fixBlockManager.ensureProAccess()
      return
    }

    const capabilityInspectBtn = target.closest<HTMLElement>('[data-capability-open-marketplace]')
    if (capabilityInspectBtn?.dataset.capabilityOpenMarketplace) {
      store.dispatch({ type: 'view/centerSet', view: 'marketplace' })
      return
    }

    const capabilityRunBtn = target.closest<HTMLElement>('[data-capability-run]')
    if (capabilityRunBtn?.dataset.capabilityRun) {
      const packKey = capabilityRunBtn.dataset.capabilityRun
      const workspaceRoot = deps.getAgentWorkspaceRoot()
      if (!workspaceRoot) {
        deps.setTransientStatusSummary(store, 'Missing workspace root')
        return
      }
      if (typeof window.rina.executeCapability !== 'function') {
        deps.setTransientStatusSummary(store, 'Capability runner unavailable')
        return
      }
      const result = await window.rina.executeCapability({
        packKey,
        projectRoot: workspaceRoot,
      })
      const planSteps = Array.isArray(result?.plan) ? deps.normalizePlanSteps(result.plan) : []
      const requirements = deps.resolvePlanCapabilityRequirements(store.getState(), planSteps)
      const messageId = `rina:capability-plan:${Date.now()}`
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: messageId,
          role: 'rina',
          content: deps.buildExecutionPlanContent(
            result?.prompt || `Run ${packKey} through the trusted runner.`,
            { reasoning: result?.reasoning, steps: planSteps },
            requirements
          ),
          ts: Date.now(),
          workspaceKey: deps.getWorkspaceKey(),
        },
      })
      if (
        deps.commitStartedExecutionResult(
          store,
          {
            messageId,
            prompt: result?.prompt || `Run ${packKey} through the trusted runner.`,
            workspaceRoot,
            planSteps,
            title: packKey,
            command:
              planSteps.map((step) => String(step?.input?.command || '')).filter(Boolean).join(' && ')
              || result?.prompt
              || packKey,
          },
          result || {}
        )
      ) {
        return
      }
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:capability-error:${Date.now()}`,
          role: 'rina',
          content: deps.buildExecutionHaltContent(
            result?.prompt || `Run ${packKey} through the trusted runner.`,
            result?.error || result?.haltReason || 'Capability run did not start.'
          ),
          ts: Date.now(),
          workspaceKey: deps.getWorkspaceKey(),
        },
      })
      return
    }

    const proofBtn = target.closest<HTMLElement>('[data-fix-proof]')
    if (proofBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === proofBtn.dataset.fixId)
      if (!fix) return
      try {
        await window.rina.supportBundle()
        store.dispatch({ type: 'fix/upsert', fix: { ...fix, error: undefined } })
      } catch (error) {
        store.dispatch({
          type: 'fix/upsert',
          fix: { ...fix, error: `Support bundle failed: ${error instanceof Error ? error.message : String(error)}` },
        })
      }
      return
    }

    const receiptBtn = target.closest<HTMLElement>('[data-fix-receipt]')
    if (receiptBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === receiptBtn.dataset.fixId)
      if (fix) {
        await navigator.clipboard.writeText(fix.runId)
        deps.setTransientStatusSummary(store, 'Run ID copied')
      }
      return
    }

    if (target.closest('[data-copy-trust-snapshot]')) {
      await navigator.clipboard.writeText(deps.buildTrustSnapshot(store))
      deps.setTransientStatusSummary(store, 'Workspace trust snapshot copied')
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
