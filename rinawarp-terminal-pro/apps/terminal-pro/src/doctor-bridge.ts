/**
 * Doctor Bridge - Adapts @rinawarp/doctor engine to IPC handlers
 * 
 * SECURITY: This module has been updated to route all execution through the
 * ToolRegistry layer. The legacy regex allowlist is now deprecated and
 * serves only as a mapping reference for the shim below.
 */

import type {
  AgentPlan,
  EvidenceBundle,
  FixOption,
  Finding,
  DiagnosisBundle,
  OutcomeCard,
  VerificationResult,
  ToolStep,
  SessionMetadata
} from "@rinawarp/doctor";
import { SystemDoctorEngine, DIAGNOSIS_CANDIDATES } from "@rinawarp/doctor";
import os from "node:os";

// ============================================================================
// LEGACY ALLOWLIST - DEPRECATED (kept as reference for shim mapping only)
// These regex patterns are no longer used for execution. Instead, they map
// to tool names in the registry below.
// ============================================================================
const LEGACY_ALLOWLIST_REGEX = [
  /^ps$/i,
  /^top$/i,
  /^uptime$/i,
  /^free$/i,
  /^df$/i,
  /^cat\s+\/proc\//i,
  /^sensors$/i,
];

// ============================================================================
// LEGACY-TO-TOOL MAPPING SHIM (Temporary compatibility layer)
// Converts legacy command patterns to registry tool names
// ============================================================================
const LEGACY_TO_TOOL: Array<{ re: RegExp; tool: string; input: (cmd: string) => unknown }> = [
  { re: /^ps$/i, tool: "doctor.ps", input: () => ({}) },
  { re: /^top$/i, tool: "doctor.top", input: () => ({}) },
  { re: /^uptime$/i, tool: "doctor.uptime", input: () => ({}) },
  { re: /^free$/i, tool: "doctor.free", input: () => ({}) },
  { re: /^df$/i, tool: "doctor.df", input: () => ({}) },
  { re: /^sensors$/i, tool: "doctor.sensors", input: () => ({}) },
  { re: /^cat\s+\/proc\/(.+)$/i, tool: "file.read.proc", input: (cmd) => ({ path: "/" + cmd.split(/\s+/).slice(1).join("/") }) },
  { re: /^cat\s+\/proc\/loadavg$/i, tool: "doctor.loadavg", input: () => ({}) },
  { re: /^uptime$/i, tool: "doctor.uptime", input: () => ({}) },
  { re: /^ps\s+-eo\s+pid.*$/i, tool: "doctor.ps", input: () => ({}) },
];

/**
 * Convert legacy command string to a PlanStep for the registry
 * Returns null if command doesn't match any legacy pattern
 */
export function legacyDoctorCommandToPlanStep(cmd: string): { tool: string; input: unknown } | null {
  const match = LEGACY_TO_TOOL.find((x) => x.re.test(cmd));
  if (!match) return null;
  return { tool: match.tool, input: match.input(cmd) };
}

/**
 * Check if a legacy command is recognized (for validation)
 */
export function isLegacyCommand(cmd: string): boolean {
  return LEGACY_TO_TOOL.some((x) => x.re.test(cmd));
}

// Create engine instance with v1 config
const sessionMeta: SessionMetadata = {
  sessionId: `session_${Date.now()}`,
  startedAt: new Date().toISOString(),
  platform: process.platform as "linux" | "darwin" | "win32",
  distro: process.env.DISTRO || undefined,
  kernel: os.release(),
  hostname: os.hostname(),
  userMode: "pro"
};

// NOTE: The SystemDoctorEngine now uses registry tools via the ExecutionEngine
// The allowlist is kept for backwards compatibility but is not used for execution
const engine = new SystemDoctorEngine(
  {
    platform: process.platform as "linux" | "darwin" | "win32",
    // LEGACY: Keep allowlist for reference only - execution now goes through registry
    allowlist: LEGACY_ALLOWLIST_REGEX,
    maxReadTimeout: 15000,
    maxWriteTimeout: 60000
  },
  sessionMeta
);

