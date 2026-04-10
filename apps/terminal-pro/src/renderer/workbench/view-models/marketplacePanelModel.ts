import type { WorkbenchState } from '../store.js'

export function buildMarketplacePanelModel(state: WorkbenchState) {
  const isStarter = state.license.tier === 'starter' || state.license.tier === 'free'
  const capabilityMap = new Map(state.capabilities.packs.map((pack) => [pack.key, pack]))
  const installedCount = state.marketplace.agents.filter((agent) => state.marketplace.installed.includes(agent.name)).length
  const lockedCount = state.marketplace.agents.filter((agent) => Number(agent.price || 0) > 0 && isStarter && !state.marketplace.installed.includes(agent.name)).length
  const availableCount = state.marketplace.agents.length - installedCount - lockedCount
  return {
    loading: state.marketplace.loading,
    error: state.marketplace.error,
    isEmpty: state.marketplace.agents.length === 0,
    summary: { installedCount, lockedCount, availableCount },
    cards: state.marketplace.agents.map((agent) => {
      const capabilityPack = capabilityMap.get(agent.name)
      const premium = Number(agent.price || 0) > 0
      const installed = state.marketplace.installed.includes(agent.name)
      const locked = premium && isStarter && !installed
      return {
        name: agent.name,
        author: agent.author || 'unknown',
        version: agent.version || '1.0.0',
        description: agent.description || 'No description provided.',
        badge: installed ? 'Ready in thread' : locked ? 'Upgrade required' : premium ? 'Paid pack' : 'Installable now',
        actionLabel: installed ? 'Installed' : locked ? 'Upgrade to Pro' : 'Install',
        disabled: installed,
        installCopy: installed
          ? 'Installed locally and ready to route back through the Agent thread.'
          : locked
            ? 'This pack is real, but the trusted run path stays locked until Pro is active.'
            : 'Install it here, then run it from Agent with the same proof rules as everything else.',
        meta: [
          installed ? 'Ready' : locked ? 'Locked' : 'Available',
          `Category ${capabilityPack?.category || (premium ? 'marketplace' : 'workspace')}`,
          `${Array.isArray(agent.commands) ? agent.commands.length : 0} workflow${Array.isArray(agent.commands) && agent.commands.length === 1 ? '' : 's'}`,
          installed ? 'Proof ready in thread' : locked ? 'Unlock to run with proof' : 'Install to run with proof',
          `Proof ${capabilityPack?.actions?.[0]?.proof?.join(', ') || 'run, receipt, log'}`,
          `Permissions ${capabilityPack?.permissions?.join(', ') || 'read-only'}`,
          `${String(agent.downloads || 0)} downloads`,
        ],
      }
    }),
  }
}
