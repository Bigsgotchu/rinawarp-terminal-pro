export type LicenseTier = 'free' | 'pro' | 'team' | 'enterprise'
export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'cancelled'

export interface LicenseVerifyResponse {
  ok: true
  customer_id: string
  tier: LicenseTier
  status: LicenseStatus
  expires_at: number
  license_token: string
  features: string[]
  limits: {
    concurrentAgents: number
    memorySessions: number
    apiCallsPerDay: number
  }
}

export interface LicenseInfo {
  customerId: string
  tier: LicenseTier
  status: LicenseStatus
  expiresAt: number
  token: string
  features: string[]
  lastVerified: number
}

export type CheckoutResponse = {
  ok?: boolean
  url: string
  sessionId?: string
}
