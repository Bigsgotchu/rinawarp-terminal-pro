import { getInstalledAgent, listInstalledAgents, type AgentPackage } from '../agent-manager.js'
import { BUILTIN_CAPABILITY_PACKS } from './catalog.js'
import { capabilityPackFromContract } from './contracts.js'
import type { CapabilityInstallState, CapabilityPack } from './types.js'

export function capabilityPackFromAgent(agent: AgentPackage, installState: CapabilityInstallState): CapabilityPack {
  return capabilityPackFromContract(agent, installState)
}

export function listInstalledCapabilityPacks(): CapabilityPack[] {
  return listInstalledAgents()
    .map((name) => getInstalledAgent(name))
    .filter((agent): agent is AgentPackage => !!agent)
    .map((agent) => capabilityPackFromAgent(agent, 'installed'))
}

export function listCapabilityPacks(marketplaceAgents: AgentPackage[] = []): CapabilityPack[] {
  const packs = new Map<string, CapabilityPack>()

  for (const builtin of BUILTIN_CAPABILITY_PACKS) {
    packs.set(builtin.key, builtin)
  }

  for (const installed of listInstalledCapabilityPacks()) {
    packs.set(installed.key, installed)
  }

  const installedNames = new Set(listInstalledAgents())
  for (const agent of marketplaceAgents) {
    const installState: CapabilityInstallState =
      installedNames.has(agent.name) ? 'installed' : agent.price && agent.price > 0 ? 'upgrade-required' : 'available'
    packs.set(agent.name, capabilityPackFromAgent(agent, installState))
  }

  return Array.from(packs.values()).sort((a, b) => a.title.localeCompare(b.title))
}
