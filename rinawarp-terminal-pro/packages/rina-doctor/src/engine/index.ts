/**
 * System Doctor Engine - Main Pipeline
 * Implements: Intake -> Triage -> Inspect -> Collect -> Interpret -> Diagnose -> Recommend -> Gate -> Execute -> Verify -> Report
 */

import type {
  SessionMetadata,
  TranscriptEvent,
  ToolStep,
  AgentPlan,
  EvidenceBundle,
  Finding,
  Diagnosis,
  DiagnosisBundle,
  FixOption,
  VerificationResult,
  OutcomeCard,
  Risk,
  Rule
} from "../types/index.js";
import { generateFindings, scoreDiagnoses, ruleRegistry, COMMON_RULES, type DiagnosisCandidate } from "../rules/engine.js";
import { systemParser } from "../parser/index.js";
import { normalizeCommand, classifyRisk, isAllowed } from "../collector/normalizer.js";

export interface DoctorConfig {
  platform: "linux" | "darwin" | "win32";
  allowlist: RegExp[];
  maxReadTimeout: number;
  maxWriteTimeout: number;
}

export interface TriageResult {
  matchedPlaybook?: string;
  symptomKeywords: string[];
  suggestedSteps: ToolStep[];
}

export interface ExecuteOptions {
  confirmed: boolean;
  confirmationText?: string;
  streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void;
}

export class SystemDoctorEngine {
  private config: DoctorConfig;
  private transcript: TranscriptEvent[] = [];
  private sessionMeta: SessionMetadata;

  constructor(config: DoctorConfig, sessionMeta: SessionMetadata) {
    this.config = config;
    this.sessionMeta = sessionMeta;
  }

  /**
   * Stage 1: Intake - Capture user intent
   */
  intake(intent: string): void {
    this.addTranscript({
      ts: new Date().toISOString(),
      type: "intent",
      text: intent
    });
  }

  /**
   * Stage 2: Triage - Classify symptom
   */
  triage(intent: string): TriageResult {
    const keywords: string[] = [];
    const symptomPatterns: Record<string, string[]> = {
      hot: ["hot", "running hot", "temperature", "overheat", "fan", "thermal", "cpu hot"],
      slow: ["slow", "lag", "performance", "speed", "responsive"],
      disk: ["disk", "space", "full", "storage", "capacity"],
      memory: ["memory", "ram", "leak", "swapping", "oom"],
      network: ["network", "wifi", "internet", "connection", "port"],
      docker: ["docker", "container", "image"],
      build: ["build", "compile", "error", "failed"]
    };

    const lowerIntent = intent.toLowerCase();

    for (const [symptom, patterns] of Object.entries(symptomPatterns)) {
      if (patterns.some(p => lowerIntent.includes(p))) {
        keywords.push(symptom);
      }
    }

    const suggestedSteps: ToolStep[] = this.getBaseInspectSteps();

    if (keywords.includes("hot") || keywords.includes("slow")) {
      suggestedSteps.push({
        id: "sensors",
        tool: "terminal",
        command: "sensors",
        risk: "read",
        description: "Temperature sensors"
      });
    }

    if (keywords.includes("disk") || keywords.includes("space")) {
      suggestedSteps.push({
        id: "df",
        tool: "terminal",
        command: "df -h",
        risk: "read",
        description: "Disk usage"
      });
    }

    return {
      matchedPlaybook: keywords[0] || "general",
      symptomKeywords: keywords,
      suggestedSteps
    };
  }

  /**
   * Stage 3: Build Inspect Plan
   */
  buildInspectPlan(intent: string, playbookId?: string): AgentPlan {
    const triage = this.triage(intent);

    return {
      id: `inspect_${Date.now()}`,
      intent,
      playbookId: playbookId || triage.matchedPlaybook,
      stage: "inspect",
      reasoning: `Inspecting system to diagnose: ${triage.symptomKeywords.join(", ") || "general check"}`,
      steps: triage.suggestedSteps
    };
  }

