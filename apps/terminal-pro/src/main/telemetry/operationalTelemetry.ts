import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type OperationalTelemetryEvent =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'rollback_triggered'
  | 'approval_denied'
  | 'workspace_selected'
  | 'first_build_run'
  | 'first_proof_generated'
  | 'proof_exported'
  | 'safe_fix_proposed'
  | 'safe_fix_approved'
  | 'memory_saved'
  | 'marketplace_opened'
  | 'crash_report_created'
  | 'update_check_started'
  | 'update_available'
  | 'update_downloaded'
  | 'update_restart_requested'
  | 'update_success'

export type OperationalTelemetrySettings = {
  enabled: boolean
  installId: string
  installPingSent: boolean
  lastActivePingDate?: string | null
  counters?: Partial<Record<OperationalTelemetryEvent, number>>
}

type AppLike = {
  getPath(name: 'userData'): string
  getVersion(): string
}

type FetchLike = (url: string, init: {
  method: 'POST'
  headers: Record<string, string>
  body: string
}) => Promise<unknown>

export type OperationalTelemetryDeps = {
  app: AppLike
  fetchImpl?: FetchLike
  fsImpl?: Pick<typeof fs, 'existsSync' | 'mkdirSync' | 'readFileSync' | 'writeFileSync'>
  now?: () => Date
  baseUrl?: string
}

export type OperationalTelemetrySendResult = {
  accepted: boolean
  enabled: boolean
  degraded?: boolean
  error?: string
}

const DEFAULT_BASE_URL = 'https://rinawarptech.com'
const SETTINGS_FILE = 'operational-telemetry.json'
const OPERATIONAL_TELEMETRY_EVENTS = new Set<OperationalTelemetryEvent>([
  'task_started',
  'task_completed',
  'task_failed',
  'rollback_triggered',
  'approval_denied',
  'workspace_selected',
  'first_build_run',
  'first_proof_generated',
  'proof_exported',
  'safe_fix_proposed',
  'safe_fix_approved',
  'memory_saved',
  'marketplace_opened',
  'crash_report_created',
  'update_check_started',
  'update_available',
  'update_downloaded',
  'update_restart_requested',
  'update_success',
])

function normalizeBaseUrl(input?: string): string {
  const value = String(input || process.env.RINAWARP_TELEMETRY_BASE_URL || DEFAULT_BASE_URL).trim()
  return value.replace(/\/+$/, '')
}

