/**
 * RinaWarp Terminal Pro - Production Renderer
 *
 * This module handles all DOM queries, event listeners, and panel logic
 * for the production build. It uses the window.rina API exposed via preload
 * to communicate with the main process.
 *
 * No inline scripts - all logic is in this module for CSP compliance.
 */

import { BasePanel } from './components/basePanel.js'
import { createActionsController } from './actions/actionController.js'
import { globalShortcutRegistry } from './keyboard/shortcutRegistry.js'
import { initSettingsUi } from './settings/bootstrap.js'
import { hasRunProof } from './workbench/proof.js'
import { renderWorkbench } from './workbench/render.js'
import {
  WorkbenchStore,
  type CapabilityPackModel,
  type FixBlockModel,
  type FixStepModel,
  type LicenseTier,
  type MessageBlock,
  type WorkbenchState,
} from './workbench/store.js'

// ============================================================
// Type Definitions for window.rina API
// ============================================================

interface RinaWindow {
  rina: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    on: (channel: string, handler: (...args: unknown[]) => void) => () => void
    setMode: (mode: string) => Promise<{ ok: boolean; mode: string }>
    getMode: () => Promise<string>
    getStatus: () => Promise<unknown>
    getPlans: () => Promise<unknown[]>
    runAgent: (command: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) => Promise<unknown>
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
    onBrainEvent: (cb: (event: BrainEvent) => void) => void
    onThinking: (cb: (step: ThinkingStep) => void) => void
    onStreamChunk: (cb: (evt: unknown) => void) => void
    onStreamEnd: (cb: (evt: unknown) => void) => void
    onPlanStepStart: (cb: (evt: unknown) => void) => void
    onPlanRunStart: (cb: (p: { planRunId: string }) => void) => void
    onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) => void
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
    get: () => Density
    set: (value: Density) => void
    toggle: () => Density
  }
}

interface BrainStats {
  total: number
  intent: number
  planning: number
  reasoning: number
  tool: number
  memory: number
  action: number
  result: number
  error: number
}

interface BrainEvent {
  type: string
  message: string
  progress?: number
}

interface ThinkingStep {
  time: number
  message: string
}

type FixPlanStep = {
  stepId?: string
  tool?: string
  input?: {
    command?: string
    cwd?: string
    timeoutMs?: number
  }
  risk?: 'inspect' | 'safe-write' | 'high-impact'
  risk_level?: 'low' | 'medium' | 'high'
  requires_confirmation?: boolean
}

type FixPlanResponse = {
  id?: string
  reasoning?: string
  steps?: FixPlanStep[]
}

type RendererPlanRisk = 'inspect' | 'safe-write' | 'high-impact'
type RendererRiskLevel = 'low' | 'medium' | 'high'

type FailedStepContext = {
  runId: string
  streamId: string
  command: string
  cwd: string
}

const WORKBENCH_STORAGE_KEY = 'rinawarp.workbench.state.v1'
const DENSITY_STORAGE_KEY = 'rw-density'
const RW_SKIN_STORAGE_KEY = 'rw-skin'

// ============================================================
// Unified Runtime Style System
// Single <style> tag that contains all runtime CSS in deterministic order
// ============================================================

type StyleSegment =
  | 'fixblock'
  | 'density'
  | 'tokens'
  | 'layout'
  | 'skin'
  | 'misc'

const RUNTIME_STYLE_ID = 'rw-runtime-styles'
const styleSegments = new Map<StyleSegment, string>()

function renderRuntimeStyles(): void {
  let tag = document.getElementById(RUNTIME_STYLE_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = RUNTIME_STYLE_ID
    document.head.appendChild(tag)
  }

  // Fixed order = deterministic, no surprises
  const order: StyleSegment[] = ['fixblock', 'density', 'tokens', 'layout', 'skin', 'misc']
  tag.textContent = order
    .map((k) => {
      const css = styleSegments.get(k)
      return css ? `/* --- ${k} --- */
${css}
` : ''
    })
    .join('\n')
}

function setStyleSegment(key: StyleSegment, css: string): void {
  if (styleSegments.get(key) === css) return
  styleSegments.set(key, css)
  renderRuntimeStyles()
}

function clearStyleSegment(key: StyleSegment): void {
  if (!styleSegments.has(key)) return
  styleSegments.delete(key)
  renderRuntimeStyles()
}

declare const window: RinaWindow

