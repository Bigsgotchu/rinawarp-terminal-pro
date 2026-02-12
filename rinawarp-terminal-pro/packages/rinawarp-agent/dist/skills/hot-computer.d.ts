/**
 * Hot Computer Skill
 *
 * Diagnose and remediate overheating issues.
 *
 * This skill demonstrates the "Agent mindset" - it:
 * 1. Inspects system metrics (CPU, processes, thermal sensors)
 * 2. Proposes safe remediation steps
 * 3. Confirms before any destructive actions
 */
import type { AgentPlan } from "../types.ts";
/**
 * Create a plan to diagnose and fix an overheating computer.
 *
 * @returns An agent plan for diagnosing thermal issues
 */
export declare function planHotComputer(): AgentPlan;
/**
 * Parse diagnostic output and suggest fixes.
 * This would be used by the agent to generate recommendations.
 */
export interface DiagnosticResult {
    highCpuProcesses: string[];
    thermalWarning: boolean;
    diskFull: boolean;
    recommendations: string[];
}
/**
 * Simple parser for diagnostic results.
 * In a real implementation, this would use LLM or structured parsing.
 */
export declare function parseDiagnostics(results: Array<{
    command: string;
    output: string;
}>): DiagnosticResult;
