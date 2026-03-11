import { contextBridge, ipcRenderer, shell } from "electron";

contextBridge.exposeInMainWorld("rina", {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, handler: (...args: any[]) => void) => {
    const wrapped = (_evt: unknown, payload: unknown) => handler(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },

  // Original APIs
  plan: (intent: string) => ipcRenderer.invoke("agent:plan", intent),
  execute: () => ipcRenderer.invoke("agent:execute"),
  verifyLicense: (customerId: string) => ipcRenderer.invoke("license:verify", customerId),
  licenseState: () => ipcRenderer.invoke("license:state"),
  openStripePortal: () => ipcRenderer.invoke("license:portal"),
  licenseLookupByEmail: (email: string) => ipcRenderer.invoke("license:lookup", email),
  personalityReply: (args: { userId: string; message: string; isTaskContext: boolean }) =>
    ipcRenderer.invoke("rina:personality:reply", args),
  personalityPrefix: (args: { userId: string; message: string }) =>
    ipcRenderer.invoke("rina:personality:prefix", args),

  // Directory picker
  showDirectoryPicker: () => ipcRenderer.invoke("rina:pickDirectory"),
  openDirectory: () => ipcRenderer.invoke("rina:workspace:pick"),

  // Workspace picker (returns { ok, path })
  pickWorkspace: () => ipcRenderer.invoke("rina:workspace:pick"),
  workspaceDefault: () => ipcRenderer.invoke("rina:workspace:default"),
  codeListFiles: (args: { projectRoot: string; limit?: number }) => ipcRenderer.invoke("rina:code:listFiles", args),
  codeReadFile: (args: { projectRoot: string; relativePath: string; maxBytes?: number }) =>
    ipcRenderer.invoke("rina:code:readFile", args),

  // Interactive PTY terminal
  ptyStart: (args?: { cols?: number; rows?: number; cwd?: string }) =>
    ipcRenderer.invoke("rina:pty:start", args),
  ptyWrite: (data: string) => ipcRenderer.invoke("rina:pty:write", data),
  ptyResize: (cols: number, rows: number) => ipcRenderer.invoke("rina:pty:resize", cols, rows),
  ptyStop: () => ipcRenderer.invoke("rina:pty:stop"),
  ptyMetrics: () => ipcRenderer.invoke("rina:pty:metrics"),
  onPtyData: (cb: (data: string) => void) => ipcRenderer.on("rina:pty:data", (_e, data) => cb(data)),
  onPtyExit: (cb: (evt: { exitCode: number; signal: number }) => void) =>
    ipcRenderer.on("rina:pty:exit", (_e, payload) => cb(payload)),

  // Warp-like block APIs
  agentPlan: (args: { intentText: string; projectRoot: string }) =>
    ipcRenderer.invoke("rina:agent:plan", args),

  executePlanStream: (args: {
    plan: any[];
    projectRoot: string;
    confirmed: boolean;
    confirmationText: string;
  }) => ipcRenderer.invoke("rina:executePlanStream", args),

  // Plan stop API
  stopPlan: (planRunId: string) => ipcRenderer.invoke("rina:plan:stop", planRunId),
  structuredStatus: () => ipcRenderer.invoke("rina:structured:status"),
  exportStructuredRunbook: (sessionId?: string) => ipcRenderer.invoke("rina:structured:runbook:export", sessionId),
  exportStructuredRunbookPreview: (sessionId?: string) => ipcRenderer.invoke("rina:structured:runbook:preview", sessionId),
  exportStructuredRunbookJson: (sessionId?: string) => ipcRenderer.invoke("rina:structured:runbook:json", sessionId),
  exportPreview: (args: { kind: "runbook_markdown" | "audit_json"; sessionId?: string }) =>
    ipcRenderer.invoke("rina:export:preview", args),
  exportPublish: (args: { previewId: string; typedConfirm: string; expectedHash?: string }) =>
    ipcRenderer.invoke("rina:export:publish", args),
  structuredSearch: (query: string, limit?: number) => ipcRenderer.invoke("rina:structured:search", query, limit),
  unifiedSearch: (query: string, limit?: number) => ipcRenderer.invoke("rina:search:unified", query, limit),
  detectPromptBoundaries: (transcript: string, shellHint?: "bash" | "zsh" | "fish" | "pwsh" | "unknown") =>
    ipcRenderer.invoke("rina:structured:detect-boundaries", transcript, shellHint),
  redactionPreview: (text: string) => ipcRenderer.invoke("rina:redaction:preview", text),
  sharePreview: (args: { content: string }) => ipcRenderer.invoke("rina:share:preview", args),
  policyEnv: () => ipcRenderer.invoke("rina:policy:env"),
  policyExplain: (command: string) => ipcRenderer.invoke("rina:policy:explain", command),
  diagnosticsPaths: () => ipcRenderer.invoke("rina:diagnostics:paths"),
  supportBundle: () => ipcRenderer.invoke("rina:support:bundle"),
  daemonStatus: () => ipcRenderer.invoke("rina:daemon:status"),
  daemonStart: () => ipcRenderer.invoke("rina:daemon:start"),
  daemonStop: () => ipcRenderer.invoke("rina:daemon:stop"),
  daemonTasks: (args?: { status?: "queued" | "running" | "completed" | "failed" | "canceled"; deadLetter?: boolean }) =>
    ipcRenderer.invoke("rina:daemon:tasks", args || {}),
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) =>
    ipcRenderer.invoke("rina:daemon:task:add", args),
  orchestratorIssueToPr: (args: {
    issueId: string;
    repoPath: string;
    branchName?: string;
    command?: string;
    repoSlug?: string;
    push?: boolean;
    prDryRun?: boolean;
    baseBranch?: string;
    prTitle?: string;
    prBody?: string;
    commitMessage?: string;
  }) => ipcRenderer.invoke("rina:orchestrator:issue-to-pr", args),
  orchestratorGraph: () => ipcRenderer.invoke("rina:orchestrator:workspace-graph"),
  orchestratorPrepareBranch: (args: { repoPath: string; issueId?: string; branchName?: string }) =>
    ipcRenderer.invoke("rina:orchestrator:git:prepare-branch", args),
  orchestratorCreatePr: (args: {
    repoSlug: string;
    head: string;
    base?: string;
    title: string;
    body?: string;
    draft?: boolean;
    dryRun?: boolean;
    workflowId?: string;
    issueId?: string;
    branchName?: string;
  }) => ipcRenderer.invoke("rina:orchestrator:github:create-pr", args),
  orchestratorPrStatus: (args: {
    workflowId: string;
    status: "planned" | "opened" | "merged" | "closed" | "failed";
    issueId?: string;
    branchName?: string;
    repoSlug?: string;
    mode?: "dry_run" | "live";
    number?: number;
    url?: string;
    error?: string;
  }) => ipcRenderer.invoke("rina:orchestrator:github:pr-status", args),
  orchestratorWebhookAudit: (args?: {
    limit?: number;
    outcome?: "accepted" | "rejected";
    mapped?: "pr_status" | "ci_status" | "review_revision";
  }) => ipcRenderer.invoke("rina:orchestrator:github:webhook-audit", args || {}),
  orchestratorCiStatus: (args: {
    workflowId: string;
    provider: string;
    status: "queued" | "running" | "passed" | "failed";
    url?: string;
    autoRetry?: boolean;
    repoPath?: string;
    issueId?: string;
    branchName?: string;
    command?: string;
    repoSlug?: string;
    baseBranch?: string;
    prDryRun?: boolean;
  }) => ipcRenderer.invoke("rina:orchestrator:ci:status", args),
  orchestratorReviewComment: (args: {
    workflowId: string;
    repoPath: string;
    issueId: string;
    branchName: string;
    comment: string;
    command?: string;
    repoSlug?: string;
    baseBranch?: string;
    prDryRun?: boolean;
  }) => ipcRenderer.invoke("rina:orchestrator:review:comment", args),
  importShellHistory: (limit?: number) => ipcRenderer.invoke("rina:history:import", limit),
  reportRendererError: (payload: { kind?: string; message?: string; extra?: string }) =>
    ipcRenderer.invoke("rina:renderer:error", payload),
  createShare: (args: { title?: string; content?: string; expiresDays?: number; requiredRole?: "owner" | "operator" | "viewer"; previewId: string }) =>
    ipcRenderer.invoke("rina:share:create", args),
  listShares: () => ipcRenderer.invoke("rina:share:list"),
  getShare: (id: string) => ipcRenderer.invoke("rina:share:get", id),
  revokeShare: (id: string) => ipcRenderer.invoke("rina:share:revoke", id),
  teamGet: () => ipcRenderer.invoke("rina:team:get"),
  teamActivity: (args?: { limit?: number }) => ipcRenderer.invoke("rina:team:activity", args || {}),
  teamCreateInvite: (args: { email?: string; role?: "owner" | "operator" | "viewer"; expiresHours?: number }) =>
    ipcRenderer.invoke("rina:team:createInvite", args),
  teamListInvites: (args?: { includeSecrets?: boolean }) => ipcRenderer.invoke("rina:team:listInvites", args || {}),
  teamAcceptInvite: (args: { inviteCode?: string }) => ipcRenderer.invoke("rina:team:acceptInvite", args),
  teamRevokeInvite: (id: string) => ipcRenderer.invoke("rina:team:revokeInvite", id),
  teamSetCurrentUser: (email: string) => ipcRenderer.invoke("rina:team:setCurrentUser", email),
  teamUpsertMember: (member: { email: string; role: "owner" | "operator" | "viewer" }) =>
    ipcRenderer.invoke("rina:team:upsertMember", member),
  teamRemoveMember: (email: string) => ipcRenderer.invoke("rina:team:removeMember", email),
  auditExport: () => ipcRenderer.invoke("rina:audit:export"),
  chatSend: (text: string, projectRoot?: string) => ipcRenderer.invoke("rina:chat:send", text, projectRoot),
  chatExport: () => ipcRenderer.invoke("rina:chat:export"),
  themesList: () => ipcRenderer.invoke("rina:themes:list"),
  themesGet: () => ipcRenderer.invoke("rina:themes:get"),
  themesSet: (id: string) => ipcRenderer.invoke("rina:themes:set", id),
  themesCustomGet: () => ipcRenderer.invoke("rina:themes:custom:get"),
  themesCustomUpsert: (theme: any) => ipcRenderer.invoke("rina:themes:custom:upsert", theme),
  themesCustomDelete: (id: string) => ipcRenderer.invoke("rina:themes:custom:delete", id),
  toggleDevtools: () => ipcRenderer.invoke("rina:devtools:toggle"),
  appVersion: () => ipcRenderer.invoke("rina:app:version"),
  updateState: () => ipcRenderer.invoke("rina:update:state"),
  checkForUpdate: () => ipcRenderer.invoke("rina:update:check"),
  openUpdateDownload: () => ipcRenderer.invoke("rina:update:open-download"),

  // Doctor v1: Read-only evidence collection
  doctorPlan: (args: { projectRoot: string; symptom: string }) =>
    ipcRenderer.invoke("rina:doctor:plan", args),

  executeStepStream: (args: {
    step: { id: string; tool: "terminal"; command: string; risk: "read" | "safe-write" | "high-impact" };
    projectRoot: string;
    confirmed: boolean;
    confirmationText: string;
  }) =>
    ipcRenderer.invoke("rina:executeStepStream", args.step, args.confirmed, args.confirmationText, args.projectRoot),

  cancelStream: (streamId: string) => ipcRenderer.invoke("rina:stream:cancel", streamId),
  killStream: (streamId: string) => ipcRenderer.invoke("rina:stream:kill", streamId),

  onStreamChunk: (cb: (evt: any) => void) => ipcRenderer.on("rina:stream:chunk", (_e, payload) => cb(payload)),
  onStreamEnd: (cb: (evt: any) => void) => ipcRenderer.on("rina:stream:end", (_e, payload) => cb(payload)),
  onPlanStepStart: (cb: (evt: any) => void) => ipcRenderer.on("rina:plan:stepStart", (_e, payload) => cb(payload)),

  // Plan run events
  onPlanRunStart: (cb: (p: { planRunId: string }) => void) =>
    ipcRenderer.on("rina:plan:run:start", (_e, p) => cb(p)),
  onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) =>
    ipcRenderer.on("rina:plan:run:end", (_e, p) => cb(p)),

  // Generic custom event handler
  onCustomEvent: (eventName: string, cb: (evt: any) => void) => ipcRenderer.on(eventName, (_e, payload) => cb(payload)),

  // Analytics - conversion funnel tracking
  trackFunnelStep: (step: string, properties?: Record<string, unknown>) =>
    ipcRenderer.invoke("rina:analytics:funnel", step, properties),
  trackEvent: (event: string, properties?: Record<string, unknown>) =>
    ipcRenderer.invoke("analytics:trackEvent", event, properties),

  // Analytics - Usage tracking
  getUsageStatus: () => ipcRenderer.invoke("analytics:getUsageStatus"),
  isUsageTrackingEnabled: () => ipcRenderer.invoke("analytics:isUsageTrackingEnabled"),
  enableUsageTracking: () => ipcRenderer.invoke("analytics:enableUsageTracking"),
  disableUsageTracking: () => ipcRenderer.invoke("analytics:disableUsageTracking"),
  trackCommandExecuted: () => ipcRenderer.invoke("analytics:trackCommandExecuted"),
  trackAISuggestionUsed: () => ipcRenderer.invoke("analytics:trackAISuggestionUsed"),
  trackSelfHealingRun: () => ipcRenderer.invoke("analytics:trackSelfHealingRun"),
  trackTerminalSessionStart: () => ipcRenderer.invoke("analytics:trackTerminalSessionStart"),
});