function inferPlanRisk(step: Partial<FixPlanStep>): RendererPlanRisk {
  if (step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact') return 'high-impact'
  if (step.risk_level === 'medium' || step.risk === 'safe-write') return 'safe-write'
  return 'inspect'
}

function inferRiskLevel(risk: RendererPlanRisk): RendererRiskLevel {
  if (risk === 'high-impact') return 'high'
  if (risk === 'safe-write') return 'medium'
  return 'low'
}

function normalizePlanStep(step: FixPlanStep): FixPlanStep {
  const risk = inferPlanRisk(step)
  return {
    ...step,
    risk,
    risk_level: inferRiskLevel(risk),
    requires_confirmation: risk === 'high-impact',
  }
}

function normalizePlanSteps(steps: FixPlanStep[]): FixPlanStep[] {
  return steps.map((step) => normalizePlanStep(step))
}

function didExecutionStart(result: { runId?: string; code?: string; ok?: boolean } | null | undefined): boolean {
  if (!result?.runId) return false
  return result.code !== 'PLAN_HALTED' && result.code !== 'MISSING_PROJECT_ROOT' && result.code !== 'EXEC_BACKEND_UNAVAILABLE'
}

// ============================================================
// Panel Classes extending BasePanel
// ============================================================

class ExecutionTracePanel extends BasePanel {
  private store: WorkbenchStore

  constructor(selector: string, store: WorkbenchStore) {
    super(selector)
    this.store = store
  }

  appendOutput(output: string, className = ''): void {
    this.store.dispatch({
      type: 'executionTrace/blockUpsert',
      block: {
        id: `info:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        status: className === 'error' ? 'failed' : 'info',
        output,
        ts: Date.now(),
      },
    })
  }
}

class AgentPanel extends BasePanel {
  private store: WorkbenchStore

  constructor(selector: string, store: WorkbenchStore) {
    super(selector)
    this.store = store

    // Listen for agent step events
    window.rina.onPlanStepStart((step) => {
      this.showAgentStep(step)
    })

    window.rina.onPlanRunStart(({ planRunId }) => {
      this.appendAgentOutput(`<div class="agent-step start">Starting plan: ${escapeHtml(planRunId)}</div>`, [
        agentStepBlock('start', `Starting plan: ${planRunId}`),
      ])
    })

    window.rina.onPlanRunEnd(({ planRunId, ok, haltedBecause }) => {
      const status = ok ? 'completed' : `halted: ${haltedBecause || 'unknown'}`
      this.appendAgentOutput(`<div class="agent-step end">Plan ${escapeHtml(planRunId)} ${escapeHtml(status)}</div>`, [
        agentStepBlock('end', `Plan ${planRunId} ${status}`),
      ])
    })
  }

  showAgentStep(step: unknown): void {
    const stepData = step as { stepIndex?: number; name?: string; status?: string }
    this.appendAgentOutput(
      `<div class="agent-step running">Step ${escapeHtml(stepData.stepIndex ?? '?')}: ${escapeHtml(stepData.name ?? 'running')}</div>`,
      [agentStepBlock('running', `Step ${stepData.stepIndex ?? '?'}: ${stepData.name ?? 'running'}`)]
    )
  }

  appendAgentOutput(html: string, content?: MessageBlock[]): void {
    this.store.dispatch({
      type: 'chat/add',
      msg: {
        id: `agent:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        role: 'system',
        content,
        html,
        ts: Date.now(),
        workspaceKey: getWorkspaceKeyFromStore(this.store),
      },
    })
  }

  mountFixBlock(fix: FixBlockModel): void {
    this.store.dispatch({ type: 'fix/upsert', fix })
  }
}

class CodePanel extends BasePanel {
  private store: WorkbenchStore | null

  constructor(selector: string, store?: WorkbenchStore) {
    super(selector)
    this.store = store ?? null
  }

  async refresh(): Promise<void> {
    try {
      const workspaceRoot = this.store ? getAgentWorkspaceRootFromStore(this.store) : getAgentWorkspaceRoot()
      const files = (await window.rina.invoke(
        'rina:code:listFiles',
        workspaceRoot ? { projectRoot: workspaceRoot, limit: 100 } : { limit: 100 }
      )) as {
        ok: boolean
        files?: string[]
      }
      if (files.ok && files.files) {
        this.clearContent()
        files.files.forEach((file: string) => {
          const row = document.createElement('div')
          row.className = 'code-file'
          row.textContent = file
          this.appendContent(row)
        })
      }
    } catch (error) {
      console.error('Failed to list files:', error)
    }
  }
}

class DiagnosticsPanel extends BasePanel {
  constructor(selector: string) {
    super(selector)
    this.updateStats()
  }

  async updateStats(): Promise<void> {
    try {
      const stats = (await window.rina.invoke('rina:getStatus')) as {
        mode?: string
        tools?: unknown[]
        agentRunning?: boolean
        memoryStats?: {
          conversationCount?: number
          learnedCommandsCount?: number
          projectsCount?: number
        }
      }

      this.clearContent()
      ;[
        ['Mode', stats.mode || 'unknown'],
        ['Tools', String(stats.tools?.length || 0)],
        ['Agent Running', stats.agentRunning ? 'Yes' : 'No'],
        ['Conversations', String(stats.memoryStats?.conversationCount || 0)],
        ['Learned Commands', String(stats.memoryStats?.learnedCommandsCount || 0)],
      ].forEach(([label, value]) => {
        const item = document.createElement('div')
        item.className = 'stat-item'

        const labelEl = document.createElement('span')
        labelEl.className = 'stat-label'
        labelEl.textContent = `${label}:`

        const valueEl = document.createElement('span')
        valueEl.className = 'stat-value'
        valueEl.textContent = value

        item.appendChild(labelEl)
        item.appendChild(valueEl)
        this.appendContent(item)
      })
    } catch (error) {
      console.error('Failed to update diagnostics:', error)
    }
  }
}

class BrainPanel extends BasePanel {
  private visualizationElement: HTMLElement | null = null
  private statsElement: HTMLElement | null = null

  constructor(selector: string) {
    super(selector)

    // Get visualization and stats elements
    this.visualizationElement = this.root.querySelector('#brain-visualization')
    this.statsElement = this.root.querySelector('#brain-stats')

    // Listen for brain events
    window.rina.onBrainEvent((event) => {
      this.addBrainThought(event)
    })

    // Update stats periodically
    this.updateStats()
    setInterval(() => this.updateStats(), 5000)
  }

  addBrainThought(event: BrainEvent): void {
    const icons: Record<string, string> = {
      intent: '🎯',
      planning: '📋',
      reasoning: '🧠',
      tool: '🔧',
      memory: '💾',
      action: '⚡',
      result: '✅',
      error: '❌',
    }

    const icon = icons[event.type] || '•'
    const truncatedMessage = event.message.length > 60 ? event.message.substring(0, 60) + '...' : event.message
    const wrapper = document.createElement('div')
    wrapper.className = 'brain-flow-wrapper'

    const flow = document.createElement('div')
    flow.className = 'brain-flow'

    const iconEl = document.createElement('div')
    iconEl.className = `brain-icon ${event.type}`
    iconEl.textContent = icon

    const stepEl = document.createElement('div')
    stepEl.className = 'brain-step'

    const labelEl = document.createElement('div')
    labelEl.className = 'brain-label'
    labelEl.textContent = event.type.toUpperCase()

    const textEl = document.createElement('div')
    textEl.className = 'brain-text'
    textEl.textContent = truncatedMessage

    stepEl.appendChild(labelEl)
    stepEl.appendChild(textEl)

    if (event.progress !== undefined) {
      const progressBar = document.createElement('div')
      progressBar.className = 'progress-bar'
      const progressFill = document.createElement('div')
      progressFill.className = 'progress-fill'
      progressFill.style.width = `${event.progress}%`
      progressBar.appendChild(progressFill)
      stepEl.appendChild(progressBar)
    }

    flow.appendChild(iconEl)
    flow.appendChild(stepEl)
    wrapper.appendChild(flow)
    this.appendContent(wrapper)

    // Keep only last 10 thoughts
    const panelBody = this.root.querySelector('.rw-panel-body')
    if (panelBody && panelBody.children.length > 10) {
      panelBody.removeChild(panelBody.firstChild!)
    }
  }

  async updateStats(): Promise<void> {
    try {
      const stats = await window.rina.getBrainStats()

      if (this.statsElement) {
        this.statsElement.replaceChildren()
        ;[
          ['text-teal', String(stats.total), 'Total Thoughts'],
          ['text-hot-pink', String(stats.intent), 'Intent'],
          ['text-coral', String(stats.planning), 'Planning'],
          ['text-babyblue', String(stats.tool), 'Tools'],
          ['text-purple', String(stats.memory), 'Memory'],
          ['text-green', String(stats.result), 'Results'],
        ].forEach(([valueClass, value, label]) => {
          const stat = document.createElement('div')
          stat.className = 'brain-stat'

          const valueEl = document.createElement('div')
          valueEl.className = `brain-stat-value ${valueClass}`
          valueEl.textContent = value

          const labelEl = document.createElement('div')
          labelEl.className = 'brain-stat-label'
          labelEl.textContent = label

          stat.appendChild(valueEl)
          stat.appendChild(labelEl)
          this.statsElement!.appendChild(stat)
        })
      }
    } catch (error) {
      console.error('Failed to update brain stats:', error)
    }
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

let currentWorkspaceRoot = '__none__'
const liveRunIdByStreamId = new Map<string, string>()
const trackedProofRunIds = new Set<string>()
let statusSummaryResetTimer: ReturnType<typeof setTimeout> | null = null

function setWorkspaceRoot(root?: string | null): void {
  const normalized = typeof root === 'string' ? root.trim() : ''
  currentWorkspaceRoot = normalized || '__none__'
}

function getWorkspaceKey(): string {
  return currentWorkspaceRoot
}

function getAgentWorkspaceRoot(): string | null {
  return currentWorkspaceRoot === '__none__' ? null : currentWorkspaceRoot
}

function getWorkspaceKeyFromStore(store: WorkbenchStore): string {
  return store.getState().workspaceKey || '__none__'
}

function getAgentWorkspaceRootFromStore(store: WorkbenchStore): string | null {
  const workspaceKey = getWorkspaceKeyFromStore(store)
  return workspaceKey === '__none__' ? null : workspaceKey
}

function setTransientStatusSummary(store: WorkbenchStore, message: string, durationMs = 1800): void {
  store.dispatch({ type: 'ui/setStatusSummary', text: message })
  if (statusSummaryResetTimer) clearTimeout(statusSummaryResetTimer)
  statusSummaryResetTimer = setTimeout(() => {
    store.dispatch({ type: 'ui/setStatusSummary', text: null })
    statusSummaryResetTimer = null
  }, durationMs)
}

function getSnapshotAnalyticsByWorkspace(snapshot: unknown): Record<string, WorkbenchState['analytics']> {
  if (!snapshot || typeof snapshot !== 'object') return {}
  const candidate = (snapshot as { analyticsByWorkspace?: unknown }).analyticsByWorkspace
  if (!candidate || typeof candidate !== 'object') return {}
  return candidate as Record<string, WorkbenchState['analytics']>
}

async function trackRendererEvent(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    await window.rina.trackEvent?.(event, properties)
  } catch {
    // Analytics is optional.
  }
}

async function trackRendererFunnel(step: 'first_run' | 'first_block', properties?: Record<string, unknown>): Promise<void> {
  try {
    await window.rina.trackFunnelStep?.(step, properties)
  } catch {
    // Analytics is optional.
  }
}

type RinaReplyResult = {
  text?: string
  error?: string
  intent?: string
  requiresConfirmation?: boolean
  rina?: {
    output?: unknown
    error?: string
    intent?: string
  }
}

type StructuredCommandReply = {
  command: string
  success: boolean
  outputText: string
  durationMs?: number | null
  runId?: string
  sessionId?: string
  receiptId?: string
  exitCode?: number | null
}

function isExecutionPrompt(prompt: string): boolean {
  return /\b(build|test|tests|deploy|lint|fix|repair)\b/i.test(prompt)
}

function renderExecutionPlanReply(prompt: string, plan: FixPlanResponse): string {
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  const intro = plan.reasoning?.trim() || `I mapped "${prompt}" to a receipts-backed run.`
  const stepItems = steps
    .slice(0, 6)
    .map((step, index) => {
      const title = step.stepId || `Step ${index + 1}`
      const command = String(step.input?.command || '').trim()
      return `<li><strong>${escapeHtml(title)}</strong>${command ? `<div class="rw-reply-inline-code">${escapeHtml(command)}</div>` : ''}</li>`
    })
    .join('')

  return `
    ${renderMessageBubble(intro)}
    ${renderReplyCard({
      label: 'Plan',
      badge: 'Receipts-backed',
      body: `<ul class="rw-reply-list">${stepItems || '<li>No plan steps returned.</li>'}</ul>`,
    })}
  `
}

function bubbleBlock(text: string): MessageBlock {
  return { type: 'bubble', text }
}

function agentStepBlock(statusClass: 'start' | 'running' | 'end', text: string): MessageBlock {
  return { type: 'agent-step', statusClass, text }
}

function replyCardBlock(args: { label: string; badge?: string; bodyHtml: string; className?: string }): MessageBlock {
  return {
    type: 'reply-card',
    label: args.label,
    badge: args.badge,
    className: args.className,
    bodyHtml: args.bodyHtml,
  }
}

function buildExecutionPlanContent(prompt: string, plan: FixPlanResponse, requirements: PlanCapabilityRequirement[] = []): MessageBlock[] {
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  const intro = plan.reasoning?.trim() || `I mapped "${prompt}" to a receipts-backed run.`
  const stepItems = steps
    .slice(0, 6)
    .map((step, index) => {
      const title = step.stepId || `Step ${index + 1}`
      const command = String(step.input?.command || '').trim()
      return `<li><strong>${escapeHtml(title)}</strong>${command ? `<div class="rw-reply-inline-code">${escapeHtml(command)}</div>` : ''}</li>`
    })
    .join('')

  const blocks: MessageBlock[] = [
    bubbleBlock(intro),
    replyCardBlock({
      label: 'Plan',
      badge: 'Receipts-backed',
      bodyHtml: `<ul class="rw-reply-list">${stepItems || '<li>No plan steps returned.</li>'}</ul>`,
    }),
  ]
  const capabilityCard = buildPlanCapabilityCard(requirements)
  if (capabilityCard) blocks.push(capabilityCard)
  return blocks
}

function renderMessageBubble(text: string): string {
  return `<div class="rw-message-bubble">${escapeHtml(text)}</div>`
}

function renderInlineActions(
  actions: Array<{ label: string; tab?: string; prompt?: string }>
): string {
  const buttons = actions
    .map((action) => {
      if (action.prompt) {
        return `<button class="rw-inline-action" type="button" data-agent-prompt="${escapeHtml(action.prompt)}">${escapeHtml(action.label)}</button>`
      }
      if (action.tab) {
        return `<button class="rw-inline-action" type="button" data-tab="${escapeHtml(action.tab)}">${escapeHtml(action.label)}</button>`
      }
      return ''
    })
    .filter(Boolean)
    .join('')

  return buttons ? `<div class="rw-inline-actions">${buttons}</div>` : ''
}

function renderReplyCard(args: { label: string; badge?: string; body: string; className?: string }): string {
  const classes = ['rw-reply-card', args.className].filter(Boolean).join(' ')
  const head = args.badge
    ? `
      <div class="rw-reply-card-head">
        <div class="rw-reply-card-label">${escapeHtml(args.label)}</div>
        <div class="rw-reply-card-badge">${escapeHtml(args.badge)}</div>
      </div>
    `
    : `<div class="rw-reply-card-label">${escapeHtml(args.label)}</div>`

  return `
    <div class="${classes}">
      ${head}
      ${args.body}
    </div>
  `
}

function scrollToRun(runId: string): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-run-id="${CSS.escape(runId)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function scrollToMessage(messageId: string): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(messageId)}"]`)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  })
}

function createRunLinkedMessage(store: WorkbenchStore, args: { command: string; runId: string; originMessage?: string }): string {
  const messageId = `rina:run:${args.runId}`
  store.dispatch({
    type: 'chat/add',
    msg: {
      id: messageId,
      role: 'rina',
      content: [
        bubbleBlock(
          `I started a run for ${args.command}. Treat the work as in progress until run ${args.runId} has an exit code and receipt you can inspect.`
        ),
      ],
      ts: Date.now(),
      workspaceKey: getWorkspaceKeyFromStore(store),
      runIds: [args.runId],
    },
  })
  if (args.originMessage) {
    store.dispatch({ type: 'chat/linkRun', messageId: args.originMessage, runId: args.runId })
  }
  return messageId
}

function buildInterruptedRunRecoveryPrompt(run: WorkbenchState['runs'][number]): string {
  return `Resume the interrupted task. The last command was "${run.command}" in "${run.cwd || run.projectRoot || 'the workspace'}". Explain what likely happened, decide the safest next step, and continue if appropriate.`
}

function formatAnalyticsTimestamp(value?: number): string {
  if (!value) return 'none'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'none'
  return date.toLocaleString()
}

function buildTrustSnapshot(store: WorkbenchStore): string {
  const state = store.getState()
  const lastRun = [...state.runs].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0]
  return [
    `Workspace: ${state.workspaceKey || 'unknown'}`,
    'Trust scope: current workspace',
    `Mode: ${state.runtime.mode || 'unknown'}`,
    `Starter intents: ${state.analytics.starterIntentCount}`,
    `Inspector opens: ${state.analytics.inspectorOpenCount}`,
    `Output expands: ${state.analytics.runOutputExpandCount}`,
    `Proof-backed runs: ${state.analytics.proofBackedRunCount}`,
    `Last starter: ${state.analytics.lastStarterIntent || 'none'}`,
    `First starter at: ${formatAnalyticsTimestamp(state.analytics.firstStarterIntentAt)}`,
    `Last inspector: ${state.analytics.lastInspector || 'none'}`,
    `First proof at: ${formatAnalyticsTimestamp(state.analytics.firstProofBackedRunAt)}`,
    `Last run: ${lastRun ? `${lastRun.id} ${lastRun.status} exit=${lastRun.exitCode ?? 'unknown'}` : 'none'}`,
    `IPC: ${state.runtime.ipcCanonicalReady ? 'consolidated' : 'unknown'}`,
    `Renderer: ${state.runtime.rendererCanonicalReady ? 'canonical' : 'unknown'}`,
  ].join('\n')
}

function extractStructuredCommandReply(output: unknown): StructuredCommandReply | null {
  if (!output || typeof output !== 'object') return null

  const record = output as Record<string, unknown>
  if (typeof record.command !== 'string' || !record.command.trim()) return null

  const nested =
    record.output && typeof record.output === 'object' ? (record.output as Record<string, unknown>) : null

  const success =
    typeof record.success === 'boolean'
      ? record.success
      : typeof nested?.success === 'boolean'
        ? nested.success
        : false

  const outputText =
    typeof nested?.output === 'string'
      ? nested.output
      : typeof record.output === 'string'
        ? record.output
        : ''

  const durationMs =
    typeof record.durationMs === 'number'
      ? record.durationMs
      : typeof nested?.durationMs === 'number'
        ? nested.durationMs
        : null

  const runId =
    typeof record.runId === 'string'
      ? record.runId
      : typeof nested?.runId === 'string'
        ? nested.runId
        : undefined

  const sessionId =
    typeof record.planRunId === 'string'
      ? record.planRunId
      : typeof record.sessionId === 'string'
        ? record.sessionId
        : typeof nested?.planRunId === 'string'
          ? nested.planRunId
          : typeof nested?.sessionId === 'string'
            ? nested.sessionId
            : undefined

  const receiptId =
    typeof record.receiptId === 'string'
      ? record.receiptId
      : typeof record.latestReceiptId === 'string'
        ? record.latestReceiptId
        : typeof nested?.receiptId === 'string'
          ? nested.receiptId
          : typeof nested?.latestReceiptId === 'string'
            ? nested.latestReceiptId
            : undefined

  const exitCode =
    typeof record.exitCode === 'number'
      ? record.exitCode
      : typeof record.code === 'number'
        ? record.code
        : typeof nested?.exitCode === 'number'
          ? nested.exitCode
          : typeof nested?.code === 'number'
            ? nested.code
            : null

  return {
    command: record.command,
    success,
    outputText: outputText.trim(),
    durationMs,
    runId,
    sessionId,
    receiptId,
    exitCode,
  }
}

function hasStructuredCommandRunRef(reply: StructuredCommandReply): boolean {
  return Boolean(reply.runId || reply.sessionId || reply.receiptId)
}

function summarizeCommandReply(reply: StructuredCommandReply): string {
  const normalized = reply.command.trim()
  if (reply.success) {
    if (!hasStructuredCommandRunRef(reply)) {
      return 'I have immediate command output, but this path did not attach a run ID or receipt. Treat it as unverified until Rina reruns it through the trusted path.'
    }
    if (normalized.includes('build')) return 'I ran the build command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('test')) return 'I ran the test command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('lint')) return 'I ran the lint command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('deploy')) return 'I ran the deploy command, but do not treat it as done until the linked run proof is complete.'
    return 'I ran that command, but do not treat it as done until the linked run proof is complete.'
  }

  if (normalized.includes('build')) return 'I tried the build and it failed. Here is the command output.'
  if (normalized.includes('test')) return 'I ran the tests and they failed. Here is what came back.'
  if (normalized.includes('lint')) return 'I ran lint and it failed. Here is what came back.'
  if (normalized.includes('deploy')) return 'I tried the deploy command and it failed. Here is what came back.'
  return 'I ran that command and it failed. Here is what came back.'
}

function humanizeHaltReason(reason?: string): string {
  const normalized = String(reason || '').trim()
  if (!normalized) return 'The plan halted before a proof-backed run could start.'
  if (/confirmation/i.test(normalized) || /typed YES/i.test(normalized)) {
    return 'The plan is paused waiting for confirmation before Rina can run anything.'
  }
  if (/profile/i.test(normalized) || /interactive/i.test(normalized)) {
    return 'The plan was blocked by the current execution profile before a trusted run could start.'
  }
  if (/policy/i.test(normalized) || /blocked/i.test(normalized)) {
    return 'The plan was blocked by policy before a trusted run could start.'
  }
  return normalized
}

function renderExecutionHaltReply(prompt: string, reason?: string): string {
  const summary = humanizeHaltReason(reason)
  const actions =
    /confirmation/i.test(String(reason || '')) || /typed YES/i.test(String(reason || ''))
      ? renderInlineActions([{ label: 'Open Runs', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }])
      : renderInlineActions([{ label: 'Inspect receipts', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }])

  return renderReplyCard({
    label: 'Execution halted',
    badge: 'Proof not started',
    className: 'rw-command-result halted',
    body: `
      <div class="rw-command-result-copy">${escapeHtml(summary)}</div>
      <div class="rw-command-result-copy rw-command-result-empty">Prompt: ${escapeHtml(prompt)}</div>
      ${actions}
    `,
  })
}

function buildExecutionHaltContent(prompt: string, reason?: string): MessageBlock[] {
  const summary = humanizeHaltReason(reason)
  const actions =
    /confirmation/i.test(String(reason || '')) || /typed YES/i.test(String(reason || ''))
      ? renderInlineActions([{ label: 'Open Runs', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }])
      : renderInlineActions([{ label: 'Inspect receipts', tab: 'runs' }, { label: 'Inspect execution trace', tab: 'execution-trace' }])

  return [
    replyCardBlock({
      label: 'Execution halted',
      badge: 'Proof not started',
      className: 'rw-command-result halted',
      bodyHtml: `
        <div class="rw-command-result-copy">${escapeHtml(summary)}</div>
        <div class="rw-command-result-copy rw-command-result-empty">Prompt: ${escapeHtml(prompt)}</div>
        ${actions}
      `,
    }),
  ]
}

function classifyCommandIntent(command: string): 'build' | 'test' | 'deploy' | 'command' {
  const normalized = command.toLowerCase()
  if (normalized.includes('build')) return 'build'
  if (normalized.includes('test')) return 'test'
  if (normalized.includes('deploy')) return 'deploy'
  return 'command'
}

type CapabilityPromptMatch = {
  key: string
  reason: string
}

type CapabilityDecision =
  | { state: 'ready'; pack: CapabilityPackModel; reason: string }
  | { state: 'locked'; pack: CapabilityPackModel; reason: string }
  | { state: 'install'; pack: CapabilityPackModel; reason: string }

type PlanCapabilityRequirement = {
  key: string
  pack: CapabilityPackModel
  state: 'ready' | 'locked' | 'install'
  reasons: string[]
}

function matchPromptCapability(prompt: string): CapabilityPromptMatch | null {
  const normalized = prompt.toLowerCase()
  if (/\b(system diagnostics|system-diagnostics)\b/.test(normalized)) {
    return { key: 'system-diagnostics', reason: 'System diagnostics capability' }
  }
  if (/\b(cloudflare|workers|pages)\b/.test(normalized)) {
    return { key: 'deploy:cloudflare', reason: 'Cloudflare deploy capability' }
  }
  if (/\b(android|adb)\b/.test(normalized)) {
    return { key: 'device:android:scan', reason: 'Android scan capability' }
  }
  if (/\b(ios|iphone|ipad)\b/.test(normalized)) {
    return { key: 'device:ios:scan', reason: 'iOS scan capability' }
  }
  if (/\b(system doctor|fix my computer|scan my computer|slow laptop|port conflict|disk space|diagnose my computer)\b/.test(normalized)) {
    return { key: 'system:doctor', reason: 'System Doctor capability' }
  }
  return null
}

function resolvePromptCapability(state: WorkbenchState, prompt: string): CapabilityDecision | null {
  const match = matchPromptCapability(prompt)
  if (!match) return null
  const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
  if (!pack) return null
  if (state.license.tier === 'starter' && pack.tier !== 'starter') {
    return { state: 'locked', pack, reason: match.reason }
  }
  if (pack.installState === 'upgrade-required') {
    return { state: 'locked', pack, reason: match.reason }
  }
  if (pack.source === 'marketplace' && pack.installState === 'available') {
    return { state: 'install', pack, reason: match.reason }
  }
  return { state: 'ready', pack, reason: match.reason }
}

function buildCapabilityDecisionContent(decision: CapabilityDecision): MessageBlock[] {
  const proofLine = decision.pack.actions[0]?.proof.join(', ') || 'run, receipt, log'
  if (decision.state === 'ready') {
    const runLabel = buildCapabilityRunLabel(decision.pack.key)
    return [
      replyCardBlock({
        label: 'Capability ready',
        badge: decision.pack.title,
        bodyHtml: `
          <div class="rw-command-result-copy">${escapeHtml(decision.reason)} is available in this workspace.</div>
          <div class="rw-command-result-copy rw-command-result-empty">Proof contract: ${escapeHtml(proofLine)}</div>
          <div class="rw-inline-actions">
            <button class="rw-inline-action" type="button" data-capability-run="${escapeHtml(decision.pack.key)}">${escapeHtml(runLabel)}</button>
            <button class="rw-inline-action" type="button" data-agent-top-tab="plan">Open Plan</button>
            <button class="rw-inline-action" type="button" data-tab="marketplace">Inspect capabilities</button>
          </div>
        `,
      }),
    ]
  }

  if (decision.state === 'install') {
    return [
      replyCardBlock({
        label: 'Capability required',
        badge: 'Install needed',
        className: 'rw-command-result halted',
        bodyHtml: `
          <div class="rw-command-result-copy">${escapeHtml(decision.reason)} needs the ${escapeHtml(decision.pack.title)} pack before Rina can run it through the trusted path.</div>
          <div class="rw-command-result-copy rw-command-result-empty">Expected proof: ${escapeHtml(proofLine)}</div>
          <div class="rw-inline-actions">
            <button class="rw-inline-action" type="button" data-capability-install="${escapeHtml(decision.pack.key)}">Install capability</button>
            <button class="rw-inline-action" type="button" data-tab="marketplace">Open Marketplace</button>
          </div>
        `,
      }),
    ]
  }

  return [
    replyCardBlock({
      label: 'Capability locked',
      badge: 'Upgrade required',
      className: 'rw-command-result halted',
      bodyHtml: `
        <div class="rw-command-result-copy">${escapeHtml(decision.reason)} is available, but this workspace needs ${escapeHtml(decision.pack.title)} on Pro before Rina can execute it.</div>
        <div class="rw-command-result-copy rw-command-result-empty">Expected proof: ${escapeHtml(proofLine)}</div>
        <div class="rw-inline-actions">
          <button class="rw-inline-action" type="button" data-plan-upgrade="pro">Upgrade to Pro</button>
          <button class="rw-inline-action" type="button" data-agent-top-tab="plan">Open Plan</button>
        </div>
      `,
    }),
  ]
}

function matchPlanStepCapability(step: FixPlanStep): CapabilityPromptMatch | null {
  const tool = String(step.tool || '').toLowerCase()
  const command = String(step.input?.command || '').toLowerCase()
  const combined = `${tool} ${command}`
  if (/\b(cloudflare|wrangler|workers|pages)\b/.test(combined)) {
    return { key: 'deploy:cloudflare', reason: 'Cloudflare deploy capability' }
  }
  if (/\b(android|adb)\b/.test(combined)) {
    return { key: 'device:android:scan', reason: 'Android scan capability' }
  }
  if (/\b(ios|xcrun|instruments|simctl|iphone|ipad)\b/.test(combined)) {
    return { key: 'device:ios:scan', reason: 'iOS scan capability' }
  }
  if (/\bdoctor\b/.test(combined) || tool.startsWith('doctor.')) {
    return { key: 'system:doctor', reason: 'System Doctor capability' }
  }
  return null
}

function resolvePlanCapabilityRequirements(state: WorkbenchState, steps: FixPlanStep[]): PlanCapabilityRequirement[] {
  const requirements = new Map<string, PlanCapabilityRequirement>()
  for (const step of steps) {
    const match = matchPlanStepCapability(step)
    if (!match) continue
    const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
    if (!pack) continue
    const nextState: PlanCapabilityRequirement['state'] =
      state.license.tier === 'starter' && pack.tier !== 'starter'
        ? 'locked'
        : pack.installState === 'upgrade-required'
          ? 'locked'
          : pack.source === 'marketplace' && pack.installState === 'available'
            ? 'install'
            : 'ready'
    const existing = requirements.get(pack.key)
    if (existing) {
      existing.reasons = [...new Set([...existing.reasons, match.reason])]
      if (existing.state === 'ready' && nextState !== 'ready') existing.state = nextState
      continue
    }
    requirements.set(pack.key, {
      key: pack.key,
      pack,
      state: nextState,
      reasons: [match.reason],
    })
  }
  return Array.from(requirements.values())
}

function buildPlanCapabilityCard(requirements: PlanCapabilityRequirement[]): MessageBlock | null {
  if (requirements.length === 0) return null
  const items = requirements
    .map((requirement) => {
      const proofLine = requirement.pack.actions[0]?.proof.join(', ') || 'run, receipt, log'
      const stateLabel =
        requirement.state === 'ready' ? 'Ready' : requirement.state === 'install' ? 'Install needed' : 'Upgrade required'
      return `
        <li>
          <div class="rw-plan-step-title">${escapeHtml(requirement.pack.title)} <span class="rw-reply-card-badge">${escapeHtml(stateLabel)}</span></div>
          <div class="rw-command-result-copy">${escapeHtml(requirement.reasons.join(', '))}</div>
          <div class="rw-command-result-copy rw-command-result-empty">Proof: ${escapeHtml(proofLine)}</div>
        </li>
      `
    })
    .join('')
  const blocked = requirements.find((requirement) => requirement.state !== 'ready')
  const actions = blocked
    ? blocked.state === 'locked'
      ? `
          <div class="rw-inline-actions">
            <button class="rw-inline-action" type="button" data-plan-upgrade="pro">Upgrade to Pro</button>
            <button class="rw-inline-action" type="button" data-agent-top-tab="plan">Open Plan</button>
          </div>
        `
      : `
          <div class="rw-inline-actions">
            <button class="rw-inline-action" type="button" data-capability-install="${escapeHtml(blocked.pack.key)}">Install capability</button>
            <button class="rw-inline-action" type="button" data-tab="marketplace">Open Marketplace</button>
          </div>
        `
    : ''
  return replyCardBlock({
    label: 'Capabilities',
    badge: blocked ? 'Required before run start' : 'Ready',
    className: blocked ? 'rw-command-result halted' : undefined,
    bodyHtml: `<ul class="rw-reply-list">${items}</ul>${actions}`,
  })
}

function buildCapabilityRunLabel(packKey: string): string {
  if (packKey === 'system:doctor') return 'Run diagnostics'
  if (packKey === 'deploy:cloudflare') return 'Run deploy preflight'
  if (packKey === 'device:android:scan') return 'Run device scan'
  if (packKey === 'device:ios:scan') return 'Run device scan'
  if (packKey === 'system-diagnostics') return 'Run diagnostics'
  return 'Run capability check'
}

function formatDurationMs(durationMs?: number | null): string | null {
  if (!Number.isFinite(durationMs) || durationMs == null) return null
  if (durationMs < 1000) return `${Math.max(1, Math.round(durationMs))}ms`
  return `${Math.round(durationMs / 100) / 10}s`
}

function extractTestCounts(outputText: string): { passed?: number; failed?: number; skipped?: number } {
  const passed =
    outputText.match(/\b(\d+)\s+passed\b/i)?.[1] ||
    outputText.match(/\bpass(?:ed|ing)?\s*:?\s*(\d+)\b/i)?.[1]
  const failed =
    outputText.match(/\b(\d+)\s+failed\b/i)?.[1] ||
    outputText.match(/\bfail(?:ed|ing)?\s*:?\s*(\d+)\b/i)?.[1]
  const skipped =
    outputText.match(/\b(\d+)\s+skipped\b/i)?.[1] ||
    outputText.match(/\bskip(?:ped|ping)?\s*:?\s*(\d+)\b/i)?.[1]
  return {
    passed: passed ? Number(passed) : undefined,
    failed: failed ? Number(failed) : undefined,
    skipped: skipped ? Number(skipped) : undefined,
  }
}

function extractDeployFacts(command: string, outputText: string): { target?: string; artifact?: string } {
  const source = `${command}\n${outputText}`
  const targetMatch =
    source.match(/\b(production|prod|staging|stage|preview|dev|development)\b/i) ||
    source.match(/\bto\s+([a-z0-9._-]+)\b/i)
  const artifactMatch =
    source.match(/\b(v?\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?)\b/i) ||
    source.match(/\b(build|release|deploy(?:ment)?)\s+(?:id|version|tag)?[:#]?\s*([a-z0-9._-]+)\b/i)

  return {
    target: targetMatch?.[1] ? String(targetMatch[1]) : undefined,
    artifact: artifactMatch?.[2] ? String(artifactMatch[2]) : artifactMatch?.[1] ? String(artifactMatch[1]) : undefined,
  }
}

function renderCommandResultCard(reply: StructuredCommandReply): string {
  const intent = classifyCommandIntent(reply.command)
  const hasRunRef = hasStructuredCommandRunRef(reply)
  const cardTitle =
    intent === 'build'
      ? hasRunRef
        ? 'Build result'
        : 'Build output'
      : intent === 'test'
        ? hasRunRef
          ? 'Test result'
          : 'Test output'
        : intent === 'deploy'
          ? hasRunRef
            ? 'Deploy result'
            : 'Deploy output'
          : hasRunRef
            ? 'Command result'
            : 'Command output'
  const statusLabel = reply.success ? (hasRunRef ? 'Proof pending' : 'Unverified output') : 'Failed'
  const durationLabel = formatDurationMs(reply.durationMs)
  const testCounts = intent === 'test' ? extractTestCounts(reply.outputText) : {}
  const deployFacts = intent === 'deploy' ? extractDeployFacts(reply.command, reply.outputText) : {}
  const outputBody = reply.outputText
    ? `<div class="rw-command-result-copy">${escapeHtml(reply.outputText.slice(0, 1600))}</div>`
    : `<div class="rw-command-result-copy rw-command-result-empty">The command finished without any captured output.</div>`
  const proofWarning = reply.success
    ? hasRunRef
      ? `<div class="rw-command-result-copy rw-command-result-empty">This card only reflects the immediate command output. Treat the result as proof pending until the linked run has a run ID, exit code, and receipt.</div>`
      : `<div class="rw-command-result-copy rw-command-result-empty">This output came back without a linked run ID or receipt, so it is not trusted proof yet. Ask Rina to rerun it through the trusted path if you need a proof-backed result.</div>`
    : ''
  const proofItems = [
    `<div class="rw-proof-summary-item"><span>Command</span><code>${escapeHtml(reply.command)}</code></div>`,
    durationLabel ? `<div class="rw-proof-summary-item"><span>Duration</span><strong>${escapeHtml(durationLabel)}</strong></div>` : '',
    reply.runId ? `<div class="rw-proof-summary-item"><span>Run</span><strong>${escapeHtml(reply.runId)}</strong></div>` : '',
    reply.receiptId ? `<div class="rw-proof-summary-item"><span>Receipt</span><strong>${escapeHtml(reply.receiptId)}</strong></div>` : '',
    typeof reply.exitCode === 'number' ? `<div class="rw-proof-summary-item"><span>Exit</span><strong>${escapeHtml(String(reply.exitCode))}</strong></div>` : '',
    intent === 'test' && typeof testCounts.passed === 'number'
      ? `<div class="rw-proof-summary-item"><span>Passed</span><strong>${escapeHtml(String(testCounts.passed))}</strong></div>`
      : '',
    intent === 'test' && typeof testCounts.failed === 'number'
      ? `<div class="rw-proof-summary-item"><span>Failed</span><strong>${escapeHtml(String(testCounts.failed))}</strong></div>`
      : '',
    intent === 'test' && typeof testCounts.skipped === 'number'
      ? `<div class="rw-proof-summary-item"><span>Skipped</span><strong>${escapeHtml(String(testCounts.skipped))}</strong></div>`
      : '',
    intent === 'deploy' && deployFacts.target
      ? `<div class="rw-proof-summary-item"><span>Target</span><strong>${escapeHtml(deployFacts.target)}</strong></div>`
      : '',
    intent === 'deploy' && deployFacts.artifact
      ? `<div class="rw-proof-summary-item"><span>Artifact</span><strong>${escapeHtml(deployFacts.artifact)}</strong></div>`
      : '',
    `<div class="rw-proof-summary-item"><span>Proof</span><strong>${reply.success ? (hasRunRef ? 'Proof pending' : 'No linked run proof') : 'See run details'}</strong></div>`,
  ]
    .filter(Boolean)
    .join('')

  const actions = hasRunRef
    ? [
        { label: 'Inspect receipts', tab: 'runs' },
        { label: 'Inspect execution trace', tab: 'execution-trace' },
      ]
    : [
        { label: 'Inspect execution trace', tab: 'execution-trace' },
        { label: 'Rerun through trusted path', prompt: `Run this through the trusted path with receipts: ${reply.command}` },
      ]

  return renderReplyCard({
    label: cardTitle,
    badge: statusLabel,
    className: `rw-command-result-card ${reply.success ? 'is-success' : 'is-failed'}`,
    body: `
      <div class="rw-proof-summary-grid">${proofItems}</div>
      ${proofWarning}
      ${outputBody}
      ${renderInlineActions(actions)}
    `,
  })
}

function renderRinaReply(result: RinaReplyResult): string {
  const output = result.rina?.output
  const commandReply = extractStructuredCommandReply(output)
  const text =
    commandReply && result.intent !== 'execute'
      ? summarizeCommandReply(commandReply)
      : result.text || result.error || 'Here is the latest status.'

  const blocks: string[] = [renderMessageBubble(text)]

  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>

    if (commandReply && result.intent !== 'execute') {
      blocks.push(renderCommandResultCard(commandReply))
    }

    if (record.originalError && typeof record.originalError === 'string') {
      blocks.push(
        renderReplyCard({
          label: 'What I found',
          body: `<div class="rw-reply-inline-code">${escapeHtml(record.originalError)}</div>`,
        })
      )
    }

    if (Array.isArray(record.commands) && record.commands.length > 0) {
      blocks.push(
        renderReplyCard({
          label: 'Try next',
          body: renderInlineActions(
            (record.commands as unknown[]).map((command) => ({
              label: String(command),
              prompt: String(command),
            }))
          ),
        })
      )
    }

    if (record.newCommands && typeof record.newCommands === 'object') {
      const items = Object.entries(record.newCommands as Record<string, unknown>)
        .map(([command, description]) => `<li><strong>${escapeHtml(command)}</strong> — ${escapeHtml(String(description))}</li>`)
        .join('')
      blocks.push(
        renderReplyCard({
          label: 'What I can do from here',
          body: `<ul class="rw-reply-list">${items}</ul>`,
        })
      )
    }

    if (record.plan && typeof record.plan === 'object') {
      const plan = record.plan as Record<string, unknown>
      const steps = Array.isArray(plan.steps) ? (plan.steps as Array<Record<string, unknown>>) : []
      const stepItems = steps
        .slice(0, 6)
        .map((step, index) => {
          const title = typeof step.description === 'string' ? step.description : typeof step.id === 'string' ? step.id : `Step ${index + 1}`
          const command = typeof step.command === 'string' ? step.command : ''
          return `
            <li>
              <div class="rw-plan-step-title">${escapeHtml(title)}</div>
              ${command ? `<div class="rw-reply-inline-code">${escapeHtml(command)}</div>` : ''}
            </li>
          `
        })
        .join('')

      blocks.push(
        renderReplyCard({
          label: 'My plan',
          badge: result.requiresConfirmation ? 'Needs your approval' : 'Ready for review',
          body: `
            <ul class="rw-reply-list">${stepItems || '<li>No plan steps returned.</li>'}</ul>
            ${renderInlineActions([
              { label: 'Run the safe steps', prompt: 'Run the safe steps from the current fix plan.' },
              { label: 'Open Runs', tab: 'runs' },
            ])}
          `,
        })
      )
    }

    if (
      !commandReply &&
      (
        typeof record.totalSteps === 'number' ||
        typeof record.successfulSteps === 'number' ||
        typeof record.failedSteps === 'number' ||
        typeof record.durationMs === 'number'
      )
    ) {
      const stat = (label: string, value: unknown) => `<div class="rw-stat-pill"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`
      blocks.push(
        renderReplyCard({
          label: 'What happened',
          body: `
            <div class="rw-stat-grid">
              ${typeof record.totalSteps === 'number' ? stat('Steps', record.totalSteps) : ''}
              ${typeof record.successfulSteps === 'number' ? stat('Succeeded', record.successfulSteps) : ''}
              ${typeof record.failedSteps === 'number' ? stat('Failed', record.failedSteps) : ''}
              ${typeof record.durationMs === 'number' ? stat('Duration', `${Math.round(Number(record.durationMs) / 1000)}s`) : ''}
            </div>
            ${renderInlineActions([{ label: 'Inspect receipts', tab: 'runs' }])}
          `,
        })
      )
    }

    if (!commandReply && Array.isArray(record.results) && record.results.length > 0) {
      const items = (record.results as Array<Record<string, unknown>>)
        .slice(0, 6)
        .map((entry) => {
          const title = typeof entry.command === 'string' ? entry.command : typeof entry.stepId === 'string' ? entry.stepId : 'Step'
          const status = entry.success === true ? 'OK' : entry.success === false ? 'Failed' : 'Done'
          const outputText =
            typeof entry.output === 'string' && entry.output.trim() ? entry.output.trim().slice(0, 220) : ''
          return `
            <li>
              <div class="rw-reply-result-head">
                <strong>${escapeHtml(title)}</strong>
                <span class="rw-reply-card-badge">${escapeHtml(status)}</span>
              </div>
              ${outputText ? `<div class="rw-reply-inline-code">${escapeHtml(outputText)}</div>` : ''}
            </li>
          `
        })
        .join('')
      blocks.push(
        renderReplyCard({
          label: 'What each step returned',
          body: `<ul class="rw-reply-list">${items}</ul>`,
        })
      )
    }
  }

  if (result.intent === 'execute') {
    blocks.push(
      renderInlineActions([
        { label: 'Inspect execution trace', tab: 'execution-trace' },
        { label: 'Inspect receipts', tab: 'runs' },
      ])
    )
  }

  return blocks.join('')
}

function buildRinaReplyContent(result: RinaReplyResult): MessageBlock[] {
  const output = result.rina?.output
  const commandReply = extractStructuredCommandReply(output)
  const text =
    commandReply && result.intent !== 'execute'
      ? summarizeCommandReply(commandReply)
      : result.text || result.error || 'Here is the latest status.'

  const blocks: MessageBlock[] = [bubbleBlock(text)]

  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>

    if (commandReply && result.intent !== 'execute') {
      blocks.push({ type: 'markup', html: renderCommandResultCard(commandReply) })
    }

    if (record.originalError && typeof record.originalError === 'string') {
      blocks.push(
        replyCardBlock({
          label: 'What I found',
          bodyHtml: `<div class="rw-reply-inline-code">${escapeHtml(record.originalError)}</div>`,
        })
      )
    }

    if (Array.isArray(record.commands) && record.commands.length > 0) {
      blocks.push(
        replyCardBlock({
          label: 'Try next',
          bodyHtml: renderInlineActions(
            (record.commands as unknown[]).map((command) => ({
              label: String(command),
              prompt: String(command),
            }))
          ),
        })
      )
    }

    if (record.newCommands && typeof record.newCommands === 'object') {
      const items = Object.entries(record.newCommands as Record<string, unknown>)
        .map(([command, description]) => `<li><strong>${escapeHtml(command)}</strong> — ${escapeHtml(String(description))}</li>`)
        .join('')
      blocks.push(replyCardBlock({ label: 'What I can do from here', bodyHtml: `<ul class="rw-reply-list">${items}</ul>` }))
    }

    if (record.plan && typeof record.plan === 'object') {
      const plan = record.plan as Record<string, unknown>
      const steps = Array.isArray(plan.steps) ? (plan.steps as Array<Record<string, unknown>>) : []
      const stepItems = steps
        .slice(0, 6)
        .map((step, index) => {
          const title = typeof step.description === 'string' ? step.description : typeof step.id === 'string' ? step.id : `Step ${index + 1}`
          const command = typeof step.command === 'string' ? step.command : ''
          return `
            <li>
              <div class="rw-plan-step-title">${escapeHtml(title)}</div>
              ${command ? `<div class="rw-reply-inline-code">${escapeHtml(command)}</div>` : ''}
            </li>
          `
        })
        .join('')

      blocks.push(
        replyCardBlock({
          label: 'My plan',
          badge: result.requiresConfirmation ? 'Needs your approval' : 'Ready for review',
          bodyHtml: `
            <ul class="rw-reply-list">${stepItems || '<li>No plan steps returned.</li>'}</ul>
            ${renderInlineActions([
              { label: 'Run the safe steps', prompt: 'Run the safe steps from the current fix plan.' },
              { label: 'Open Runs', tab: 'runs' },
            ])}
          `,
        })
      )
    }

    if (
      !commandReply &&
      (
        typeof record.totalSteps === 'number' ||
        typeof record.successfulSteps === 'number' ||
        typeof record.failedSteps === 'number' ||
        typeof record.durationMs === 'number'
      )
    ) {
      const stat = (label: string, value: unknown) => `<div class="rw-stat-pill"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`
      blocks.push(
        replyCardBlock({
          label: 'What happened',
          bodyHtml: `
            <div class="rw-stat-grid">
              ${typeof record.totalSteps === 'number' ? stat('Steps', record.totalSteps) : ''}
              ${typeof record.successfulSteps === 'number' ? stat('Succeeded', record.successfulSteps) : ''}
              ${typeof record.failedSteps === 'number' ? stat('Failed', record.failedSteps) : ''}
              ${typeof record.durationMs === 'number' ? stat('Duration', `${Math.round(Number(record.durationMs) / 1000)}s`) : ''}
            </div>
            ${renderInlineActions([{ label: 'Inspect receipts', tab: 'runs' }])}
          `,
        })
      )
    }

    if (!commandReply && Array.isArray(record.results) && record.results.length > 0) {
      const items = (record.results as Array<Record<string, unknown>>)
        .slice(0, 6)
        .map((entry) => {
          const title = typeof entry.command === 'string' ? entry.command : typeof entry.stepId === 'string' ? entry.stepId : 'Step'
          const status = entry.success === true ? 'OK' : entry.success === false ? 'Failed' : 'Done'
          const outputText =
            typeof entry.output === 'string' && entry.output.trim() ? entry.output.trim().slice(0, 220) : ''
          return `
            <li>
              <div class="rw-reply-result-head">
                <strong>${escapeHtml(title)}</strong>
                <span class="rw-reply-card-badge">${escapeHtml(status)}</span>
              </div>
              ${outputText ? `<div class="rw-reply-inline-code">${escapeHtml(outputText)}</div>` : ''}
            </li>
          `
        })
        .join('')
      blocks.push(replyCardBlock({ label: 'What each step returned', bodyHtml: `<ul class="rw-reply-list">${items}</ul>` }))
    }
  }

  if (result.intent === 'execute') {
    blocks.push({ type: 'markup', html: renderInlineActions([{ label: 'Inspect execution trace', tab: 'execution-trace' }, { label: 'Inspect receipts', tab: 'runs' }]) })
  }

  return blocks
}

async function startPlannedExecution(
  store: WorkbenchStore,
  args: {
    prompt: string
    workspaceKey: string
    workspaceRoot: string
    plan: FixPlanResponse
    planSteps: FixPlanStep[]
    capabilityRequirements?: PlanCapabilityRequirement[]
  }
): Promise<boolean> {
  const messageId = `rina:plan:${Date.now()}`
  store.dispatch({
    type: 'chat/add',
    msg: {
      id: messageId,
      role: 'rina',
      content: buildExecutionPlanContent(args.prompt, args.plan, args.capabilityRequirements || []),
      ts: Date.now(),
      workspaceKey: args.workspaceKey,
    },
  })

  if ((args.capabilityRequirements || []).some((requirement) => requirement.state !== 'ready')) {
    return false
  }

  const execResult = await window.rina.executePlanStream({
    plan: args.planSteps,
    projectRoot: args.workspaceRoot,
    confirmed: false,
    confirmationText: '',
  })

  if (
    commitStartedExecutionResult(
      store,
      { messageId, prompt: args.prompt, workspaceRoot: args.workspaceRoot, planSteps: args.planSteps },
      execResult || {}
    )
  ) {
    return true
  }

  store.dispatch({
    type: 'chat/add',
    msg: {
      id: `rina:plan-error:${Date.now()}`,
      role: 'rina',
      content: buildExecutionHaltContent(args.prompt, execResult?.error || execResult?.haltReason || 'The run did not start.'),
      ts: Date.now(),
      workspaceKey: args.workspaceKey,
    },
  })
  return false
}

function commitStartedExecutionResult(
  store: WorkbenchStore,
  args: {
    messageId: string
    prompt: string
    workspaceRoot: string
    planSteps: FixPlanStep[]
    title?: string
    command?: string
  },
  execResult: {
    ok?: boolean
    runId?: string
    planRunId?: string
  }
): boolean {
  const runStarted = didExecutionStart(execResult)
  if (!runStarted || !execResult.runId) return false
  store.dispatch({ type: 'chat/linkRun', messageId: args.messageId, runId: execResult.runId })
  store.dispatch({
    type: 'runs/upsert',
    run: {
      id: execResult.runId,
      sessionId: execResult.planRunId || execResult.runId,
      title: args.title || args.prompt,
      command: args.command || args.planSteps.map((step) => String(step.input?.command || '')).filter(Boolean).join(' && ') || args.prompt,
      cwd: args.workspaceRoot,
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endedAt: null,
      exitCode: null,
      commandCount: args.planSteps.length,
      failedCount: 0,
      latestReceiptId: execResult.runId,
      originMessageId: args.messageId,
    },
  })
  return true
}

async function sendPromptToRina(store: WorkbenchStore, prompt: string): Promise<void> {
  const trimmed = prompt.trim()
  if (!trimmed) return

  const now = Date.now()
  const workspaceKey = getWorkspaceKeyFromStore(store)
  const workspaceRoot = getAgentWorkspaceRootFromStore(store)
  store.dispatch({
    type: 'chat/add',
    msg: {
      id: `user:${now}`,
      role: 'user',
      content: [bubbleBlock(trimmed)],
      ts: now,
      workspaceKey,
    },
  })
  store.dispatch({
    type: 'thinking/set',
    active: true,
    message: 'Rina is tracing through it…',
    stream: '',
  })

  void trackRendererFunnel('first_run', {
    entry_surface: 'agent_thread',
    workspace_key: workspaceKey,
  })

  try {
    const promptCapabilityMatch = matchPromptCapability(trimmed)
    let capabilityDecision = resolvePromptCapability(store.getState(), trimmed)
    if (
      promptCapabilityMatch &&
      typeof window.rina.capabilityPacks === 'function' &&
      (!capabilityDecision || capabilityDecision.state !== 'ready')
    ) {
      await refreshCapabilityPacks(store)
      capabilityDecision = resolvePromptCapability(store.getState(), trimmed)
    }
    if (capabilityDecision) {
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:capability:${Date.now()}`,
          role: 'rina',
          content: buildCapabilityDecisionContent(capabilityDecision),
          ts: Date.now(),
          workspaceKey,
        },
      })

      if (capabilityDecision.state !== 'ready') {
        return
      }
    }

    if (workspaceRoot && isExecutionPrompt(trimmed)) {
      const plan = await window.rina.agentPlan({
        intentText: trimmed,
        projectRoot: workspaceRoot,
      })
      const planSteps = Array.isArray(plan?.steps) ? plan.steps : []

      if (planSteps.length > 0) {
        const normalizedPlanSteps = normalizePlanSteps(planSteps)
        const planCapabilityRequirements = resolvePlanCapabilityRequirements(store.getState(), normalizedPlanSteps)
        await startPlannedExecution(store, {
          prompt: trimmed,
          workspaceKey,
          workspaceRoot,
          plan,
          planSteps: normalizedPlanSteps,
          capabilityRequirements: planCapabilityRequirements,
        })
        return
      }
    }

    const result = (await window.rina.runAgent(trimmed, {
      workspaceRoot,
      mode: (store.getState().runtime.mode as 'auto' | 'assist' | 'explain') || 'explain',
    })) as RinaReplyResult

    store.dispatch({
      type: 'chat/add',
      msg: {
        id: `rina:${Date.now()}`,
        role: 'rina',
        content: buildRinaReplyContent(result),
        ts: Date.now(),
        workspaceKey,
      },
    })
  } catch (error) {
    store.dispatch({
      type: 'chat/add',
      msg: {
        id: `rina:error:${Date.now()}`,
        role: 'rina',
        content: [bubbleBlock(error instanceof Error ? error.message : String(error))],
        ts: Date.now(),
        workspaceKey,
      },
    })
  } finally {
    store.dispatch({
      type: 'thinking/set',
      active: false,
      message: '',
      stream: '',
    })
  }
}

