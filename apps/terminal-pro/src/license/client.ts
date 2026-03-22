import * as electron from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { CheckoutResponse, LicenseInfo, LicenseStatus, LicenseTier, LicenseVerifyResponse } from './types.js'
import { getFeaturesForTier, getLimitsForTier } from './tierHelpers.js'

const { app } = electron

const LICENSE_CACHE_FILE = 'license-cache.json'
export const DEFAULT_LICENSE_API_BASE = process.env.RINAWARP_LICENSE_API_BASE || 'https://api.rinawarptech.com'

function defaultUserDataPath(): string {
  return app?.getPath?.('userData') || path.join(os.homedir(), '.rinawarp-terminal-pro')
}

function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, '')
}

export function licenseApiUrl(pathname: string): string {
  const normalized = normalizeBaseUrl(DEFAULT_LICENSE_API_BASE)
  const nextPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (normalized.endsWith('/v1') && nextPath.startsWith('/v1/')) {
    return `${normalized}${nextPath.slice(3)}`
  }
  return `${normalized}${nextPath}`
}

export function getLicenseApiBase(): string {
  return normalizeBaseUrl(DEFAULT_LICENSE_API_BASE)
}

function buildCandidateUrls(base: string, paths: string[]): string[] {
  const normalized = normalizeBaseUrl(base)
  const urls = new Set<string>()
  for (const pathname of paths) {
    const nextPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    if (normalized.endsWith('/v1') && nextPath.startsWith('/v1/')) {
      urls.add(`${normalized}${nextPath.slice(3)}`)
    } else {
      urls.add(`${normalized}${nextPath}`)
    }
  }
  return [...urls]
}

async function postJsonWithFallback<T>(args: {
  paths: string[]
  body: unknown
  errorLabel: string
}): Promise<T> {
  const candidates = buildCandidateUrls(DEFAULT_LICENSE_API_BASE, args.paths)
  let lastError: Error | null = null

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args.body),
      })

      if (!res.ok) {
        const text = await res.text()
        if (res.status === 404) {
          lastError = new Error(`${args.errorLabel} failed (${res.status}): ${text}`)
          continue
        }
        throw new Error(`${args.errorLabel} failed (${res.status}): ${text}`)
      }

      return (await res.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error(`${args.errorLabel} failed`)
}

function coerceTier(rawTier: string | undefined): LicenseTier {
  const tier = String(rawTier || 'free').trim().toLowerCase()
  if (tier === 'pro') return 'pro'
  if (tier === 'team') return 'team'
  if (tier === 'enterprise') return 'enterprise'
  return 'free'
}

function coerceStatus(rawStatus: string | undefined, valid?: boolean): LicenseStatus {
  const status = String(rawStatus || '').trim().toLowerCase()
  if (status === 'active' || status === 'expired' || status === 'suspended' || status === 'cancelled') {
    return status
  }
  return valid === false ? 'expired' : 'active'
}

function coerceLicenseResponse(raw: any, customerId: string): LicenseVerifyResponse {
  const valid = raw?.valid !== false && raw?.ok !== false
  if (!valid) {
    throw new Error(raw?.error || 'License is not valid')
  }

  const tier = coerceTier(raw?.tier)
  const status = coerceStatus(raw?.status, raw?.valid)
  const expiresAt =
    Number.isFinite(raw?.expires_at)
      ? Number(raw.expires_at)
      : Number.isFinite(raw?.expiresAt)
        ? Number(raw.expiresAt)
        : Date.now() + 30 * 24 * 60 * 60 * 1000

  return {
    ok: true,
    customer_id: String(raw?.customer_id || raw?.customerId || customerId),
    tier,
    status,
    expires_at: expiresAt,
    license_token: String(raw?.license_token || raw?.licenseToken || raw?.key || ''),
    features: Array.isArray(raw?.features) ? raw.features : getFeaturesForTier(tier),
    limits: raw?.limits || getLimitsForTier(tier),
  }
}

function getLicenseCachePath(): string {
  const userDataPath = defaultUserDataPath()
  return path.join(userDataPath, LICENSE_CACHE_FILE)
}

export function loadCachedLicense(): LicenseInfo | null {
  try {
    const cachePath = getLicenseCachePath()
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8')
      const info: LicenseInfo = JSON.parse(data)

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

export async function verifyLicense(customerId: string, options?: { force?: boolean }): Promise<LicenseVerifyResponse> {
  const cached = loadCachedLicense()
  if (!options?.force && cached && cached.customerId === customerId) {
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
    const raw = await postJsonWithFallback<any>({
      paths: ['/v1/licenses/verify', '/v1/license/verify', '/api/license/verify'],
      body: {
        customerId,
        customer_id: customerId,
        deviceId: getDeviceId(),
        device_id: getDeviceId(),
        app_version: app?.getVersion?.() || '1.0.0',
      },
      errorLabel: 'License verify',
    })
    const result = coerceLicenseResponse(raw, customerId)

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

export async function createCheckoutSession(args: {
  email: string
  deviceId: string
  tier?: string
  billingCycle?: 'monthly' | 'annual'
  seats?: number
  workspaceId?: string
  priceId?: string
}): Promise<CheckoutResponse> {
  const response = await postJsonWithFallback<CheckoutResponse & { checkoutUrl?: string }>({
    paths: ['/v1/license/checkout', '/api/checkout'],
    body: {
      email: args.email.trim().toLowerCase(),
      deviceId: args.deviceId,
      device_id: args.deviceId,
      tier: args.tier,
      billingCycle: args.billingCycle,
      seats: args.seats,
      workspaceId: args.workspaceId,
      workspace_id: args.workspaceId,
      priceId: args.priceId,
    },
    errorLabel: 'checkout',
  })
  return {
    ...response,
    url: response.url || response.checkoutUrl || '',
  }
}

export async function createPortalSession(args: {
  email: string
  deviceId: string
  customerId?: string | null
}): Promise<CheckoutResponse> {
  return await postJsonWithFallback<CheckoutResponse>({
    paths: ['/v1/license/portal', '/api/license/portal', '/api/portal'],
    body: {
      email: args.email.trim().toLowerCase(),
      deviceId: args.deviceId,
      device_id: args.deviceId,
      customerId: args.customerId || undefined,
      customer_id: args.customerId || undefined,
    },
    errorLabel: 'portal',
  })
}

export async function lookupLicenseByEmail(email: string): Promise<{ ok: boolean; customer_id?: string; error?: string }> {
  return await postJsonWithFallback<{ ok: boolean; customer_id?: string; error?: string }>({
    paths: ['/v1/license/lookup', '/api/license/lookup-by-email'],
    body: {
      email: email.trim().toLowerCase(),
    },
    errorLabel: 'Lookup',
  })
}

function getDeviceId(): string {
  const userDataPath = defaultUserDataPath()
  const filePath = path.join(userDataPath, 'device-id.json')
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as { deviceId?: string }
    if (parsed?.deviceId && typeof parsed.deviceId === 'string') return parsed.deviceId
  } catch {
    // Fall through to create a new ID.
  }
  const crypto = require('crypto')
  const deviceId = crypto.randomUUID()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ deviceId }, null, 2), 'utf8')
  return deviceId
}

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
