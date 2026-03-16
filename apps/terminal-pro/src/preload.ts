import electron from 'electron'
const { contextBridge, ipcRenderer, shell } = electron

// ============================================================
// SECURITY: Whitelist of allowed IPC channels
// ============================================================
const ALLOWED_INVOKE_CHANNELS = new Set([
  // Terminal CLI block execution
  'terminal:run',
  // Rina core status/mode (required for renderer)
  'rina:getStatus',
  'rina:getMode',
  'rina:setMode',
  'rina:getPlans',
  'rina:runAgent',
  'rina:getTools',
  // Agent channels
  'agent:interpret',
  'agent:getSessions',
  'agent:getPlans',
  'agent:loadSession',
  'agent:executePlan',
  'agent:plan',
  'agent:execute',
  // License channels
  'license:verify',
  'license:state',
  'license:portal',
  'license:lookup',
  // Rina personality
  'rina:personality:reply',
  'rina:personality:prefix',
  // Workspace
  'rina:pickDirectory',
  'rina:workspace:pick',
  'rina:workspace:default',
  // Code operations
  'rina:code:listFiles',
  'rina:code:readFile',
  'read-file',
  'save-file',
  // PTY
  'rina:pty:start',
  'rina:pty:write',
  'rina:pty:resize',
  'rina:pty:stop',
  'rina:pty:metrics',
  // Agent planning
  'rina:agent:plan',
  'rina:executePlanStream',
  // Plan control
  'rina:plan:stop',
  'rina:structured:status',
  // Export
  'rina:structured:runbook:export',
  'rina:structured:runbook:preview',
  'rina:structured:runbook:json',
  'rina:export:preview',
  'rina:export:publish',
  // Search
  'rina:structured:search',
  'rina:search:unified',
  'rina:structured:detect-boundaries',
  'rina:redaction:preview',
  // Policy
  'rina:policy:env',
  'rina:policy:explain',
  // Diagnostics
  'rina:diagnostics:paths',
  'rina:support:bundle',
  // Daemon
  'rina:daemon:status',
  'rina:daemon:start',
  'rina:daemon:stop',
  'rina:daemon:tasks',
  'rina:daemon:task:add',
  // Orchestrator
  'rina:orchestrator:issue-to-pr',
  'rina:orchestrator:workspace-graph',
  'rina:orchestrator:git:prepare-branch',
  'rina:orchestrator:github:create-pr',
  'rina:orchestrator:github:pr-status',
  'rina:orchestrator:github:webhook-audit',
  'rina:orchestrator:ci:status',
  'rina:orchestrator:review:comment',
  // History
  'rina:history:import',
  'rina:renderer:error',
  // Share
  'rina:share:preview',
  'rina:share:create',
  'rina:share:list',
  'rina:share:get',
  'rina:share:revoke',
  // Team
  'rina:team:get',
  'rina:team:activity',
  'rina:team:createInvite',
  'rina:team:listInvites',
  'rina:team:acceptInvite',
  'rina:team:revokeInvite',
  'rina:team:setCurrentUser',
  'rina:team:upsertMember',
  'rina:team:removeMember',
  // Audit
  'rina:audit:export',
  // Chat
  'rina:chat:send',
  'rina:chat:export',
  // Themes
  'rina:themes:list',
  'rina:themes:get',
  'rina:themes:set',
  'rina:themes:custom:get',
  'rina:themes:custom:upsert',
  'rina:themes:custom:delete',
  // DevTools
  'rina:devtools:toggle',
  // App
  'rina:app:version',
  // Updates
  'rina:update:state',
  'rina:update:check',
  'rina:update:open-download',
  // Doctor
  'rina:doctor:plan',
  // Stream
  'rina:executeStepStream',
  'rina:stream:cancel',
  'rina:stream:kill',
  // Brain
  'rina:brain:stats',
  // Telemetry
  'telemetry:sessionStart',
  'telemetry:sessionEnd',
  'telemetry:commandRun',
  'telemetry:aiMessage',
  'telemetry:quickFix',
  // Analytics
  'rina:analytics:funnel',
  'analytics:trackEvent',
  'analytics:getUsageStatus',
  'analytics:isUsageTrackingEnabled',
  'analytics:enableUsageTracking',
  'analytics:disableUsageTracking',
  'analytics:trackCommandExecuted',
  'analytics:trackAISuggestionUsed',
  'analytics:trackSelfHealingRun',
  'analytics:trackTerminalSessionStart',
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

// Agent API for hybrid Chat + CLI + IDE UI
contextBridge.exposeInMainWorld('agent', {
  interpret: (input: string) => ipcRenderer.invoke('agent:interpret', input),
  getSessions: () => ipcRenderer.invoke('agent:getSessions'),
  getPlans: () => ipcRenderer.invoke('agent:getPlans'),
  loadSession: (id: string) => ipcRenderer.invoke('agent:loadSession', id),
  executePlan: (id: string) => ipcRenderer.invoke('agent:executePlan', id),
})

// Terminal API for CLI block execution in chat
contextBridge.exposeInMainWorld('terminal', {
  run: (command: string) => ipcRenderer.invoke('terminal:run', command),
})

contextBridge.exposeInMainWorld('rina', {
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
  // Direct command runner - for quick CLI execution
  runCommand: (cmd: string) => ipcRenderer.invoke('terminal:run', cmd),
  onStreamChunk: (cb: (data: any) => void) => {
    ipcRenderer.on('rina:stream:chunk', (_e, payload) => cb(payload))
  },
  onStreamEnd: (cb: (data: any) => void) => {
    ipcRenderer.on('rina:stream:end', (_e, payload) => cb(payload))
  },
  on: (channel: string, handler: (...args: any[]) => void) => {
    if (!isOnChannelAllowed(channel)) {
      console.warn(`[Security] Blocked on channel: ${channel}`)
      return () => {}
    }
    const wrapped = (_evt: unknown, payload: unknown) => handler(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },

  // Set Rina execution mode (auto, assist, explain)
  setMode: (mode: string) => ipcRenderer.invoke('rina:setMode', mode),

  // Original APIs
  plan: (intent: string) => ipcRenderer.invoke('agent:plan', intent),
  execute: () => ipcRenderer.invoke('agent:execute'),
  verifyLicense: (customerId: string) => ipcRenderer.invoke('license:verify', customerId),
  licenseState: () => ipcRenderer.invoke('license:state'),
  openStripePortal: () => ipcRenderer.invoke('license:portal'),
  licenseLookupByEmail: (email: string) => ipcRenderer.invoke('license:lookup', email),
  personalityReply: (args: { userId: string; message: string; isTaskContext: boolean }) =>
    ipcRenderer.invoke('rina:personality:reply', args),
  personalityPrefix: (args: { userId: string; message: string }) => ipcRenderer.invoke('rina:personality:prefix', args),

  // Directory picker
  showDirectoryPicker: () => ipcRenderer.invoke('rina:pickDirectory'),
  openDirectory: () => ipcRenderer.invoke('rina:workspace:pick'),

  // Workspace picker (returns { ok, path })
  pickWorkspace: () => ipcRenderer.invoke('rina:workspace:pick'),
  workspaceDefault: () => ipcRenderer.invoke('rina:workspace:default'),
  codeListFiles: (args: { projectRoot: string; limit?: number }) => ipcRenderer.invoke('rina:code:listFiles', args),
  codeReadFile: (args: { projectRoot: string; relativePath: string; maxBytes?: number }) =>
    ipcRenderer.invoke('rina:code:readFile', args),

  // Interactive PTY terminal
  ptyStart: (args?: { cols?: number; rows?: number; cwd?: string }) => ipcRenderer.invoke('rina:pty:start', args),
  ptyWrite: (data: string) => ipcRenderer.invoke('rina:pty:write', data),
  ptyResize: (cols: number, rows: number) => ipcRenderer.invoke('rina:pty:resize', cols, rows),
  ptyStop: () => ipcRenderer.invoke('rina:pty:stop'),
  ptyMetrics: () => ipcRenderer.invoke('rina:pty:metrics'),
  onPtyData: (cb: (data: string) => void) => ipcRenderer.on('rina:pty:data', (_e, data) => cb(data)),
  onPtyExit: (cb: (evt: { exitCode: number; signal: number }) => void) =>
    ipcRenderer.on('rina:pty:exit', (_e, payload) => cb(payload)),

  // Warp-like block APIs
  agentPlan: (args: { intentText: string; projectRoot: string }) => ipcRenderer.invoke('rina:agent:plan', args),

  executePlanStream: (args: { plan: any[]; projectRoot: string; confirmed: boolean; confirmationText: string }) =>
    ipcRenderer.invoke('rina:executePlanStream', args),

  // Plan stop API
  stopPlan: (planRunId: string) => ipcRenderer.invoke('rina:plan:stop', planRunId),
  structuredStatus: () => ipcRenderer.invoke('rina:structured:status'),
  exportStructuredRunbook: (sessionId?: string) => ipcRenderer.invoke('rina:structured:runbook:export', sessionId),
  exportStructuredRunbookPreview: (sessionId?: string) =>
    ipcRenderer.invoke('rina:structured:runbook:preview', sessionId),
  exportStructuredRunbookJson: (sessionId?: string) => ipcRenderer.invoke('rina:structured:runbook:json', sessionId),
  exportPreview: (args: { kind: 'runbook_markdown' | 'audit_json'; sessionId?: string }) =>
    ipcRenderer.invoke('rina:export:preview', args),
  exportPublish: (args: { previewId: string; typedConfirm: string; expectedHash?: string }) =>
    ipcRenderer.invoke('rina:export:publish', args),
  structuredSearch: (query: string, limit?: number) => ipcRenderer.invoke('rina:structured:search', query, limit),
  unifiedSearch: (query: string, limit?: number) => ipcRenderer.invoke('rina:search:unified', query, limit),
  detectPromptBoundaries: (transcript: string, shellHint?: 'bash' | 'zsh' | 'fish' | 'pwsh' | 'unknown') =>
    ipcRenderer.invoke('rina:structured:detect-boundaries', transcript, shellHint),
  redactionPreview: (text: string) => ipcRenderer.invoke('rina:redaction:preview', text),
  sharePreview: (args: { content: string }) => ipcRenderer.invoke('rina:share:preview', args),
  policyEnv: () => ipcRenderer.invoke('rina:policy:env'),
  policyExplain: (command: string) => ipcRenderer.invoke('rina:policy:explain', command),
  diagnosticsPaths: () => ipcRenderer.invoke('rina:diagnostics:paths'),
  supportBundle: () => ipcRenderer.invoke('rina:support:bundle'),
  daemonStatus: () => ipcRenderer.invoke('rina:daemon:status'),
  daemonStart: () => ipcRenderer.invoke('rina:daemon:start'),
  daemonStop: () => ipcRenderer.invoke('rina:daemon:stop'),
  daemonTasks: (args?: { status?: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'; deadLetter?: boolean }) =>
    ipcRenderer.invoke('rina:daemon:tasks', args || {}),
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) =>
    ipcRenderer.invoke('rina:daemon:task:add', args),
  orchestratorIssueToPr: (args: {
    issueId: string
    repoPath: string
    branchName?: string
    command?: string
    repoSlug?: string
    push?: boolean
    prDryRun?: boolean
    baseBranch?: string
    prTitle?: string
    prBody?: string
    commitMessage?: string
  }) => ipcRenderer.invoke('rina:orchestrator:issue-to-pr', args),
  orchestratorGraph: () => ipcRenderer.invoke('rina:orchestrator:workspace-graph'),
  orchestratorPrepareBranch: (args: { repoPath: string; issueId?: string; branchName?: string }) =>
    ipcRenderer.invoke('rina:orchestrator:git:prepare-branch', args),
  orchestratorCreatePr: (args: {
    repoSlug: string
    head: string
    base?: string
    title: string
    body?: string
    draft?: boolean
    dryRun?: boolean
    workflowId?: string
    issueId?: string
    branchName?: string
  }) => ipcRenderer.invoke('rina:orchestrator:github:create-pr', args),
  orchestratorPrStatus: (args: {
    workflowId: string
    status: 'planned' | 'opened' | 'merged' | 'closed' | 'failed'
    issueId?: string
    branchName?: string
    repoSlug?: string
    mode?: 'dry_run' | 'live'
    number?: number
    url?: string
    error?: string
  }) => ipcRenderer.invoke('rina:orchestrator:github:pr-status', args),
  orchestratorWebhookAudit: (args?: {
    limit?: number
    outcome?: 'accepted' | 'rejected'
    mapped?: 'pr_status' | 'ci_status' | 'review_revision'
  }) => ipcRenderer.invoke('rina:orchestrator:github:webhook-audit', args || {}),
  orchestratorCiStatus: (args: {
    workflowId: string
    provider: string
    status: 'queued' | 'running' | 'passed' | 'failed'
    url?: string
    autoRetry?: boolean
    repoPath?: string
    issueId?: string
    branchName?: string
    command?: string
    repoSlug?: string
    baseBranch?: string
    prDryRun?: boolean
  }) => ipcRenderer.invoke('rina:orchestrator:ci:status', args),
  orchestratorReviewComment: (args: {
    workflowId: string
    repoPath: string
    issueId: string
    branchName: string
    comment: string
    command?: string
    repoSlug?: string
    baseBranch?: string
    prDryRun?: boolean
  }) => ipcRenderer.invoke('rina:orchestrator:review:comment', args),
  importShellHistory: (limit?: number) => ipcRenderer.invoke('rina:history:import', limit),
  reportRendererError: (payload: { kind?: string; message?: string; extra?: string }) =>
    ipcRenderer.invoke('rina:renderer:error', payload),
  createShare: (args: {
    title?: string
    content?: string
    expiresDays?: number
    requiredRole?: 'owner' | 'operator' | 'viewer'
    previewId: string
  }) => ipcRenderer.invoke('rina:share:create', args),
  listShares: () => ipcRenderer.invoke('rina:share:list'),
  getShare: (id: string) => ipcRenderer.invoke('rina:share:get', id),
  revokeShare: (id: string) => ipcRenderer.invoke('rina:share:revoke', id),
  teamGet: () => ipcRenderer.invoke('rina:team:get'),
  teamActivity: (args?: { limit?: number }) => ipcRenderer.invoke('rina:team:activity', args || {}),
  teamCreateInvite: (args: { email?: string; role?: 'owner' | 'operator' | 'viewer'; expiresHours?: number }) =>
    ipcRenderer.invoke('rina:team:createInvite', args),
  teamListInvites: (args?: { includeSecrets?: boolean }) => ipcRenderer.invoke('rina:team:listInvites', args || {}),
  teamAcceptInvite: (args: { inviteCode?: string }) => ipcRenderer.invoke('rina:team:acceptInvite', args),
  teamRevokeInvite: (id: string) => ipcRenderer.invoke('rina:team:revokeInvite', id),
  teamSetCurrentUser: (email: string) => ipcRenderer.invoke('rina:team:setCurrentUser', email),
  teamUpsertMember: (member: { email: string; role: 'owner' | 'operator' | 'viewer' }) =>
    ipcRenderer.invoke('rina:team:upsertMember', member),
  teamRemoveMember: (email: string) => ipcRenderer.invoke('rina:team:removeMember', email),
  auditExport: () => ipcRenderer.invoke('rina:audit:export'),
  chatSend: (text: string, projectRoot?: string) => ipcRenderer.invoke('rina:chat:send', text, projectRoot),
  chatExport: () => ipcRenderer.invoke('rina:chat:export'),
  themesList: () => ipcRenderer.invoke('rina:themes:list'),
  themesGet: () => ipcRenderer.invoke('rina:themes:get'),
  themesSet: (id: string) => ipcRenderer.invoke('rina:themes:set', id),
  themesCustomGet: () => ipcRenderer.invoke('rina:themes:custom:get'),
  themesCustomUpsert: (theme: any) => ipcRenderer.invoke('rina:themes:custom:upsert', theme),
  themesCustomDelete: (id: string) => ipcRenderer.invoke('rina:themes:custom:delete', id),
  toggleDevtools: () => ipcRenderer.invoke('rina:devtools:toggle'),
  appVersion: () => ipcRenderer.invoke('rina:app:version'),
  updateState: () => ipcRenderer.invoke('rina:update:state'),
  checkForUpdate: () => ipcRenderer.invoke('rina:update:check'),
  openUpdateDownload: () => ipcRenderer.invoke('rina:update:open-download'),

  // Doctor v1: Read-only evidence collection
  doctorPlan: (args: { projectRoot: string; symptom: string }) => ipcRenderer.invoke('rina:doctor:plan', args),

  executeStepStream: (args: {
    step: { id: string; tool: 'terminal'; command: string; risk: 'read' | 'safe-write' | 'high-impact' }
    projectRoot: string
    confirmed: boolean
    confirmationText: string
  }) =>
    ipcRenderer.invoke('rina:executeStepStream', args.step, args.confirmed, args.confirmationText, args.projectRoot),

  cancelStream: (streamId: string) => ipcRenderer.invoke('rina:stream:cancel', streamId),
  killStream: (streamId: string) => ipcRenderer.invoke('rina:stream:kill', streamId),

  onPlanStepStart: (cb: (evt: any) => void) => ipcRenderer.on('rina:plan:stepStart', (_e, payload) => cb(payload)),

  // Plan run events
  onPlanRunStart: (cb: (p: { planRunId: string }) => void) => ipcRenderer.on('rina:plan:run:start', (_e, p) => cb(p)),
  onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) =>
    ipcRenderer.on('rina:plan:run:end', (_e, p) => cb(p)),

  // Thinking stream - real-time AI thinking visualization
  onThinking: (cb: (step: { time: number; message: string }) => void) =>
    ipcRenderer.on('rina:thinking', (_e, step) => cb(step)),

  // Brain stats - for Visual AI Brain Panel
  getBrainStats: () => ipcRenderer.invoke('rina:brain:stats'),

  // Brain events - real-time AI reasoning
  onBrainEvent: (cb: (event: any) => void) => ipcRenderer.on('rina:brain:event', (_e, event) => cb(event)),

  // Get Rina status
  getMode: () => ipcRenderer.invoke('rina:getMode'),
  getStatus: () => ipcRenderer.invoke('rina:getStatus'),
  getPlans: () => ipcRenderer.invoke('rina:getPlans'),
  runAgent: (command: string) => ipcRenderer.invoke('rina:runAgent', command),

  // Autonomy status
  autonomy: { enabled: false, level: 'off' },

  // Get tools list
  getTools: () => ipcRenderer.invoke('rina:getTools'),

  // Generic custom event handler
  onCustomEvent: (eventName: string, cb: (evt: any) => void) => ipcRenderer.on(eventName, (_e, payload) => cb(payload)),

  // Analytics - conversion funnel tracking
  trackFunnelStep: (step: string, properties?: Record<string, unknown>) =>
    ipcRenderer.invoke('rina:analytics:funnel', step, properties),
  trackEvent: (event: string, properties?: Record<string, unknown>) =>
    ipcRenderer.invoke('analytics:trackEvent', event, properties),

  // Analytics - Usage tracking
  getUsageStatus: () => ipcRenderer.invoke('analytics:getUsageStatus'),
  isUsageTrackingEnabled: () => ipcRenderer.invoke('analytics:isUsageTrackingEnabled'),
  enableUsageTracking: () => ipcRenderer.invoke('analytics:enableUsageTracking'),
  disableUsageTracking: () => ipcRenderer.invoke('analytics:disableUsageTracking'),
  trackCommandExecuted: () => ipcRenderer.invoke('analytics:trackCommandExecuted'),
  trackAISuggestionUsed: () => ipcRenderer.invoke('analytics:trackAISuggestionUsed'),
  trackSelfHealingRun: () => ipcRenderer.invoke('analytics:trackSelfHealingRun'),
  trackTerminalSessionStart: () => ipcRenderer.invoke('analytics:trackTerminalSessionStart'),

  // Telemetry - Session tracking
  trackSessionStart: () => ipcRenderer.invoke('telemetry:sessionStart'),
  trackSessionEnd: () => ipcRenderer.invoke('telemetry:sessionEnd'),

  // Telemetry - Action tracking
  trackCommandRun: () => ipcRenderer.invoke('telemetry:commandRun'),
  trackAiMessage: () => ipcRenderer.invoke('telemetry:aiMessage'),
  trackQuickFix: () => ipcRenderer.invoke('telemetry:quickFix'),
})