function loadWorkbenchSnapshot(): Partial<WorkbenchStore['getState'] extends () => infer T ? T : never> | null {
  try {
    const raw = localStorage.getItem(WORKBENCH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<WorkbenchStore['getState'] extends () => infer T ? T : never>
  } catch {
    return null
  }
}

function persistWorkbenchState(store: WorkbenchStore): void {
  const state = store.getState()
  try {
    const snapshot = loadWorkbenchSnapshot()
    const analyticsByWorkspace = {
      ...getSnapshotAnalyticsByWorkspace(snapshot),
      [state.workspaceKey || '__none__']: state.analytics,
    }
    localStorage.setItem(
      WORKBENCH_STORAGE_KEY,
      JSON.stringify({
        activeTab: state.activeTab,
        activeCenterView: state.activeCenterView,
        activeRightView: state.activeRightView,
        workspaceKey: state.workspaceKey,
        analytics: state.analytics,
        analyticsByWorkspace,
        runtime: state.runtime,
      })
    )
  } catch {
    // ignore persistence failures
  }
}

function ensureFixBlockStyles(): void {
  if (document.getElementById('rw-fix-block-styles')) return
  const style = document.createElement('style')
  style.id = 'rw-fix-block-styles'
  style.textContent = `
    .fix-block {
      border: 1px solid rgba(0,229,204,.18);
      background: rgba(255,255,255,.03);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.28);
    }
    .fix-block-head,
    .fix-block-row,
    .fix-block-actions,
    .fix-block-footer {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .fix-block-head { justify-content: space-between; }
    .fix-block-title {
      font-weight: 700;
      color: var(--teal);
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: .72rem;
    }
    .fix-badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: .68rem;
      border: 1px solid rgba(255,255,255,.1);
      color: var(--text-primary);
      background: rgba(255,255,255,.04);
    }
    .fix-badge.safe { color: var(--teal); border-color: rgba(0,229,204,.28); }
    .fix-badge.caution { color: var(--coral); border-color: rgba(255,127,80,.3); }
    .fix-badge.danger { color: var(--hot-pink); border-color: rgba(255,0,127,.3); }
    .fix-label {
      color: var(--text-muted);
      font-size: .68rem;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-block-end: 4px;
    }
    .fix-body {
      display: grid;
      gap: 10px;
    }
    .fix-copy {
      color: var(--text-primary);
      line-height: 1.45;
    }
    .fix-meta {
      color: var(--text-muted);
      font-size: .76rem;
      display: grid;
      gap: 4px;
    }
    .fix-block code {
      font-family: var(--font);
      color: var(--baby-blue);
      word-break: break-word;
    }
    .fix-step {
      border: 1px solid var(--border);
      background: rgba(0,0,0,.22);
      border-radius: 8px;
      padding: 8px 10px;
      display: grid;
      gap: 6px;
    }
    .fix-step-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .fix-step-title {
      font-size: .78rem;
      color: var(--text-primary);
      font-weight: 600;
    }
    .fix-step-command {
      font-size: .78rem;
      color: var(--baby-blue);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .fix-btn {
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
      color: var(--text-primary);
      border-radius: 8px;
      padding: 7px 10px;
      cursor: pointer;
      font-family: var(--font);
      font-size: .76rem;
      transition: background .15s, border-color .15s;
    }
    .fix-btn:hover { background: rgba(255,255,255,.08); }
    .fix-btn.primary {
      border-color: rgba(0,229,204,.35);
      background: rgba(0,229,204,.1);
      color: var(--teal);
    }
    .fix-btn[disabled] {
      opacity: .55;
      cursor: default;
    }
    .fix-status-note,
    .fix-result-note {
      color: var(--text-muted);
      font-size: .76rem;
    }
    .fix-result-note.error { color: var(--coral); }
    .fix-result-note.success { color: var(--teal); }
    .fix-upgrade-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }
    .fix-upgrade-modal {
      inline-size: min(460px, 100%);
      border-radius: 14px;
      background: #121318;
      border: 1px solid rgba(255,255,255,.08);
      box-shadow: 0 24px 60px rgba(0,0,0,.45);
      padding: 18px;
      display: grid;
      gap: 12px;
    }
    .fix-upgrade-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .fix-upgrade-copy {
      color: var(--text-muted);
      line-height: 1.5;
    }
    .fix-upgrade-list {
      display: grid;
      gap: 6px;
      color: var(--text-primary);
      padding-inline-start: 18px;
    }
    .fix-upgrade-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `
  document.head.appendChild(style)
}

type Density = 'compact' | 'comfortable'
type RwSkin = 'legacy' | 'vscode'

function getStoredSkin(): RwSkin {
  const raw = (localStorage.getItem(RW_SKIN_STORAGE_KEY) || '').trim()
  return raw === 'legacy' ? 'legacy' : 'vscode'
}

function setStoredSkin(value: RwSkin): void {
  localStorage.setItem(RW_SKIN_STORAGE_KEY, value)
}

function getWorkbenchVsCodeSkinCss(): string {
  return `
    html[data-skin="vscode"] .rw-workbench-topbar {
      block-size: 36px !important;
      padding: 6px 10px !important;
      border-block-end: 1px solid var(--w-divider, var(--rw-divider)) !important;
      background: transparent !important;
    }

    html[data-skin="vscode"] .rw-workbench-tab-group-label {
      font-size: 10px !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      color: var(--w-muted, var(--rw-muted)) !important;
      opacity: 0.75 !important;
    }

    html[data-skin="vscode"] .rw-workbench-tab {
      block-size: 24px !important;
      padding: 0 8px !important;
      border-radius: 6px !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      box-shadow: none !important;
      color: var(--w-muted, var(--rw-muted)) !important;
    }

    html[data-skin="vscode"] .rw-workbench-tab:hover {
      color: var(--w-fg, var(--rw-fg)) !important;
      background: color-mix(in oklab, var(--w-panel-2, var(--rw-surface-2)) 35%, transparent) !important;
      border-color: var(--w-border, var(--rw-border)) !important;
    }

    html[data-skin="vscode"] .rw-workbench-tab[aria-selected="true"],
    html[data-skin="vscode"] .rw-workbench-tab[data-active="true"] {
      color: var(--w-fg, var(--rw-fg)) !important;
      background: transparent !important;
      border-color: transparent !important;
      position: relative !important;
    }

    html[data-skin="vscode"] .rw-workbench-tab[aria-selected="true"]::after,
    html[data-skin="vscode"] .rw-workbench-tab[data-active="true"]::after {
      content: "" !important;
      position: absolute !important;
      inset-inline-start: 8px !important;
      inset-inline-end: 8px !important;
      inset-block-end: -7px !important;
      block-size: 2px !important;
      border-radius: 99px !important;
      background: linear-gradient(90deg, var(--rw-hotpink), var(--rw-teal), var(--rw-babyblue)) !important;
      opacity: 0.9 !important;
    }

    html[data-skin="vscode"] .rw-topbar-action {
      block-size: 24px !important;
      padding: 6px 10px !important;
      border-radius: 7px !important;
      background: transparent !important;
      border: 1px solid var(--w-border, var(--rw-border)) !important;
      box-shadow: none !important;
      color: var(--w-muted, var(--rw-muted)) !important;
    }

    html[data-skin="vscode"] .rw-topbar-action:hover {
      color: var(--w-fg, var(--rw-fg)) !important;
      background: color-mix(in oklab, var(--w-panel-2, var(--rw-surface-2)) 35%, transparent) !important;
    }

    html[data-skin="vscode"] .rw-inline-runblock {
      gap: 8px !important;
      padding: 10px 12px !important;
      border-radius: 12px !important;
      border: 1px solid var(--w-divider, var(--rw-divider)) !important;
      background: color-mix(in oklab, var(--w-panel, var(--rw-surface)) 92%, transparent) !important;
      box-shadow: none !important;
    }

    html[data-skin="vscode"] .rw-inline-runblock-head {
      padding-block-end: 8px !important;
      border-block-end: 1px solid var(--w-divider, var(--rw-divider)) !important;
    }

    html[data-skin="vscode"] .rw-status-pill,
    html[data-skin="vscode"] .rw-proof-pill,
    html[data-skin="vscode"] .rw-pill {
      min-block-size: 22px !important;
      padding: 0 8px !important;
      border-radius: 7px !important;
      border: 1px solid var(--w-border, var(--rw-border)) !important;
      box-shadow: none !important;
    }

    html[data-skin="vscode"] .rw-inline-runblock-command,
    html[data-skin="vscode"] .rw-inline-runblock-output {
      padding: 10px 12px !important;
      border-radius: 10px !important;
      border: 1px solid var(--w-divider, var(--rw-divider)) !important;
      background: color-mix(in oklab, black 70%, transparent) !important;
      box-shadow: none !important;
    }

    html[data-skin="vscode"] .rw-inline-runblock-actions-top .rw-link-btn,
    html[data-skin="vscode"] .rw-inline-runblock-overflow > summary {
      min-block-size: 22px !important;
      padding: 0 8px !important;
      border-radius: 7px !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      color: var(--rw-babyblue) !important;
    }

    html[data-skin="vscode"] .rw-inline-runblock-overflow-menu {
      border: 1px solid var(--w-divider, var(--rw-divider)) !important;
      border-radius: 10px !important;
      background: rgba(12, 15, 20, 0.98) !important;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28) !important;
    }
  `
}

function syncSkinUi(value: RwSkin): void {
  const btn = document.querySelector<HTMLElement>('[data-action="toggle-skin"]')
  if (!btn) return
  btn.textContent = value === 'vscode' ? 'Skin: VS Code' : 'Skin: Legacy'
  btn.setAttribute('aria-pressed', String(value === 'vscode'))
}

function applyWorkbenchSkin(value: RwSkin): void {
  document.documentElement.setAttribute('data-skin', value)
  if (value === 'legacy') {
    clearStyleSegment('skin')
    return
  }
  setStyleSegment('skin', getWorkbenchVsCodeSkinCss())
}

function ensureWorkbenchVsCodeSkin(force?: RwSkin): RwSkin {
  const skin = force ?? getStoredSkin()
  applyWorkbenchSkin(skin)
  return skin
}

function getStoredDensity(): Density {
  const raw = (localStorage.getItem(DENSITY_STORAGE_KEY) || '').trim()
  return raw === 'comfortable' ? 'comfortable' : 'compact'
}

function setStoredDensity(value: Density): void {
  localStorage.setItem(DENSITY_STORAGE_KEY, value)
}

function applyDensityAttribute(value: Density): void {
  document.documentElement.setAttribute('data-density', value)
}

function getDensityCss(value: Density): string {
  if (value === 'comfortable') {
    return `
      html[data-density="comfortable"] .rw-topbar-action[data-action="toggle-density"] {
        box-shadow: inset 0 0 0 1px rgba(124, 199, 255, 0.16);
      }
    `
  }

  return `
    :root {
      --rw-radius-1: 6px;
      --rw-radius-2: 10px;
      --rw-radius-3: 12px;
      --rw-pad-1: 8px;
      --rw-pad-2: 12px;
      --rw-gap-1: 8px;
      --rw-pill-h: 24px;
      --rw-pill-px: 10px;
    }

    html[data-density="compact"] .rw-workbench-topbar { padding: 8px 12px !important; }
    html[data-density="compact"] .rw-workbench-tab {
      border-radius: var(--rw-radius-2) !important;
      padding: 6px 10px !important;
      min-block-size: var(--rw-pill-h) !important;
      font-size: 0.76rem !important;
    }
    html[data-density="compact"] .rw-topbar-action {
      border-radius: var(--rw-radius-2) !important;
      padding: 6px 10px !important;
      min-block-size: var(--rw-pill-h) !important;
      font-size: 0.7rem !important;
      box-shadow: none !important;
      transform: none !important;
    }

    html[data-density="compact"] .rw-chip,
    html[data-density="compact"] .rw-agent-chip,
    html[data-density="compact"] .rw-status-pill,
    html[data-density="compact"] .rw-proof-pill,
    html[data-density="compact"] .rw-inline-action {
      border-radius: var(--rw-radius-1) !important;
      padding: 0 var(--rw-pill-px) !important;
      min-block-size: var(--rw-pill-h) !important;
      box-shadow: none !important;
    }

    html[data-density="compact"] .rw-agent-panel-head { padding: 6px 12px !important; }
    html[data-density="compact"] .rw-agent-body { padding: 10px !important; gap: 8px !important; }
    html[data-density="compact"] #agent-output {
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      gap: 8px !important;
    }

    html[data-density="compact"] .rw-agent-hero,
    html[data-density="compact"] .rw-agent-composer,
    html[data-density="compact"] .rw-inline-runblock,
    html[data-density="compact"] .rw-reply-card,
    html[data-density="compact"] .rw-message-bubble {
      border-radius: var(--rw-radius-3) !important;
      box-shadow: none !important;
    }

    html[data-density="compact"] .rw-agent-hero {
      padding: var(--rw-pad-2) !important;
    }

    html[data-density="compact"] .rw-prompt-chip {
      border-radius: var(--rw-radius-2) !important;
      padding: 7px 10px !important;
      transform: none !important;
      gap: 8px !important;
      font-size: 0.76rem !important;
    }

    html[data-density="compact"] .rw-agent-composer {
      padding: var(--rw-pad-1) !important;
      gap: 8px !important;
    }
    html[data-density="compact"] .rw-agent-input {
      min-block-size: 56px !important;
      padding: 9px 10px !important;
      border-radius: var(--rw-radius-3) !important;
      box-shadow: none !important;
      font-size: 0.88rem !important;
    }
    html[data-density="compact"] .rw-agent-input:focus {
      box-shadow: 0 0 0 3px rgba(87, 231, 255, 0.06) !important;
    }
    html[data-density="compact"] .rw-agent-send {
      border-radius: var(--rw-radius-2) !important;
      padding: 8px 12px !important;
      box-shadow: none !important;
      transform: none !important;
    }

    html[data-density="compact"] .rw-inline-runblock { padding: 10px 11px !important; gap: 8px !important; }
    html[data-density="compact"] .rw-run-block { padding: 10px 0 !important; gap: 7px !important; }

  `
}

function upsertStyleTag(id: string, cssText: string): HTMLStyleElement {
  let tag = document.getElementById(id) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = id
    document.head.appendChild(tag)
  }
  if (tag.textContent !== cssText) tag.textContent = cssText
  return tag
}

