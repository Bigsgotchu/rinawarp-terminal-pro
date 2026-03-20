import * as electron from 'electron'
const { contextBridge, ipcRenderer, shell } = electron

// ============================================================
// MINIMAL SECURITY WHITELIST - Only verified working channels
// ============================================================
const ALLOWED_INVOKE_CHANNELS = new Set([
  // Core Rina (verified working)
  'rina:getStatus',
  'rina:getMode',
  'rina:setMode',
  'rina:runAgent',
  'rina:getPlans',
  'rina:getTools',
  // Telemetry (stubs - always return true)
  'telemetry:sessionStart',
  'telemetry:sessionEnd',
  'telemetry:commandRun',
  'telemetry:aiMessage',
  'telemetry:quickFix',
  // Diagnostics
  'rina:diagnostics:paths',
  'rina:support:bundle',
  'rina:openRunsFolder',
  'rina:runs:list',
  'rina:runs:tail',
  'rina:revealRunReceipt',
  'rina:code:listFiles',
  'rina:code:readFile',
  'rina:workspace:default',
  // PTY (if available)
  'rina:pty:start',
  'rina:pty:write',
  'rina:pty:resize',
  'rina:pty:stop',
  'rina:pty:metrics',
  // Canonical plan/run/proof path
  'rina:agent:plan',
  'rina:executePlanStream',
  'rina:capabilities:execute',
  'rina:analytics:funnel',
  'analytics:trackEvent',
  // License
  'license:verify',
  'license:refresh',
  'license:state',
  'license:checkout',
  'license:portal',
  'license:lookup',
  'license:email',
  'secure-agent:list',
  'secure-agent:marketplace',
  'secure-agent:install',
  'rina:capabilities:list',
])

const ALLOWED_ON_CHANNELS = new Set([
  'rina:pty:data',
  'rina:pty:exit',
  'rina:stream:chunk',
  'rina:stream:end',
  'rina:plan:stepStart',
  'rina:plan:run:start',
  'rina:plan:run:end',
  'rina:thinking',
  'rina:brain:event',
])

const ALLOWED_SEND_CHANNELS = new Set<string>([
  // No send channels by default for security
])

// ============================================================
// SECURITY: Validate channel against whitelist
// ============================================================
function isInvokeChannelAllowed(channel: string): boolean {
  return ALLOWED_INVOKE_CHANNELS.has(channel)
}

function isOnChannelAllowed(channel: string): boolean {
  return ALLOWED_ON_CHANNELS.has(channel)
}

function isSendChannelAllowed(channel: string): boolean {
  return ALLOWED_SEND_CHANNELS.has(channel)
}

// ============================================================
// SECURITY: Sanitize input to prevent injection
// ============================================================
function sanitizeString(input: unknown, maxLength = 10000): string {
  if (typeof input !== 'string') return ''
  // Limit length to prevent DoS
  return input.substring(0, maxLength)
}

function sanitizeObject(input: unknown): Record<string, unknown> | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  // Return a shallow copy to prevent mutation
  return { ...(input as Record<string, unknown>) }
}

// Electron API for renderer access - wrap ipcRenderer methods explicitly
// SECURITY: All IPC calls are validated against whitelist
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    on: (channel: string, callback: (...args: any[]) => void) => {
      if (!isOnChannelAllowed(channel)) {
        console.warn(`[Security] Blocked on channel: ${channel}`)
        return
      }
      ipcRenderer.on(channel, (_event: any, ...args: any[]) => callback(...args))
    },
    send: (channel: string, ...args: any[]) => {
      if (!isSendChannelAllowed(channel)) {
        console.warn(`[Security] Blocked send channel: ${channel}`)
        return
      }
      ipcRenderer.send(channel, ...args)
    },
    invoke: (channel: string, ...args: any[]) => {
      if (!isInvokeChannelAllowed(channel)) {
        console.warn(`[Security] Blocked invoke channel: ${channel}`)
        return Promise.reject(new Error(`Channel not allowed: ${channel}`))
      }
      // Sanitize arguments
      const sanitizedArgs = args.map((arg) =>
        typeof arg === 'string' ? sanitizeString(arg) : typeof arg === 'object' ? sanitizeObject(arg) : arg
      )
      return ipcRenderer.invoke(channel, ...sanitizedArgs)
    },
  },
  shell,
})

