export type CapabilityPackCategory = 'system' | 'deploy' | 'device' | 'security' | 'workspace'

export type CapabilityTier = 'starter' | 'pro' | 'paid'

export type CapabilitySource = 'builtin' | 'marketplace' | 'installed'

export type CapabilityInstallState = 'builtin' | 'available' | 'installed' | 'upgrade-required'

export type CapabilityPermission = 'read-only' | 'workspace-write' | 'network' | 'cloud' | 'device'

export type CapabilityProofKind = 'run' | 'receipt' | 'log' | 'artifact' | 'diff'

export type CapabilityRisk = 'read' | 'safe-write' | 'high-impact'

export interface CapabilityAction {
  id: string
  label: string
  tool: string
  risk: CapabilityRisk
  proof: CapabilityProofKind[]
  requiresConfirmation?: boolean
}

export interface CapabilityPack {
  key: string
  title: string
  description: string
  category: CapabilityPackCategory
  source: CapabilitySource
  tier: CapabilityTier
  installState: CapabilityInstallState
  permissions: CapabilityPermission[]
  actions: CapabilityAction[]
  tags?: string[]
  price?: number
  commands?: string[]
}
