// Type definitions for the Rina API exposed via preload script
export interface RinaAPI {
  // Generic invoke
  invoke: (channel: string, ...args: any[]) => Promise<any>

  // Core methods
  getMode(): Promise<string>
  setMode(mode: string): Promise<{ ok: boolean; mode: string }>
  getStatus(): Promise<any>
  getPlans(): Promise<any>
  runAgent(
    command: string,
    opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }
  ): Promise<any>
  conversationRoute(command: string, opts?: { workspaceRoot?: string | null }): Promise<any>
  handleConversationTurn(command: string, opts?: { workspaceRoot?: string | null }): Promise<any>
  getTools(): Promise<any>

  // PTY terminal
  ptyStart(args?: { cols?: number; rows?: number; cwd?: string }): Promise<any>
  ptyWrite(data: string): Promise<any>
  ptyResize(cols: number, rows: number): Promise<any>
  ptyStop(): Promise<any>
  ptyMetrics(): Promise<any>
  onPtyData(cb: (data: string) => void): () => void
  onPtyExit(cb: (evt: { exitCode: number; signal: number }) => void): () => void

  // Event subscriptions
  on(channel: string, handler: (...args: any[]) => void): () => void
  onThinking(cb: (step: { time: number; message: string }) => void): () => void
  onStreamChunk(cb: (data: any) => void): () => void
  onStreamEnd(cb: (data: any) => void): () => void
  onPlanStepStart(cb: (evt: any) => void): () => void
  onPlanRunStart(cb: (p: { planRunId: string }) => void): () => void
  onPlanRunEnd(cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void): () => void
  onTimelineEvent(cb: (event: any) => void): () => void
  onBrainEvent(cb: (event: any) => void): () => void

  // Brain
  getBrainStats(): Promise<any>

  // Diagnostics
  diagnosticsPaths(): Promise<any>
  supportBundle(snapshot?: unknown): Promise<any>
  openRunsFolder(): Promise<any>
  runsList(limit?: number): Promise<any>
  runsTail(args: { runId: string; sessionId: string; maxLines?: number; maxBytes?: number }): Promise<any>
  runsArtifacts(args: { runId: string; sessionId: string }): Promise<any>
  revealRunReceipt(receiptId: string): Promise<any>
  codeListFiles(args: any): Promise<any>
  codeReadFile(args: any): Promise<any>

  // Telemetry
  trackSessionStart(): Promise<any>
  trackSessionEnd(): Promise<any>
  trackCommandRun(): Promise<any>
  trackAiMessage(): Promise<any>
  trackQuickFix(): Promise<any>

  // Agent actions
  agentPlan(args: { intentText: string; projectRoot: string }): Promise<any>
  fixProject(projectRoot: string): Promise<any>
  executePlanStream(args: {
    plan: any[]
    projectRoot: string
    confirmed: boolean
    confirmationText: string
  }): Promise<any>
  executeCapability(args: {
    packKey: string
    projectRoot: string
    actionId?: string
    confirmed?: boolean
    confirmationText?: string
  }): Promise<any>

  // Analytics
  trackEvent(event: string, properties?: Record<string, unknown>): Promise<any>
  trackFunnelStep(step: string, properties?: Record<string, unknown>): Promise<any>

  // Policy and security
  policyExplain(command: string): Promise<any>
  redactionPreview(text: string): Promise<any>

  // Memory
  memoryGetState(): Promise<any>
  memoryUpdateProfile(input: any): Promise<any>
  memoryUpdateWorkspace(workspaceId: string, input: any): Promise<any>
  memoryDeleteEntry(input: any): Promise<any>
  memorySetInferredStatus(id: string, status: 'approved' | 'dismissed'): Promise<any>
  memorySetOperationalStatus(id: string, status: 'approved' | 'rejected'): Promise<any>
  memoryDeleteOperational(id: string): Promise<any>
  memoryResetWorkspace(workspaceId: string): Promise<any>
  memoryResetAll(): Promise<any>

  // Workspace
  pickWorkspace(): Promise<any>
  demoWorkspace(): Promise<any>
  workspaceDefault(): Promise<any>

  // Themes
  themesList(): Promise<any>
  themesGet(): Promise<any>
  themesSet(id: string): Promise<any>
  themesCustomGet(): Promise<any>
  themesCustomUpsert(theme: any): Promise<any>
  themesCustomDelete(id: string): Promise<any>

  // App updates
  appVersion(): Promise<any>
  updateState(): Promise<any>
  checkForUpdate(): Promise<any>
  openUpdateDownload(): Promise<any>
  installUpdate(): Promise<any>
  updateConfig(): Promise<any>
  setUpdateConfig(config: any): Promise<any>
  releaseInfo(): Promise<any>
  verifyRelease(): Promise<any>

  // License
  verifyLicense(customerId: string): Promise<any>
  licenseRefresh(): Promise<any>
  licenseState(): Promise<any>
  licenseCheckout(
    input?:
      | string
      | {
          email?: string
          tier?: string
          billingCycle?: 'monthly' | 'annual'
          seats?: number
          workspaceId?: string
          priceId?: string
        }
  ): Promise<any>
  openStripePortal(email?: string): Promise<any>
  licenseCachedEmail(): Promise<any>
  licenseLookupByEmail(email: string): Promise<any>

  // Auth
  authLogin(args: { email: string; password: string }): Promise<any>
  authRegister(args: { email: string; password: string; name?: string }): Promise<any>
  authLogout(): Promise<any>
  authMe(): Promise<any>
  authForgotPassword(args: { email: string }): Promise<any>
  authResetPassword(args: { token: string; password: string }): Promise<any>
  authState(): Promise<any>
  authToken(): Promise<any>

  // Marketplace
  marketplaceList(): Promise<any>
  installedAgents(): Promise<any>
  installMarketplaceAgent(args: { name: string; userEmail?: string }): Promise<any>
  capabilityPacks(): Promise<any>
}

// Extend the Window interface
declare global {
  interface Window {
    rina: RinaAPI
  }
}
