/**
 * System Doctor Engine - Main Pipeline
 * Implements: Intake -> Triage -> Inspect -> Collect -> Interpret -> Diagnose -> Recommend -> Gate -> Execute -> Verify -> Report
 */
import type { SessionMetadata, TranscriptEvent, ToolStep, AgentPlan, EvidenceBundle, Finding, DiagnosisBundle, FixOption, VerificationResult, OutcomeCard, Risk, Rule } from "../types/index.js";
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
export declare class SystemDoctorEngine {
    private config;
    private transcript;
    private sessionMeta;
    constructor(config: DoctorConfig, sessionMeta: SessionMetadata);
    /**
     * Stage 1: Intake - Capture user intent
     */
    intake(intent: string): void;
    /**
     * Stage 2: Triage - Classify symptom
     */
    triage(intent: string): TriageResult;
    /**
     * Stage 3: Build Inspect Plan
     */
    buildInspectPlan(intent: string, playbookId?: string): AgentPlan;
    /**
     * Stage 4: Collect Evidence
     */
    collectEvidence(steps: ToolStep[], options?: {
        streamCallback?: (chunk: string, stream: "stdout" | "stderr") => void;
    }): Promise<EvidenceBundle>;
    /**
     * Stage 5: Interpret - Run rules
     */
    interpret(evidence: EvidenceBundle, rules?: Rule[]): Finding[];
    /**
     * Stage 6: Diagnose - Generate differential
     */
    diagnose(findings: Finding[], candidates: Array<{
        causeId: string;
        label: string;
        supporting: string[];
        disconfirming?: string[];
    }>): DiagnosisBundle;
    /**
     * Stage 7: Recommend - Generate fix options
     */
    recommend(diagnosis: DiagnosisBundle, fixOptions: Array<{
        label: string;
        why: string;
        risk: Risk;
        commands: string[];
    }>): FixOption[];
    /**
     * Stage 8: Gate - Require confirmation
     */
    gate(step: ToolStep, confirmed: boolean, confirmationText?: string): boolean;
    /**
     * Stage 9: Execute Fix
     */
    executeFix(plan: AgentPlan, options: ExecuteOptions): Promise<Record<string, {
        stdout: string;
        stderr: string;
        exitCode: number | null;
    }>>;
    /**
     * Stage 10: Verify
     */
    verify(before: EvidenceBundle, after: EvidenceBundle, checks: Array<{
        label: string;
        validate: (b: EvidenceBundle, a: EvidenceBundle) => boolean;
    }>): Promise<VerificationResult>;
    /**
     * Stage 11: Report - Generate outcome card
     */
    report(diagnosis: DiagnosisBundle, verification: VerificationResult, actions: Array<{
        label: string;
        risk: Risk;
    }>): OutcomeCard;
    addTranscript(event: TranscriptEvent): void;
    getTranscript(): TranscriptEvent[];
    exportTranscript(format: "json" | "text"): string;
    private getBaseInspectSteps;
    private executeCommand;
    private generateDiagnosisNotes;
    private generatePreventionTips;
}
export declare const DIAGNOSIS_CANDIDATES: {
    hot: {
        causeId: string;
        label: string;
        supporting: string[];
    }[];
    slow: {
        causeId: string;
        label: string;
        supporting: string[];
    }[];
    disk: {
        causeId: string;
        label: string;
        supporting: string[];
    }[];
};
//# sourceMappingURL=index.d.ts.map