  /**
   * Stage 4: Collect Evidence
   */
  async collectEvidence(
    steps: ToolStep[],
    options?: { streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void }
  ): Promise<EvidenceBundle> {
    const outputs: Record<string, { stdout: string; stderr: string; exitCode: number | null }> = {};

    for (const step of steps) {
      const normalized = normalizeCommand(step.command);

      if (!isAllowed(step.command, this.config.allowlist)) {
        outputs[step.id] = {
          stdout: "",
          stderr: "Command not in allowlist",
          exitCode: -1
        };
        continue;
      }

      try {
        const output = await this.executeCommand(
          normalized.normalized,
          step.risk === "read" ? this.config.maxReadTimeout : this.config.maxWriteTimeout,
          options?.streamCallback
        );

        outputs[step.id] = {
          stdout: output.stdout,
          stderr: output.stderr,
          exitCode: output.exitCode
        };

        this.addTranscript({
          ts: new Date().toISOString(),
          type: "exec",
          stepId: step.id,
          command: step.command,
          risk: step.risk
        });

        this.addTranscript({
          ts: new Date().toISOString(),
          type: "output",
          stepId: step.id,
          stream: "stdout",
          data: output.stdout.slice(0, 1000)
        });
      } catch (e) {
        outputs[step.id] = {
          stdout: "",
          stderr: String(e),
          exitCode: -1
        };
      }
    }

    return systemParser.buildEvidence(outputs);
  }

  /**
   * Stage 5: Interpret - Run rules
   */
  interpret(evidence: EvidenceBundle, rules?: Rule[]): Finding[] {
    const applicableRules = rules || ruleRegistry.getAllRules();
    const stepOutputs: Record<string, { stdout: string; stderr: string }> = {};

    for (const [key, value] of Object.entries(evidence.raw)) {
      stepOutputs[key] = {
        stdout: value.stdout,
        stderr: value.stderr
      };
    }

    const findings = generateFindings(applicableRules, evidence, stepOutputs);

    for (const finding of findings) {
      this.addTranscript({
        ts: new Date().toISOString(),
        type: "finding",
        finding
      });
    }

    return findings;
  }

  /**
   * Stage 6: Diagnose - Generate differential
   */
  diagnose(
    findings: Finding[],
    candidates: Array<{ causeId: string; label: string; supporting: string[]; disconfirming?: string[] }>
  ): DiagnosisBundle {
    const scored = scoreDiagnoses(findings, candidates.map(c => ({
      ...c,
      score: 0,
      supporting: c.supporting,
      disconfirming: c.disconfirming || []
    })));

    const diagnosisBundle: DiagnosisBundle = {
      primary: {
        causeId: scored.primary.causeId,
        label: scored.primary.label,
        probability: scored.primary.score,
        supportingFindings: scored.primary.supporting,
        disconfirmingFindings: scored.primary.disconfirming
      },
      differential: scored.differential.map(d => ({
        causeId: d.causeId,
        label: d.label,
        probability: d.score,
        supportingFindings: d.supporting,
        disconfirmingFindings: d.disconfirming
      })),
      notes: this.generateDiagnosisNotes(scored.primary, findings)
    };

    this.addTranscript({
      ts: new Date().toISOString(),
      type: "diagnosis",
      diagnosis: diagnosisBundle
    });

    return diagnosisBundle;
  }

  /**
   * Stage 7: Recommend - Generate fix options
   */
  recommend(
    diagnosis: DiagnosisBundle,
    fixOptions: Array<{
      label: string;
      why: string;
      risk: Risk;
      commands: string[];
    }>
  ): FixOption[] {
    const options: FixOption[] = fixOptions.map((opt, i) => ({
      id: `fix_${i}`,
      label: opt.label,
      why: opt.why,
      risk: opt.risk,
      plan: {
        id: `fix_plan_${Date.now()}_${i}`,
        intent: diagnosis.primary.label,
        playbookId: diagnosis.primary.causeId,
        stage: "fix",
        reasoning: opt.why,
        steps: opt.commands.map((cmd, j) => ({
          id: `fix_${i}_s${j}`,
          tool: "terminal",
          command: cmd,
          risk: opt.risk,
          description: opt.label
        }))
      },
      expectedOutcome: [`Resolve ${diagnosis.primary.label}`]
    }));

    const riskOrder: Record<Risk, number> = { read: 0, "safe-write": 1, "high-impact": 2 };
    options.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    return options;
  }

