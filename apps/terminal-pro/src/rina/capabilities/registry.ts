import { getInstalledAgent, listInstalledAgents, type AgentPackage } from '../agent-manager.js'
import { BUILTIN_CAPABILITY_PACKS } from './catalog.js'
import type {
  CapabilityInstallState,
  CapabilityPack,
  CapabilityPermission,
  CapabilityProofKind,
  CapabilityRisk,
  CapabilityTier,
} from './types.js'

function inferCategory(agent: AgentPackage): CapabilityPack['category'] {
  const text = `${agent.name} ${agent.description}`.toLowerCase()
  if (text.includes('deploy')) return 'deploy'
  if (text.includes('docker')) return 'workspace'
  if (text.includes('security')) return 'security'
  if (text.includes('diagnostic') || text.includes('system')) return 'system'
  return 'workspace'
}

function inferTier(agent: AgentPackage): CapabilityTier {
  return agent.price && agent.price > 0 ? 'paid' : 'starter'
}

function inferPermissions(agent: AgentPackage): CapabilityPermission[] {
  const text = `${agent.name} ${agent.description} ${agent.commands.map((command) => command.steps.join(' ')).join(' ')}`.toLowerCase()
  const permissions = new Set<CapabilityPermission>(['read-only'])
  if (/\bdeploy|publish|push|prune|build\b/.test(text)) permissions.add('workspace-write')
  if (/\bvercel|netlify|docker|registry|https?:\/\//.test(text)) permissions.add('network')
  if (/\bvercel|netlify|cloudflare|registry|deploy\b/.test(text)) permissions.add('cloud')
  return Array.from(permissions)
}

function inferRisk(agent: AgentPackage): CapabilityRisk {
  const text = agent.commands.flatMap((command) => command.steps).join(' ').toLowerCase()
  if (/\bdeploy|publish|push|prune\b/.test(text)) return 'high-impact'
  if (/\binstall|write|build\b/.test(text)) return 'safe-write'
  return 'read'
}

export function capabilityPackFromAgent(agent: AgentPackage, installState: CapabilityInstallState): CapabilityPack {
  const risk = inferRisk(agent)
  const proof: CapabilityProofKind[] = risk === 'read' ? ['run', 'receipt', 'log'] : ['run', 'receipt', 'log', 'artifact']
  return {
    key: agent.name,
    title: agent.name
      .split(/[-_:]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    description: agent.description,
    category: inferCategory(agent),
    source: installState === 'installed' ? 'installed' : 'marketplace',
    tier: inferTier(agent),
    installState,
    permissions: inferPermissions(agent),
    tags: [agent.author, 'marketplace'].filter(Boolean),
    price: agent.price,
    commands: agent.commands.map((command) => command.name),
    actions: agent.commands.map((command) => ({
      id: command.name,
      label: command.name,
      tool: `capability.${agent.name}.${command.name}`,
      risk,
      proof,
      requiresConfirmation: risk !== 'read',
    })),
  }
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
