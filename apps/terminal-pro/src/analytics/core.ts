import * as electron from 'electron'
import path from 'node:path'
import fs from 'node:fs'

const { app } = electron

const POSTHOG_API_KEY = process.env.RINAWARP_POSTHOG_KEY || process.env.POSTHOG_API_KEY || ''
const POSTHOG_HOST = process.env.RINAWARP_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://app.posthog.com'
const ANALYTICS_DISABLED =
  process.env.RINAWARP_ANALYTICS_DISABLED === 'true' ||
  process.env.RINAWARP_ANALYTICS_DISABLED === '1' ||
  !POSTHOG_API_KEY

export type AnalyticsEvent =
  | 'app_started'
  | 'app_closed'
  | 'terminal_session_start'
  | 'terminal_session_end'
  | 'command_executed'
  | 'command_blocked'
  | 'ai_suggestion_shown'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_rejected'
  | 'error_recovered'
  | 'settings_opened'
  | 'settings_changed'
  | 'login_success'
  | 'login_failed'
  | 'signup_success'
  | 'subscription_started'
  | 'subscription_failed'
  | 'feature_flag_evaluated'
  | 'daemon_started'
  | 'daemon_stopped'
  | 'agent_run_completed'
  | 'agent_run_failed'
  | 'self_heal_success'
  | 'self_heal_failed'
  | 'starter_intent_selected'
  | 'inspector_opened'
  | 'run_output_expanded'
  | 'proof_backed_run_seen'
  | 'funnel_signup'
  | 'funnel_first_run'
  | 'funnel_first_block'
  | 'funnel_upgrade_view'
  | 'funnel_paid'
  | 'usage_tracking_enabled'
  | 'ai_suggestion_used'
  | 'self_healing_run'
  | 'terminal_session_tracked'

function getDeviceId(): string {
  const userDataPath = app?.getPath?.('userData') || '.'
  const deviceIdPath = path.join(userDataPath, 'analytics-device-id.txt')

  try {
    if (fs.existsSync(deviceIdPath)) {
      return fs.readFileSync(deviceIdPath, 'utf8').trim()
    }
    const crypto = require('node:crypto')
    const deviceId = crypto.randomUUID()
    fs.mkdirSync(path.dirname(deviceIdPath), { recursive: true })
    fs.writeFileSync(deviceIdPath, deviceId, 'utf8')
    return deviceId
  } catch {
    return 'unknown-device'
  }
}

let posthog: any | null = null
let posthogCtor: any | null = null

function loadPostHogCtor(): any | null {
  if (posthogCtor) return posthogCtor
  try {
    const mod = require('posthog-node')
    posthogCtor = mod?.PostHog || mod?.default || null
  } catch {
    posthogCtor = null
  }
  return posthogCtor
}

function getPostHog(): any | null {
  if (ANALYTICS_DISABLED) return null
  if (!posthog) {
    const PostHog = loadPostHogCtor()
    if (!PostHog) return null
    try {
      posthog = new PostHog(POSTHOG_API_KEY, {
        host: POSTHOG_HOST,
        flushAt: 20,
        flushInterval: 10000,
        enable: true,
      })
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error)
      return null
    }
  }
  return posthog
}

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.capture({
      distinctId: getDeviceId(),
      event,
      properties: {
        ...properties,
        app_version: app?.getVersion?.() || 'unknown',
        platform: process.platform,
        node_version: process.version,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('[Analytics] Failed to track event:', event, error)
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.identify({
      distinctId: getDeviceId(),
      userId,
      properties: traits,
    })
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error)
  }
}

export function setSuperProperties(properties: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.register({
      ...properties,
      app_version: app?.getVersion?.() || 'unknown',
      platform: process.platform,
    })
  } catch (error) {
    console.error('[Analytics] Failed to set super properties:', error)
  }
}

export function trackFeatureFlag(flagName: string, flagValue: unknown): void {
  trackEvent('feature_flag_evaluated', {
    flag_name: flagName,
    flag_value: String(flagValue),
  })
}

export async function flushAnalytics(): Promise<void> {
  const ph = getPostHog()
  if (!ph) return

  try {
    await ph.flushAsync()
  } catch (error) {
    console.error('[Analytics] Failed to flush:', error)
  }
}

export async function shutdownAnalytics(): Promise<void> {
  await flushAnalytics()

  const ph = getPostHog()
  if (ph) {
    ph.shutdown()
    posthog = null
  }
}

export function initAnalyticsCore(): void {
  if (ANALYTICS_DISABLED) {
    console.log('[Analytics] Analytics disabled (no POSTHOG_API_KEY set)')
    return
  }

  console.log('[Analytics] Initialized with device ID:', getDeviceId().slice(0, 8) + '...')

  setSuperProperties({
    app_name: 'RinaWarp Terminal Pro',
    app_version: app?.getVersion?.() || 'unknown',
    platform: process.platform,
    arch: process.arch,
  })

  trackEvent('app_started')
}
