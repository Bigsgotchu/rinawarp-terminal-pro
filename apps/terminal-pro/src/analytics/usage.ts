import * as electron from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { trackEvent, type AnalyticsDispatchResult } from './core.js'

const { app } = electron

interface UsageMetrics {
  commandsExecuted: number
  aiSuggestionsUsed: number
  selfHealingRuns: number
  terminalSessions: number
  totalSessionTimeMs: number
}

const DEFAULT_USAGE: UsageMetrics = {
  commandsExecuted: 0,
  aiSuggestionsUsed: 0,
  selfHealingRuns: 0,
  terminalSessions: 0,
  totalSessionTimeMs: 0,
}

const FREE_TIER_LIMITS = {
  commandsExecuted: 100,
  aiSuggestionsUsed: 20,
  selfHealingRuns: 10,
  terminalSessions: 50,
  totalSessionTimeMs: 3600000,
}

function usageMetricsPath(): string {
  const userDataPath = app?.getPath?.('userData') || '.'
  return path.join(userDataPath, 'analytics-usage.json')
}

function loadUsageMetrics(): UsageMetrics {
  try {
    const fp = usageMetricsPath()
    if (!fs.existsSync(fp)) return { ...DEFAULT_USAGE }
    const raw = fs.readFileSync(fp, 'utf8')
    const parsed = JSON.parse(raw) as UsageMetrics
    return parsed || { ...DEFAULT_USAGE }
  } catch {
    return { ...DEFAULT_USAGE }
  }
}

function saveUsageMetrics(): void {
  try {
    const fp = usageMetricsPath()
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, JSON.stringify(usageMetrics, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

let usageMetrics: UsageMetrics = loadUsageMetrics()
let usageTrackingEnabled = false

export function isUsageTrackingEnabled(): boolean {
  return usageTrackingEnabled
}

export function enableUsageTracking(): AnalyticsDispatchResult {
  usageTrackingEnabled = true
  return trackEvent('usage_tracking_enabled')
}

export function disableUsageTracking(): void {
  usageTrackingEnabled = false
}

export function getUsageStatus(): {
  approachingLimit: boolean
  atLimit: boolean
  limits: typeof FREE_TIER_LIMITS
  usage: UsageMetrics
  usagePercent: Record<keyof UsageMetrics, number>
} {
  const usagePercent: Record<keyof UsageMetrics, number> = {
    commandsExecuted: Math.min(100, (usageMetrics.commandsExecuted / FREE_TIER_LIMITS.commandsExecuted) * 100),
    aiSuggestionsUsed: Math.min(100, (usageMetrics.aiSuggestionsUsed / FREE_TIER_LIMITS.aiSuggestionsUsed) * 100),
    selfHealingRuns: Math.min(100, (usageMetrics.selfHealingRuns / FREE_TIER_LIMITS.selfHealingRuns) * 100),
    terminalSessions: Math.min(100, (usageMetrics.terminalSessions / FREE_TIER_LIMITS.terminalSessions) * 100),
    totalSessionTimeMs: Math.min(100, (usageMetrics.totalSessionTimeMs / FREE_TIER_LIMITS.totalSessionTimeMs) * 100),
  }

  const approachingLimit = Object.values(usagePercent).some((p) => p >= 80)
  const atLimit = Object.values(usagePercent).some((p) => p >= 100)

  return {
    approachingLimit,
    atLimit,
    limits: FREE_TIER_LIMITS,
    usage: { ...usageMetrics },
    usagePercent,
  }
}

export function trackCommandExecuted(): AnalyticsDispatchResult {
  if (!usageTrackingEnabled) {
    return {
      accepted: false,
      enabled: false,
      degraded: true,
      error: 'Usage tracking disabled',
    }
  }
  usageMetrics.commandsExecuted += 1
  saveUsageMetrics()

  const status = getUsageStatus()
  return trackEvent('command_executed', {
    total_commands: usageMetrics.commandsExecuted,
    usage_percent: status.usagePercent.commandsExecuted,
    approaching_limit: status.approachingLimit,
  })
}

export function trackAISuggestionUsed(): AnalyticsDispatchResult {
  if (!usageTrackingEnabled) {
    return {
      accepted: false,
      enabled: false,
      degraded: true,
      error: 'Usage tracking disabled',
    }
  }
  usageMetrics.aiSuggestionsUsed += 1
  saveUsageMetrics()

  const status = getUsageStatus()
  return trackEvent('ai_suggestion_used', {
    total_suggestions: usageMetrics.aiSuggestionsUsed,
    usage_percent: status.usagePercent.aiSuggestionsUsed,
    approaching_limit: status.approachingLimit,
  })
}

export function trackSelfHealingRun(): AnalyticsDispatchResult {
  if (!usageTrackingEnabled) {
    return {
      accepted: false,
      enabled: false,
      degraded: true,
      error: 'Usage tracking disabled',
    }
  }
  usageMetrics.selfHealingRuns += 1
  saveUsageMetrics()

  const status = getUsageStatus()
  return trackEvent('self_healing_run', {
    total_runs: usageMetrics.selfHealingRuns,
    usage_percent: status.usagePercent.selfHealingRuns,
    approaching_limit: status.approachingLimit,
  })
}

export function trackTerminalSessionStart(): AnalyticsDispatchResult {
  if (!usageTrackingEnabled) {
    return {
      accepted: false,
      enabled: false,
      degraded: true,
      error: 'Usage tracking disabled',
    }
  }
  usageMetrics.terminalSessions += 1
  saveUsageMetrics()

  const status = getUsageStatus()
  return trackEvent('terminal_session_tracked', {
    total_sessions: usageMetrics.terminalSessions,
    usage_percent: status.usagePercent.terminalSessions,
    approaching_limit: status.approachingLimit,
  })
}

export function addSessionTime(ms: number): void {
  if (!usageTrackingEnabled) return
  usageMetrics.totalSessionTimeMs += ms
}