function syncDensityUi(value: Density): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-action="toggle-density"]'))
  for (const btn of buttons) {
    btn.textContent = value === 'compact' ? 'Density: Compact' : 'Density: Comfortable'
    btn.setAttribute('aria-pressed', String(value === 'compact'))
  }
}

function ensureDensityOverrides(force?: Density): Density {
  const density = force ?? getStoredDensity()
  applyDensityAttribute(density)
  setStyleSegment('density', getDensityCss(density))
  syncDensityUi(density)
  return density
}

function getThemeTokenCss(): string {
  return `
      :root {
        --w-bg: #0b0d10;
        --w-panel: #0f1217;
        --w-panel-2: #121621;
        --w-border: color-mix(in oklab, white 10%, transparent);
        --w-divider: color-mix(in oklab, white 7%, transparent);
        --w-fg: color-mix(in oklab, white 88%, transparent);
        --w-muted: color-mix(in oklab, white 62%, transparent);
        --w-r1: 6px;
        --w-r2: 10px;
        --w-shadow: none;
        --w-pad-xs: 6px;
        --w-pad-s: 10px;
        --w-pad-m: 14px;
        --w-gap: 10px;
        --w-pill-h: 24px;
        --w-pill-r: 7px;

        /* Brand colors for VS Code skin */
        --rw-black: #07080b;
        --rw-ink: #0b0d12;
        --rw-panel: #0f121a;
        --rw-panel-2: #121728;
        --rw-hotpink: #ff2fb3;
        --rw-coral: #ff6a5c;
        --rw-teal: #26f7d4;
        --rw-babyblue: #7dd3ff;

        /* Aliases for skin compatibility */
        --rw-bg: var(--rw-ink);
        --rw-surface: var(--rw-panel);
        --rw-surface-2: var(--rw-panel-2);
        --rw-border: color-mix(in oklab, white 12%, transparent);
        --rw-divider: color-mix(in oklab, white 8%, transparent);
        --rw-fg: color-mix(in oklab, white 86%, transparent);
        --rw-muted: color-mix(in oklab, white 60%, transparent);
        --rw-r1: 6px;
        --rw-r2: 10px;
        --rw-shadow: none;
        --rw-pill-h: 24px;
      }
    `
}

