import type { AgentPackage } from '../agent-manager.js'
import type {
  CapabilityAction,
  CapabilityActionContract,
  CapabilityContract,
  CapabilityInstallState,
  CapabilityPack,
  CapabilityPermission,
  CapabilityProofKind,
  CapabilityRisk,
  CapabilityTier,
} from './types.js'

const READ_PROOF: CapabilityProofKind[] = ['run', 'receipt', 'log']
const WRITE_PROOF: CapabilityProofKind[] = ['run', 'receipt', 'log', 'artifact']

function titleFromKey(value: string): string {
  return value
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

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

function inferActionRisk(agent: AgentPackage, commandName: string): CapabilityRisk {
  const command = agent.commands.find((entry) => entry.name === commandName)
  if (!command) return inferRisk(agent)
  const text = `${command.name} ${command.steps.join(' ')}`.toLowerCase()
  if (/\bdeploy|publish|push|prune\b/.test(text)) return 'high-impact'
  if (/\binstall|write|build|clean\b/.test(text)) return 'safe-write'
  return 'read'
}

function normalizeProof(risk: CapabilityRisk, proof?: CapabilityProofKind[]): CapabilityProofKind[] {
  if (proof?.length) return Array.from(new Set(proof))
  return risk === 'read' ? READ_PROOF : WRITE_PROOF
}

function normalizeContract(agent: AgentPackage): CapabilityContract {
  if (agent.capability) {
    const fallbackRisk = agent.capability.risk || inferRisk(agent)
    return {
      category: agent.capability.category,
      tier: agent.capability.tier || inferTier(agent),
      permissions: agent.capability.permissions,
      risk: fallbackRisk,
      proof: normalizeProof(fallbackRisk, agent.capability.proof),
      tags: agent.capability.tags,
      actions: agent.capability.actions.map((action) => ({
        ...action,
        proof: normalizeProof(action.risk, action.proof),
        tool: action.tool || `capability.${agent.name}.${action.id}`,
      })),
    }
  }

  const risk = inferRisk(agent)
  return {
    category: inferCategory(agent),
    tier: inferTier(agent),
    permissions: inferPermissions(agent),
    risk,
    proof: normalizeProof(risk),
    tags: [agent.author, 'marketplace'].filter(Boolean),
    actions: agent.commands.map((command) => {
      const actionRisk = inferActionRisk(agent, command.name)
      return {
        id: command.name,
        label: titleFromKey(command.name),
        tool: `capability.${agent.name}.${command.name}`,
        risk: actionRisk,
        proof: normalizeProof(actionRisk),
        requiresConfirmation: actionRisk !== 'read',
      }
    }),
  }
}

function toCapabilityAction(agent: AgentPackage, action: CapabilityActionContract, fallbackRisk: CapabilityRisk): CapabilityAction {
  const risk = action.risk || fallbackRisk
  const proof = normalizeProof(risk, action.proof)
  return {
    id: action.id,
    label: action.label,
    tool: action.tool || `capability.${agent.name}.${action.id}`,
    risk,
    proof,
    requiresConfirmation: action.requiresConfirmation ?? risk !== 'read',
  }
}

export function capabilityPackFromContract(agent: AgentPackage, installState: CapabilityInstallState): CapabilityPack {
  const contract = normalizeContract(agent)
  const fallbackRisk = contract.risk || 'read'
  return {
    key: agent.name,
    title: titleFromKey(agent.name),
    description: agent.description,
    category: contract.category,
    source: installState === 'installed' ? 'installed' : 'marketplace',
    tier: contract.tier || inferTier(agent),
    installState,
    permissions: contract.permissions,
    tags: contract.tags,
    price: agent.price,
    commands: agent.commands.map((command) => command.name),
    actions: contract.actions.map((action) => toCapabilityAction(agent, action, fallbackRisk)),
  }
}
