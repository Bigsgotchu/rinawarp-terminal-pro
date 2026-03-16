export {}

// Electron IPC types for renderer
interface ElectronAPI {
  ipcRenderer: {
    on(channel: string, callback: (...args: any[]) => void): void
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
  }
  shell: {
    openPath(path: string): Promise<string>
    openExternal(url: string): Promise<void>
  }
}

declare global {
  type DiagnosticsFileInfo = {
    path: string
    exists: boolean
    sha256?: string | null
    sizeBytes?: number | null
  }

  type DiagnosticsPaths = {
    app: {
      isPackaged: boolean
      appPath: string
      resourcesPath: string
      cwd: string
      platform: string
      arch: string
      versions?: Record<string, string | undefined>
    }
    resolved: {
      main?: DiagnosticsFileInfo
      preload?: DiagnosticsFileInfo
      renderer?: DiagnosticsFileInfo
      themeRegistry?: DiagnosticsFileInfo
      policyYaml?: DiagnosticsFileInfo
    }
    active: {
      themeRegistryPath?: string | null
      policyYamlPath?: string | null
    }
    notes?: string[]
  }

  // Add the specific keys you use on globalThis here:
  // Example:
  var RW_DEV: boolean | undefined
  var RW_SESSION: string | undefined

  interface Window {
    electronAPI?: ElectronAPI
    RINAWARP_READY?: boolean
    rina: {
      invoke(channel: string, ...args: any[]): Promise<any>
      on(channel: string, handler: (...args: any[]) => void): () => void

      // Original APIs
      plan(intent: string): Promise<any>
      execute(): Promise<any>
      verifyLicense(customerId: string): Promise<{
        ok: boolean
        tier?: string
        effective_tier?: string
        status?: string
        expires_at?: number | null
        customer_id?: string
        license_token?: string
      }>
      licenseState(): Promise<{
        tier: string
        has_token: boolean
        expires_at: number | null
        customer_id: string | null
        status?: string
      }>
      openStripePortal(): Promise<{ ok: boolean; fallback?: boolean }>
      licenseLookupByEmail(email: string): Promise<{
        ok: boolean
        customer_id?: string
        error?: string
      }>
      personalityReply(args: { userId: string; message: string; isTaskContext: boolean }): Promise<{
        shouldSmallTalk: boolean
        intent: string
        text?: string
        meta?: { reason?: string }
      }>
      personalityPrefix(args: { userId: string; message: string }): Promise<{
        prefix?: string
        reason?: string
      }>

      // Directory picker
      showDirectoryPicker(): Promise<string | null>
      openDirectory(): Promise<{ ok: boolean; path?: string }>

      // Workspace picker (returns path)
      pickWorkspace(): Promise<{ ok: boolean; path?: string }>
      workspaceDefault(): Promise<{ ok: boolean; path?: string }>
      codeListFiles(args: {
        projectRoot: string
        limit?: number
      }): Promise<{ ok: boolean; files?: string[]; error?: string }>
      codeReadFile(args: { projectRoot: string; relativePath: string; maxBytes?: number }): Promise<{
        ok: boolean
        content?: string
        truncated?: boolean
        error?: string
      }>

      // Interactive PTY terminal
      ptyStart(args?: { cols?: number; rows?: number; cwd?: string }): Promise<any>
      ptyWrite(data: string): Promise<any>
      ptyResize(cols: number, rows: number): Promise<any>
      ptyStop(): Promise<any>
      ptyMetrics(): Promise<{
        ok: boolean
        error?: string
        metrics?: {
          startedAt: string
          bytesIn: number
          bytesOut: number
          resizeCount: number
          blockedCommands: number
          durationSec: number
          boundaries: number
          cwd: string
          shell: string
        }
      }>
      onPtyData(cb: (data: string) => void): void
      onPtyExit(cb: (p: { exitCode: number; signal: number }) => void): void

      // Warp-like block APIs
      agentPlan(args: { intentText: string; projectRoot: string }): Promise<any>
      executePlanStream(args: {
        plan: any[]
        projectRoot: string
        confirmed: boolean
        confirmationText: string
      }): Promise<{ runId: string; planRunId?: string }>

      // Plan stop API
      stopPlan(planRunId: string): Promise<{ ok: boolean; message?: string }>
      structuredStatus(): Promise<{ enabled: boolean; latestSessionId: string | null }>
      exportStructuredRunbook(sessionId?: string): Promise<string>
      exportStructuredRunbookPreview(sessionId?: string): Promise<{
        markdown: string
        hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        redactionCount: number
      }>
      exportPreview(args: { kind: 'runbook_markdown' | 'audit_json'; sessionId?: string }): Promise<{
        ok: boolean
        error?: string
        previewId?: string
        kind?: 'runbook_markdown' | 'audit_json'
        redactedText?: string
        redactionCount?: number
        hits?: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        mime?: string
        fileName?: string
        contentHash?: string
        expiresAt?: string
      }>
      exportPublish(args: { previewId: string; typedConfirm: string; expectedHash?: string }): Promise<{
        ok: boolean
        error?: string
        kind?: 'runbook_markdown' | 'audit_json'
        content?: string
        mime?: string
        fileName?: string
        redactionCount?: number
      }>
      exportStructuredRunbookJson(sessionId?: string): Promise<{
        id: string
        sessionId: string
        createdAt: string
        source: string
        projectRoot?: string
        parameters: string[]
        steps: Array<{ stepId: string; command: string; cwd?: string; risk?: string }>
      } | null>
      structuredSearch(
        query: string,
        limit?: number
      ): Promise<
        Array<{
          sessionId: string
          commandId: string
          command: string
          cwd?: string
          risk?: string
          ok?: boolean
          exitCode?: number | null
          durationMs?: number
          startedAt: string
          score: number
          snippet: string
        }>
      >
      unifiedSearch(
        query: string,
        limit?: number
      ): Promise<
        Array<{
          id: string
          source: 'structured' | 'transcript' | 'share'
          label: string
          meta: string
          snippet?: string
          command?: string
          shareId?: string
          createdAt: string
          score: number
        }>
      >
      detectPromptBoundaries(
        transcript: string,
        shellHint?: 'bash' | 'zsh' | 'fish' | 'pwsh' | 'unknown'
      ): Promise<
        Array<{
          shell: 'bash' | 'zsh' | 'fish' | 'pwsh' | 'unknown'
          prompt: string
          command: string
          output: string
          startLine: number
          endLine: number
        }>
      >
      policyEnv(): Promise<{ env: 'dev' | 'staging' | 'prod'; role: 'owner' | 'operator' | 'viewer' }>
      policyExplain(command: string): Promise<{
        env: 'dev' | 'staging' | 'prod'
        action: 'allow' | 'deny' | 'require_approval' | 'require_two_step'
        approval: 'none' | 'click' | 'typed_yes' | 'typed_phrase'
        message: string
        typedPhrase?: string
        matchedRuleId?: string
      }>
      diagnosticsPaths(): Promise<DiagnosticsPaths>
      supportBundle(): Promise<{ ok: boolean; error?: string; path?: string; bytes?: number }>
      importShellHistory(
        limit?: number
      ): Promise<{ ok: boolean; imported?: number; commands?: string[]; error?: string }>
      reportRendererError(payload: {
        kind?: string
        message?: string
        extra?: string
      }): Promise<{ ok: boolean; error?: string }>
      sharePreview(args: { content: string }): Promise<{
        ok: boolean
        error?: string
        previewId?: string
        redactedText?: string
        hits?: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        redactionCount?: number
        expiresAt?: string
      }>
      createShare(args: {
        title?: string
        content?: string
        expiresDays?: number
        requiredRole?: 'owner' | 'operator' | 'viewer'
        previewId: string
      }): Promise<{ ok: boolean; error?: string; share?: any }>
      listShares(): Promise<
        Array<{
          id: string
          createdAt: string
          createdBy?: string
          title?: string
          revoked: boolean
          expiresAt?: string
          requiredRole?: 'owner' | 'operator' | 'viewer'
        }>
      >
      getShare(id: string): Promise<{ ok: boolean; error?: string; share?: any }>
      revokeShare(id: string): Promise<{ ok: boolean; error?: string }>
      teamGet(): Promise<{
        currentUser?: string
        members: Array<{ email: string; role: 'owner' | 'operator' | 'viewer' }>
      }>
      teamSetCurrentUser(
        email: string
      ): Promise<{ ok: boolean; error?: string; role?: 'owner' | 'operator' | 'viewer' }>
      teamUpsertMember(member: {
        email: string
        role: 'owner' | 'operator' | 'viewer'
      }): Promise<{ ok: boolean; error?: string }>
      teamRemoveMember(email: string): Promise<{ ok: boolean; error?: string }>
      auditExport(): Promise<string>
      chatSend(text: string, projectRoot?: string): Promise<Array<{ role: 'rina'; text: string }>>
      chatExport(): Promise<string>
      redactionPreview(text: string): Promise<{
        redactedText: string
        hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        redactionCount: number
      }>
      themesList(): Promise<{ themes: Array<any> }>
      themesGet(): Promise<{ id: string }>
      themesSet(id: string): Promise<{ ok: boolean; error?: string }>
      themesCustomGet(): Promise<{ themes: Array<any> }>
      themesCustomUpsert(theme: any): Promise<{ ok: boolean; error?: string }>
      themesCustomDelete(id: string): Promise<{ ok: boolean; error?: string }>
      toggleDevtools(): Promise<{ ok: boolean; open?: boolean; error?: string }>
      appVersion(): Promise<string>
      updateState(): Promise<{
        status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'error'
        currentVersion: string
        latestVersion: string | null
        checkedAt: string | null
        manifestUrl: string
        releaseUrl: string
        error: string | null
      }>
      checkForUpdate(): Promise<{
        status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'error'
        currentVersion: string
        latestVersion: string | null
        checkedAt: string | null
        manifestUrl: string
        releaseUrl: string
        error: string | null
      }>
      openUpdateDownload(): Promise<{ ok: boolean; url: string }>

      // Doctor v1: Read-only evidence collection
      doctorPlan(args: { projectRoot: string; symptom: string }): Promise<any>

      executeStepStream(args: {
        step: { id: string; tool: 'terminal'; command: string; risk: 'read' | 'safe-write' | 'high-impact' }
        projectRoot: string
        confirmed: boolean
        confirmationText: string
      }): Promise<{ streamId: string }>
      cancelStream(streamId: string): Promise<any>
      killStream(streamId: string): Promise<{ ok: boolean; message: string }>
      onStreamChunk(cb: (p: any) => void): void
      onStreamEnd(cb: (p: any) => void): void
      onPlanStepStart(cb: (p: any) => void): void

      // Plan run events
      onPlanRunStart(cb: (p: { planRunId: string }) => void): void
      onPlanRunEnd(cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void): void
      onCustomEvent(eventName: string, cb: (payload: any) => void): void
    }
  }
}
