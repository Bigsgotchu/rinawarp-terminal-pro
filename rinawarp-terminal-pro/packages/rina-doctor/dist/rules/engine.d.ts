/**
 * Rules Engine - Deterministic Finding Generation
 */
import type { Rule, RuleExpression, Finding, EvidenceBundle } from "../types/index.ts";
export type SeverityLevel = "info" | "warn" | "critical";
export interface DiagnosisCandidate {
    causeId: string;
    label: string;
    score: number;
    supporting: string[];
    disconfirming: string[];
}
export declare function evaluateExpression(expr: RuleExpression, metrics: Record<string, any>): boolean;
export declare function generateFindings(rules: Rule[], evidence: EvidenceBundle, stepOutputs: Record<string, {
    stdout: string;
    stderr: string;
}>): Finding[];
export interface DiagnosisCandidate {
    causeId: string;
    label: string;
    score: number;
    supporting: string[];
    disconfirming: string[];
    nextProbes?: {
        command: string;
        reason: string;
    }[];
}
export declare function scoreDiagnoses(findings: Finding[], candidates: DiagnosisCandidate[]): {
    primary: DiagnosisCandidate;
    differential: DiagnosisCandidate[];
};
export declare function createRule(id: string, when: RuleExpression, severity: SeverityLevel, title: string, explanation: string, options?: {
    confidence?: number;
    stepId?: string;
    metricKey?: string;
}): Rule;
export declare const COMMON_RULES: Rule[];
export declare class RuleRegistry {
    private rules;
    addRule(rule: Rule): void;
    getRule(id: string): Rule | undefined;
    getAllRules(): Rule[];
    loadRules(rules: Rule[]): void;
}
export declare const ruleRegistry: RuleRegistry;
//# sourceMappingURL=engine.d.ts.map