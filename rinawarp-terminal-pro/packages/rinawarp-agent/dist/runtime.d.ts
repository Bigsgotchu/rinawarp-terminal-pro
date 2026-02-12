/**
 * RinaWarp Agent Runtime
 *
 * Core execution engine for running agent plans with safety checks.
 */
import type { AgentPlan, ToolCall, PlanResult, ConfirmFn, LoggerFn, UserContext, WorkspaceContext } from "./types.ts";
import { type RiskLevel } from "@rinawarp/safety";
export interface RuntimeOptions {
    /** User confirmation callback for risky operations */
    confirm?: ConfirmFn;
    /** Logger for runtime events */
    logger?: LoggerFn;
    /** User context for personalized execution */
    userContext?: UserContext;
    /** Workspace context for tool execution */
    workspaceContext?: WorkspaceContext;
    /** Whether to abort on first error (default: true) */
    abortOnError?: boolean;
    /** Default timeout for commands in ms (default: 60000) */
    defaultTimeoutMs?: number;
}
/**
 * Execute an agent plan with safety checks and confirmation.
 *
 * @param plan - The plan to execute
 * @param options - Runtime configuration options
 * @returns Promise resolving to the plan execution result
 */
export declare function runPlan(plan: AgentPlan, options?: RuntimeOptions): Promise<PlanResult>;
/**
 * Create a confirmation prompt message for a tool call.
 *
 * @param step - The step to confirm
 * @param userName - Optional user name for personalization
 * @returns Formatted confirmation message
 */
export declare function createConfirmationMessage(step: ToolCall, userName?: string): string;
/**
 * Validate that a plan is well-formed.
 *
 * @param plan - The plan to validate
 * @returns Array of validation errors (empty if valid)
 */
export declare function validatePlan(plan: AgentPlan): string[];
/**
 * Estimate the total risk level of a plan.
 *
 * @param plan - The plan to analyze
 * @returns The highest risk level in the plan
 */
export declare function estimatePlanRisk(plan: AgentPlan): RiskLevel;
