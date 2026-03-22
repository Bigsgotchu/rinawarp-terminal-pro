import type { LicenseTier, LicenseVerifyResponse } from './types.js'

export function getFeaturesForTier(tier: LicenseTier): string[] {
  const baseFeatures = ['terminal', 'filesystem', 'git', 'basic-commands']

  switch (tier) {
    case 'free':
      return baseFeatures
    case 'pro':
      return [...baseFeatures, 'docker', 'ai-brain', 'memory', 'advanced-commands']
    case 'team':
      return [...baseFeatures, 'docker', 'ai-brain', 'memory', 'advanced-commands', 'multi-agent', 'collaboration']
    case 'enterprise':
      return [
        ...baseFeatures,
        'docker',
        'ai-brain',
        'memory',
        'advanced-commands',
        'multi-agent',
        'collaboration',
        'custom-integrations',
        'priority-support',
      ]
    default:
      return baseFeatures
  }
}

export function getLimitsForTier(tier: LicenseTier) {
  switch (tier) {
    case 'free':
      return { concurrentAgents: 1, memorySessions: 5, apiCallsPerDay: 100 }
    case 'pro':
      return { concurrentAgents: 3, memorySessions: 50, apiCallsPerDay: 1000 }
    case 'team':
      return { concurrentAgents: 10, memorySessions: 200, apiCallsPerDay: 5000 }
    case 'enterprise':
      return { concurrentAgents: -1, memorySessions: -1, apiCallsPerDay: -1 }
    default:
      return { concurrentAgents: 1, memorySessions: 5, apiCallsPerDay: 100 }
  }
}

export function hasFeature(license: LicenseVerifyResponse | null, feature: string): boolean {
  if (!license) return false
  return license.features.includes(feature)
}

export function isWithinLimits(
  license: LicenseVerifyResponse | null,
  limitType: 'concurrentAgents' | 'memorySessions' | 'apiCallsPerDay',
  current: number
): boolean {
  if (!license) return false
  const limits = license.limits

  switch (limitType) {
    case 'concurrentAgents':
      return limits.concurrentAgents === -1 || current < limits.concurrentAgents
    case 'memorySessions':
      return limits.memorySessions === -1 || current < limits.memorySessions
    case 'apiCallsPerDay':
      return limits.apiCallsPerDay === -1 || current < limits.apiCallsPerDay
    default:
      return true
  }
}

export function getTierDisplayName(tier: LicenseTier): string {
  switch (tier) {
    case 'free':
      return 'Free'
    case 'pro':
      return 'Pro'
    case 'team':
      return 'Team'
    case 'enterprise':
      return 'Enterprise'
    default:
      return 'Unknown'
  }
}
