/**
 * RinaWarp Agent Types
 *
 * Core type definitions for agent plans, tool calls, and execution.
 */
import type { RiskLevel } from "@rinawarp/safety";
/**
 * Available tool names in the RinaWarp agent system.
 */
export type ToolName = "terminal" | "filesystem" | "git" | "http" | "system";
/**
 * A single tool call in an agent plan.
 */
export interface ToolCall {
    /** The tool to execute */
    tool: ToolName;
    /** The command or operation to perform */
    command: string;
    /** Additional arguments for the tool */
    args?: Record<string, unknown>;
    /** Risk level - auto-classified if not provided */
    risk?: RiskLevel;
    /** Human-readable description of what this step does */
    description?: string;
}
/**
 * An agent plan containing multiple tool call steps.
 */
export interface AgentPlan {
    /** The user's intent that prompted this plan */
    intent: string;
    /** Brief summary of what the plan accomplishes */
    summary: string;
    /** Ordered list of steps to execute */
    steps: ToolCall[];
    /** Optional metadata about the plan */
    metadata?: {
        /** Estimated time to complete in seconds */
        estimatedTimeSeconds?: number;
        /** Whether this plan requires user confirmation */
        requiresConfirmation?: boolean;
        /** Tags for categorizing the plan */
        tags?: string[];
    };
}
/**
 * Result of executing a single tool call.
 */
export interface StepResult {
    /** The step that was executed */
    step: ToolCall;
    /** Whether the step succeeded */
    ok: boolean;
    /** Output from successful execution */
    output?: string;
    /** Error message if execution failed */
    error?: string;
}
/**
 * Result of executing a complete plan.
 */
export interface PlanResult {
    /** The original plan that was executed */
    plan: AgentPlan;
    /** Results for each step in order */
    results: StepResult[];
    /** Whether the entire plan completed successfully */
    success: boolean;
    /** Overall summary of what happened */
    summary: string;
    /** Total time spent executing in milliseconds */
    executionTimeMs: number;
}
/**
 * Function type for confirming risky operations.
 */
export type ConfirmFn = (step: ToolCall) => Promise<boolean>;
/**
 * Function type for logging agent activity.
 */
export type LoggerFn = (message: string, level: "info" | "warn" | "error") => void;
/**
 * User context available to the agent.
 */
export interface UserContext {
    /** User's preferred working directory */
    workingDirectory?: string;
    /** User's name for personalized messages */
    userName?: string;
    /** User's timezone */
    timezone?: string;
    /** Operating system platform */
    platform?: "linux" | "darwin" | "win32";
    /** User preferences for auto-confirmation */
    autoConfirmLowRisk?: boolean;
}
/**
 * Workspace context for the agent.
 */
export interface WorkspaceContext {
    /** Path to the workspace root */
    rootPath: string;
    /** Git repository info if available */
    git?: {
        branch: string;
        isRepo: boolean;
        remote?: string;
    };
    /** Package manager detected */
    packageManager?: "npm" | "yarn" | "pnpm" | "bun" | "cargo";
    /** Project type if detectable */
    projectType?: "node" | "rust" | "python" | "go" | "unknown";
}