function ensureWorkbenchThemeTokens(): void {
  setStyleSegment('tokens', getThemeTokenCss())
}

function ensureWorkbenchLayoutOverrides(): void {
  setStyleSegment('layout', getLayoutCss())
}

function getLayoutCss(): string {
  return `
      html[data-rw-renderer="prod"] body,
      html[data-rw-renderer="prod"] #rw-app {
        background: var(--w-bg);
        color: var(--w-fg);
      }
    `
}

function setDensity(value: Density): void {
  setStoredDensity(value)
  ensureDensityOverrides(value)
}

function toggleDensity(): Density {
  const current = (document.documentElement.getAttribute('data-density') as Density | null) ?? getStoredDensity()
  const next: Density = current === 'compact' ? 'comfortable' : 'compact'
  setDensity(next)
  return next
}

function summarizeFailure(command: string, outputTail: string, exitCode: number | null): string {
  const lines = outputTail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const interesting = lines.find((line) => /error|failed|cannot|missing|denied|not found|unknown/i.test(line))
  if (interesting) return interesting.slice(0, 220)
  return `\`${command}\` exited with code ${exitCode ?? 'unknown'}.`
}

function normalizePath(origin: string, maybePath: string): string {
  if (/^https?:\/\//i.test(maybePath)) return maybePath
  return `${origin}/${maybePath.replace(/^\/+/, '')}`
}

function maxRiskLabel(steps: FixPlanStep[]): 'safe' | 'caution' | 'danger' {
  if (steps.some((step) => step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact')) {
    return 'danger'
  }
  if (steps.some((step) => step.risk_level === 'medium' || step.risk === 'safe-write')) {
    return 'caution'
  }
  return 'safe'
}

function riskCopy(label: 'safe' | 'caution' | 'danger'): string {
  if (label === 'danger') return 'Needs approval'
  if (label === 'caution') return 'Review suggested'
  return 'Safe'
}

function isAutoSafeStep(step: FixPlanStep): boolean {
  return !step.requires_confirmation && step.risk_level !== 'high' && step.risk !== 'high-impact'
}

function buildFixIntent(ctx: FailedStepContext, outputTail: string, exitCode: number | null): string {
  return [
    `The command below failed during a background execution run. Produce a minimal fix plan as runnable actions.`,
    `Failed command: ${ctx.command}`,
    `cwd: ${ctx.cwd}`,
    `exit code: ${exitCode ?? 'unknown'}`,
    `Recent output tail:`,
    outputTail || '(no output captured)',
    `Focus on the safest likely fix first. Avoid destructive commands unless absolutely necessary.`,
  ].join('\n')
}

class FixBlockManager {
  private store: WorkbenchStore
  private stepContextByStream = new Map<string, FailedStepContext>()
  private outputByStream = new Map<string, string>()
  private seenFailures = new Set<string>()

  constructor(store: WorkbenchStore) {
    this.store = store
  }

  recordPlanStepStart(payload: unknown): void {
    const stepPayload = payload as {
      runId?: string
      streamId?: string
      step?: { input?: { command?: string; cwd?: string } }
    }
    const streamId = String(stepPayload?.streamId || '')
    const command = String(stepPayload?.step?.input?.command || '')
    if (!streamId || !command) return
    const cwd = String(stepPayload?.step?.input?.cwd || '.')
    const runId = String(stepPayload?.runId || '')
    this.stepContextByStream.set(streamId, { runId, streamId, command, cwd })
    this.outputByStream.set(streamId, '')
  }

  recordChunk(payload: unknown): void {
    const chunk = payload as { streamId?: string; data?: string }
    const streamId = String(chunk?.streamId || '')
    if (!streamId) return
    const next = `${this.outputByStream.get(streamId) || ''}${String(chunk?.data || '')}`
    this.outputByStream.set(streamId, next.slice(-6000))
  }

  async recordStreamEnd(payload: unknown): Promise<void> {
    const end = payload as { streamId?: string; ok?: boolean; code?: number | null; error?: string }
    const streamId = String(end?.streamId || '')
    if (!streamId || end?.ok !== false || this.seenFailures.has(streamId)) return

    const ctx = this.stepContextByStream.get(streamId)
    if (!ctx?.command) return

    this.seenFailures.add(streamId)
    const outputTail = `${this.outputByStream.get(streamId) || ''}${end?.error ? `\n${String(end.error)}` : ''}`.trim()
    const fix = this.buildFixBlockModel(ctx, outputTail, typeof end?.code === 'number' ? end.code : null)
    this.store.dispatch({ type: 'fix/upsert', fix })
    await this.planIntoFix(fix, ctx, outputTail, typeof end?.code === 'number' ? end.code : null)
  }

  private buildFixBlockModel(ctx: FailedStepContext, outputTail: string, exitCode: number | null): FixBlockModel {
    return {
      id: `fix:${ctx.runId || ctx.streamId}`,
      runId: ctx.runId || ctx.streamId,
      streamId: ctx.streamId,
      command: ctx.command,
      cwd: ctx.cwd,
      exitCode,
      status: 'planning',
      whatBroke: summarizeFailure(ctx.command, outputTail, exitCode),
      whySafe: 'RinaWarp is generating the lowest-risk runnable fix plan it can justify from the failed receipt context.',
      steps: [],
      ts: Date.now(),
    }
  }

  private async planIntoFix(
    fix: FixBlockModel,
    ctx: FailedStepContext,
    outputTail: string,
    exitCode: number | null
  ): Promise<void> {
    try {
      const plan = await window.rina.agentPlan({
        intentText: buildFixIntent(ctx, outputTail, exitCode),
        projectRoot: ctx.cwd,
      })
      const steps = Array.isArray(plan?.steps) ? plan.steps : []
      const nextFix: FixBlockModel = {
        ...fix,
        status: steps.length > 0 ? 'ready' : 'error',
        whySafe:
          plan?.reasoning ||
          (steps.length > 0
            ? 'These actions came from the planner using the failed command, recent output tail, and workspace root.'
            : 'No runnable fix steps were returned for this failure.'),
        steps: steps.map((step, index): FixStepModel => ({
          title: `Step ${index + 1}`,
          command: String(step.input?.command || '(missing command)'),
          cwd: String(step.input?.cwd || ctx.cwd),
          risk:
            step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact'
              ? 'dangerous'
              : step.risk_level === 'medium' || step.risk === 'safe-write'
                ? 'moderate'
                : 'safe',
        })),
        error: steps.length > 0 ? undefined : 'No runnable actions available for this failure yet.',
      }
      this.store.dispatch({ type: 'fix/upsert', fix: nextFix })
    } catch (error) {
      this.store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          whySafe: 'RinaWarp could not produce a structured fix plan from this failure.',
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  async ensureProAccess(): Promise<boolean> {
    const license = await window.rina.licenseState()
    if ((license?.tier || 'starter').toLowerCase() !== 'starter') return true
    await this.openUpgradeModal()
    return this.refreshProWithRetry()
  }

  async promptUpgradeToPro(): Promise<void> {
    await this.openUpgradeModal()
  }

  private async refreshProWithRetry(deadlineMs = 60_000): Promise<boolean> {
    const deadline = Date.now() + deadlineMs
    while (Date.now() < deadline) {
      const state = window.rina.licenseRefresh ? await window.rina.licenseRefresh() : await window.rina.licenseState()
      const tier = (state?.tier || 'starter').toLowerCase()
      if (tier !== 'starter') return true
      await new Promise((resolve) => setTimeout(resolve, 3_000))
    }
    return false
  }

  private async openUpgradeModal(): Promise<void> {
    ensureFixBlockStyles()
    const cachedEmail = String((await window.rina.licenseCachedEmail?.())?.email || '').trim().toLowerCase()
    await new Promise<void>((resolve) => {
      const backdrop = document.createElement('div')
      backdrop.className = 'fix-upgrade-backdrop'
      backdrop.innerHTML = `
        <div class="fix-upgrade-modal" role="dialog" aria-modal="true" aria-label="Upgrade to Pro">
          <div class="fix-upgrade-title">Unlock premium execution</div>
          <div class="fix-upgrade-copy">
            Pro unlocks premium capability packs, installable agents, and one-click safe fixes while keeping proof attached to the thread.
          </div>
          <ul class="fix-upgrade-list">
            <li>Premium capability packs and agents</li>
            <li>One-click safe fixes when they are available</li>
            <li>Receipts and support bundles stay audit-backed</li>
          </ul>
          <label class="fix-upgrade-email-label" for="fix-upgrade-email">Billing email</label>
          <input
            id="fix-upgrade-email"
            class="fix-upgrade-email-input"
            type="email"
            placeholder="you@example.com"
            value="${cachedEmail.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"
            autocomplete="email"
          />
          <div class="fix-upgrade-status" data-upgrade-status></div>
          <div class="fix-upgrade-actions">
            <button class="fix-btn" data-upgrade-cancel>Not now</button>
            <button class="fix-btn" data-upgrade-refresh>I’ve paid — Refresh Pro status</button>
            <button class="fix-btn primary" data-upgrade-confirm>Upgrade to Pro</button>
          </div>
        </div>
      `
      const close = () => {
        backdrop.remove()
        resolve()
      }
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) close()
      })
      const emailInput = backdrop.querySelector<HTMLInputElement>('#fix-upgrade-email')
      const statusEl = backdrop.querySelector<HTMLElement>('[data-upgrade-status]')
      const readEmail = () => String(emailInput?.value || '').trim().toLowerCase()
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-cancel]')?.addEventListener('click', close)
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-refresh]')?.addEventListener('click', async () => {
        const refreshBtn = backdrop.querySelector<HTMLButtonElement>('[data-upgrade-refresh]')
        if (refreshBtn) {
          refreshBtn.disabled = true
          refreshBtn.textContent = 'Refreshing…'
        }
        if (statusEl) statusEl.textContent = ''
        try {
          const unlocked = await this.refreshProWithRetry()
          if (unlocked) {
            close()
            return
          }
          if (refreshBtn) refreshBtn.textContent = 'Still pending — try again'
          if (statusEl) statusEl.textContent = 'Still pending. If you just paid, webhook processing can take a minute.'
        } finally {
          if (refreshBtn) refreshBtn.disabled = false
        }
      })
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-confirm]')?.addEventListener('click', async () => {
        const confirmBtn = backdrop.querySelector<HTMLButtonElement>('[data-upgrade-confirm]')
        const email = readEmail()
        if (!email) {
          if (statusEl) statusEl.textContent = 'Enter your billing email to continue.'
          emailInput?.focus()
          return
        }
        if (confirmBtn) {
          confirmBtn.disabled = true
          confirmBtn.textContent = 'Opening checkout…'
        }
        try {
          const result = window.rina.licenseCheckout ? await window.rina.licenseCheckout(email) : null
          if (result?.ok) {
            if (statusEl) statusEl.textContent = 'Checkout opened in your browser. After payment, click Refresh Pro status.'
          } else if (window.rina.openStripePortal) {
            await window.rina.openStripePortal(email)
            if (statusEl) statusEl.textContent = 'Billing portal opened in your browser.'
          } else if (window.electronAPI?.shell?.openExternal) {
            await window.electronAPI.shell.openExternal('https://rinawarptech.com/pricing')
            if (statusEl) statusEl.textContent = 'Pricing opened in your browser.'
          }
        } catch {
          if (statusEl) statusEl.textContent = 'Could not open checkout. Try again in a moment.'
        } finally {
          if (confirmBtn) {
            confirmBtn.disabled = false
            confirmBtn.textContent = 'Upgrade to Pro'
          }
        }
      })
      document.body.appendChild(backdrop)
      emailInput?.focus()
    })
  }
}