  /**
   * Stage 8: Gate - Require confirmation
   */
  gate(step: ToolStep, confirmed: boolean, confirmationText?: string): boolean {
    if (step.risk === "read") return true;
    if (step.risk === "safe-write" && !confirmed) return false;
    if (step.risk === "high-impact") {
      if (!confirmed || confirmationText !== "YES") return false;
    }
    return true;
  }

  /**
   * Stage 9: Execute Fix
   */
  async executeFix(
    plan: AgentPlan,
    options: ExecuteOptions
  ): Promise<Record<string, { stdout: string; stderr: string; exitCode: number | null }>> {
    const results: Record<string, { stdout: string; stderr: string; exitCode: number | null }> = {};

    for (const step of plan.steps) {
      if (!this.gate(step, options.confirmed, options.confirmationText)) {
        this.addTranscript({
          ts: new Date().toISOString(),
          type: "approval",
          stepId: step.id,
          approved: false
        });
        throw new Error(`Gate denied for step ${step.id}: ${step.risk} risk requires confirmation`);
      }

      this.addTranscript({
        ts: new Date().toISOString(),
        type: "approval",
        stepId: step.id,
        approved: true,
        typed: options.confirmationText
      });

      try {
        const output = await this.executeCommand(
          step.command,
          this.config.maxWriteTimeout,
          options.streamCallback
        );

        results[step.id] = {
          stdout: output.stdout,
          stderr: output.stderr,
          exitCode: output.exitCode
        };

        this.addTranscript({
          ts: new Date().toISOString(),
          type: "exec",
          stepId: step.id,
          command: step.command,
          risk: step.risk
        });
      } catch (e) {
        results[step.id] = {
          stdout: "",
          stderr: String(e),
          exitCode: -1
        };
      }
    }

    return results;
  }

  /**
   * Stage 10: Verify
   */
  async verify(
    before: EvidenceBundle,
    after: EvidenceBundle,
    checks: Array<{ label: string; validate: (b: EvidenceBundle, a: EvidenceBundle) => boolean }>
  ): Promise<VerificationResult> {
    const checkResults = checks.map(check => ({
      label: check.label,
      ok: check.validate(before, after)
    }));

    const result: VerificationResult = {
      ok: checkResults.every(r => r.ok),
      checks: checkResults,
      before,
      after
    };

    this.addTranscript({
      ts: new Date().toISOString(),
      type: "verification",
      verification: result
    });

    return result;
  }

  /**
   * Stage 11: Report - Generate outcome card
   */
  report(
    diagnosis: DiagnosisBundle,
    verification: VerificationResult,
    actions: Array<{ label: string; risk: Risk }>
  ): OutcomeCard {
    let status: OutcomeCard["status"] = "resolved";
    let confidence = diagnosis.primary.probability;

    if (!verification.ok) {
      status = verification.checks.every(r => r.ok) ? "unchanged" : "failed";
      confidence *= 0.5;
    } else if (verification.ok && verification.checks.some(r => !r.ok)) {
      status = "improved";
      confidence *= 0.8;
    }

    const outcome: OutcomeCard = {
      status,
      rootCause: diagnosis.primary.label,
      actionsTaken: actions,
      results: verification.checks.map(c => `${c.label}: ${c.ok ? "OK" : "Failed"}`),
      preventionTips: this.generatePreventionTips(diagnosis),
      confidence
    };

    this.addTranscript({
      ts: new Date().toISOString(),
      type: "summary",
      summary: outcome
    });

    return outcome;
  }

  // Transcript Management
  addTranscript(event: TranscriptEvent): void {
    this.transcript.push(event);
  }

