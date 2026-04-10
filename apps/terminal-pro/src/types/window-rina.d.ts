export {}

import type { FixProjectResult } from '../main/assistant/fixProjectFlow.js'

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
  interface Window {
    electronAPI?: ElectronAPI
    RINAWARP_READY?: boolean
    rina: {
      invoke(channel: string, ...args: any[]): Promise<any>
      on(channel: string, handler: (...args: any[]) => void): () => void
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
      licenseRefresh(): Promise<{
        tier: string
        has_token: boolean
        expires_at: number | null
        customer_id: string | null
        status?: string
      }>
      licenseState(): Promise<{
        tier: string
        has_token: boolean
        expires_at: number | null
        customer_id: string | null
        status?: string
      }>
      licenseCheckout(input?: string | {
        email?: string
        tier?: string
        billingCycle?: 'monthly' | 'annual'
        seats?: number
        workspaceId?: string
        priceId?: string
      }): Promise<{ ok: boolean; error?: string; url?: string; sessionId?: string }>
      openStripePortal(email?: string): Promise<{ ok: boolean; fallback?: boolean; degraded?: boolean; error?: string }>
      licenseCachedEmail(): Promise<{ email?: string | null }>
      licenseLookupByEmail(email: string): Promise<{
        ok: boolean
        customer_id?: string
        error?: string
      }>
      authLogin(args: { email: string; password: string }): Promise<{
        ok: boolean
        token?: string
        user?: { id?: string; email?: string; name?: string; emailVerified?: boolean }
        error?: string
      }>
      authRegister(args: { email: string; password: string; name?: string }): Promise<{
        ok: boolean
        message?: string
        error?: string
      }>
      authLogout(): Promise<{ ok: boolean }>
      authMe(): Promise<{
        ok: boolean
        user?: { id?: string; email?: string; name?: string; emailVerified?: boolean }
        error?: string
      }>
      authForgotPassword(args: { email: string }): Promise<{ ok: boolean; message?: string; error?: string }>
      authResetPassword(args: { token: string; password: string }): Promise<{ ok: boolean; message?: string; error?: string }>
      authState(): Promise<{
        ok?: boolean
        authenticated: boolean
        user: { id?: string; email?: string; name?: string; emailVerified?: boolean } | null
        token?: string | null
        degraded?: boolean
        error?: string
      }>
      authToken(): Promise<{ token?: string | null }>
      teamState(): Promise<{
        ok: boolean
        workspaceId?: string
        currentUser: string
        currentRole: string
        members: Array<{ email: string; role: string }>
        seatsAllowed: number
        seatsUsed: number
        error?: string
      }>
      teamPlan(): Promise<{
        ok?: boolean
        plan?: string
        status?: string
        seats_allowed?: number
        seats_used?: number
        renews_at?: string
        error?: string
      }>
      teamWorkspaceCreate(args: { name: string; region?: string }): Promise<{ workspace_id?: string; owner_id?: string; ok?: boolean; error?: string }>
      teamWorkspaceSet(workspaceId: string): Promise<{ ok: boolean; workspaceId?: string; error?: string }>
      teamWorkspaceGet(workspaceId?: string): Promise<{
        id?: string
        name?: string
        region?: string
        seats_allowed?: number
        seats_used?: number
        billing_status?: string
        billing_enforced?: boolean
        billing_locked?: boolean
        error?: string
        ok?: boolean
      }>
      teamInvitesList(workspaceId?: string): Promise<{ ok?: boolean; invites?: Array<any>; error?: string }>
      teamInviteCreate(args: {
        workspaceId?: string
        email: string
        role?: 'owner' | 'admin' | 'member'
        expiresInHours?: number
        sendEmail?: boolean
      }): Promise<{ ok?: boolean; invite_id?: string; expires_at?: string; invite_token?: string; error?: string }>
      teamInviteRevoke(inviteId: string): Promise<{ ok?: boolean; error?: string }>
      teamAuditList(args?: { workspaceId?: string; type?: string; from?: string; to?: string; limit?: number }): Promise<{ ok?: boolean; entries?: Array<any>; error?: string }>
      teamBillingSetEnforcement(args: { workspaceId?: string; requireActivePlan: boolean }): Promise<{ ok?: boolean; workspace?: any; error?: string }>
      marketplaceList(): Promise<{
        ok: boolean
        source?: string
        degraded?: boolean
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
      installedAgents(): Promise<{
        ok: boolean
        agents?: Array<{
          name: string
          version?: string
          permissions?: string[]
          hasSignature?: boolean
        }>
        error?: string
      }>
      installMarketplaceAgent(args: { name: string; userEmail?: string }): Promise<{
        ok: boolean
        source?: string
        degraded?: boolean
        warning?: string
        agent?: {
          name: string
          version: string
          description: string
          author: string
          permissions?: string[]
          commands?: unknown[]
        }
        error?: string
      }>
      capabilityPacks(): Promise<{
        ok: boolean
        source?: string
        degraded?: boolean
        error?: string
        capabilities?: Array<{
          key: string
          title: string
          description: string
          category: 'system' | 'deploy' | 'device' | 'security' | 'workspace'
          source: 'builtin' | 'marketplace' | 'installed'
          tier: 'free' | 'pro' | 'paid'
          installState: 'builtin' | 'available' | 'installed' | 'upgrade-required'
          permissions: Array<'read-only' | 'workspace-write' | 'network' | 'cloud' | 'device'>
          actions: Array<{
            id: string
            label: string
            tool: string
            risk: 'read' | 'safe-write' | 'high-impact'
            proof: Array<'run' | 'receipt' | 'log' | 'artifact' | 'diff'>
            requiresConfirmation?: boolean
          }>
          tags?: string[]
          price?: number
          commands?: string[]
        }>
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
      showDirectoryPicker(): Promise<string | null>
      openDirectory(): Promise<{ ok: boolean; path?: string }>
      pickWorkspace(): Promise<{ ok: boolean; path?: string }>
      demoWorkspace(): Promise<{ ok: boolean; path?: string; source?: string; error?: string }>
      workspaceDefault(): Promise<{ ok: boolean; path?: string }>
      setMode(mode: string): Promise<{ ok: boolean; mode: string }>
      getMode(): Promise<string>
      fixProject(projectRoot: string): Promise<FixProjectResult>
      codeListFiles(args?: {
        projectRoot?: string
        limit?: number
        query?: string
      }): Promise<{ ok: boolean; files?: string[]; error?: string }>
      codeReadFile(args: { projectRoot?: string; relativePath: string; maxBytes?: number }): Promise<{
        ok: boolean
        content?: string
        truncated?: boolean
        error?: string
      }>
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
      onPtyData(cb: (data: string) => void): () => void
      onPtyExit(cb: (p: { exitCode: number; signal: number }) => void): () => void
      agentPlan(args: { intentText: string; projectRoot: string }): Promise<any>
      executePlanStream(args: {
        plan: any[]
        projectRoot: string
        confirmed: boolean
        confirmationText: string
      }): Promise<{
        ok?: boolean
        runId?: string
        planRunId?: string
        haltedStepId?: string | null
        haltReason?: string
        error?: string
        code?: string
        retrySuggestion?: string
      }>
      executeCapability(args: {
        packKey: string
        projectRoot: string
        actionId?: string
        confirmed?: boolean
        confirmationText?: string
      }): Promise<{
        ok?: boolean
        runId?: string
        planRunId?: string
        packKey?: string
        actionId?: string
        prompt?: string
        reasoning?: string
        plan?: any[]
        haltedStepId?: string | null
        haltReason?: string
        error?: string
        code?: string
        retrySuggestion?: string
      }>
      stopPlan(planRunId: string): Promise<{ ok: boolean; message?: string }>
      structuredStatus(): Promise<{ enabled: boolean; latestSessionId: string | null }>
      exportStructuredRunbook(sessionId?: string): Promise<string>
      exportStructuredRunbookPreview(sessionId?: string): Promise<{
        markdown: string
        hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        redactionCount: number
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
      supportBundle(snapshot?: unknown): Promise<{ ok: boolean; error?: string; path?: string; bytes?: number }>
      openRunsFolder(): Promise<{ ok: boolean; error?: string; path?: string }>
      runsList(limit?: number): Promise<{
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
      runsTail(args: { runId: string; sessionId: string; maxLines?: number; maxBytes?: number }): Promise<{
        ok: boolean
        tail?: string
        error?: string
      }>
      runsArtifacts(args: { runId: string; sessionId: string }): Promise<{
        ok: boolean
        summary?: {
          stdoutChunks: number
          stderrChunks: number
          metaChunks: number
          stdoutPreview: string
          stderrPreview: string
          metaPreview: string
          changedFiles: string[]
          diffHints: string[]
        }
        error?: string
      }>
      revealRunReceipt(receiptId: string): Promise<{ ok: boolean; error?: string; receipt?: any }>
      importShellHistory(limit?: number): Promise<{ ok: boolean; imported?: number; commands?: string[]; error?: string }>
      reportRendererError(payload: {
        kind?: string
        message?: string
        extra?: string
      }): Promise<{ ok: boolean; error?: string }>
      chatSend(text: string, projectRoot?: string): Promise<Array<{ role: 'rina'; text: string }>>
      chatExport(): Promise<string>
      redactionPreview(text: string): Promise<{
        redactedText: string
        hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }>
        redactionCount: number
      }>
      conversationRoute(
        text: string,
        opts?: { workspaceRoot?: string | null }
      ): Promise<{
        rawText: string
        mode: 'chat' | 'question' | 'inspect' | 'execute' | 'mixed' | 'follow_up' | 'recovery' | 'settings' | 'memory_update' | 'unclear'
        turnType?: 'greeting' | 'help' | 'follow_up' | 'diagnose' | 'action' | 'explain' | 'frustration' | 'clarify_needed'
        confidence: number
        workspaceId?: string
        references: {
          runId?: string
          receiptId?: string
          priorMessageId?: string
          restoredSessionId?: string
        }
        allowedNextAction: 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'
        requiresAction?: boolean
        userGoal?: string
        constraints?: string[]
        assistantReply?: string
        planPreview?: { id?: string; reasoning?: string; steps?: Array<any> }
        taskStarted?: boolean
        permissionRequest?: { required: boolean; reason: string }
        clarification?: {
          required: boolean
          reason?: string
          question?: string
        }
        executionCandidate?: {
          goal: string
          target?: string
          constraints?: string[]
          risk: 'low' | 'medium' | 'high'
        }
        context?: {
          workspaceRoot: string | null
          latestRunId: string | null
          latestReceiptId: string | null
          latestRecoverySessionId: string | null
          latestIntent: 'self_check' | 'build' | 'test' | 'deploy' | 'fix' | 'inspect' | 'command' | 'unknown'
          latestOutcome: 'succeeded' | 'failed' | 'interrupted' | 'running' | 'unknown' | 'none'
          latestActionSummary: string | null
          hasVerifiedRun: boolean
          hasAnyAnchor: boolean
        }
        replyPlan?: {
          turnType: 'greeting' | 'help' | 'follow_up' | 'diagnose' | 'action' | 'explain' | 'frustration' | 'clarify_needed'
          anchor: {
            workspaceRoot: string | null
            runId: string | null
            receiptId: string | null
          }
          mode: 'reply_only' | 'explain_verified' | 'ask_once' | 'plan' | 'run'
          tone: 'normal' | 'supportive' | 'corrective'
          shouldStartRun: boolean
        }
      }>
      handleConversationTurn(
        text: string,
        opts?: { workspaceRoot?: string | null }
      ): Promise<{
        assistantReply: string
        intent: {
          type: 'chat' | 'question' | 'inspect' | 'execute' | 'mixed' | 'self_check' | 'follow_up' | 'recovery' | 'settings' | 'memory_update' | 'unclear'
          confidence: number
          requiresAction: boolean
          userGoal?: string
          constraints?: string[]
        }
        task?: {
          id: string
          started: boolean
          planPreview?: { id?: string; reasoning?: string; steps?: Array<any> }
        }
        permissionRequest?: { reason: string; actions: string[] }
        routedTurn: {
          rawText: string
          mode: 'chat' | 'question' | 'inspect' | 'execute' | 'mixed' | 'follow_up' | 'recovery' | 'settings' | 'memory_update' | 'unclear'
          confidence: number
          references: {
            runId?: string
            receiptId?: string
            priorMessageId?: string
            restoredSessionId?: string
          }
          allowedNextAction: 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'
          requiresAction?: boolean
          userGoal?: string
          constraints?: string[]
          clarification?: {
            required: boolean
            reason?: string
            question?: string
          }
        }
      }>
      memoryGetState(): Promise<{
        owner: {
          ownerId: string
          mode: 'licensed' | 'local-fallback'
          customerId: string | null
          email: string | null
        }
        memory: {
          ownerId: string
          profile: {
            preferredName?: string
            tonePreference?: 'concise' | 'balanced' | 'detailed'
            humorPreference?: 'low' | 'medium' | 'high'
            likes?: string[]
            dislikes?: string[]
          }
          workspaces: Record<string, {
            workspaceId: string
            label?: string
            preferredResponseStyle?: string[]
            preferredProofStyle?: string[]
            conventions?: Array<{ key: string; value: string }>
            updatedAt: string
          }>
          inferredMemories: Array<{
            id: string
            kind: 'preference' | 'habit' | 'project' | 'relationship'
            summary: string
            confidence: number
            source: 'behavior' | 'conversation'
            workspaceId?: string
            runId?: string
            status: 'suggested' | 'approved' | 'dismissed'
            createdAt: string
            updatedAt: string
          }>
          operationalMemories?: Array<{
            id: string
            scope: 'session' | 'user' | 'project' | 'episode'
            kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
            status?: 'approved' | 'suggested' | 'rejected'
            content: string
            salience: number
            confidence?: number
            workspaceId?: string
            source?: 'behavior' | 'conversation' | 'user_explicit' | 'assistant_inferred' | 'task_outcome' | 'system_derived'
            tags?: string[]
            createdAt: string
            updatedAt: string
            lastUsedAt?: string
            metadata?: Record<string, unknown>
          }>
          operationalStore?: {
            backend: 'sqlite' | 'json-fallback'
            reason?: string
          }
          updatedAt: string
        }
      }>
      memoryUpdateProfile(input: {
        preferredName?: string
        tonePreference?: 'concise' | 'balanced' | 'detailed'
        humorPreference?: 'low' | 'medium' | 'high'
        likes?: string[]
        dislikes?: string[]
      }): Promise<any>
      memoryUpdateWorkspace(workspaceId: string, input: {
        label?: string
        preferredResponseStyle?: string[]
        preferredProofStyle?: string[]
        conventions?: Array<{ key: string; value: string }>
      }): Promise<any>
      memoryDeleteEntry(input: {
        scope: 'profile' | 'workspace'
        field: 'likes' | 'dislikes' | 'preferredResponseStyle' | 'preferredProofStyle' | 'conventions' | 'inferredMemories'
        workspaceId?: string
        value?: string
        key?: string
      }): Promise<any>
      memorySetInferredStatus(id: string, status: 'approved' | 'dismissed'): Promise<any>
      memorySetOperationalStatus(id: string, status: 'approved' | 'rejected'): Promise<any>
      memoryDeleteOperational(id: string): Promise<any>
      memoryResetWorkspace(workspaceId: string): Promise<any>
      memoryResetAll(): Promise<any>
      themesList(): Promise<{ themes: Array<any> }>
      themesGet(): Promise<{ id: string }>
      themesSet(id: string): Promise<{ ok: boolean; error?: string }>
      themesCustomGet(): Promise<{ themes: Array<any> }>
      themesCustomUpsert(theme: any): Promise<{ ok: boolean; error?: string }>
      themesCustomDelete(id: string): Promise<{ ok: boolean; error?: string }>
      toggleDevtools(): Promise<{ ok: boolean; open?: boolean; error?: string }>
      appVersion(): Promise<string>
      updateConfig(): Promise<{
        channel: 'stable' | 'beta' | 'alpha'
        autoCheck: boolean
        autoDownload: boolean
      }>
      setUpdateConfig(config: {
        channel: 'stable' | 'beta' | 'alpha'
        autoCheck: boolean
        autoDownload: boolean
      }): Promise<{ ok: boolean; config: any }>
      releaseInfo(): Promise<{
        version: string
        platform: string
        arch: string
        signatureOk: boolean | null
        checksumOk: boolean | null
        signedBy: string | null
        publishedAt: string | null
      }>
      verifyRelease(): Promise<{
        ok: boolean
        performed: boolean
        degraded: boolean
        signatureOk: boolean | null
        checksumOk: boolean | null
        signedBy: string | null
        error?: string
      }>
      updateState(): Promise<{
        status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'downloading' | 'downloaded' | 'unsupported' | 'error'
        currentVersion: string
        latestVersion: string | null
        checkedAt: string | null
        manifestUrl: string
        releaseUrl: string
        error: string | null
        downloadProgress: number | null
        downloadedAt: string | null
        supported: boolean
        installReady: boolean
        channel: 'stable' | 'beta' | 'alpha'
      }>
      checkForUpdate(): Promise<{
        status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'downloading' | 'downloaded' | 'unsupported' | 'error'
        currentVersion: string
        latestVersion: string | null
        checkedAt: string | null
        manifestUrl: string
        releaseUrl: string
        error: string | null
        downloadProgress: number | null
        downloadedAt: string | null
        supported: boolean
        installReady: boolean
        channel: 'stable' | 'beta' | 'alpha'
      }>
      openUpdateDownload(): Promise<{ ok: boolean; url: string; error?: string }>
      installUpdate(): Promise<{ ok: boolean; immediate: boolean; error?: string }>
      doctorPlan(args: { projectRoot: string; symptom: string }): Promise<any>
      onThinking(cb: (step: { time: number; message: string }) => void): () => void
      onBrainEvent(cb: (event: any) => void): () => void
      onStreamChunk(cb: (p: any) => void): () => void
      onStreamEnd(cb: (p: any) => void): () => void
      onPlanStepStart(cb: (p: any) => void): () => void
      onPlanRunStart(cb: (p: { planRunId: string }) => void): () => void
      onPlanRunEnd(cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void): () => void
      onTimelineEvent(cb: (event: any) => void): () => void
      onCustomEvent(eventName: string, cb: (payload: any) => void): void
    }
  }
}
