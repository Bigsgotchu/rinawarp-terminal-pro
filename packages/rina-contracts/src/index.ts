export type RinaSource = "terminal_pro" | "vscode_companion" | "api";

export type RinaRunMode = "answer" | "plan" | "execute" | "verify" | "recover";

export type SafetyProfile = "strict" | "standard" | "trusted_workspace";

export type AgentRunRequest = {
  workspaceId: string;
  userId: string;
  source: RinaSource;
  userMessage: string;
  mode: RinaRunMode;
  cwd: string;
  selectedFiles?: string[];
  safetyProfile: SafetyProfile;
  metadata?: Record<string, unknown>;
};

export type PlanStep = {
  id: string;
  title: string;
  kind: "inspect" | "command" | "file_change" | "mcp" | "explain";
  command?: string;
  cwd?: string;
  risk?: "low" | "medium" | "high" | "blocked";
  requiresApproval?: boolean;
};

export type VerificationCheck =
  | {
      type: "command";
      label: string;
      command: string;
      cwd?: string;
      timeoutMs?: number;
      expectedExitCode?: number;
      expectedOutputIncludes?: string[];
      expectedOutputExcludes?: string[];
    }
  | {
      type: "file_exists";
      label: string;
      path: string;
    }
  | {
      type: "file_contains";
      label: string;
      path: string;
      includes: string[];
    }
  | {
      type: "diff_check";
      label: string;
      expectedChangedFiles?: string[];
      forbiddenChangedFiles?: string[];
    }
  | {
      type: "http_check";
      label: string;
      url: string;
      expectedStatus?: number;
      expectedBodyIncludes?: string[];
    };

export type VerificationPlan = {
  expectedOutcome: string;
  checks: VerificationCheck[];
  successCriteria: string[];
};

export type RecoveryStep = {
  reason: string;
  suggestedAction: string;
  requiresApproval: boolean;
};

export type PlanPreview = {
  id: string;
  objective: string;
  steps: PlanStep[];
  verificationPlan: VerificationPlan;
  recoveryPlan?: RecoveryStep[];
};

export type RiskSummary = {
  level: "low" | "medium" | "high" | "blocked";
  reasons: string[];
  requiresApproval: boolean;
};

export type CommandReceipt = {
  id: string;
  command: string;
  cwd: string;
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  stdout: string;
  stderr: string;
};

export type FileChangeReceipt = {
  path: string;
  changeType: "created" | "modified" | "deleted";
  diff?: string;
};

export type McpCallReceipt = {
  server: string;
  tool: string;
  input: unknown;
  output: unknown;
  status: "succeeded" | "failed";
};

export type ArtifactReceipt = {
  type: "log" | "diff" | "file" | "url";
  label: string;
  value: string;
};

export type VerificationReceipt = {
  status: "passed" | "failed" | "skipped" | "partial";
  checks: {
    label: string;
    type: string;
    status: "passed" | "failed" | "skipped";
    evidence: string;
    exitCode?: number;
    durationMs?: number;
  }[];
  conclusion: string;
  recoverySuggested: boolean;
};

export type ExecutionReceipt = {
  id: string;
  sessionId: string;
  workspaceId: string;
  userIntent: string;
  planId: string;
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed" | "partial" | "cancelled";
  commands: CommandReceipt[];
  fileChanges: FileChangeReceipt[];
  mcpCalls: McpCallReceipt[];
  artifacts: ArtifactReceipt[];
  verification: VerificationReceipt;
  risk: {
    level: "low" | "medium" | "high" | "blocked";
    reasons: string[];
    approvals: {
      approvedAt: string;
      approvedBy: string;
      reason: string;
    }[];
  };
  summary: string;
};

export type AgentRunEvent =
  | { type: "intent_detected"; intent: string }
  | { type: "plan_created"; plan: PlanPreview }
  | { type: "approval_required"; risk: RiskSummary; planId?: string; command?: string }
  | { type: "run_started"; runId: string }
  | { type: "command_started"; commandId: string; command: string; cwd: string }
  | { type: "command_output"; commandId: string; stream: "stdout" | "stderr"; text: string }
  | { type: "command_completed"; commandId: string; exitCode: number }
  | { type: "file_changed"; path: string; changeType: "created" | "modified" | "deleted"; diff?: string }
  | { type: "verification_started"; checks: VerificationCheck[] }
  | { type: "verification_completed"; receipt: VerificationReceipt }
  | { type: "recovery_required"; failedRunId: string; failure: string; likelyCause: string; suggestedAction: string }
  | { type: "receipt_created"; receipt: ExecutionReceipt }
  | { type: "memory_updated"; keys: string[] }
  | { type: "error"; message: string; recoverable: boolean };
