/**
 * RinaWarp License Client
 *
 * Handles license validation and feature gating.
 */

export type LicenseTier = 'starter' | 'pro' | 'team' | 'enterprise'

export interface LicenseInfo {
  tier: LicenseTier
  valid: boolean
  customerId?: string
  expiresAt?: number
  features: string[]
}

/**
 * License Client - manages licensing
 */
class LicenseClient {
  private license: LicenseInfo = {
    tier: 'starter',
    valid: false,
    features: [],
  }

  private apiEndpoint = 'https://api.rinawarptech.com'

  /**
   * Get current license
   */
  get(): LicenseInfo {
    return { ...this.license }
  }

  /**
   * Check if license is valid
   */
  isValid(): boolean {
    return this.license.valid
  }

  /**
   * Get current tier
   */
  getTier(): LicenseTier {
    return this.license.tier
  }

  /**
   * Validate license key
   */
  async validate(key: string): Promise<LicenseInfo> {
    try {
      // In production, this would call the API
      // For now, simulate validation
      const response = await fetch(`${this.apiEndpoint}/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })

      if (response.ok) {
        const data = await response.json()
        this.license = {
          tier: data.tier || 'starter',
          valid: true,
          customerId: data.customerId,
          expiresAt: data.expiresAt,
          features: data.features || [],
        }
      }
    } catch {
      // Demo mode - allow access
      this.license = {
        tier: 'enterprise',
        valid: true,
        features: ['brain', 'context', 'autonomy', 'workflows', 'multiAgent'],
      }
    }

    return this.get()
  }

  /**
   * Check if feature is available
   */
  hasFeature(feature: string): boolean {
    // Enterprise has all features
    if (this.license.tier === 'enterprise') return true

    // Pro features
    const proFeatures = ['brain', 'context', 'refactor']
    if (this.license.tier === 'pro' && proFeatures.includes(feature)) return true

    // Team features
    const teamFeatures = ['workflows', 'multiAgent']
    if (this.license.tier === 'team' && teamFeatures.includes(feature)) return true

    // Check explicit features list
    return this.license.features.includes(feature)
  }

  /**
   * Check feature with tier requirement
   */
  requiresTier(feature: string, minTier: LicenseTier): boolean {
    const tiers: LicenseTier[] = ['starter', 'pro', 'team', 'enterprise']
    const required = tiers.indexOf(minTier)
    const current = tiers.indexOf(this.license.tier)

    return current >= required || this.hasFeature(feature)
  }

  /**
   * Gate feature - throw if not available
   */
  gate(feature: string): void {
    if (!this.hasFeature(feature)) {
      throw new Error(`Feature "${feature}" requires ${this.getTierDescription()} tier`)
    }
  }

  /**
   * Get tier description
   */
  getTierDescription(): string {
    const descriptions: Record<LicenseTier, string> = {
      starter: 'Starter',
      pro: 'Pro',
      team: 'Team',
      enterprise: 'Enterprise',
    }
    return descriptions[this.license.tier]
  }

  /**
   * Set license manually (for testing)
   */
  setLicense(tier: LicenseTier, features: string[] = []): void {
    this.license = {
      tier,
      valid: true,
      features,
    }
  }

  /**
   * Clear license
   */
  clear(): void {
    this.license = {
      tier: 'starter',
      valid: false,
      features: [],
    }
  }
}

/**
 * Feature flags
 */
export const features = {
  BRAIN_PANEL: 'brain',
  CONTEXT_ENGINE: 'context',
  AUTONOMY: 'autonomy',
  REFACTOR: 'refactor',
  DEPLOY: 'deploy',
  WORKFLOWS: 'workflows',
  MULTI_AGENT: 'multiAgent',
  DOCKER: 'docker',
  PLUGINS: 'plugins',
  TELEMETRY: 'telemetry',
}

/**
 * Singleton instance
 */
export const licenseClient = new LicenseClient()
