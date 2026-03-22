import type { FixPlanResponse, FixPlanStep } from '../replies/renderPlanReplies.js'
import type { BrainEvent, BrainStats, ThinkingStep } from '../services/rendererEventTypes.js'
import type { Density as ThemeDensity } from '../theme/tokens.js'
import type { CapabilityPackModel } from '../workbench/store.js'

export interface RinaRendererWindow {
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
  rina: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    on: (channel: string, handler: (...args: unknown[]) => void) => () => void
    setMode: (mode: string) => Promise<{ ok: boolean; mode: string }>
    getMode: () => Promise<string>
    getStatus: () => Promise<unknown>
    getPlans: () => Promise<unknown[]>
    runAgent: (command: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) => Promise<unknown>
    conversationRoute: (
      command: string,
      opts?: { workspaceRoot?: string | null }
    ) => Promise<{
      rawText: string
      mode: 'chat' | 'question' | 'inspect' | 'execute' | 'follow_up' | 'recovery' | 'settings' | 'memory_update' | 'unclear'
      confidence: number
      workspaceId?: string
      references: { runId?: string; priorMessageId?: string; restoredSessionId?: string }
      allowedNextAction: 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'
      clarification?: { required: boolean; reason?: string; question?: string }
      executionCandidate?: { goal: string; target?: string; constraints?: string[]; risk: 'low' | 'medium' | 'high' }
    }>
    agentPlan: (args: { intentText: string; projectRoot: string }) => Promise<FixPlanResponse>
    executePlanStream: (args: {
      plan: FixPlanStep[]
      projectRoot: string
      confirmed: boolean
      confirmationText: string
    }) => Promise<{
      ok?: boolean
      runId?: string
      planRunId?: string
      haltedStepId?: string | null
      haltReason?: string
      error?: string
      code?: string
      retrySuggestion?: string
    }>
    executeCapability?: (args: {
      packKey: string
      projectRoot: string
      actionId?: string
      confirmed?: boolean
      confirmationText?: string
    }) => Promise<{
      ok?: boolean
      runId?: string
      planRunId?: string
      packKey?: string
      actionId?: string
      prompt?: string
      reasoning?: string
      plan?: FixPlanStep[]
      haltedStepId?: string | null
      haltReason?: string
      error?: string
      code?: string
      retrySuggestion?: string
    }>
    trackEvent?: (event: string, properties?: Record<string, unknown>) => Promise<{ ok?: boolean }>
    trackFunnelStep?: (step: string, properties?: Record<string, unknown>) => Promise<{ ok?: boolean }>
    getTools: () => Promise<unknown[]>
    getBrainStats: () => Promise<BrainStats>
    onBrainEvent: (cb: (event: BrainEvent) => void) => () => void
    onThinking: (cb: (step: ThinkingStep) => void) => () => void
    onStreamChunk: (cb: (evt: unknown) => void) => () => void
    onStreamEnd: (cb: (evt: unknown) => void) => () => void
    onPlanStepStart: (cb: (evt: unknown) => void) => () => void
    onPlanRunStart: (cb: (p: { planRunId: string }) => void) => () => void
    onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) => () => void
    onCustomEvent: (eventName: string, cb: (evt: unknown) => void) => void
    licenseRefresh: () => Promise<{
      tier?: string
      has_token?: boolean
      expires_at?: number | null
      customer_id?: string | null
      status?: string
    }>
    licenseState: () => Promise<{ tier?: string }>
    licenseCheckout?: (email?: string) => Promise<{ ok: boolean; error?: string; url?: string; sessionId?: string }>
    licenseCachedEmail?: () => Promise<{ email?: string | null }>
    openStripePortal: (email?: string) => Promise<{ ok: boolean; fallback?: boolean; error?: string }>
    marketplaceList?: () => Promise<{
      ok: boolean
      agents?: Array<{
        name: string
        description: string
        author: string
        version: string
        commands: unknown[]
        downloads?: number
        price?: number
        rating?: number | null
      }>
      error?: string
    }>
    installedAgents?: () => Promise<{
      ok: boolean
      agents?: Array<{ name: string; version?: string; permissions?: string[]; hasSignature?: boolean }>
      error?: string
    }>
    installMarketplaceAgent?: (args: { name: string; userEmail?: string }) => Promise<{
      ok: boolean
      agent?: { name: string; version: string; description: string; author: string; permissions?: string[]; commands?: unknown[] }
      error?: string
    }>
    capabilityPacks?: () => Promise<{
      ok: boolean
      source?: string
      error?: string
      capabilities?: CapabilityPackModel[]
    }>
    supportBundle: () => Promise<{ ok: boolean; error?: string; path?: string; bytes?: number }>
    openRunsFolder: () => Promise<{ ok: boolean; error?: string; path?: string }>
    runsList?: (limit?: number) => Promise<{
      ok: boolean
      runs?: Array<{
        sessionId: string
        createdAt: string
        updatedAt: string
        projectRoot?: string
        source?: string
        platform?: string
        commandCount: number
        failedCount: number
        latestCommand?: string
        latestExitCode?: number | null
        latestCwd?: string
        latestReceiptId?: string
        latestStartedAt?: string
        latestEndedAt?: string | null
        interrupted: boolean
      }>
      error?: string
    }>
    runsTail?: (args: { runId: string; sessionId: string; maxLines?: number; maxBytes?: number }) => Promise<{
      ok: boolean
      tail?: string
      error?: string
    }>
    revealRunReceipt: (receiptId: string) => Promise<{ ok: boolean; error?: string; path?: string }>
    workspaceDefault?: () => Promise<{ ok: boolean; path?: string }>
    autonomy: { enabled: boolean; level: string }
  }
  electronAPI?: {
    shell?: { openExternal: (url: string) => Promise<void> }
  }
  __rinaSettings?: {
    open: () => void
    close: () => void
    isOpen: () => boolean
  }
  __rinaDensity?: {
    get: () => ThemeDensity
    set: (value: ThemeDensity) => void
    toggle: () => ThemeDensity
  }
  RINAWARP_READY?: boolean
}
