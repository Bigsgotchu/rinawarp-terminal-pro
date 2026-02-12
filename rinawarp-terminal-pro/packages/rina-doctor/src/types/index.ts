/**
 * System Doctor Diagnostic Engine - Core Types
 * Following the v1 specification
 */

// ============================================================================
// Session & Environment
// ============================================================================

export type Risk = "read" | "safe-write" | "high-impact";

export type Platform = "linux" | "darwin" | "win32";

export type UserMode = "starter" | "creator" | "pro" | "founder" | "enterprise";

export interface SessionMetadata {
  sessionId: string;
  startedAt: string; // ISO timestamp
  platform: Platform;
  distro?: string; // e.g. "Kali"
  kernel?: string;
  hostname?: string;
  userMode: UserMode;
}

// ============================================================================
// Tool Steps & Plans
// ============================================================================

export interface ToolStep {
  id: string;
  tool: "terminal" | "fs" | "git";
  command: string;
  risk: Risk;
  description?: string;
  timeoutMs?: number; // default: 15000 for read, 60000 for safe-write
  maxBytes?: number; // output cap, default: 1MB
  normalize?: "kv" | "table" | "json" | "raw";
  tags?: string[]; // e.g. ["cpu", "thermal"]
}

export interface AgentPlan {
  id: string;
  intent: string;
  playbookId?: string;
  stage: "inspect" | "fix" | "verify";
  reasoning: string;
  steps: ToolStep[];
}

// ============================================================================
// Evidence Collection
// ============================================================================

export interface StepOutput {
  stepId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

export interface EvidenceBundle {
  collectedAt: string;
  raw: Record<string, StepOutput>;
  metrics: Record<string, number | string | boolean>;
  snapshots: Snapshot[];
}

export interface Snapshot {
  ts: string;
  kind: "cpu" | "mem" | "disk" | "thermal" | "net" | "proc" | "service";
  data: any;
}

// ============================================================================
// Findings & Diagnosis
// ============================================================================

export type Severity = "info" | "warn" | "critical";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  evidenceRefs: Array<{
    stepId?: string;
    metricKey?: string;
    excerpt?: string;
  }>;
  confidence: number; // 0..1 for the finding itself
}

export interface Diagnosis {
  causeId: string; // e.g. "cpu_runaway_process"
  label: string;
  probability: number; // 0..1
  supportingFindings: string[]; // finding ids
  disconfirmingFindings?: string[];
  nextProbes?: ToolStep[];
}

export interface DiagnosisBundle {
  primary: Diagnosis;
  differential: Diagnosis[]; // sorted by probability
  notes: string;
}

// ============================================================================
// Fix Options
// ============================================================================

export interface FixOption {
  id: string;
  label: string;
  why: string;
  risk: Risk;
  plan: AgentPlan; // stage="fix"
  expectedOutcome: string[];
  rollback?: AgentPlan; // optional safe rollback
}

// ============================================================================
// Verification
// ============================================================================

export interface VerificationResult {
  ok: boolean;
  checks: {
    label: string;
    ok: boolean;
    details?: string;
  }[];
  before?: EvidenceBundle;
  after: EvidenceBundle;
}

// ============================================================================
// Outcome Card
// ============================================================================

export type OutcomeStatus = "resolved" | "improved" | "unchanged" | "stopped" | "failed";

export interface OutcomeCard {
  status: OutcomeStatus;
  rootCause?: string;
  actionsTaken: {
    label: string;
    risk: Risk;
  }[];
  results: string[];
  preventionTips?: string[];
  confidence: number; // 0..1
}

// ============================================================================
// Transcript / Audit Log
// ============================================================================

export type TranscriptType =
  | "intent"
  | "plan"
  | "approval"
  | "exec"
  | "output"
  | "finding"
  | "diagnosis"
  | "verification"
  | "summary";

export interface TranscriptEvent {
  ts: string;
  type: TranscriptType;
  [key: string]: any;
}

// ============================================================================
// Rules Engine
// ============================================================================

export interface Rule {
  id: string;
  when: RuleExpression;
  emit: Omit<Finding, "id">; // evidenceRefs will be populated at emit time
}

export type RuleExpression =
  | { op: "gt"; lhs: string; rhs: number }
  | { op: "gte"; lhs: string; rhs: number }
  | { op: "lt"; lhs: string; rhs: number }
  | { op: "lte"; lhs: string; rhs: number }
  | { op: "eq"; lhs: string; rhs: number | string | boolean }
  | { op: "neq"; lhs: string; rhs: number | string | boolean }
  | { op: "and"; expressions: RuleExpression[] }
  | { op: "or"; expressions: RuleExpression[] }
  | { op: "exists"; path: string }
  | { op: "matches"; path: string; pattern: string };

// ============================================================================
// Playbook Definition
// ============================================================================

export interface Playbook {
  id: string; // e.g. "sys_hot_v1"
  name: string;
  version: string;
  triggers: string[]; // keywords and classifiers
  inspect: ToolStep[];
  interpret: Rule[];
  fixes: FixTemplate[];
  verify: ToolStep[];
  stopConditions?: StopCondition[];
}

export interface FixTemplate {
  id: string;
  label: string;
  why: string;
  risk: Risk;
  templateSteps: string[]; // command templates
  verification: string;
  rollback?: string[];
}

export interface StopCondition {
  when: RuleExpression;
  message: string;
  suggestedNext?: FixOption[];
}

// ============================================================================
// Command Normalization (Safety)
// ============================================================================

export interface NormalizedCommand {
  original: string;
  normalized: string;
  risk: Risk;
  timeoutMs: number;
  maxBytes: number;
  warnings?: string[];
}

// ============================================================================
// Engine Configuration
// ============================================================================

export interface DoctorConfig {
  platform: Platform;
  allowlist: RegExp[];
  maxReadTimeout: number;
  maxWriteTimeout: number;
  maxOutputBytes: number;
  strictMode: boolean;
}

// ============================================================================
// Collector Options
// ============================================================================

export interface CollectOptions {
  timeoutMs?: number;
  maxBytes?: number;
  abortSignal?: AbortSignal;
  streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void;
}
