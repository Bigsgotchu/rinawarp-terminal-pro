import type {
  DiagnosticsCommand,
  DiagnosticsGatherCommand,
  DiagnosticsGatherResult,
  WorkspaceService,
} from "../../../../../packages/runtime-contracts/dist/index.js";
import type { DiagnosticsHotReport } from "../../../../../packages/runtime-feature-diagnostics/dist/index.js";
import type { WorkspaceServiceConfig } from "../../../../../packages/runtime-feature-workspace/dist/index.js";
import type {
  StructuredRunArtifactSummary,
  StructuredRunsListItem,
} from "../runs/structuredRuns.js";
import type {
  PlanRunState,
  RegisterAgentExecutionArgs,
} from "../ipc/agentExecutionFlow.js";

export type AnyFn = (...args: any[]) => any;
export type AsyncUnknownFn<Args = unknown, Result = unknown> = (
  args: Args,
) => Promise<Result>;
export type AsyncOptionalUnknownFn<Args = unknown, Result = unknown> = (
  args?: Args,
) => Promise<Result>;

export type SafeSendTarget = {
  send(channel: string, payload?: unknown): void;
  isDestroyed(): boolean;
  id?: number;
};

export type SafeSendFn = (
  target: SafeSendTarget | null | undefined,
  channel: string,
  payload?: unknown,
) => boolean;

export type RoleComparator = (role: string, minimumRole: string) => boolean;

export type ChatDoctorIntentClassification = {
  type: string;
  confidence: number;
  intent: string;
};

export type DoctorPlanArgs = {
  projectRoot: string;
  symptom: string;
};

export type DoctorFixPlanStep = {
  input?: {
    cwd?: string;
    command?: string;
  };
  risk?: "read" | "safe-write" | "high-impact";
  [key: string]: unknown;
};

export type DoctorFixPlan = {
  steps?: DoctorFixPlanStep[];
  [key: string]: unknown;
};

export type DevtoolsToggleTarget = SafeSendTarget & {
  isDevToolsOpened(): boolean;
  closeDevTools(): void;
  openDevTools(options: { mode: "detach" }): void;
};

