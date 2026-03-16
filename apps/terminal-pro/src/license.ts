/**
 * RinaWarp License System
 *
 * Production license verification with subscription tiers.
 * Supports offline validation with cached tokens.
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electron = require('electron')
const { app } = electron
import fs from 'fs'
import path from 'path'

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

const LICENSE_CACHE_FILE = 'license-cache.json'

/**
 * Get the license cache file path
 */
function getLicenseCachePath(): string {
  const userDataPath = app?.getPath?.('userData') || process.cwd()
  return path.join(userDataPath, LICENSE_CACHE_FILE)
}

/**
 * Load cached license info
 */
export function loadCachedLicense(): LicenseInfo | null {
  try {
    const cachePath = getLicenseCachePath()
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8')
      const info: LicenseInfo = JSON.parse(data)

      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - info.lastVerified
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return info
      }
    }
  } catch (e) {
    console.warn('[License] Failed to load cached license:', e)
  }
  return null
}

/**
 * Save license info to cache
 */
function cacheLicense(info: LicenseInfo): void {
  try {
    const cachePath = getLicenseCachePath()
    const dir = path.dirname(cachePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(cachePath, JSON.stringify(info, null, 2))
  } catch (e) {
    console.warn('[License] Failed to cache license:', e)
  }
}

/**
 * Get feature list for tier
 */
function getFeaturesForTier(tier: LicenseTier): string[] {
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

/**
 * Get limits for tier
 */
function getLimitsForTier(tier: LicenseTier) {
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

/**
 * Verify license key with the RinaWarp API
 */
export async function verifyLicense(customerId: string): Promise<LicenseVerifyResponse> {
  // Check cache first for offline support
  const cached = loadCachedLicense()
  if (cached && cached.customerId === customerId) {
    // Return cached if not expired
    if (cached.expiresAt > Date.now()) {
      return {
        ok: true,
        customer_id: cached.customerId,
        tier: cached.tier,
        status: cached.status,
        expires_at: cached.expiresAt,
        license_token: cached.token,
        features: cached.features,
        limits: getLimitsForTier(cached.tier),
      }
    }
  }

  try {
    const url = `https://api.rinawarptech.com/api/license/verify`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        device_id: getDeviceId(),
        app_version: app?.getVersion?.() || '1.0.0',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`License verify failed (${res.status}): ${text}`)
    }

    const result = (await res.json()) as LicenseVerifyResponse

    // Cache the result
    cacheLicense({
      customerId: result.customer_id,
      tier: result.tier,
      status: result.status,
      expiresAt: result.expires_at,
      token: result.license_token,
      features: result.features || getFeaturesForTier(result.tier),
      lastVerified: Date.now(),
    })

    return result
  } catch (err) {
    // If API fails, return cached license if available
    if (cached) {
      console.warn('[License] API failed, using cached license')
      return {
        ok: true,
        customer_id: cached.customerId,
        tier: cached.tier,
        status: cached.status,
        expires_at: cached.expiresAt,
        license_token: cached.token,
        features: cached.features,
        limits: getLimitsForTier(cached.tier),
      }
    }
    throw err
  }
}

/**
 * Get device ID for license validation
 */
function getDeviceId(): string {
  // Generate a simple device ID based on system info
  const os = require('os')
  const crypto = require('crypto')
  const hostname = os.hostname()
  const username = os.userInfo().username
  return crypto.createHash('sha256').update(`${hostname}-${username}`).digest('hex').substring(0, 16)
}

/**
 * Check if a feature is available for the current license
 */
export function hasFeature(license: LicenseVerifyResponse | null, feature: string): boolean {
  if (!license) return false
  return license.features.includes(feature)
}

/**
 * Check if operation is within limits
 */
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

/**
 * Get tier display name
 */
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

/**
 * Clear cached license (for logout)
 */
export function clearCachedLicense(): void {
  try {
    const cachePath = getLicenseCachePath()
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath)
    }
  } catch (e) {
    console.warn('[License] Failed to clear cache:', e)
  }
}