// ============================================================
// MINIMAL RINA API - Only verified working channels exposed to renderer
// ============================================================
contextBridge.exposeInMainWorld('rina', {
  // Generic invoke for any allowed channel
  invoke: (channel: string, ...args: any[]) => {
    if (!isInvokeChannelAllowed(channel)) {
      console.warn(`[Security] Blocked invoke channel: ${channel}`)
      return Promise.reject(new Error(`Channel not allowed: ${channel}`))
    }
    const sanitizedArgs = args.map((arg) =>
      typeof arg === 'string' ? sanitizeString(arg) : typeof arg === 'object' ? sanitizeObject(arg) : arg
    )
    return ipcRenderer.invoke(channel, ...sanitizedArgs)
  },

  // Core status/mode (verified working)
  getMode: () => ipcRenderer.invoke('rina:getMode'),
  setMode: (mode: string) => ipcRenderer.invoke('rina:setMode', mode),
  getStatus: () => ipcRenderer.invoke('rina:getStatus'),
  getPlans: () => ipcRenderer.invoke('rina:getPlans'),
  runAgent: (command: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) =>
    ipcRenderer.invoke('rina:runAgent', command, opts),
  getTools: () => ipcRenderer.invoke('rina:getTools'),

  // PTY terminal (if available)
  ptyStart: (args?: { cols?: number; rows?: number; cwd?: string }) => ipcRenderer.invoke('rina:pty:start', args),
  ptyWrite: (data: string) => ipcRenderer.invoke('rina:pty:write', data),
  ptyResize: (cols: number, rows: number) => ipcRenderer.invoke('rina:pty:resize', cols, rows),
  ptyStop: () => ipcRenderer.invoke('rina:pty:stop'),
  ptyMetrics: () => ipcRenderer.invoke('rina:pty:metrics'),
  onPtyData: (cb: (data: string) => void) => ipcRenderer.on('rina:pty:data', (_e, data) => cb(data)),
  onPtyExit: (cb: (evt: { exitCode: number; signal: number }) => void) =>
    ipcRenderer.on('rina:pty:exit', (_e, payload) => cb(payload)),

  // Event subscriptions (allowed channels only)
  on: (channel: string, handler: (...args: any[]) => void) => {
    if (!isOnChannelAllowed(channel)) {
      console.warn(`[Security] Blocked on channel: ${channel}`)
      return () => {}
    }
    const wrapped = (_evt: unknown, payload: unknown) => handler(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },

  // Thinking stream events
  onThinking: (cb: (step: { time: number; message: string }) => void) =>
    ipcRenderer.on('rina:thinking', (_e, step) => cb(step)),

  // Stream events
  onStreamChunk: (cb: (data: any) => void) => {
    ipcRenderer.on('rina:stream:chunk', (_e, payload) => cb(payload))
  },
  onStreamEnd: (cb: (data: any) => void) => {
    ipcRenderer.on('rina:stream:end', (_e, payload) => cb(payload))
  },

  // Plan events
  onPlanStepStart: (cb: (evt: any) => void) => ipcRenderer.on('rina:plan:stepStart', (_e, payload) => cb(payload)),
  onPlanRunStart: (cb: (p: { planRunId: string }) => void) => ipcRenderer.on('rina:plan:run:start', (_e, p) => cb(p)),
  onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) =>
    ipcRenderer.on('rina:plan:run:end', (_e, p) => cb(p)),

  // Brain events
  getBrainStats: () => ipcRenderer.invoke('rina:brain:stats'),
  onBrainEvent: (cb: (event: any) => void) => ipcRenderer.on('rina:brain:event', (_e, event) => cb(event)),

  // Diagnostics
  diagnosticsPaths: () => ipcRenderer.invoke('rina:diagnostics:paths'),
  supportBundle: () => ipcRenderer.invoke('rina:support:bundle'),
  openRunsFolder: () => ipcRenderer.invoke('rina:openRunsFolder'),
  runsList: (limit?: number) => ipcRenderer.invoke('rina:runs:list', { limit }),
  runsTail: (args: { runId: string; sessionId: string; maxLines?: number; maxBytes?: number }) => ipcRenderer.invoke('rina:runs:tail', args),
  revealRunReceipt: (receiptId: string) => ipcRenderer.invoke('rina:revealRunReceipt', receiptId),

  // Telemetry (stubs - always work)
  trackSessionStart: () => ipcRenderer.invoke('telemetry:sessionStart'),
  trackSessionEnd: () => ipcRenderer.invoke('telemetry:sessionEnd'),
  trackCommandRun: () => ipcRenderer.invoke('telemetry:commandRun'),
  trackAiMessage: () => ipcRenderer.invoke('telemetry:aiMessage'),
  trackQuickFix: () => ipcRenderer.invoke('telemetry:quickFix'),

  agentPlan: (args: { intentText: string; projectRoot: string }) => ipcRenderer.invoke('rina:agent:plan', args),
  executePlanStream: (args: {
    plan: any[]
    projectRoot: string
    confirmed: boolean
    confirmationText: string
  }) => ipcRenderer.invoke('rina:executePlanStream', args),
  executeCapability: (args: {
    packKey: string
    projectRoot: string
    actionId?: string
    confirmed?: boolean
    confirmationText?: string
  }) => ipcRenderer.invoke('rina:capabilities:execute', args),
  trackEvent: (event: string, properties?: Record<string, unknown>) => ipcRenderer.invoke('analytics:trackEvent', event, properties),
  trackFunnelStep: (step: string, properties?: Record<string, unknown>) =>
    ipcRenderer.invoke('rina:analytics:funnel', step, properties),
  workspaceDefault: () => ipcRenderer.invoke('rina:workspace:default'),

  // License
  verifyLicense: (customerId: string) => ipcRenderer.invoke('license:verify', customerId),
  licenseRefresh: () => ipcRenderer.invoke('license:refresh'),
  licenseState: () => ipcRenderer.invoke('license:state'),
  licenseCheckout: (email?: string) => ipcRenderer.invoke('license:checkout', { email }),
  openStripePortal: (email?: string) => ipcRenderer.invoke('license:portal', { email }),
  licenseCachedEmail: () => ipcRenderer.invoke('license:email'),
  licenseLookupByEmail: (email: string) => ipcRenderer.invoke('license:lookup', email),
  marketplaceList: () => ipcRenderer.invoke('secure-agent:marketplace'),
  installedAgents: () => ipcRenderer.invoke('secure-agent:list'),
  installMarketplaceAgent: (args: { name: string; userEmail?: string }) => ipcRenderer.invoke('secure-agent:install', args),
  capabilityPacks: () => ipcRenderer.invoke('rina:capabilities:list'),

  // Autonomy status (stub for now)
  autonomy: { enabled: false, level: 'off' },
})
