/**
 * RinaWarp Safety Policy
 *
 * Risk classification for agent tool calls.
 * This is your moat - the safety layer that prevents dangerous operations.
 */
export type RiskLevel = "low" | "medium" | "high";
/**
 * Classify the risk level of a command string.
 *
 * @param command - The command string to classify
 * @returns The risk level: "low", "medium", or "high"
 */
export declare function classifyRisk(command: string): RiskLevel;
/**
 * Determine if a risk level requires user confirmation.
 *
 * @param risk - The risk level to check
 * @returns True if the operation requires confirmation
 */
export declare function requiresConfirmation(risk: RiskLevel): boolean;
/**
 * Get a human-readable description of why a command is flagged.
 *
 * @param command - The command string to analyze
 * @returns A description of the risk, or null if low risk
 */
export declare function getRiskDescription(command: string): string | null;
/**
 * Check if a command is safe to execute automatically.
 *
 * @param command - The command to check
 * @returns Object with isSafe flag and risk details
 */
export declare function analyzeCommand(command: string): {
    isSafe: boolean;
    risk: RiskLevel;
    requiresConfirm: boolean;
    description: string | null;
};
