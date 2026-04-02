import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { trackEvent, type AnalyticsDispatchResult, type AnalyticsEvent } from './core.js'

const require = createRequire(import.meta.url)
const electron = require('electron/main') as typeof import('electron')
const { app } = electron

type FunnelMeta = {
  lastAppStartAt?: number
  firstRunAt?: number
  firstBlockAt?: number
}

type FunnelStep = 'signup' | 'first_run' | 'first_block' | 'upgrade_view' | 'paid'

const funnelStepToKey: Record<string, keyof typeof funnelState> = {
  signup: 'signupTracked',
  first_run: 'firstRunTracked',
  first_block: 'firstBlockTracked',
  upgrade_view: 'upgradeViewTracked',
  paid: 'paidTracked',
}

let funnelState = {
  signupTracked: false,
  firstRunTracked: false,
  firstBlockTracked: false,
  upgradeViewTracked: false,
  paidTracked: false,
}

function funnelMetaPath(): string {
  const userDataPath = app?.getPath?.('userData') || '.'
  return path.join(userDataPath, 'analytics-funnel.json')
}

function loadFunnelMeta(): FunnelMeta {
  try {
    const fp = funnelMetaPath()
    if (!fs.existsSync(fp)) return {}
    const raw = fs.readFileSync(fp, 'utf8')
    const parsed = JSON.parse(raw) as FunnelMeta
    return parsed || {}
  } catch {
    return {}
  }
}

function saveFunnelMeta(meta: FunnelMeta): void {
  try {
    const fp = funnelMetaPath()
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, JSON.stringify(meta, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

let funnelMeta: FunnelMeta = loadFunnelMeta()

export function trackFunnelStep(step: FunnelStep, properties?: Record<string, unknown>): AnalyticsDispatchResult {
  const eventMap: Record<FunnelStep, AnalyticsEvent> = {
    signup: 'funnel_signup',
    first_run: 'funnel_first_run',
    first_block: 'funnel_first_block',
    upgrade_view: 'funnel_upgrade_view',
    paid: 'funnel_paid',
  }

  const stateKey = funnelStepToKey[step]
  if (funnelState[stateKey]) {
    return {
      accepted: false,
      enabled: true,
      degraded: true,
      error: `Funnel step already tracked: ${step}`,
    }
  }
  funnelState[stateKey] = true

  const now = Date.now()
  const enriched: Record<string, unknown> = {
    ...properties,
    funnel_step: step,
    funnel_order: ['signup', 'first_run', 'first_block', 'upgrade_view', 'paid'].indexOf(step) + 1,
  }

  if (step === 'first_run') {
    if (!funnelMeta.firstRunAt) funnelMeta.firstRunAt = now
    const base = funnelMeta.lastAppStartAt || now
    const delta = Math.max(0, now - base)
    enriched.time_to_first_run_ms = delta
    enriched.first_run_within_10m = delta <= 10 * 60 * 1000
  }

  if (step === 'first_block') {
    if (!funnelMeta.firstBlockAt) funnelMeta.firstBlockAt = now
    const base = funnelMeta.lastAppStartAt || now
    const delta = Math.max(0, now - base)
    enriched.time_to_first_block_ms = delta
    enriched.first_block_within_10m = delta <= 10 * 60 * 1000
  }

  saveFunnelMeta(funnelMeta)
  return trackEvent(eventMap[step], enriched)
}

export function resetFunnelState(): void {
  funnelState = {
    signupTracked: false,
    firstRunTracked: false,
    firstBlockTracked: false,
    upgradeViewTracked: false,
    paidTracked: false,
  }
}

export function markAnalyticsAppStart(): void {
  funnelMeta.lastAppStartAt = Date.now()
  saveFunnelMeta(funnelMeta)
}