// ============================================================
// Command Palette
// ============================================================

class CommandPalette {
  private root: HTMLElement | null = null
  private inputElement: HTMLInputElement | null = null
  private suggestionsElement: HTMLElement | null = null
  private isVisible = false
  private store: WorkbenchStore

  constructor(selector: string, store: WorkbenchStore) {
    this.root = document.querySelector(selector)
    this.store = store
    if (!this.root) {
      console.warn(`Command palette root ${selector} not found`)
      return
    }

    this.init()
  }

  private init(): void {
    this.inputElement = this.root!.querySelector('input')
    this.suggestionsElement = this.root!.querySelector('.suggestions')

    // Input handler
    this.inputElement?.addEventListener('input', this.handleInput.bind(this))

    // Close on Escape
    this.root?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })

    // Close on background click
    this.root?.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide()
    })
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    if (!this.root) return
    this.root.classList.add('visible')
    this.isVisible = true
    this.inputElement?.focus()
  }

  hide(): void {
    if (!this.root) return
    this.root.classList.remove('visible')
    this.isVisible = false
    if (this.inputElement) this.inputElement.value = ''
    if (this.suggestionsElement) this.suggestionsElement.innerHTML = ''
  }

  private async handleInput(): Promise<void> {
    const query = this.inputElement?.value.toLowerCase() || ''
    const commands = await this.getCommands()

    const filtered = commands.filter(
      (cmd) => cmd.cmd.toLowerCase().includes(query) || cmd.desc.toLowerCase().includes(query)
    )

    this.renderSuggestions(filtered)
  }

  private async getCommands(): Promise<Array<{ cmd: string; desc: string; action: string }>> {
    const baseCommands = [
      { cmd: 'deploy', desc: 'Ask Rina to help you deploy', action: 'execute' },
      { cmd: 'build', desc: 'Ask Rina to build the project', action: 'execute' },
      { cmd: 'test', desc: 'Ask Rina to run the tests', action: 'execute' },
      { cmd: 'analyze', desc: 'Ask Rina to analyze the project', action: 'execute' },
      { cmd: 'lint', desc: 'Ask Rina to run lint', action: 'execute' },
      { cmd: 'refactor', desc: 'Ask Rina to help refactor', action: 'execute' },
      { cmd: 'brain', desc: 'Open Brain inspector', action: 'panel-brain' },
      { cmd: 'diagnostics', desc: 'Open Diagnostics inspector', action: 'panel-diagnostics' },
      { cmd: 'agent', desc: 'Open Agent thread', action: 'panel-agent' },
      { cmd: 'code', desc: 'Open Workspace inspector', action: 'panel-code' },
      { cmd: 'mode auto', desc: 'Set auto mode', action: 'mode-auto' },
      { cmd: 'mode assist', desc: 'Set assist mode', action: 'mode-assist' },
      { cmd: 'mode explain', desc: 'Set explain mode', action: 'mode-explain' },
      { cmd: 'status', desc: 'Ask Rina for system status', action: 'execute' },
      { cmd: 'help', desc: 'Ask Rina what she can do here', action: 'execute' },
    ]

    // Try to get additional commands from Rina
    try {
      const plans = (await window.rina.getPlans()) as Array<{ id: string; description?: string }>
      if (plans && plans.length > 0) {
        plans.forEach((plan) => {
          baseCommands.push({
            cmd: plan.id,
            desc: plan.description || plan.id,
            action: 'execute',
          })
        })
      }
    } catch {
      // Use base commands only
    }

    return baseCommands
  }

  private renderSuggestions(commands: Array<{ cmd: string; desc: string; action: string }>): void {
    if (!this.suggestionsElement) return

    this.suggestionsElement.innerHTML = ''

    commands.forEach((cmd) => {
      const item = document.createElement('div')
      item.className = 'palette-item'
      const icon = cmd.action?.startsWith('panel-') ? '📋' : cmd.action?.startsWith('mode-') ? '⚙️' : '✦'
      item.innerHTML = `<span class="text-teal">${icon} ${cmd.cmd}</span> <span class="text-gray-400">- ${cmd.desc}</span>`
      item.addEventListener('click', () => this.executeCommand(cmd.cmd, cmd.action))
      this.suggestionsElement?.appendChild(item)
    })

    if (commands.length === 0 && this.inputElement?.value) {
      this.suggestionsElement.innerHTML = '<div class="palette-item text-gray-400">Press Enter to ask Rina…</div>'
    }
  }

  private async executeCommand(cmd: string, action: string): Promise<void> {
    // Handle panel switching
    if (action?.startsWith('panel-')) {
      const panelName = action.replace('panel-', '')
      const tabButton = document.querySelector(`[data-tab="${panelName}"]`)
      if (tabButton) {
        ;(tabButton as HTMLElement).click()
      }
      this.hide()
      return
    }

    // Handle mode changes
    if (action?.startsWith('mode-')) {
      const mode = action.replace('mode-', '')
      await window.rina.setMode(mode)
      this.hide()
      return
    }

    // Ask Rina through the canonical thread path
    try {
      await sendPromptToRina(this.store, cmd)
    } catch (error) {
      console.error('Command execution failed:', error)
    }

    this.hide()
  }
}