function defaultSettings(): OperationalTelemetrySettings {
  return {
    enabled: process.env.RINAWARP_TELEMETRY_DISABLED !== '1',
    installId: crypto.randomUUID(),
    installPingSent: false,
    lastActivePingDate: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSettings(
  filePath: string,
  fsImpl: NonNullable<OperationalTelemetryDeps['fsImpl']>,
): OperationalTelemetrySettings {
  try {
    if (!fsImpl.existsSync(filePath)) return defaultSettings()
    const parsed = JSON.parse(fsImpl.readFileSync(filePath, 'utf8'))
    if (!isRecord(parsed)) return defaultSettings()

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      installId: typeof parsed.installId === 'string' && parsed.installId ? parsed.installId : crypto.randomUUID(),
      installPingSent: parsed.installPingSent === true,
      lastActivePingDate: typeof parsed.lastActivePingDate === 'string' ? parsed.lastActivePingDate : null,
      counters: isRecord(parsed.counters) ? sanitizeCounters(parsed.counters) : {},
    }
  } catch {
    return defaultSettings()
  }
}

function sanitizeCounters(input: Record<string, unknown>): Partial<Record<OperationalTelemetryEvent, number>> {
  const counters: Partial<Record<OperationalTelemetryEvent, number>> = {}
  for (const [event, value] of Object.entries(input)) {
    if (!isOperationalTelemetryEvent(event)) continue
    const count = Number(value)
    counters[event] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  }
  return counters
}

export class OperationalTelemetry {
  private readonly app: AppLike
  private readonly fetchImpl: FetchLike
  private readonly fsImpl: NonNullable<OperationalTelemetryDeps['fsImpl']>
  private readonly now: () => Date
  private readonly baseUrl: string
  private readonly settingsPath: string
  private settings: OperationalTelemetrySettings | null = null

  constructor(deps: OperationalTelemetryDeps) {
    this.app = deps.app
    this.fetchImpl = deps.fetchImpl || (globalThis.fetch as unknown as FetchLike)
    this.fsImpl = deps.fsImpl || fs
    this.now = deps.now || (() => new Date())
    this.baseUrl = normalizeBaseUrl(deps.baseUrl)
    this.settingsPath = path.join(this.app.getPath('userData'), SETTINGS_FILE)
  }

  getSettings(): OperationalTelemetrySettings {
    if (!this.settings) {
      this.settings = readSettings(this.settingsPath, this.fsImpl)
      this.persist()
    }
    return { ...this.settings }
  }

  setEnabled(enabled: boolean): OperationalTelemetrySettings {
    const current = this.getMutableSettings()
    current.enabled = enabled
    this.persist()
    return this.getSettings()
  }

  async sendInstallPingOnce(): Promise<OperationalTelemetrySendResult> {
    const settings = this.getMutableSettings()
    if (settings.installPingSent) {
      return { accepted: false, enabled: settings.enabled, degraded: true, error: 'Install ping already sent' }
    }

    const result = await this.post('/v1/telemetry/install', this.basePayload())
    if (result.accepted) {
      settings.installPingSent = true
      this.persist()
    }
    return result
  }

  async sendDailyActivePing(): Promise<OperationalTelemetrySendResult> {
    const settings = this.getMutableSettings()
    const today = this.now().toISOString().slice(0, 10)
    if (settings.lastActivePingDate === today) {
      return { accepted: false, enabled: settings.enabled, degraded: true, error: 'Daily active ping already sent' }
    }

    const result = await this.post('/v1/telemetry/active', this.basePayload())
    if (result.accepted) {
      settings.lastActivePingDate = today
      this.persist()
    }
    return result
  }

  async recordCounter(event: OperationalTelemetryEvent): Promise<OperationalTelemetrySendResult> {
    this.incrementCounter(event)
    return this.post('/v1/telemetry/event', {
      ...this.basePayload(),
      event,
      count: 1,
    })
  }

  getCounterSnapshot(): Partial<Record<OperationalTelemetryEvent, number>> {
    return { ...(this.getMutableSettings().counters || {}) }
  }

  private incrementCounter(event: OperationalTelemetryEvent): void {
    const settings = this.getMutableSettings()
    settings.counters = settings.counters || {}
    settings.counters[event] = Number(settings.counters[event] || 0) + 1
    this.persist()
  }

  private getMutableSettings(): OperationalTelemetrySettings {
    if (!this.settings) {
      this.settings = readSettings(this.settingsPath, this.fsImpl)
      this.persist()
    }
    return this.settings
  }

  private basePayload(): Record<string, unknown> {
    const settings = this.getMutableSettings()
    return {
      installId: settings.installId,
      version: this.app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    }
  }

  private async post(pathname: string, payload: Record<string, unknown>): Promise<OperationalTelemetrySendResult> {
    const settings = this.getMutableSettings()
    if (!settings.enabled) {
      return { accepted: false, enabled: false }
    }

    try {
      await this.fetchImpl(`${this.baseUrl}${pathname}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return { accepted: true, enabled: true }
    } catch (error) {
      return {
        accepted: false,
        enabled: true,
        degraded: true,
        error: error instanceof Error ? error.message : 'Operational telemetry unavailable',
      }
    }
  }

  private persist(): void {
    if (!this.settings) return
    try {
      this.fsImpl.mkdirSync(path.dirname(this.settingsPath), { recursive: true })
      this.fsImpl.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8')
    } catch {
      // Telemetry settings must never block runtime startup.
    }
  }
}

let operationalTelemetry: OperationalTelemetry | null = null

export function initOperationalTelemetry(deps: OperationalTelemetryDeps): OperationalTelemetry {
  operationalTelemetry = new OperationalTelemetry(deps)
  return operationalTelemetry
}

export function getOperationalTelemetry(): OperationalTelemetry | null {
  return operationalTelemetry
}

export function isOperationalTelemetryEvent(event: string): event is OperationalTelemetryEvent {
  return OPERATIONAL_TELEMETRY_EVENTS.has(event as OperationalTelemetryEvent)
}

export function startOperationalTelemetrySession(): void {
  const telemetry = getOperationalTelemetry()
  if (!telemetry) return
  void telemetry.sendInstallPingOnce()
  void telemetry.sendDailyActivePing()
}
