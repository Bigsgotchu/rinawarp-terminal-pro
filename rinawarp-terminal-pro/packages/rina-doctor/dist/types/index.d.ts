/**
 * System Doctor Diagnostic Engine - Core Types
 * Following the v1 specification
 */
export type Risk = "read" | "safe-write" | "high-impact";
export type Platform = "linux" | "darwin" | "win32";
export type UserMode = "starter" | "creator" | "pro" | "founder" | "enterprise";
export interface SessionMetadata {
    sessionId: string;
    startedAt: string;
    platform: Platform;
    distro?: string;
    kernel?: string;
    hostname?: string;
    userMode: UserMode;
}
export interface ToolStep {
    id: string;
    tool: "terminal" | "fs" | "git";
    command: string;
    risk: Risk;
    description?: string;
    timeoutMs?: number;
    maxBytes?: number;
    normalize?: "kv" | "table" | "json" | "raw";
    tags?: string[];
}
export interface AgentPlan {
    id: string;
    intent: string;
    playbookId?: string;
    stage: "inspect" | "fix" | "verify";
    reasoning: string;
    steps: ToolStep[];
}
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
    confidence: number;
}
export interface Diagnosis {
    causeId: string;
    label: string;
    probability: number;
    supportingFindings: string[];
    disconfirmingFindings?: string[];
    nextProbes?: ToolStep[];
}
export interface DiagnosisBundle {
    primary: Diagnosis;
    differential: Diagnosis[];
    notes: string;
}
export interface FixOption {
    id: string;
    label: string;
    why: string;
    risk: Risk;
    plan: AgentPlan;
    expectedOutcome: string[];
    rollback?: AgentPlan;
}
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
    confidence: number;
}
export type TranscriptType = "intent" | "plan" | "approval" | "exec" | "output" | "finding" | "diagnosis" | "verification" | "summary";
export interface TranscriptEvent {
    ts: string;
    type: TranscriptType;
    [key: string]: any;
}
export interface Rule {
    id: string;
    when: RuleExpression;
    emit: Omit<Finding, "id">;
}
export type RuleExpression = {
    op: "gt";
    lhs: string;
    rhs: number;
} | {
    op: "gte";
    lhs: string;
    rhs: number;
} | {
    op: "lt";
    lhs: string;
    rhs: number;
} | {
    op: "lte";
    lhs: string;
    rhs: number;
} | {
    op: "eq";
    lhs: string;
    rhs: number | string | boolean;
} | {
    op: "neq";
    lhs: string;
    rhs: number | string | boolean;
} | {
    op: "and";
    expressions: RuleExpression[];
} | {
    op: "or";
    expressions: RuleExpression[];
} | {
    op: "exists";
    path: string;
} | {
    op: "matches";
    path: string;
    pattern: string;
};
export interface Playbook {
    id: string;
    name: string;
    version: string;
    triggers: string[];
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
    templateSteps: string[];
    verification: string;
    rollback?: string[];
}
export interface StopCondition {
    when: RuleExpression;
    message: string;
    suggestedNext?: FixOption[];
}
export interface NormalizedCommand {
    original: string;
    normalized: string;
    risk: Risk;
    timeoutMs: number;
    maxBytes: number;
    warnings?: string[];
}
export interface DoctorConfig {
    platform: Platform;
    allowlist: RegExp[];
    maxReadTimeout: number;
    maxWriteTimeout: number;
    maxOutputBytes: number;
    strictMode: boolean;
}
export interface CollectOptions {
    timeoutMs?: number;
    maxBytes?: number;
    abortSignal?: AbortSignal;
    streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void;
}
//# sourceMappingURL=index.d.ts.map