export type DevtoolsToggleResult =
  | {
      ok: true;
      open: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type BrowserWindowInstance = {
  webContents: DevtoolsToggleTarget;
  loadFile(path: string): void;
  once(event: "closed", cb: () => void): void;
};

export type BrowserWindowCtor = new (options: unknown) => BrowserWindowInstance;

export type RuntimeContext = {
  structuredSessionStore: unknown;
  lastLoadedThemePath: string | null;
  lastLoadedPolicyPath: string | null;
};

export type RuntimeState = {
  structuredSessionStore: unknown;
  ctx: RuntimeContext;
};

export type JsonPersistenceHelpers = {
  readJson(filePath: string): unknown;
  writeJson(filePath: string, value: unknown): unknown;
};

export type ThemeResourcePathResolver = (
  relPath: string,
  devBase: "app" | "repo",
) => string;

export type ResourcePathResolver = (
  relPath: string,
  devBase?: string,
) => string;

export type PackagedResourceWarner = (
  resourceName: string,
  resolvedPath: string,
) => void;

export type ThemeRegistryBuilderDeps = {
  resolveResourcePath: ResourcePathResolver;
  warnIfUnexpectedPackagedResource: PackagedResourceWarner;
  persistence: JsonPersistenceHelpers;
};

export type ThemeRegistryDeps = {
  resolveResourcePath: ThemeResourcePathResolver;
  warnIfUnexpectedPackagedResource: PackagedResourceWarner;
  readJsonIfExists(filePath: string): unknown;
  writeJsonFile(filePath: string, value: unknown): unknown;
  setLastLoadedThemePath(filePath: string | null): void;
};

export type MemoryState = {
  owner: {
    ownerId: string;
    mode: "licensed" | "local-fallback";
    customerId: string | null;
    email: string | null;
  };
  memory: {
    ownerId: string;
    profile: {
      preferredName?: string;
      tonePreference?: "concise" | "balanced" | "detailed";
      humorPreference?: "low" | "medium" | "high";
      likes?: string[];
      dislikes?: string[];
    };
    workspaces: Record<
      string,
      {
        workspaceId: string;
        label?: string;
        preferredResponseStyle?: string[];
        preferredProofStyle?: string[];
        conventions?: Array<{ key: string; value: string }>;
        updatedAt: string;
      }
    >;
    inferredMemories: Array<{
      id: string;
      kind: "preference" | "habit" | "project" | "relationship";
      summary: string;
      confidence: number;
      source: "behavior" | "conversation";
      workspaceId?: string;
      runId?: string;
      status: "suggested" | "approved" | "dismissed";
      createdAt: string;
      updatedAt: string;
    }>;
    operationalMemories?: Array<{
      id: string;
      scope: "session" | "user" | "project" | "episode";
      kind:
        | "preference"
        | "constraint"
        | "project_fact"
        | "task_outcome"
        | "conversation_fact";
      content: string;
      status?: "approved" | "suggested" | "rejected";
      salience: number;
      confidence?: number;
      workspaceId?: string;
      source?:
        | "behavior"
        | "conversation"
        | "user_explicit"
        | "assistant_inferred"
        | "task_outcome"
        | "system_derived";
      tags?: string[];
      createdAt: string;
      updatedAt: string;
      lastUsedAt?: string;
      metadata?: Record<string, unknown>;
    }>;
    operationalStore?: {
      backend: "sqlite" | "json-fallback";
      reason?: string;
    };
    updatedAt: string;
  };
};

export type MemoryProfileUpdate = Partial<MemoryState["memory"]["profile"]>;

export type MemoryWorkspaceUpdate = {
  label?: string;
  preferredResponseStyle?: string[];
  preferredProofStyle?: string[];
  conventions?: Array<{ key: string; value: string }>;
};

export type MemoryDeleteEntryArgs = {
  scope: "profile" | "workspace";
  field:
    | "likes"
    | "dislikes"
    | "preferredResponseStyle"
    | "preferredProofStyle"
    | "conventions"
    | "inferredMemories";
  workspaceId?: string;
  value?: string;
  key?: string;
};

export type MemoryIpcDeps = {
  ipcMain: unknown;
  getState: () => MemoryState;
  updateProfile: (input: MemoryProfileUpdate) => MemoryState;
  updateWorkspace: (
    workspaceId: string,
    input: MemoryWorkspaceUpdate,
  ) => MemoryState;
  resetWorkspace: (workspaceId: string) => MemoryState;
  resetAll: () => MemoryState;
  setInferredMemoryStatus: (
    id: string,
    status: "approved" | "dismissed",
  ) => MemoryState;
  setOperationalMemoryStatus: (
    id: string,
    status: "approved" | "rejected",
  ) => MemoryState;
  deleteOperationalMemory: (id: string) => MemoryState;
  deleteEntry: (args: MemoryDeleteEntryArgs) => MemoryState;
};

export type OwnerMemoryStore = {
  getState: MemoryIpcDeps["getState"];
  updateProfile: MemoryIpcDeps["updateProfile"];
  updateWorkspace: MemoryIpcDeps["updateWorkspace"];
  resetWorkspace: MemoryIpcDeps["resetWorkspace"];
  resetAll: MemoryIpcDeps["resetAll"];
  setInferredMemoryStatus: MemoryIpcDeps["setInferredMemoryStatus"];
  setOperationalMemoryStatus: MemoryIpcDeps["setOperationalMemoryStatus"];
  deleteOperationalMemory: MemoryIpcDeps["deleteOperationalMemory"];
  deleteEntry: MemoryIpcDeps["deleteEntry"];
  upsertOperationalMemory: (input: {
    scope: "session" | "user" | "project" | "episode";
    kind:
      | "preference"
      | "constraint"
      | "project_fact"
      | "task_outcome"
      | "conversation_fact";
    content: string;
    workspaceId?: string;
    source?: "behavior" | "conversation";
    salience?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) => MemoryState;
  retrieveRelevantMemories: (input: {
    query: string;
    workspaceId?: string;
    limit?: number;
  }) => Array<{
    id: string;
    scope: "session" | "user" | "project" | "episode";
    kind:
      | "preference"
      | "constraint"
      | "project_fact"
      | "task_outcome"
      | "conversation_fact";
    content: string;
    salience: number;
    workspaceId?: string;
    source?: "behavior" | "conversation";
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    lastUsedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  recordConversationTurn: (input: {
    sessionId?: string;
    workspaceId?: string;
    userMessage: string;
    assistantReply: string;
  }) => MemoryState;
  recordTaskOutcome: (input: {
    workspaceId?: string;
    taskTitle: string;
    summary: string;
    success: boolean;
  }) => MemoryState;
  retrieveRelevantMemory?: (input: {
    userId?: string;
    workspaceId?: string;
    sessionId?: string;
    query: string;
    limit?: number;
  }) => Array<{
    id: string;
    scope: "session" | "user" | "project" | "episode";
    kind:
      | "preference"
      | "constraint"
      | "project_fact"
      | "task_outcome"
      | "conversation_fact";
    content: string;
    salience: number;
    workspaceId?: string;
    source?: "behavior" | "conversation";
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    lastUsedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  processTurnMemory?: (input: {
    userId?: string;
    workspaceId?: string | null;
    sessionId?: string | null;
    userMessage: string;
    assistantMessage?: string;
    taskResult?: {
      success: boolean;
      summary: string;
      filesChanged?: string[];
      commandsRun?: string[];
    };
  }) => Promise<Array<{
    id: string;
    scope: "session" | "user" | "project" | "episode";
    kind:
      | "preference"
      | "constraint"
      | "project_fact"
      | "task_outcome"
      | "conversation_fact";
    content: string;
    salience: number;
    workspaceId?: string;
    source?: "behavior" | "conversation";
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    lastUsedAt?: string;
    metadata?: Record<string, unknown>;
  }>>;
  getRecentMessages?: (sessionId: string) => Array<{
    role: "user" | "assistant";
    text: string;
    createdAt: string;
  }>;
};

export type OwnerMemoryStoreDeps = {
  app: {
    getPath(name: string): string;
  };
  path?: {
    join(...parts: string[]): string;
    basename(path: string): string;
  };
  readJsonIfExists: (filePath: string) => unknown;
  writeJsonFile: (filePath: string, value: unknown) => void;
  getCurrentLicenseCustomerId: () => string | null;
  getCachedEmail: () => string | null;
  getDeviceId: () => string;
  listRecentRuns?: (limit?: number) => Array<{
    sessionId: string;
    projectRoot?: string;
    latestCommand?: string;
    latestReceiptId?: string;
    failedCount?: number;
    interrupted?: boolean;
  }>;
};

export type AgentdHeadersOptions = {
  includeLicenseToken?: boolean;
  headers?: Record<string, string>;
};

export type AgentdRequestInit = {
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  includeLicenseToken?: boolean;
};

export type AgentdClient = {
  buildAgentdHeaders: (
    opts?: AgentdHeadersOptions,
  ) => Record<string, string>;
  agentdJson: (path: string, init: AgentdRequestInit) => Promise<unknown>;
};

export type LicenseStateSnapshot = {
  tier: string;
  has_token: boolean;
  expires_at: number | null;
  customer_id: string | null;
  status: string;
};

export type VerifyLicenseResult = {
  ok?: boolean;
  tier: string;
  license_token?: string | null;
  expires_at?: number | null;
  customer_id?: string | null;
  status?: string;
};

export type VerifyLicenseFn = (
  customerId: string,
  options?: { force?: boolean },
) => Promise<VerifyLicenseResult>;

export type StoredEntitlement = {
  tier: string;
  token: string | null;
  expiresAt: number | null;
  customerId: string | null;
  verifiedAt?: string;
  lastVerifiedAt?: string;
  status?: string;
};

export type LicenseStateHelpers = {
  applyVerifiedLicense: (data: {
    tier: string;
    license_token?: string | null;
    expires_at?: number | null;
    customer_id?: string | null;
    status?: string;
  }) => string;
  resetLicenseToStarter: () => void;
  getLicenseState: () => LicenseStateSnapshot;
  getCurrentLicenseCustomerId: () => string | null;
  getLicenseTier: () => string;
  getLicenseToken: () => string | null;
  refreshLicenseState: () => Promise<LicenseStateSnapshot>;
  saveEntitlements: () => void;
  loadEntitlements: () => StoredEntitlement | null;
  applyStoredEntitlement: (data: StoredEntitlement) => void;
  isEntitlementStale: (
    data: StoredEntitlement & { lastVerifiedAt?: string },
  ) => boolean;
};

export type PlanRunRegistry = Map<string, PlanRunState>;

export type StreamExecutionState = {
  cancelled: boolean;
  stepId: string;
  command: string;
};

export type StreamExecutionRegistry = Map<string, StreamExecutionState>;

export type PlanExecutionTerminalSafety = {
  risk: "safe-write";
  risk_level: "medium";
  requires_confirmation: boolean;
  commandRisk: unknown;
};

export type PlanExecutionStreamControlResult = {
  ok: boolean;
  message: string;
  degraded?: boolean;
};

export type PlanExecutionStreamResult = {
  streamId: string;
};

export type PipeAgentdSseToRendererArgs = {
  eventSender: SafeSendTarget;
  localPlanRunId: string;
  agentdPlanRunId: string;
  runId: string;
};

export type PlanExecutionHelpers = {
  runningPlanRuns: PlanRunRegistry;
  newPlanRunId: () => string;
  terminalWriteSafetyFields: (
    stepRisk: unknown,
  ) => PlanExecutionTerminalSafety;
  pipeAgentdSseToRenderer: (
    args: PipeAgentdSseToRendererArgs,
  ) => Promise<string | undefined>;
  executeStepStreamForIpc: (args: unknown) => Promise<PlanExecutionStreamResult>;
  streamCancelForIpc: (
    streamId: string,
  ) => Promise<PlanExecutionStreamControlResult>;
  streamKillForIpc: (
    streamId: string,
  ) => Promise<PlanExecutionStreamControlResult>;
  planStopForIpc: (
    planRunId: string,
  ) => Promise<PlanExecutionStreamControlResult>;
};

export type PlanExecutionHelperDeps = {
  engine: unknown;
  executeViaEngine: AnyFn;
  getLicenseTier: () => string;
  normalizeProjectRoot: ProjectRootNormalizer;
  resolveProjectRootSafe: ProjectRootResolver;
  gateProfileCommand: GateProfileCommandFn;
  evaluatePolicyGate: PolicyGateHelpers["evaluatePolicyGate"];
  ensureStructuredSession: SessionHelpers["ensureStructuredSession"];
  withStructuredSessionWrite: SessionHelpers["withStructuredSessionWrite"];
  structuredSessionStore: () => unknown;
  safeSend: SafeSendFn;
  redactChunkIfNeeded: PtyRuntimeHelpers["redactChunkIfNeeded"];
  forRendererDisplay: PtyRuntimeHelpers["forRendererDisplay"];
  agentdJson: AgentdClient["agentdJson"];
  buildAgentdHeaders: AgentdClient["buildAgentdHeaders"];
  AGENTD_BASE_URL: string;
  running: StreamExecutionRegistry;
  ptyStreamOwners: Map<string, number>;
  closePtyForWebContents: PtyRuntimeHelpers["closePtyForWebContents"];
  createStreamId: PtyRuntimeHelpers["createStreamId"];
  riskFromPlanStep: AnyFn;
  addTranscriptEntry: SessionHelpers["addTranscriptEntry"];
  e2ePlanPayloads: Map<unknown, unknown>;
};

export type PolicyGateResult = {
  ok: boolean;
  message?: string;
};

export type PolicyGateHelpers = {
  evaluatePolicyGate: (
    command: string,
    confirmed: boolean,
    confirmationText: string,
  ) => PolicyGateResult;
  explainPolicy: (command: string) => unknown;
};

export type PolicyGateDeps = {
  fs: {
    existsSync(path: string): boolean;
    readFileSync(path: string, encoding: string): string;
  };
  ctx: RuntimeState["ctx"];
  resolveResourcePath: ResourcePathResolver;
  warnIfUnexpectedPackagedResource: PackagedResourceWarner;
  sessionState: {
    entries: Array<{
      type?: string;
      command?: string;
    }>;
  };
  getCurrentRole: () => string;
};

export type SessionHelpers = {
  withStructuredSessionWrite: (fn: () => void) => void;
  ensureStructuredSession: (args: unknown) => string | null;
  sanitizeForPersistence: (value: unknown) => unknown;
  addTranscriptEntry: (entry: Record<string, unknown>) => void;
  getSessionTranscript: () => {
    sessionId: string;
    startTime: string;
    endTime: string;
    entries: unknown[];
    playbookResults: Record<string, unknown>;
  };
  exportTranscript: (format?: string) => string;
};

export type SessionHelperDeps = {
  redactText: RedactTextFn;
  getStructuredSessionStore: () => unknown;
  sessionState: {
    id: string;
    startTime: string;
    entries: unknown[];
    playbookResults: Map<unknown, unknown>;
  };
};

export type CodeListFilesArgs = {
  projectRoot: string;
  query?: string;
  limit?: number;
};

export type CodeListFilesResult =
  {
    files: readonly string[];
  };

export type CodeReadFileArgs = {
  projectRoot: string;
  relativePath: string;
};

export type CodeReadFileResult = {
  content: string;
};

export type WorkspaceRuntimeHelpers = {
  workspaceService: WorkspaceService;
  codeListFilesForIpc: (args: CodeListFilesArgs) => Promise<CodeListFilesResult>;
  codeReadFileForIpc: (args: CodeReadFileArgs) => Promise<CodeReadFileResult>;
};

export type WorkspaceRuntimeHelperDeps = WorkspaceServiceConfig;

export type RegisterRinaIpcDeps = {
  ipcMain: unknown;
  openRunsFolderForIpc: () => Promise<unknown> | unknown;
  revealRunReceiptForIpc: (receiptId: unknown) => Promise<unknown> | unknown;
  fixProjectForIpc: (projectRoot: unknown) => Promise<unknown> | unknown;
  explainPolicy: (command: string) => Promise<unknown> | unknown;
  redactionPreviewForIpc: (text: unknown) => Promise<unknown> | unknown;
  diagnosticsPathsForIpc: (deps: unknown) => Promise<unknown> | unknown;
  diagnosticsBundleDeps: unknown;
  supportBundleForIpcWithSnapshot: (
    deps: unknown,
    snapshot: unknown,
  ) => Promise<unknown> | unknown;
  workspacePickForIpc: () => Promise<unknown> | unknown;
  workspaceDefaultForIpc: (senderId: number) => Promise<unknown> | unknown;
  workspaceDemoForIpc: () => Promise<unknown> | unknown;
};

export type FixProjectFlowDeps = {
  agentPlan: (args: {
    intentText: string;
    projectRoot: string;
  }) => Promise<unknown>;
  evaluatePolicy: (step: {
    id: string;
    command: string;
    risk: "inspect" | "safe-write" | "high-impact";
    description?: string;
  }) => {
    ok: boolean;
    requiresConfirmation?: boolean;
    message?: string;
  };
};

export type WorkspaceElectronIpcHelpers = {
  workspacePickForIpc: RegisterRinaIpcDeps["workspacePickForIpc"];
  workspaceDefaultForIpc: RegisterRinaIpcDeps["workspaceDefaultForIpc"];
  workspaceDemoForIpc: RegisterRinaIpcDeps["workspaceDemoForIpc"];
};

export type WorkspaceElectronIpcHelperDeps = {
  dialog: unknown;
  ptySessions: PtySessionRegistry;
  getDefaultCwd: () => string;
};

export type DiagnoseHotLinuxResult = DiagnosticsHotReport;

export type RuntimeDiagnosticsCommandArgs = DiagnosticsCommand;

export type RuntimeDiagnosticsCommandResult = string;

export type RuntimeDiagnosticsHelpers = {
  diagnoseHotLinux: () => Promise<DiagnoseHotLinuxResult>;
  runCommandOnceViaEngine: (
    command: RuntimeDiagnosticsCommandArgs,
  ) => Promise<RuntimeDiagnosticsCommandResult>;
  runCommandOnce: (
    command: RuntimeDiagnosticsCommandArgs,
  ) => Promise<RuntimeDiagnosticsCommandResult>;
  runGatherCommand: (
    command: DiagnosticsGatherCommand,
  ) => Promise<DiagnosticsGatherResult>;
};

export type BuildPlanKind = "node" | "python" | "rust" | "go" | "unknown";

export type BuildPlanWorkflow = "build" | "test" | "deploy";

export type BuildPlanStep = {
  stepId: string;
  tool: "terminal" | "selfCheck";
  input: {
    command: string;
    cwd?: string;
    timeoutMs?: number;
  };
  risk: "inspect" | "safe-write" | "high-impact";
  risk_level: "low" | "medium" | "high";
  requires_confirmation: boolean;
  description: string;
};

export type BuildPlan = {
  id: string;
  intent: string;
  reasoning: string;
  steps: BuildPlanStep[];
  playbookId?: string;
};

export type BuildPlanPlaybook = {
  id: string;
  name?: string;
  description: string;
  category?: string;
  signals: readonly string[];
  gatherCommands: ReadonlyArray<{
    command: string;
    description: string;
  }>;
  fixOptions?: Array<{
    name: string;
    description: string;
    risk: "read" | "safe-write" | "high-impact";
    commands: string[];
    verification?: string;
  }>;
};

export type BuildPlanHelperDeps = {
  fs: unknown;
  path: unknown;
  playbooks: readonly BuildPlanPlaybook[];
  topCpuCmdSafeShort: string;
};

export type BuildPlanHelpers = {
  makePlan: (intentRaw: string, projectRoot?: string) => Promise<BuildPlan>;
  detectBuildKind: (projectRoot: string) => Promise<BuildPlanKind>;
  buildStepsForKind: (
    kind: BuildPlanKind,
    projectRoot?: string,
    workflow?: BuildPlanWorkflow,
  ) => Promise<BuildPlanStep[]>;
};

export type MiscIpcHelpers = {
  pingForIpc: AnyFn;
  historyImportForIpc: AnyFn;
  diagnoseHotForIpc: AnyFn;
  planForIpc: AnyFn;
  playbooksGetForIpc: AnyFn;
  playbookExecuteForIpc: AnyFn;
  redactionPreviewForIpc: RegisterRinaIpcDeps["redactionPreviewForIpc"];
};

export type MiscIpcPlaybook = BuildPlanPlaybook;

export type MiscIpcHelperDeps = {
  process: {
    platform: string;
  };
  redactText: RedactTextFn;
  importShellHistory: (limit: number) => unknown;
  diagnoseHotLinux: RuntimeDiagnosticsHelpers["diagnoseHotLinux"];
  addTranscriptEntry: SessionHelpers["addTranscriptEntry"];
  makePlan: BuildPlanHelpers["makePlan"];
  playbooks: readonly MiscIpcPlaybook[];
};

export type PtySessionProcess = {
  kill(signal?: string): void;
  onExit(cb: () => void): void;
};

export type PtySessionState = {
  cwd: string;
  shellKind: string;
  transcriptBuffer: string;
  finalizedBoundaryCount: number;
  proc: PtySessionProcess;
};

export type PtySessionRegistry = Map<number, PtySessionState>;

export type PtyRuntimeHelpers = {
  redactChunkIfNeeded: (text: unknown) => string;
  forRendererDisplay: (text: unknown) => string;
  redactForModel: (text: unknown) => string;
  getPtyModule: () => Promise<unknown | null>;
  getDefaultShell: () => string;
  shellToKind: (shell: unknown) => string;
  finalizePtyBoundaries: (
    targetWebContents: SafeSendTarget & { id: number },
    session: PtySessionState,
    flushAll?: boolean,
  ) => void;
  closePtyForWebContents: (webContentsId: number) => void;
  createStreamId: () => string;
  createStableBoundaryStreamId: (
    webContentsId: number,
    index: number,
  ) => string;
};

export type PtyRuntimeHelperDeps = {
  path: {
    basename(path: string): string;
  };
  process: {
    platform: string;
    env: Record<string, string | undefined>;
  };
  redactText: RedactTextFn;
  detectCommandBoundaries: AnyFn;
  getStructuredSessionStore: () => unknown;
  ensureStructuredSession: SessionHelpers["ensureStructuredSession"];
  withStructuredSessionWrite: SessionHelpers["withStructuredSessionWrite"];
  addTranscriptEntry: SessionHelpers["addTranscriptEntry"];
  safeSend: SafeSendFn;
  ptyStreamOwners: Map<string, number>;
  ptySessions: PtySessionRegistry;
  ptyResizeTimers: Map<number, ReturnType<typeof setTimeout>>;
  webContents: unknown;
};

export type RegisterRinaPlanIpcDeps = {
  ipcMain: unknown;
  resolveProjectRootSafe: ProjectRootResolver;
  fetchRemotePlanForIpc: (args: {
    intentText: string;
    projectRoot: string;
  }) => Promise<unknown>;
};

export type RegisterTeamIpcDeps = {
  ipcMain: unknown;
  accountPlanForIpc: AnyFn;
  teamWorkspaceCreateForIpc: AnyFn;
  teamWorkspaceGetForIpc: AnyFn;
  teamInvitesListForIpc: AnyFn;
  teamInviteCreateForIpc: AnyFn;
  teamInviteRevokeForIpc: AnyFn;
  teamAuditListForIpc: AnyFn;
  teamBillingEnforcementForIpc: AnyFn;
  loadTeamDb: AnyFn;
  saveTeamDb: AnyFn;
  normalizeRole: AnyFn;
};

export type AgentdIpcWrappers = {
  daemonStatus: () => Promise<unknown>;
  daemonTasks: (args?: {
    status?: string;
    deadLetter?: boolean;
  }) => Promise<unknown>;
  daemonTaskAdd: (args?: {
    type?: string;
    payload?: Record<string, unknown>;
    maxAttempts?: number;
  }) => Promise<unknown>;
  daemonStart: () => Promise<unknown>;
  daemonStop: () => Promise<unknown>;
  fetchRemotePlanForIpc: RegisterRinaPlanIpcDeps["fetchRemotePlanForIpc"];
  executeRemotePlanForIpc: RegisterAgentExecutionArgs["executeRemotePlan"];
  orchestratorIssueToPrForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  orchestratorGraphForIpc: () => Promise<unknown>;
  orchestratorPrepareBranchForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  orchestratorCreatePrForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  orchestratorPrStatusForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  orchestratorWebhookAuditForIpc: AsyncOptionalUnknownFn<
    { limit?: number; outcome?: string; mapped?: boolean },
    unknown
  >;
  orchestratorCiStatusForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  orchestratorReviewCommentForIpc: AsyncOptionalUnknownFn<unknown, unknown>;
  accountPlanForIpc: RegisterTeamIpcDeps["accountPlanForIpc"];
  teamWorkspaceCreateForIpc: RegisterTeamIpcDeps["teamWorkspaceCreateForIpc"];
  teamWorkspaceGetForIpc: RegisterTeamIpcDeps["teamWorkspaceGetForIpc"];
  teamInvitesListForIpc: RegisterTeamIpcDeps["teamInvitesListForIpc"];
  teamInviteCreateForIpc: RegisterTeamIpcDeps["teamInviteCreateForIpc"];
  teamInviteRevokeForIpc: RegisterTeamIpcDeps["teamInviteRevokeForIpc"];
  teamAuditListForIpc: RegisterTeamIpcDeps["teamAuditListForIpc"];
  teamBillingEnforcementForIpc: RegisterTeamIpcDeps["teamBillingEnforcementForIpc"];
};

export type AgentdIpcWrapperDeps = {
  agentdJson: AgentdClient["agentdJson"];
  isE2E: boolean;
  makePlan: BuildPlanHelpers["makePlan"];
  terminalWriteSafetyFields: PlanExecutionHelpers["terminalWriteSafetyFields"];
  e2ePlanPayloads: Map<unknown, unknown>;
  getCurrentRole: () => string;
  hasRoleAtLeast: RoleComparator;
};

export type RunsListArgs = {
  limit?: number;
};

export type RunsListResult =
  | {
      ok: true;
      runs: StructuredRunsListItem[];
    }
  | {
      ok: false;
      error: string;
    };

export type RunsTailArgs = {
  sessionId: string;
  runId?: string;
  maxLines?: number;
  maxBytes?: number;
};

export type RunsTailResult =
  | {
      ok: true;
      runId: string;
      sessionId: string;
      tail: string;
    }
  | {
      ok: false;
      error: string;
    };

export type RunsArtifactsArgs = {
  sessionId: string;
  runId?: string;
};

export type RunsArtifactsResult =
  | {
      ok: true;
      runId: string;
      sessionId: string;
      summary: StructuredRunArtifactSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type RunsIpcHelpers = {
  runsListForIpc: (args?: RunsListArgs) => Promise<RunsListResult>;
  openRunsFolderForIpc: RegisterRinaIpcDeps["openRunsFolderForIpc"];
  revealRunReceiptForIpc: RegisterRinaIpcDeps["revealRunReceiptForIpc"];
  runsTailForIpc: (args: RunsTailArgs) => Promise<RunsTailResult>;
  runsArtifactsForIpc: (args: RunsArtifactsArgs) => Promise<RunsArtifactsResult>;
};

export type RunsIpcHelperDeps = {
  app: {
    getPath(name: string): string;
  };
  fs: {
    existsSync(path: string): boolean;
    readdirSync(path: string, options?: unknown): any[];
    readFileSync(path: string, encoding: string): string;
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
  };
  path: {
    join(...parts: string[]): string;
    dirname(path: string): string;
    basename(path: string): string;
  };
  shell: {
    openPath(path: string): Promise<string>;
  };
  listStructuredRunsFromSessionsRoot: (
    sessionsRoot: string,
    limit?: number,
  ) => StructuredRunsListItem[];
  readStructuredRunTailFromSessionsRoot: (
    sessionsRoot: string,
    args: {
      sessionId: string;
      runId?: string;
      maxLines?: number;
      maxBytes?: number;
    },
  ) => string;
  summarizeStructuredRunArtifactsFromSessionsRoot: (
    sessionsRoot: string,
    args: { sessionId: string; runId?: string },
  ) => StructuredRunArtifactSummary;
};

export type WindowLifecycleHelpers = {
  createWindow: () => void;
  devtoolsToggleForIpc: (
    wc: DevtoolsToggleTarget,
  ) => Promise<DevtoolsToggleResult>;
};

export type WindowLifecycleDeps = {
  BrowserWindow: BrowserWindowCtor;
  path: {
    join(...parts: string[]): string;
  };
  __dirname: string;
  app: {
    isPackaged: boolean;
  };
  safeSend: SafeSendFn;
  thinkingStream: {
    on(event: "thinking", cb: (step: unknown) => void): void;
  };
  closePtyForWebContents: PtyRuntimeHelpers["closePtyForWebContents"];
  setDaemonFunctions: AnyFn;
  setLicenseFunctions: AnyFn;
  registerIpcHandlers: AnyFn;
  registerSecureAgentIpc: AnyFn;
  ipcMain: unknown;
  getLicenseTier: () => string;
  verifyLicense: VerifyLicenseFn;
  applyVerifiedLicense: LicenseStateHelpers["applyVerifiedLicense"];
  resetLicenseToStarter: LicensingRuntime["resetLicenseToStarter"];
  saveEntitlements: AnyFn;
  refreshLicenseState: LicensingRuntime["refreshLicenseState"];
  shell: {
    openExternal(url: string): Promise<void>;
  };
  getLicenseState: LicensingRuntime["getLicenseState"];
  getCurrentLicenseCustomerId: () => string | null;
  getOrCreateDeviceId: AnyFn;
  getCachedEmail: AnyFn;
  setCachedEmail: AnyFn;
  daemonStatus: AgentdIpcWrappers["daemonStatus"];
  daemonTasks: AgentdIpcWrappers["daemonTasks"];
  daemonTaskAdd: AgentdIpcWrappers["daemonTaskAdd"];
  daemonStart: AgentdIpcWrappers["daemonStart"];
  daemonStop: AgentdIpcWrappers["daemonStop"];
  runsListForIpc: RunsIpcHelpers["runsListForIpc"];
  runsTailForIpc: RunsIpcHelpers["runsTailForIpc"];
  runsArtifactsForIpc: RunsIpcHelpers["runsArtifactsForIpc"];
  codeListFilesForIpc: WorkspaceRuntimeHelpers["codeListFilesForIpc"];
  codeReadFileForIpc: WorkspaceRuntimeHelpers["codeReadFileForIpc"];
  ownerMemoryStore: OwnerMemoryStore;
  makePlan: BuildPlanHelpers["makePlan"];
  evaluatePolicyGate: PolicyGateHelpers["evaluatePolicyGate"];
  handleRinaMessage: AnyFn;
  rinaController: AnyFn;
  resolveProjectRootSafe: ProjectRootResolver;
  normalizeRinaResponse: AnyFn;
};

export type UpdateIpcDeps = {
  ipcMain: unknown;
  app: unknown;
  fs: unknown;
  path: unknown;
  shell: unknown;
};

export type UpdateIpcBuilderDeps = {
  app: unknown;
  fs: unknown;
  path: unknown;
  shell: unknown;
};

export type AnalyticsTrackerResult = {
  accepted: boolean;
  enabled: boolean;
  degraded?: boolean;
  error?: string;
};

export type StartupLogger = {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

export type ProjectRootResolver = (input: unknown) => string;
export type ProjectRootNormalizer = (
  input: unknown,
  workspaceRoot?: string,
) => string;

export type RedactionResult = {
  redactedText: string;
};

export type RedactTextFn = (text: string) => RedactionResult;

export type ProjectRulesBundle = {
  projectRoot: string;
  files: unknown[];
  merged: string;
  warnings: string[];
};

export type LoadProjectRulesFn = (
  projectRoot: string,
  opts?: { maxBytesPerFile?: number; parentLevels?: number },
) => ProjectRulesBundle;

export type RulesToSystemBlockFn = (bundle: ProjectRulesBundle) => string;
export type SummarizeProfileFn = (profile: unknown) => string;

export type GateProfileCommandArgs = {
  projectRoot: string;
  command: string;
  risk: unknown;
  confirmed: boolean;
  confirmationText: string;
};

export type GateProfileCommandResult = {
  ok: boolean;
  message?: string;
};

export type GateProfileCommandFn = (
  args: GateProfileCommandArgs,
) => GateProfileCommandResult;

export type RegisterAnalyticsIpcDeps = {
  ipcMain: unknown;
  trackFunnelStep: (
    step: string,
    properties?: Record<string, unknown>,
  ) => AnalyticsTrackerResult | undefined;
  trackEvent: (
    event: string,
    properties?: Record<string, unknown>,
  ) => AnalyticsTrackerResult | undefined;
  getUsageStatus: () => unknown;
  isUsageTrackingEnabled: () => boolean;
  enableUsageTracking: () => AnalyticsTrackerResult | undefined;
  disableUsageTracking: () => void;
  trackCommandExecuted: () => AnalyticsTrackerResult | undefined;
  trackAISuggestionUsed: () => AnalyticsTrackerResult | undefined;
  trackSelfHealingRun: () => AnalyticsTrackerResult | undefined;
  trackTerminalSessionStart: () => AnalyticsTrackerResult | undefined;
};

export type TeamMember = {
  email: string;
  role: string;
};

export type TeamDb = {
  workspaceId?: string;
  currentUser?: string;
  currentRole?: string;
  members?: TeamMember[];
  seatsAllowed?: number;
};

export type RegisterTeamStateIpcDeps = {
  ipcMain: unknown;
  loadTeamDb: () => TeamDb;
  getCurrentRole: () => string;
};

export type RegisterPostStartupIpcAndServicesDeps = {
  registerPtyHandlers: () => void;
  registerAgentExecutionIpc: (deps: RegisterAgentExecutionArgs) => void;
  agentExecutionIpcDeps: RegisterAgentExecutionArgs;
  registerAnalyticsIpc: (deps: RegisterAnalyticsIpcDeps) => void;
  analyticsIpcDeps: RegisterAnalyticsIpcDeps;
  registerRinaPlanIpc: (deps: RegisterRinaPlanIpcDeps) => void;
  rinaPlanIpcDeps: RegisterRinaPlanIpcDeps;
  registerRinaIpc: (deps: RegisterRinaIpcDeps) => void;
  rinaIpcDeps: RegisterRinaIpcDeps;
  registerTeamIpc: (deps: RegisterTeamIpcDeps) => void;
  teamIpcDeps: RegisterTeamIpcDeps;
  registerThemeHandlers: (
    ipcMain: unknown,
    deps: ThemeRegistryDeps,
  ) => void;
  ipcMain: unknown;
  themeRegistryDeps: ThemeRegistryDeps;
  registerMemoryIpc: (deps: MemoryIpcDeps) => void;
  memoryIpcDeps: MemoryIpcDeps;
  registerUpdateIpc: (deps: UpdateIpcDeps) => void;
  updateIpcDeps: UpdateIpcDeps;
};

export type DoctorIpcHelpers = {
  doctorInspectForIpc: AsyncUnknownFn<unknown, unknown>;
  doctorCollectForIpc: (
    steps: unknown,
    streamCallback?: unknown,
  ) => Promise<unknown>;
  doctorInterpretForIpc: AsyncUnknownFn<
    { intent: string; evidence: unknown; [key: string]: unknown },
    unknown
  >;
  doctorVerifyForIpc: AsyncUnknownFn<
    {
      intent: string;
      before: unknown;
      after: unknown;
      diagnosis: unknown;
      [key: string]: unknown;
    },
    unknown
  >;
  doctorExecuteFixForIpc: (
    plan: DoctorFixPlan,
    confirmed: boolean,
    confirmationText?: string,
  ) => Promise<unknown>;
};

export type ChatDoctorIpcHelpers = {
  doctorTranscriptGetForIpc: () => Promise<unknown>;
  doctorTranscriptExportForIpc: (format?: string) => Promise<unknown>;
  getConversation: (win: unknown) => unknown | null;
  setConversation: (win: unknown, state: unknown | null | undefined) => void;
  classifyIntent: (text: string) => ChatDoctorIntentClassification;
  formatFindingsForChat: (findings: unknown) => string;
  formatDiagnosisForChat: (diagnosis: unknown) => string;
  formatFixOptionsForChat: (fixOptions: unknown) => string;
  formatOutcomeForChat: (outcome: unknown, verification?: unknown) => string;
  chatSendForIpc: (text: unknown, projectRoot?: string) => Promise<unknown>;
  chatExportForIpc: () => Promise<unknown>;
  summarizeRinaOutput: (output: unknown) => string;
  normalizeRinaResponse: (response: {
    ok: boolean;
    intent?: string;
    error?: string;
    output?: unknown;
    blocked?: boolean;
    requiresConfirmation?: boolean;
    [key: string]: unknown;
  }) => {
    ok: boolean;
    intent?: string;
    text: string;
    actions: unknown[];
    plan: unknown;
    blocked: boolean;
    requiresConfirmation: boolean;
    rina: unknown;
  };
  doctorPlanForIpc: (args: DoctorPlanArgs) => Promise<unknown>;
};

export type CreateDoctorIpcHelpersDeps = {
  doctorInspect: DoctorIpcHelpers["doctorInspectForIpc"];
  doctorCollect: DoctorIpcHelpers["doctorCollectForIpc"];
  doctorInterpret: DoctorIpcHelpers["doctorInterpretForIpc"];
  doctorVerify: DoctorIpcHelpers["doctorVerifyForIpc"];
  doctorExecuteFix: DoctorIpcHelpers["doctorExecuteFixForIpc"];
  evaluatePolicyGate: PolicyGateHelpers["evaluatePolicyGate"];
  redactForModel: PtyRuntimeHelpers["redactForModel"];
  sanitizeForPersistence: SessionHelpers["sanitizeForPersistence"];
  resolveProjectRootSafe: ProjectRootResolver;
  getDefaultCwd: () => string;
  gateProfileCommand: GateProfileCommandFn;
};

export type CreateChatDoctorIpcHelpersDeps = {
  redactText: RedactTextFn;
  resolveProjectRootSafe: ProjectRootResolver;
  getDefaultCwd: () => string;
  defaultProfileForProject: (projectRoot: string) => unknown;
  loadProjectRules: LoadProjectRulesFn;
  rulesToSystemBlock: RulesToSystemBlockFn;
  summarizeProfile: SummarizeProfileFn;
  chatRouter:
    | {
        handle(
          text: string,
          context: {
            projectRoot: string;
            rulesBlock: string;
            rulesWarnings: unknown;
            profileSummary: string;
          },
        ): Promise<unknown>;
      }
    | AnyFn;
  doctorGetTranscript: ChatDoctorIpcHelpers["doctorTranscriptGetForIpc"];
  doctorExportTranscript: ChatDoctorIpcHelpers["doctorTranscriptExportForIpc"];
  handleRinaMessage: AsyncUnknownFn<string, unknown>;
};

export type RuntimeUtilsFactory = (args: {
  app: unknown;
  dialog: unknown;
  path: unknown;
  crypto: unknown;
  process: NodeJS.Process;
  os: unknown;
  fs: unknown;
  isE2E: boolean;
}) => {
  zipFiles: AnyFn;
  showSaveDialogForBundle: AnyFn;
  safeSend: SafeSendFn;
  importShellHistory: AnyFn;
};

export type StandardRegistryFactory = () => unknown;
export type ExecutionEngineCtor = new (registry: unknown) => unknown;

export type PlatformDeps = {
  app: {
    isPackaged: boolean;
    getPath(name: string): string;
  };
  BrowserWindow: BrowserWindowCtor;
  ipcMain: unknown;
  dialog: unknown;
  webContents: unknown;
  shell: {
    openPath(path: string): Promise<string>;
    openExternal(url: string): Promise<void>;
  };
  fs: {
    unlinkSync(path: string): void;
    existsSync(path: string): boolean;
    readdirSync(path: string, options?: unknown): any[];
    readFileSync(path: string, encoding: string): string;
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
  };
  path: {
    join(...parts: string[]): string;
    dirname(path: string): string;
    basename(path: string): string;
  };
  os: unknown;
  crypto: unknown;
  process: NodeJS.Process;
  __dirname: string;
};

export type ConfigDeps = {
  APP_PROJECT_ROOT: string;
  AGENTD_BASE_URL: string;
  AGENTD_AUTH_TOKEN: string;
  IS_E2E: boolean;
  TOP_CPU_CMD_SAFE: string;
  TOP_CPU_CMD_SAFE_SHORT: string;
  PLAYBOOKS: readonly BuildPlanPlaybook[];
  e2ePlanPayloads: Map<unknown, unknown>;
  StructuredSessionStore: unknown;
  featureFlags: unknown;
};

export type SecurityDeps = {
  verifyLicense: VerifyLicenseFn;
  getOrCreateDeviceId: AnyFn;
  getCachedEmail: AnyFn;
  setCachedEmail: AnyFn;
  setAuthConfig: AnyFn;
  setCachedToken: AnyFn;
  defaultProfileForProject: AnyFn;
  loadProjectRules: LoadProjectRulesFn;
  rulesToSystemBlock: RulesToSystemBlockFn;
  summarizeProfile: SummarizeProfileFn;
  riskFromPlanStep: AnyFn;
  normalizeProjectRoot: ProjectRootNormalizer;
  resolveProjectRootSafe: ProjectRootResolver;
  resolveResourcePath: ResourcePathResolver;
  warnIfUnexpectedPackagedResource: PackagedResourceWarner;
  canonicalizePath: AnyFn;
  isWithinRoot: AnyFn;
  gateProfileCommand: GateProfileCommandFn;
  redactText: RedactTextFn;
  detectCommandBoundaries: AnyFn;
};

export type IpcRegistrationDeps = {
  setDaemonFunctions: AnyFn;
  setLicenseFunctions: AnyFn;
  registerIpcHandlers: AnyFn;
  registerPtyHandlers: () => void;
  registerSecureAgentIpc: AnyFn;
  registerAgentExecutionIpc: (deps: RegisterAgentExecutionArgs) => void;
  registerMemoryIpc: (deps: MemoryIpcDeps) => void;
  registerAnalyticsIpc: (deps: RegisterAnalyticsIpcDeps) => void;
  registerUpdateIpc: (deps: UpdateIpcDeps) => void;
  registerRinaIpc: (deps: RegisterRinaIpcDeps) => void;
  registerRinaPlanIpc: (deps: RegisterRinaPlanIpcDeps) => void;
  registerTeamIpc: (deps: RegisterTeamIpcDeps) => void;
  registerTeamStateIpc: (deps: RegisterTeamStateIpcDeps) => void;
  registerThemeHandlers: (
    ipcMain: unknown,
    deps: ThemeRegistryDeps,
  ) => void;
  registerPostStartupIpcAndServices: (
    deps: RegisterPostStartupIpcAndServicesDeps,
  ) => void;
};

export type FactoryDeps = {
  createOwnerMemoryStore: (deps: OwnerMemoryStoreDeps) => OwnerMemoryStore;
  createAgentdIpcWrappers: (deps: AgentdIpcWrapperDeps) => AgentdIpcWrappers;
  createAgentdClient: (deps: {
    AGENTD_BASE_URL: string;
    AGENTD_AUTH_TOKEN: string;
    getLicenseToken: () => string | null;
  }) => AgentdClient;
  createChatDoctorIpcHelpers: (
    deps: CreateChatDoctorIpcHelpersDeps,
  ) => ChatDoctorIpcHelpers;
  createDoctorIpcHelpers: (
    deps: CreateDoctorIpcHelpersDeps,
  ) => DoctorIpcHelpers;
  createFixProjectFlow: (deps: FixProjectFlowDeps) => AnyFn;
  createPolicyGate: (deps: PolicyGateDeps) => PolicyGateHelpers;
  createBuildPlanHelpers: (deps: BuildPlanHelperDeps) => BuildPlanHelpers;
  createMiscIpcHelpers: (deps: MiscIpcHelperDeps) => MiscIpcHelpers;
  createPtyRuntimeHelpers: (deps: PtyRuntimeHelperDeps) => PtyRuntimeHelpers;
  createRunsIpcHelpers: (deps: RunsIpcHelperDeps) => RunsIpcHelpers;
  createSessionHelpers: (deps: SessionHelperDeps) => SessionHelpers;
  createRuntimeSessionState: AnyFn;
  readJsonIfExists: AnyFn;
  writeJsonFile: AnyFn;
  createRuntimeUtils: RuntimeUtilsFactory;
  createPlanExecutionHelpers: (
    deps: PlanExecutionHelperDeps,
  ) => PlanExecutionHelpers;
  createWindowLifecycle: (deps: WindowLifecycleDeps) => WindowLifecycleHelpers;
  createWorkspaceRuntimeHelpers: (
    deps: WorkspaceRuntimeHelperDeps,
  ) => WorkspaceRuntimeHelpers;
  createWorkspaceElectronIpcHelpers: (
    deps: WorkspaceElectronIpcHelperDeps,
  ) => WorkspaceElectronIpcHelpers;
  createAnalyticsSessionInitializer: (
    deps: AnalyticsSessionInitializerDeps,
  ) => InitializeAnalyticsSessionFn;
  createAuthBootstrap: (deps: AuthBootstrapDeps) => BootstrapAuthFn;
  createDaemonAutoStarter: (deps: DaemonAutoStarterDeps) => MaybeAutoStartDaemonFn;
  createEntitlementRestore: (
    deps: EntitlementRestoreDeps,
  ) => RestoreEntitlementsFn;
  createStandardRegistry: StandardRegistryFactory;
  ExecutionEngine: ExecutionEngineCtor;
};

export type AnalyticsDeps = {
  initAnalytics: AnyFn;
  trackEvent: RegisterAnalyticsIpcDeps["trackEvent"];
  trackFunnelStep: RegisterAnalyticsIpcDeps["trackFunnelStep"];
  getUsageStatus: RegisterAnalyticsIpcDeps["getUsageStatus"];
  isUsageTrackingEnabled: RegisterAnalyticsIpcDeps["isUsageTrackingEnabled"];
  enableUsageTracking: RegisterAnalyticsIpcDeps["enableUsageTracking"];
  disableUsageTracking: RegisterAnalyticsIpcDeps["disableUsageTracking"];
  trackCommandExecuted: RegisterAnalyticsIpcDeps["trackCommandExecuted"];
  trackAISuggestionUsed: RegisterAnalyticsIpcDeps["trackAISuggestionUsed"];
  trackSelfHealingRun: RegisterAnalyticsIpcDeps["trackSelfHealingRun"];
  trackTerminalSessionStart: RegisterAnalyticsIpcDeps["trackTerminalSessionStart"];
};

export type DoctorChatDeps = {
  handleRinaMessage: AnyFn;
  rinaController: AnyFn;
  thinkingStream: {
    on(event: "thinking", cb: (step: unknown) => void): void;
  };
  chatRouter: AnyFn;
  doctorInspect: CreateDoctorIpcHelpersDeps["doctorInspect"];
  doctorCollect: CreateDoctorIpcHelpersDeps["doctorCollect"];
  doctorInterpret: CreateDoctorIpcHelpersDeps["doctorInterpret"];
  doctorVerify: CreateDoctorIpcHelpersDeps["doctorVerify"];
  doctorExecuteFix: CreateDoctorIpcHelpersDeps["doctorExecuteFix"];
  doctorGetTranscript: CreateChatDoctorIpcHelpersDeps["doctorGetTranscript"];
  doctorExportTranscript: CreateChatDoctorIpcHelpersDeps["doctorExportTranscript"];
};

export type DiagnosticsDeps = {
  listStructuredRunsFromSessionsRoot: AnyFn;
  readStructuredRunTailFromSessionsRoot: AnyFn;
  summarizeStructuredRunArtifactsFromSessionsRoot: AnyFn;
  diagnosticsPathsForIpc: AnyFn;
  supportBundleForIpcWithSnapshot: AnyFn;
};

export type ExecutionDeps = {
  executeViaEngine: AnyFn;
};

export type FlatMainRuntimeDeps = PlatformDeps &
  ConfigDeps &
  SecurityDeps &
  IpcRegistrationDeps &
  FactoryDeps &
  AnalyticsDeps &
  DoctorChatDeps &
  DiagnosticsDeps &
  ExecutionDeps;

export type PersistenceDeps = Pick<PlatformDeps, "fs" | "path"> &
  Pick<FactoryDeps, "readJsonIfExists" | "writeJsonFile">;

export type CreateMainRuntimeDeps = {
  platform: PlatformDeps;
  config: ConfigDeps;
  security: SecurityDeps;
  factories: FactoryDeps;
  analytics: AnalyticsDeps;
  doctorChat: DoctorChatDeps;
  diagnostics: DiagnosticsDeps;
  execution: ExecutionDeps;
  registration: IpcRegistrationDeps;
};

export type BootstrapAuthFn = () => Promise<void>;
export type RestoreEntitlementsFn = () => Promise<StoredEntitlement | null>;
export type InitializeAnalyticsSessionFn = () => Promise<unknown>;
export type MaybeAutoStartDaemonFn = () => Promise<void>;

export type AuthBootstrapDeps = {
  app: {
    getPath(name: string): string;
  };
  fs: unknown;
  path: {
    join(...parts: string[]): string;
  };
  readJsonIfExists: AnyFn;
  setAuthConfig: AnyFn;
  setCachedToken: AnyFn;
  getOrCreateDeviceId: AnyFn;
  authApiUrl: string;
};

export type EntitlementRestoreDeps = {
  loadEntitlements: LicenseStateHelpers["loadEntitlements"];
  applyStoredEntitlement: LicenseStateHelpers["applyStoredEntitlement"];
  isEntitlementStale: LicenseStateHelpers["isEntitlementStale"];
  verifyLicense: VerifyLicenseFn;
  applyVerifiedLicense: LicenseStateHelpers["applyVerifiedLicense"];
  saveEntitlements: LicenseStateHelpers["saveEntitlements"];
  getLicenseTier: () => string;
  isE2E: boolean;
  logger?: StartupLogger;
};

export type AnalyticsSessionInitializerDeps = {
  initAnalytics: AnalyticsDeps["initAnalytics"];
  featureFlags: unknown;
  isE2E: boolean;
  app: {
    getPath(name: string): string;
  };
  path: {
    join(...parts: string[]): string;
  };
  StructuredSessionStore: unknown;
  ctx: RuntimeState["ctx"];
  withStructuredSessionWrite: SessionHelpers["withStructuredSessionWrite"];
  logger?: StartupLogger;
};

export type DaemonAutoStarterDeps = {
  daemonStart: AnyFn;
  logger?: StartupLogger;
};

export type StartupRuntime = {
  bootstrapAuth: BootstrapAuthFn;
  restoreEntitlements: RestoreEntitlementsFn;
  initializeAnalyticsSession: InitializeAnalyticsSessionFn;
  maybeAutoStartDaemon: MaybeAutoStartDaemonFn;
};

export type WindowsRuntime = {
  createWindow: WindowLifecycleHelpers["createWindow"];
  devtoolsToggleForIpc: WindowLifecycleHelpers["devtoolsToggleForIpc"];
  closePtyForWebContents: PtyRuntimeHelpers["closePtyForWebContents"];
  ptySessions: PtySessionRegistry;
};

export type AgentdRuntime = {
  buildAgentdHeaders: (
    opts?: AgentdHeadersOptions,
  ) => Record<string, string>;
  agentdJson: (path: string, init: AgentdRequestInit) => Promise<unknown>;
  daemonStatus: AgentdIpcWrappers["daemonStatus"];
  daemonTasks: AgentdIpcWrappers["daemonTasks"];
  daemonTaskAdd: AgentdIpcWrappers["daemonTaskAdd"];
  daemonStart: AgentdIpcWrappers["daemonStart"];
  daemonStop: AgentdIpcWrappers["daemonStop"];
  fetchRemotePlanForIpc: RegisterRinaPlanIpcDeps["fetchRemotePlanForIpc"];
  executeRemotePlanForIpc: AgentdIpcWrappers["executeRemotePlanForIpc"];
};

export type LicensingRuntime = {
  getLicenseState: () => LicenseStateSnapshot;
  getLicenseToken: () => string | null;
  applyVerifiedLicense: LicenseStateHelpers["applyVerifiedLicense"];
  resetLicenseToStarter: () => void;
  refreshLicenseState: () => Promise<LicenseStateSnapshot>;
};

export type DiagnosticsRuntime = {
  diagnoseHotLinux: RuntimeDiagnosticsHelpers["diagnoseHotLinux"];
  runCommandOnce: RuntimeDiagnosticsHelpers["runCommandOnce"];
  runGatherCommand: RuntimeDiagnosticsHelpers["runGatherCommand"];
  diagnosticsBundleDeps: RegisterRinaIpcDeps["diagnosticsBundleDeps"];
  explainPolicy: RegisterRinaIpcDeps["explainPolicy"];
  redactionPreviewForIpc: RegisterRinaIpcDeps["redactionPreviewForIpc"];
  supportBundleForIpcWithSnapshot: RegisterRinaIpcDeps["supportBundleForIpcWithSnapshot"];
};

export type ExecutionRuntime = {
  engine: unknown;
  executeViaEngine: AnyFn;
  terminalWriteSafetyFields: PlanExecutionHelpers["terminalWriteSafetyFields"];
  getLicenseTier: () => string;
};

export type RunsRuntime = {
  openRunsFolderForIpc: RegisterRinaIpcDeps["openRunsFolderForIpc"];
  revealRunReceiptForIpc: RegisterRinaIpcDeps["revealRunReceiptForIpc"];
  runsListForIpc: RunsIpcHelpers["runsListForIpc"];
  runsTailForIpc: RunsIpcHelpers["runsTailForIpc"];
  runsArtifactsForIpc: RunsIpcHelpers["runsArtifactsForIpc"];
};

export type TeamRuntime = {
  getCurrentRole: () => string;
  hasRoleAtLeast: RoleComparator;
  loadTeamDb: () => TeamDb;
  saveTeamDb: (value: TeamDb) => TeamDb;
  normalizeRole: RegisterTeamIpcDeps["normalizeRole"];
  accountPlanForIpc: RegisterTeamIpcDeps["accountPlanForIpc"];
  teamWorkspaceCreateForIpc: RegisterTeamIpcDeps["teamWorkspaceCreateForIpc"];
  teamWorkspaceGetForIpc: RegisterTeamIpcDeps["teamWorkspaceGetForIpc"];
  teamInvitesListForIpc: RegisterTeamIpcDeps["teamInvitesListForIpc"];
  teamInviteCreateForIpc: RegisterTeamIpcDeps["teamInviteCreateForIpc"];
  teamInviteRevokeForIpc: RegisterTeamIpcDeps["teamInviteRevokeForIpc"];
  teamAuditListForIpc: RegisterTeamIpcDeps["teamAuditListForIpc"];
  teamBillingEnforcementForIpc: RegisterTeamIpcDeps["teamBillingEnforcementForIpc"];
};

export type RegistrationRuntime = {
  registerTeamStateIpc(): void;
  registerPostStartupIpcAndServices(): void;
};

export type MainRuntime = {
  state: RuntimeState;
  startup: StartupRuntime;
  windows: WindowsRuntime;
  licensing: LicensingRuntime;
  agentd: AgentdRuntime;
  diagnostics: DiagnosticsRuntime;
  execution: ExecutionRuntime;
  runs: RunsRuntime;
  team: TeamRuntime;
  registration: RegistrationRuntime;
};