function createWorkbenchStore(initialWorkspaceKey?: string): WorkbenchStore {
  const snapshot = loadWorkbenchSnapshot()
  const activeWorkspaceKey =
    typeof initialWorkspaceKey === 'string' && initialWorkspaceKey.trim()
      ? initialWorkspaceKey.trim()
      : '__none__'
  const snapshotActiveCenterView =
    typeof (snapshot as { activeCenterView?: unknown } | undefined)?.activeCenterView === 'string'
      ? String((snapshot as { activeCenterView?: unknown }).activeCenterView)
      : undefined
  const restoredAnalytics =
    getSnapshotAnalyticsByWorkspace(snapshot)[activeWorkspaceKey] ||
    (typeof snapshot?.workspaceKey === 'string' && snapshot.workspaceKey === activeWorkspaceKey ? snapshot.analytics : undefined) ||
    snapshot?.analytics
  return new WorkbenchStore({
    activeTab: 'agent',
    activeCenterView:
      snapshotActiveCenterView === 'runs' ||
      snapshotActiveCenterView === 'marketplace' ||
      snapshotActiveCenterView === 'code' ||
      snapshotActiveCenterView === 'brain' ||
      snapshotActiveCenterView === 'settings' ||
      snapshotActiveCenterView === 'execution-trace' ||
      snapshotActiveCenterView === 'terminal'
        ? snapshotActiveCenterView === 'terminal'
          ? 'execution-trace'
          : snapshotActiveCenterView
        : 'runs',
    activeRightView: 'agent',
    ui: {
      expandedRunLinksByMessageId:
        snapshot?.ui && typeof snapshot.ui === 'object' && snapshot.ui.expandedRunLinksByMessageId && typeof snapshot.ui.expandedRunLinksByMessageId === 'object'
          ? snapshot.ui.expandedRunLinksByMessageId
          : {},
      expandedRunOutputByRunId:
        snapshot?.ui && typeof snapshot.ui === 'object' && snapshot.ui.expandedRunOutputByRunId && typeof snapshot.ui.expandedRunOutputByRunId === 'object'
          ? snapshot.ui.expandedRunOutputByRunId
          : {},
      showAllRuns: Boolean(snapshot?.ui?.showAllRuns),
      scopeRunsToWorkspace: snapshot?.ui?.scopeRunsToWorkspace !== false,
      openDrawer: null,
      statusSummaryText: typeof snapshot?.ui?.statusSummaryText === 'string' ? snapshot.ui.statusSummaryText : null,
    },
    runOutputTailByRunId:
      snapshot?.runOutputTailByRunId && typeof snapshot.runOutputTailByRunId === 'object' ? snapshot.runOutputTailByRunId : {},
    workspaceKey: activeWorkspaceKey !== '__none__' ? activeWorkspaceKey : typeof snapshot?.workspaceKey === 'string' ? snapshot.workspaceKey : activeWorkspaceKey,
    license: { tier: 'starter', lastCheckedAt: null },
    chat: [],
    executionTrace: { blocks: [] },
    fixBlocks: [],
    runs: [],
    code: { files: [] },
    diagnostics: {
      mode: 'unknown',
      toolsCount: 0,
      agentRunning: false,
      conversationCount: 0,
      learnedCommandsCount: 0,
    },
    analytics: {
      starterIntentCount: Number(restoredAnalytics?.starterIntentCount || 0),
      inspectorOpenCount: Number(restoredAnalytics?.inspectorOpenCount || 0),
      runOutputExpandCount: Number(restoredAnalytics?.runOutputExpandCount || 0),
      proofBackedRunCount: Number(restoredAnalytics?.proofBackedRunCount || 0),
      lastStarterIntent:
        typeof restoredAnalytics?.lastStarterIntent === 'string' ? restoredAnalytics.lastStarterIntent : undefined,
      lastInspector: typeof restoredAnalytics?.lastInspector === 'string' ? restoredAnalytics.lastInspector : undefined,
      firstStarterIntentAt:
        typeof restoredAnalytics?.firstStarterIntentAt === 'number'
          ? restoredAnalytics.firstStarterIntentAt
          : undefined,
      firstProofBackedRunAt:
        typeof restoredAnalytics?.firstProofBackedRunAt === 'number'
          ? restoredAnalytics.firstProofBackedRunAt
          : undefined,
    },
    brain: { stats: null, events: [] },
    thinking: { active: false, message: '', stream: '' },
    runtime: {
      mode: typeof snapshot?.runtime?.mode === 'string' ? snapshot.runtime.mode : 'explain',
      autonomyEnabled: Boolean(snapshot?.runtime?.autonomyEnabled),
      autonomyLevel: typeof snapshot?.runtime?.autonomyLevel === 'string' ? snapshot.runtime.autonomyLevel : 'off',
      ipcCanonicalReady: false,
      rendererCanonicalReady: false,
    },
    marketplace: { loading: false, agents: [], installed: [] },
    capabilities: { loading: false, packs: [] },
  })
}

async function refreshRuns(store: WorkbenchStore, options?: { markRestored?: boolean }): Promise<void> {
  if (typeof window.rina.runsList !== 'function') return
  try {
    const result = await window.rina.runsList(80)
    if (!result?.ok || !Array.isArray(result.runs)) return
    const previousRuns = new Map(store.getState().runs.map((run) => [run.id, run]))
    const mappedRuns: WorkbenchState['runs'] = result.runs.map((run) => {
      const runId = run.latestReceiptId || run.sessionId
      const status: WorkbenchState['runs'][number]['status'] = run.interrupted
        ? 'interrupted'
        : run.failedCount > 0
          ? 'failed'
          : run.latestExitCode === null || run.latestExitCode === undefined
            ? 'running'
            : 'ok'

      return {
        id: runId,
        sessionId: run.sessionId,
        title: run.latestCommand || 'Session activity',
        command: run.latestCommand || '',
        cwd: run.latestCwd || run.projectRoot || '',
        status,
        startedAt: run.latestStartedAt || run.createdAt,
        updatedAt: run.updatedAt,
        endedAt: run.latestEndedAt ?? (run.latestExitCode === null || run.latestExitCode === undefined ? null : run.updatedAt),
        exitCode: run.latestExitCode,
        commandCount: run.commandCount,
        failedCount: run.failedCount,
        latestReceiptId: run.latestReceiptId,
        projectRoot: run.projectRoot,
        source: run.source,
        platform: run.platform,
        restored: previousRuns.has(runId) ? previousRuns.get(runId)?.restored : Boolean(options?.markRestored),
      }
    })
    store.dispatch({
      type: 'runs/set',
      runs: mappedRuns,
    })
    if (options?.markRestored) {
      const restoredRuns = mappedRuns.filter((run) => run.restored)
      if (restoredRuns.length > 0) {
        const interruptedRuns = restoredRuns.filter((run) => run.status === 'interrupted')
        const latestInterrupted = interruptedRuns[0] || restoredRuns[0]
        store.dispatch({ type: 'chat/removeByPrefix', prefix: 'system:runs:restore:' })
        store.dispatch({ type: 'chat/removeByPrefix', prefix: 'rina:runs:resume:' })
        store.dispatch({
          type: 'chat/add',
          msg: {
            id: `system:runs:restore:${Date.now()}`,
            role: 'rina',
            content: latestInterrupted
              ? [
                  replyCardBlock({
                    label: 'I recovered your last session safely',
                    badge: `${restoredRuns.length} restored`,
                    className: 'rw-recovery-card',
                    bodyHtml: `
                      <div class="rw-recovery-copy">
                        Your receipts are intact. I restored ${restoredRuns.length} recent run${restoredRuns.length === 1 ? '' : 's'} from your last session and can pick up the latest interrupted task when you are ready.
                      </div>
                      ${
                        latestInterrupted.command || latestInterrupted.title
                          ? `
                            <div class="rw-recovery-latest">
                              <span class="rw-recovery-latest-label">Latest interrupted task</span>
                              <code>${escapeHtml(latestInterrupted.command || latestInterrupted.title || latestInterrupted.id)}</code>
                            </div>
                          `
                          : ''
                      }
                      <div class="rw-inline-actions rw-inline-actions-recovery">
                        ${
                          latestInterrupted.status === 'interrupted'
                            ? `<button class="rw-inline-action" type="button" data-run-resume="${escapeHtml(latestInterrupted.id)}">Resume latest</button>`
                            : ''
                        }
                        <button class="rw-inline-action" type="button" data-open-runs-panel="system:runs:restore">Review recovered runs</button>
                        <button class="rw-inline-action is-subtle" type="button" data-tab="runs">Dismiss for now</button>
                      </div>
                    `,
                  }),
                ]
              : [bubbleBlock(`Restored ${restoredRuns.length} recent run${restoredRuns.length === 1 ? '' : 's'} to the Runs inspector.`)],
            ts: Date.now(),
            workspaceKey: getWorkspaceKeyFromStore(store),
            runIds: latestInterrupted ? [latestInterrupted.id] : [],
          },
        })
      }
    }
  } catch (error) {
    console.warn('Failed to refresh runs:', error)
  }
}

function bindAgentComposer(store: WorkbenchStore): void {
  const input = document.getElementById('agent-input') as HTMLTextAreaElement | null
  const send = document.getElementById('agent-send') as HTMLButtonElement | null
  if (!input || !send) return

  const submit = async () => {
    const prompt = input.value.trim()
    if (!prompt) return
    input.value = ''
    await sendPromptToRina(store, prompt)
  }

  send.addEventListener('click', () => {
    void submit()
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  })
}

async function refreshCode(store: WorkbenchStore): Promise<void> {
  try {
    const workspaceRoot = getAgentWorkspaceRootFromStore(store)
    const files = (await window.rina.invoke(
      'rina:code:listFiles',
      workspaceRoot ? { projectRoot: workspaceRoot, limit: 100 } : { limit: 100 }
    )) as {
      ok?: boolean
      files?: string[]
    }
    if (files?.ok && Array.isArray(files.files)) {
      store.dispatch({ type: 'code/setFiles', files: files.files })
    }
  } catch (error) {
    console.warn('Failed to refresh code panel:', error)
  }
}

async function refreshDiagnostics(store: WorkbenchStore): Promise<void> {
  try {
    const stats = (await window.rina.getStatus()) as {
      mode?: string
      tools?: unknown[]
      agentRunning?: boolean
      memoryStats?: {
        conversationCount?: number
        learnedCommandsCount?: number
      }
    }
    store.dispatch({
      type: 'diagnostics/set',
      diagnostics: {
        mode: String(stats?.mode || 'unknown'),
        toolsCount: Array.isArray(stats?.tools) ? stats.tools.length : 0,
        agentRunning: Boolean(stats?.agentRunning),
        conversationCount: Number(stats?.memoryStats?.conversationCount || 0),
        learnedCommandsCount: Number(stats?.memoryStats?.learnedCommandsCount || 0),
      },
    })
  } catch (error) {
    console.warn('Failed to refresh diagnostics:', error)
  }
}

async function refreshBrainStats(store: WorkbenchStore): Promise<void> {
  try {
    const stats = await window.rina.getBrainStats()
    store.dispatch({ type: 'brain/setStats', stats })
  } catch (error) {
    console.warn('Failed to refresh brain stats:', error)
  }
}

async function refreshRuntimeStatus(store: WorkbenchStore): Promise<void> {
  try {
    const mode = await window.rina.getMode()
    store.dispatch({
      type: 'runtime/set',
      runtime: {
        mode: String(mode || 'explain'),
        autonomyEnabled: Boolean(window.rina.autonomy?.enabled),
        autonomyLevel: String(window.rina.autonomy?.level || 'off'),
        ipcCanonicalReady: true,
        rendererCanonicalReady: true,
      },
    })
  } catch (error) {
    console.warn('Failed to refresh runtime status:', error)
    store.dispatch({
      type: 'runtime/set',
      runtime: {
        ...store.getState().runtime,
        ipcCanonicalReady: false,
      },
    })
  }
}