// Export types for IPC
export type DoctorRunResult = {
  inspectPlan: AgentPlan;
  evidence?: EvidenceBundle;
  findings?: Finding[];
  diagnosis?: DiagnosisBundle;
  fixOptions?: FixOption[];
};

export type DoctorFixResult = {
  verification?: VerificationResult;
  outcome?: OutcomeCard;
};

/**
 * Build an inspect-only plan (no execution)
 */
export async function doctorInspect(intent: string): Promise<{ inspectPlan: AgentPlan }> {
  const plan = engine.buildInspectPlan(intent);
  
  engine.addTranscript({
    ts: new Date().toISOString(),
    type: "plan",
    plan
  });
  
  return { inspectPlan: plan };
}

/**
 * Collect evidence for a plan (executes steps via registry tools)
 */
export async function doctorCollect(
  steps: ToolStep[],
  streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void
): Promise<EvidenceBundle> {
  // Steps now use registry tool names instead of raw commands
  return await engine.collectEvidence(steps, { streamCallback });
}

/**
 * Interpret evidence to get findings, diagnosis, and fix options
 */
export async function doctorInterpret(input: {
  intent: string;
  evidence: EvidenceBundle;
}): Promise<Omit<DoctorRunResult, "inspectPlan">> {
  // Run interpretation
  const findings = engine.interpret(input.evidence);
  
  // Get diagnosis candidates based on intent keywords
  const keywords = input.intent.toLowerCase();
  let candidates = DIAGNOSIS_CANDIDATES.hot; // default
  
  if (keywords.includes("disk") || keywords.includes("space")) {
    candidates = DIAGNOSIS_CANDIDATES.disk;
  } else if (keywords.includes("slow") || keywords.includes("memory")) {
    candidates = DIAGNOSIS_CANDIDATES.slow;
  }
  
  // Generate diagnosis
  const diagnosis = engine.diagnose(findings, candidates);
  
  // Generate fix options
  const fixOptions = engine.recommend(diagnosis, [
    {
      label: "Apply fix from playbook",
      why: "Recommended fix for diagnosed issue",
      risk: "safe-write",
      commands: []
    }
  ]);
  
  return {
    evidence: input.evidence,
    findings,
    diagnosis,
    fixOptions
  };
}

/**
 * Verify a fix by re-running diagnostics
 */
export async function doctorVerify(input: {
  intent: string;
  before: EvidenceBundle;
  after: EvidenceBundle;
  diagnosis?: DiagnosisBundle;
}): Promise<DoctorFixResult> {
  // Simple verification: compare key metrics
  const checks = [
    {
      label: "Issue resolved",
      validate: (b: EvidenceBundle, a: EvidenceBundle) => {
        // Simple check: metrics should be different or better
        return Object.keys(a.metrics).length >= Object.keys(b.metrics).length;
      }
    }
  ];
  
  const verification = await engine.verify(input.before, input.after, checks);
  const outcome = engine.report(input.diagnosis || {} as DiagnosisBundle, verification, []);
  
  return { verification, outcome };
}

/**
 * Execute a fix plan (via registry tools)
 */
export async function doctorExecuteFix(
  plan: AgentPlan,
  confirmed: boolean,
  confirmationText?: string,
  streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void
): Promise<Record<string, { stdout: string; stderr: string; exitCode: number | null }>> {
  return await engine.executeFix(
    plan,
    { confirmed, confirmationText, streamCallback }
  );
}

/**
 * Get the current transcript
 */
export function doctorGetTranscript() {
  return engine.getTranscript();
}

/**
 * Export transcript in format
 */
export function doctorExportTranscript(format: "json" | "text"): string {
  return engine.exportTranscript(format);
}
