/**
 * @rinawarp/core
 *
 * Enforcement spine for RinaWarp v1:
 * - ToolRegistry allowlist (authoritative)
 * - LicensePolicy gating (tier matrix)
 * - ConfirmationToken scope binding
 * - Single ExecutionEngine choke point
 * - EngineCap capability token (prevents bypass)
 * - verify enforcement
 */
export * from "./types.js";
export * from "./engine-cap.js";
import type { Tool, ToolCategory, LicenseTier, ConfirmationToken, PlanStep, ExecutionReport, ExecutionContext } from "./types.js";
/**
 * ToolRegistry: single authoritative allowlist for all tools.
 * Unknown tools are hard-blocked at execution time.
 */
export declare class ToolRegistry {
    private readonly tools;
    register(tool: Tool): void;
    get(name: string): Tool | undefined;
    has(name: string): boolean;
    list(): string[];
    /**
     * Register multiple tools at once (batch operation)
     */
    registerMany(tools: Tool[]): void;
}
/**
 * License matrix (v1 locked):
 * - starter/creator: no high-impact
 * - pro/pioneer: allow only deploy.prod among high-impact
 * - founder/enterprise: all tools
 */
export declare class LicensePolicy {
    static canUseTool(license: LicenseTier, tool: Tool): boolean;
    static getAllowedCategories(license: LicenseTier): ToolCategory[];
}
/**
 * ConfirmationPolicy: determines when explicit user confirmation is required.
 */
export declare class ConfirmationPolicy {
    static needsExplicitConfirmation(tool: Tool): boolean;
    static isTokenValidForStep(token: ConfirmationToken | undefined, step: PlanStep): boolean;
    static generateScope(action: string, target: string): string;
}
/**
 * ExecutionEngine: single choke point for all tool execution.
 *
 * Enforcement order:
 * 1. Registry allowlist check
 * 2. License gating before run
 * 3. Scoped explicit confirmation
 * 4. Tool execution with output surfacing
 * 5. Verification step enforcement
 */
export declare class ExecutionEngine {
    private readonly registry;
    constructor(registry: ToolRegistry);
    execute(plan: PlanStep[], ctx: ExecutionContext): Promise<ExecutionReport>;
}