async function refreshMarketplace(store: WorkbenchStore): Promise<void> {
  if (typeof window.rina.marketplaceList !== 'function' || typeof window.rina.installedAgents !== 'function') return
  store.dispatch({ type: 'marketplace/setLoading', loading: true })
  try {
    const [marketplace, installed] = await Promise.all([window.rina.marketplaceList(), window.rina.installedAgents()])
    if (!marketplace?.ok) {
      store.dispatch({ type: 'marketplace/setError', error: marketplace?.error || 'Failed to load marketplace' })
      return
    }
    store.dispatch({ type: 'marketplace/setAgents', agents: Array.isArray(marketplace.agents) ? marketplace.agents : [] })
    store.dispatch({
      type: 'marketplace/setInstalled',
      installed: Array.isArray(installed?.agents) ? installed.agents.map((agent) => agent.name) : [],
    })
  } catch (error) {
    store.dispatch({
      type: 'marketplace/setError',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    store.dispatch({ type: 'marketplace/setLoading', loading: false })
  }
}

async function refreshCapabilityPacks(store: WorkbenchStore): Promise<void> {
  if (typeof window.rina.capabilityPacks !== 'function') return
  store.dispatch({ type: 'capabilities/setLoading', loading: true })
  try {
    const result = await window.rina.capabilityPacks()
    if (!result?.ok) {
      store.dispatch({ type: 'capabilities/setError', error: result?.error || 'Failed to load capabilities' })
      return
    }
    store.dispatch({
      type: 'capabilities/setPacks',
      packs: Array.isArray(result.capabilities) ? result.capabilities : [],
    })
  } catch (error) {
    store.dispatch({
      type: 'capabilities/setError',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    store.dispatch({ type: 'capabilities/setLoading', loading: false })
  }
}

async function runFixStepFromStore(store: WorkbenchStore, fixId: string, index: number): Promise<void> {
  const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
  const step = fix?.steps[index]
  if (!fix || !step) return

  store.dispatch({
    type: 'fix/upsert',
    fix: { ...fix, status: 'running', error: undefined },
  })

  try {
    const result = await window.rina.executePlanStream({
      plan: normalizePlanSteps([
        {
          input: { command: step.command, cwd: step.cwd },
          risk: step.risk === 'dangerous' ? 'high-impact' : step.risk === 'moderate' ? 'safe-write' : 'inspect',
        },
      ]),
      projectRoot: step.cwd,
      confirmed: false,
      confirmationText: '',
    })

    const runStarted = didExecutionStart(result)
    if (runStarted && result?.runId) {
      const messageId = createRunLinkedMessage(store, { command: step.command, runId: result.runId })
      commitStartedExecutionResult(
        store,
        {
          messageId,
          prompt: step.command,
          workspaceRoot: step.cwd,
          planSteps: normalizePlanSteps([
            {
              input: { command: step.command, cwd: step.cwd },
              risk: step.risk === 'dangerous' ? 'high-impact' : step.risk === 'moderate' ? 'safe-write' : 'inspect',
            },
          ]),
          title: step.title || step.command,
          command: step.command,
        },
        result
      )
      store.dispatch({
        type: 'fix/upsert',
        fix: { ...fix, status: 'running', applyRunId: result.runId, error: undefined },
      })
      return
    }

    store.dispatch({
      type: 'fix/upsert',
      fix: {
        ...fix,
        status: 'error',
        error: result?.error || result?.haltReason || `Step ${index + 1} did not start a proof-backed run.`,
      },
    })
  } catch (error) {
    store.dispatch({
      type: 'fix/upsert',
      fix: {
        ...fix,
        status: 'error',
        error: `Step ${index + 1} failed to start: ${error instanceof Error ? error.message : String(error)}`,
      },
    })
  }
}

async function autoApplyFixFromStore(
  store: WorkbenchStore,
  fixId: string,
  fixBlockManager: FixBlockManager
): Promise<void> {
  const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
  if (!fix) return

  const isPro = await fixBlockManager.ensureProAccess()
  if (!isPro) {
    store.dispatch({
      type: 'fix/upsert',
      fix: { ...fix, error: 'Upgrade required to auto-apply safe fixes.' },
    })
    return
  }

  const safeSteps = fix.steps.filter((step) => step.risk === 'safe')
  if (safeSteps.length === 0) {
    store.dispatch({
      type: 'fix/upsert',
      fix: { ...fix, status: 'error', error: 'No safe auto-apply steps are available for this fix.' },
    })
    return
  }

  store.dispatch({
    type: 'fix/upsert',
    fix: { ...fix, status: 'running', error: undefined },
  })

  try {
    const result = await window.rina.executePlanStream({
      plan: normalizePlanSteps(
        safeSteps.map((step) => ({
          input: { command: step.command, cwd: step.cwd },
          risk: 'safe-write',
        }))
      ),
      projectRoot: fix.cwd,
      confirmed: true,
      confirmationText: 'SAFE_FIX',
    })

    const runStarted = didExecutionStart(result)
    if (runStarted && result?.runId) {
      const commandSummary = safeSteps.map((step) => step.command).join(' && ')
      const messageId = createRunLinkedMessage(store, { command: commandSummary, runId: result.runId })
      commitStartedExecutionResult(
        store,
        {
          messageId,
          prompt: commandSummary,
          workspaceRoot: fix.cwd,
          planSteps: normalizePlanSteps(
            safeSteps.map((step) => ({
              input: { command: step.command, cwd: step.cwd },
              risk: 'safe-write',
            }))
          ),
          title: 'Auto-apply safe fix',
          command: commandSummary,
        },
        result
      )
      store.dispatch({
        type: 'fix/upsert',
        fix: { ...fix, status: 'running', applyRunId: result.runId, error: undefined },
      })
      return
    }
    store.dispatch({
      type: 'fix/upsert',
      fix: {
        ...fix,
        status: 'error',
        error: result?.error || result?.haltReason || 'Auto-apply did not start a proof-backed run.',
      },
    })
  } catch (error) {
    store.dispatch({
      type: 'fix/upsert',
      fix: {
        ...fix,
        status: 'error',
        error: `Auto-apply failed to start: ${error instanceof Error ? error.message : String(error)}`,
      },
    })
  }
}

// ============================================================
// Main Initialization
// ============================================================

// Export for external access
export { BasePanel, ExecutionTracePanel, AgentPanel, CodePanel, DiagnosticsPanel, BrainPanel, CommandPalette }

// Initialize when DOM is ready
async function init(): Promise<void> {
  console.log('[ui] renderer.prod boot', new Date().toISOString())
  document.documentElement.setAttribute('data-rw-renderer', 'prod')
  console.log('Initializing RinaWarp Terminal Pro - Production Renderer')
  if (location.pathname.includes('dist-electron/renderer')) {
    console.warn('[ui] refusing to use location.pathname as workspace root')
  }
  ensureFixBlockStyles()
  ensureDensityOverrides()
  ensureWorkbenchThemeTokens()
  ensureWorkbenchLayoutOverrides()
  ensureWorkbenchVsCodeSkin()
  try {
    const workspace = await window.rina.workspaceDefault?.()
    if (workspace?.ok && workspace.path) {
      setWorkspaceRoot(workspace.path)
      console.log('[ui] workspaceDefault', workspace.path)
    }
  } catch (error) {
    console.warn('Failed to resolve default workspace:', error)
  }
  const initialWorkspaceKey = getWorkspaceKey()
  const store = createWorkbenchStore(initialWorkspaceKey)
  store.dispatch({ type: 'workspace/set', workspaceKey: initialWorkspaceKey })
  store.subscribe((state) => {
    renderWorkbench(state)
    persistWorkbenchState(store)
  })
  initSettingsUi()
  window.__rinaDensity = {
    get: () => ((document.documentElement.getAttribute('data-density') as Density | null) ?? getStoredDensity()),
    set: (value: Density) => setDensity(value),
    toggle: () => toggleDensity(),
  }

  // Create panel instances
  const executionTracePanel = new ExecutionTracePanel('#panel-execution-trace', store)
  const agentPanel = new AgentPanel('#panel-agent', store)
  const fixBlockManager = new FixBlockManager(store)
  const actionsController = createActionsController({
    root: document,
    store,
    fixBlockManager,
    deps: {
      trackRendererEvent,
      sendPromptToRina,
      scrollToRun,
      scrollToMessage,
      autoApplyFixFromStore,
      runFixStepFromStore,
      refreshMarketplace,
      refreshCapabilityPacks,
      getAgentWorkspaceRoot: () => getAgentWorkspaceRootFromStore(store),
      normalizePlanSteps,
      resolvePlanCapabilityRequirements,
      buildExecutionPlanContent,
      commitStartedExecutionResult,
      buildExecutionHaltContent,
      buildInterruptedRunRecoveryPrompt,
      buildTrustSnapshot,
      setTransientStatusSummary,
      getWorkspaceKey: () => getWorkspaceKeyFromStore(store),
    },
  })
  actionsController.mount()
  globalThis.addEventListener(
    'beforeunload',
    () => {
      actionsController.unmount()
      unregisterShortcuts.forEach((cleanup) => cleanup())
      globalShortcutRegistry.stop()
    },
    { once: true }
  )
  bindAgentComposer(store)
  void refreshRuns(store, { markRestored: true })
  void refreshCode(store)
  void refreshDiagnostics(store)
  void refreshBrainStats(store)
  void refreshRuntimeStatus(store)
  void refreshMarketplace(store)
  void refreshCapabilityPacks(store)
  globalThis.setInterval(() => void refreshDiagnostics(store), 10_000)
  globalThis.setInterval(() => void refreshBrainStats(store), 5_000)
  globalThis.setInterval(() => void refreshRuntimeStatus(store), 10_000)

  // Create command palette
  const commandPalette = new CommandPalette('#command-palette', store)
  const unregisterShortcuts = [
    globalShortcutRegistry.register({
      key: 'k',
      ctrl: true,
      handler: () => commandPalette.toggle(),
    }),
    globalShortcutRegistry.register({
      key: 'k',
      cmd: true,
      handler: () => commandPalette.toggle(),
    }),
    globalShortcutRegistry.register({
      key: ',',
      ctrl: true,
      handler: () => {
        const settingsBtn = document.querySelector('[data-tab="settings"]')
        if (settingsBtn) {
          ;(settingsBtn as HTMLElement).click()
        }
      },
    }),
    globalShortcutRegistry.register({
      key: ',',
      cmd: true,
      handler: () => {
        const settingsBtn = document.querySelector('[data-tab="settings"]')
        if (settingsBtn) {
          ;(settingsBtn as HTMLElement).click()
        }
      },
    }),
    globalShortcutRegistry.register({
      key: 'Escape',
      handler: () => {
        commandPalette.hide()
        document.body.classList.remove('palette-open')
      },
    }),
  ]
  globalShortcutRegistry.start()

  // Subscribe to thinking stream
  window.rina.onThinking((step) => {
    store.dispatch({
      type: 'thinking/set',
      active: true,
      message: step.message || 'Rina is tracing through it',
      stream: step.message || '',
    })
  })

  window.rina.onBrainEvent((event) => {
    store.dispatch({
      type: 'brain/addEvent',
      event: {
        type: event.type || 'event',
        message: event.message || '',
        progress: typeof event.progress === 'number' ? event.progress : undefined,
      },
    })
  })

  window.rina.onPlanStepStart((payload: unknown) => {
    const stepPayload = payload as { runId?: string; streamId?: string }
    const streamId = String(stepPayload?.streamId || '')
    const runId = String(stepPayload?.runId || '')
    if (streamId && runId) {
      liveRunIdByStreamId.set(streamId, runId)
      const run = store.getState().runs.find((entry) => entry.id === runId)
      if (run) {
        store.dispatch({
          type: 'runs/upsert',
          run: {
            ...run,
            status: 'running',
            updatedAt: new Date().toISOString(),
          },
        })
      }
    }
  })

  // Subscribe to stream chunks
  window.rina.onStreamChunk((chunk: unknown) => {
    fixBlockManager.recordChunk(chunk)
    const data = chunk as { streamId?: string; data?: string; stream?: string }
    if ((data?.stream === 'stdout' || data?.stream === 'stderr') && data.streamId) {
      const blockId = `stream:${data.streamId}`
      const existing = store.getState().executionTrace.blocks.find((block) => block.id === blockId)
      if (!existing) {
        store.dispatch({
          type: 'executionTrace/blockUpsert',
          block: {
            id: blockId,
            runId: data.streamId,
            status: 'running',
            output: '',
            ts: Date.now(),
          },
        })
      }
      store.dispatch({ type: 'executionTrace/appendOutput', blockId, chunk: data.data || '' })
      const linkedRunId = liveRunIdByStreamId.get(data.streamId)
      if (linkedRunId && data.data) {
        store.dispatch({ type: 'runs/appendOutputTail', runId: linkedRunId, chunk: data.data })
      }
    }
    if (data?.data) {
      store.dispatch({
        type: 'thinking/set',
        active: store.getState().thinking.active,
        message: store.getState().thinking.message,
        stream: data.data.slice(-400),
      })
    }
  })

  // Subscribe to stream end
  window.rina.onStreamEnd((result: unknown) => {
    void fixBlockManager.recordStreamEnd(result)
    const res = result as { ok?: boolean; error?: string; streamId?: string; code?: number | null }
    const linkedRunId = res.streamId ? liveRunIdByStreamId.get(res.streamId) : undefined
    const blockId = res.streamId ? `stream:${res.streamId}` : null
    if (blockId) {
      const existing = store.getState().executionTrace.blocks.find((block) => block.id === blockId)
      if (existing) {
        store.dispatch({
          type: 'executionTrace/blockUpsert',
          block: {
            ...existing,
            status: res.ok === false ? 'failed' : 'success',
            exitCode: typeof res.code === 'number' ? res.code : existing.exitCode,
          },
        })
      }
    }
    if (linkedRunId) {
      const run = store.getState().runs.find((entry) => entry.id === linkedRunId)
      if (run) {
        const updatedRun = {
          ...run,
          status: (res.ok === false ? 'failed' : 'ok') as WorkbenchState['runs'][number]['status'],
          exitCode: typeof res.code === 'number' ? res.code : run.exitCode,
          endedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        store.dispatch({
          type: 'runs/upsert',
          run: updatedRun,
        })
        if (!trackedProofRunIds.has(updatedRun.id) && hasRunProof(updatedRun)) {
          trackedProofRunIds.add(updatedRun.id)
          store.dispatch({ type: 'analytics/track', event: 'proof_backed_run_seen' })
          void trackRendererEvent('proof_backed_run_seen', {
            run_id: updatedRun.id,
            status: updatedRun.status,
            exit_code: updatedRun.exitCode,
            workspace_key: store.getState().workspaceKey,
          })
          void trackRendererFunnel('first_block', {
            run_id: updatedRun.id,
            status: updatedRun.status,
            workspace_key: store.getState().workspaceKey,
          })
        }
        if (res.error) {
          store.dispatch({ type: 'runs/appendOutputTail', runId: linkedRunId, chunk: `\n${res.error}` })
        }
      }
      const affectedFixes = store.getState().fixBlocks.filter((fix) => fix.applyRunId === linkedRunId)
      for (const fix of affectedFixes) {
        store.dispatch({
          type: 'fix/upsert',
          fix: {
            ...fix,
            exitCode: typeof res.code === 'number' ? res.code : fix.exitCode,
            status: res.ok === false ? 'error' : typeof res.code === 'number' && res.code === 0 ? 'done' : 'error',
            error:
              res.ok === false
                ? res.error || 'The fix run failed before proof completed.'
                : typeof res.code === 'number' && res.code === 0
                  ? undefined
                  : 'The fix run finished without successful proof.',
          },
        })
      }
      if (res.streamId) liveRunIdByStreamId.delete(res.streamId)
    }
    if (res?.error) {
      executionTracePanel.appendOutput(`Error: ${res.error}`, 'error')
    } else if (res?.ok === false) {
      executionTracePanel.appendOutput('Command failed — Fix Block added in the Agent panel', 'error')
    }
    store.dispatch({ type: 'thinking/set', active: false, message: '', stream: '' })
    void refreshRuns(store)
    void refreshDiagnostics(store)
    void refreshCode(store)
  })

  window.rina.onPlanStepStart((step: unknown) => {
    fixBlockManager.recordPlanStepStart(step)
  })

  // Telemetry: track session start
  try {
    await window.rina.invoke('telemetry:sessionStart')
  } catch {
    // Telemetry is optional
  }

  // Telemetry: track session end on page unload
  // Use global Window type
  const globalWindow = window as unknown as Window
  globalWindow.addEventListener('beforeunload', async () => {
    try {
      await window.rina.invoke('telemetry:sessionEnd')
    } catch {
      // Ignore
    }
  })

  // Update status bar
  const statusSummary = document.getElementById('status-summary')
  if (statusSummary) {
    statusSummary.textContent = 'Ready'
  }

  const license = await window.rina.licenseState()
  store.dispatch({
    type: 'license/set',
    tier: ((license?.tier || 'starter').toLowerCase() as LicenseTier) || 'starter',
    lastCheckedAt: Date.now(),
  })
  store.dispatch({
    type: 'runtime/set',
    runtime: {
      ...store.getState().runtime,
      rendererCanonicalReady: true,
    },
  })

  console.log('RinaWarp Terminal Pro initialized successfully')

  // Signal renderer ready for E2E tests
  ;(window as any).RINAWARP_READY = true
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
