/**
 * Command Normalizer - Safety Guardrails
 * Ensures all commands are bounded and safe
 */
import type { NormalizedCommand, Risk } from "../types/index.ts";
export declare function normalizeCommand(command: string): NormalizedCommand;
export declare function isAllowed(command: string, allowlist: RegExp[]): boolean;
export declare function classifyRisk(command: string): Risk;
export declare function estimateOutputSize(command: string): number;
//# sourceMappingURL=normalizer.d.ts.map