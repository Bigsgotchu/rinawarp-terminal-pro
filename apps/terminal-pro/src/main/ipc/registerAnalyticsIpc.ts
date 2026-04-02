/**
 * IPC Handlers for Analytics
 *
 * Exposes analytics functions to the renderer process.
 */
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

type AnalyticsResult = {
  accepted: boolean
  enabled: boolean
  degraded?: boolean
  error?: string
}

type AnalyticsIpcResult = {
  ok: boolean
  accepted: boolean
  enabled: boolean
  degraded: boolean
  event: string
  error?: string
}

type FunnelStep = 'signup' | 'first_run' | 'first_block' | 'upgrade_view' | 'paid'

type AnalyticsDeps = {
  ipcMain: IpcMain
  trackFunnelStep: (step: string, properties?: Record<string, unknown>) => AnalyticsResult | undefined
  trackEvent: (event: string, properties?: Record<string, unknown>) => AnalyticsResult | undefined
  getUsageStatus: () => unknown
  isUsageTrackingEnabled: () => boolean
  enableUsageTracking: () => AnalyticsResult | undefined
  disableUsageTracking: () => void
  trackCommandExecuted: () => AnalyticsResult | undefined
  trackAISuggestionUsed: () => AnalyticsResult | undefined
  trackSelfHealingRun: () => AnalyticsResult | undefined
  trackTerminalSessionStart: () => AnalyticsResult | undefined
  logger?: Pick<Console, 'log'>
}

const VALID_FUNNEL_STEPS: ReadonlySet<FunnelStep> = new Set([
  'signup',
  'first_run',
  'first_block',
  'upgrade_view',
  'paid',
])

type IpcHandler = Parameters<IpcMain['handle']>[1]

function toIpcResult(result: AnalyticsResult | undefined, event: string): AnalyticsIpcResult {
  return {
    ok: Boolean(result?.accepted),
    accepted: Boolean(result?.accepted),
    enabled: Boolean(result?.enabled),
    degraded: Boolean(result?.degraded),
    event,
    error: result?.error,
  }
}

function invalidFunnelStepResult(step: string): AnalyticsIpcResult {
  return {
    ok: false,
    accepted: false,
    enabled: true,
    degraded: false,
    event: `funnel:${step}`,
    error: 'Invalid funnel step',
  }
}

function isValidFunnelStep(step: string): step is FunnelStep {
  return VALID_FUNNEL_STEPS.has(step as FunnelStep)
}

function replaceHandler(ipcMain: IpcMain, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

export function registerAnalyticsIpc(deps: AnalyticsDeps): void {
  const {
    ipcMain,
    trackFunnelStep,
    trackEvent,
    getUsageStatus,
    isUsageTrackingEnabled,
    enableUsageTracking,
    disableUsageTracking,
    trackCommandExecuted,
    trackAISuggestionUsed,
    trackSelfHealingRun,
    trackTerminalSessionStart,
    logger = console,
  } = deps

  const handleFunnelStep = async (
    _event: IpcMainInvokeEvent,
    step: string,
    properties?: Record<string, unknown>,
  ): Promise<AnalyticsIpcResult> => {
    if (!isValidFunnelStep(step)) {
      return invalidFunnelStepResult(step)
    }
    return toIpcResult(trackFunnelStep(step, properties), `funnel:${step}`)
  }

  replaceHandler(ipcMain, 'analytics:trackFunnelStep', handleFunnelStep)
  replaceHandler(ipcMain, 'rina:analytics:funnel', handleFunnelStep)

  replaceHandler(
    ipcMain,
    'analytics:trackEvent',
    async (_event: IpcMainInvokeEvent, event: string, properties?: Record<string, unknown>): Promise<AnalyticsIpcResult> =>
      toIpcResult(trackEvent(event, properties), event),
  )

  replaceHandler(ipcMain, 'analytics:getUsageStatus', async () => {
    return getUsageStatus()
  })

  replaceHandler(ipcMain, 'analytics:isUsageTrackingEnabled', async () => {
    return isUsageTrackingEnabled()
  })

  replaceHandler(ipcMain, 'analytics:enableUsageTracking', async () => {
    return toIpcResult(enableUsageTracking(), 'usage_tracking_enabled')
  })

  replaceHandler(ipcMain, 'analytics:disableUsageTracking', async () => {
    disableUsageTracking()
    return {
      ok: true,
      accepted: true,
      enabled: false,
      degraded: false,
      event: 'usage_tracking_disabled',
    }
  })

  replaceHandler(ipcMain, 'analytics:trackCommandExecuted', async () => {
    return toIpcResult(trackCommandExecuted(), 'command_executed')
  })

  replaceHandler(ipcMain, 'analytics:trackAISuggestionUsed', async () => {
    return toIpcResult(trackAISuggestionUsed(), 'ai_suggestion_used')
  })

  replaceHandler(ipcMain, 'analytics:trackSelfHealingRun', async () => {
    return toIpcResult(trackSelfHealingRun(), 'self_healing_run')
  })

  replaceHandler(ipcMain, 'analytics:trackTerminalSessionStart', async () => {
    return toIpcResult(trackTerminalSessionStart(), 'terminal_session_tracked')
  })

  logger.log('[IPC] Analytics handlers registered')
}