  getTranscript(): TranscriptEvent[] {
    return [...this.transcript];
  }

  exportTranscript(format: "json" | "text"): string {
    if (format === "json") {
      return JSON.stringify({
        session: this.sessionMeta,
        transcript: this.transcript
      }, null, 2);
    }

    let text = `RinaWarp System Doctor Report\n`;
    text += `${"=".repeat(50)}\n`;
    text += `Session: ${this.sessionMeta.sessionId}\n`;
    text += `Started: ${this.sessionMeta.startedAt}\n\n`;

    for (const event of this.transcript) {
      text += `\n[${event.type.toUpperCase()}] ${event.ts}\n`;
      text += `${JSON.stringify(event, null, 2)}\n`;
    }

    return text;
  }

  // Private helpers
  private getBaseInspectSteps(): ToolStep[] {
    return [
      { id: "uptime", tool: "terminal", command: "uptime", risk: "read", description: "Load average" },
      { id: "loadavg", tool: "terminal", command: "cat /proc/loadavg", risk: "read", description: "Load details" },
      { id: "ps", tool: "terminal", command: "ps -eo pid,ppid,pcpu,pmem,comm --sort=-pcpu | head -n 20", risk: "read", description: "Top processes" },
      { id: "free", tool: "terminal", command: "free -h", risk: "read", description: "Memory usage" },
      { id: "df", tool: "terminal", command: "df -h", risk: "read", description: "Disk usage" }
    ];
  }

  private async executeCommand(
    command: string,
    timeoutMs: number,
    streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return { stdout: "", stderr: "", exitCode: 0 };
  }

  private generateDiagnosisNotes(primary: DiagnosisCandidate, findings: Finding[]): string {
    if (findings.length === 0) {
      return "No significant issues detected.";
    }

    const critical = findings.filter(f => f.severity === "critical");
    const warnings = findings.filter(f => f.severity === "warn");

    let notes = "";
    if (critical.length > 0) {
      notes += `Critical: ${critical.map(f => f.title).join(", ")}. `;
    }
    if (warnings.length > 0) {
      notes += `Warnings: ${warnings.map(f => f.title).join(", ")}.`;
    }

    return notes || "Issues detected. Review findings for details.";
  }

  private generatePreventionTips(diagnosis: DiagnosisBundle): string[] {
    const tips: string[] = [];

    if (diagnosis.primary.causeId.includes("disk")) {
      tips.push("Monitor disk usage weekly");
      tips.push("Set up automated cleanup for temporary files");
    }
    if (diagnosis.primary.causeId.includes("memory")) {
      tips.push("Monitor memory usage with alerts");
      tips.push("Consider adding RAM if consistently high");
    }
    if (diagnosis.primary.causeId.includes("thermal")) {
      tips.push("Clean dust from vents regularly");
      tips.push("Ensure proper ventilation");
    }

    return tips;
  }
}

// Common diagnosis candidates
export const DIAGNOSIS_CANDIDATES = {
  hot: [
    { causeId: "cpu_runaway", label: "Runaway CPU process", supporting: ["runaway_process", "High CPU Load"] },
    { causeId: "thermal_hardware", label: "Hardware thermal issue", supporting: ["High Temperature"] },
    { causeId: "fan_blocked", label: "Blocked cooling fan", supporting: ["High Temperature"] }
  ],
  slow: [
    { causeId: "high_memory", label: "High memory usage", supporting: ["High Memory Usage"] },
    { causeId: "disk_io", label: "Disk I/O bottleneck", supporting: ["High CPU Load"] },
    { causeId: "cpu_pressure", label: "CPU pressure", supporting: ["High CPU Load"] }
  ],
  disk: [
    { causeId: "log_bloat", label: "Large log files", supporting: ["Disk Nearly Full"] },
    { causeId: "temp_files", label: "Temporary files accumulation", supporting: ["Disk Nearly Full"] },
    { causeId: "docker_bloat", label: "Docker data accumulation", supporting: ["Disk Nearly Full"] }
  ]
};
