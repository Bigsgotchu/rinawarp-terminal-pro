import type { WorkbenchActionControllerDeps, WorkbenchActionFixBlockManager } from './actionController.js'
import { resetUserTurnSubmitGuard } from './conversationOwner.js'
import { WorkbenchStore } from '../workbench/store.js'

export function createCapabilityActionHandler<TFixBlockManager extends WorkbenchActionFixBlockManager>(
  store: WorkbenchStore,
  fixBlockManager: TFixBlockManager,
  deps: Pick<
    WorkbenchActionControllerDeps<TFixBlockManager>,
    | 'refreshMarketplace'
    | 'refreshCapabilityPacks'
    | 'getAgentWorkspaceRoot'
    | 'normalizePlanSteps'
    | 'resolvePlanCapabilityRequirements'
    | 'buildExecutionPlanContent'
    | 'commitStartedExecutionResult'
    | 'buildExecutionHaltContent'
    | 'setTransientStatusSummary'
    | 'getWorkspaceKey'
  >
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const planUpgradeBtn = target.closest<HTMLElement>('[data-plan-upgrade]')
    if (planUpgradeBtn?.dataset.planUpgrade === 'pro') {
      await fixBlockManager.promptUpgradeToPro()
      return true
    }

    if (target.closest('[data-plan-pricing]')) {
      if (window.electronAPI?.shell?.openExternal) {
        await window.electronAPI.shell.openExternal('https://rinawarptech.com/pricing')
      }
      return true
    }

    const installBtn = target.closest<HTMLElement>('[data-market-install]')
    if (installBtn) {
      const agentName = String(installBtn.dataset.marketInstall || '')
      if (!agentName) return true
      resetUserTurnSubmitGuard()

      const currentTier = String(store.getState().license.tier || 'free').toLowerCase()
      const premiumLocked = (currentTier === 'free' || currentTier === 'starter')
        && store.getState().marketplace.agents.find((agent) => agent.name === agentName)?.price
      if (premiumLocked) {
        await fixBlockManager.ensureProAccess()
        return true
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
          resetUserTurnSubmitGuard()
        }
      } catch (error) {
        store.dispatch({
          type: 'marketplace/setError',
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return true
    }

    const capabilityInstallBtn = target.closest<HTMLElement>('[data-capability-install]')
    if (capabilityInstallBtn?.dataset.capabilityInstall) {
      const packKey = capabilityInstallBtn.dataset.capabilityInstall
      resetUserTurnSubmitGuard()
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
          resetUserTurnSubmitGuard()
        }
      } catch (error) {
        store.dispatch({
          type: 'capabilities/setError',
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return true
    }

    const capabilityUpgradeBtn = target.closest<HTMLElement>('[data-capability-upgrade]')
    if (capabilityUpgradeBtn?.dataset.capabilityUpgrade) {
      await fixBlockManager.ensureProAccess()
      return true
    }

    const capabilityRunBtn = target.closest<HTMLElement>('[data-capability-run]')
    if (capabilityRunBtn?.dataset.capabilityRun) {
      const packKey = String(capabilityRunBtn.dataset.capabilityRun || '').split('|')[0] || ''
      const actionId = capabilityRunBtn.dataset.capabilityActionId || undefined
      if (!packKey) return true
      const workspaceRoot = deps.getAgentWorkspaceRoot()
      if (!workspaceRoot) {
        deps.setTransientStatusSummary(store, 'Missing workspace root')
        return true
      }
      if (typeof window.rina.executeCapability !== 'function') {
        deps.setTransientStatusSummary(store, 'Capability runner unavailable')
        return true
      }
      const result = await window.rina.executeCapability({
        packKey,
        actionId,
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
            title: result?.prompt || packKey,
            command:
              planSteps.map((step) => String(step?.input?.command || '')).filter(Boolean).join(' && ')
              || result?.prompt
              || packKey,
          },
          result || {}
        )
      ) {
        return true
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
      return true
    }

    return false
  }
}
