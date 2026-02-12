/**
 * @rinawarp/core
 *
 * Pure types for enforcement - no imports from tools/registry to avoid cycles.
 * All tool implementations should import from this file.
 */

export type ToolCategory = "read" | "safe-write" | "high-impact" | "planning";
export type LicenseTier = "starter" | "creator" | "pro" | "pioneer" | "founder" | "enterprise";

export type ToolResult =
	| { success: true; output: string; meta?: Record<string, unknown> }
	| { success: false; error: string; output?: string; meta?: Record<string, unknown> };

export type FailureClass =
	| "permission_denied"
	| "tool_unavailable"
	| "command_error"
	| "timeout"
	| "partial_execution";

export interface ExecutionContext {
	projectRoot: string;
	license: LicenseTier;
	confirmationToken?: ConfirmationToken;
	stopRequested?: boolean;
	emit?: (event: ToolEvent) => void;
}

export type ToolEvent =
	| { type: "chunk"; stream: "stdout" | "stderr"; data: string; stepId?: string }
	| { type: "done"; stepId?: string }
	| { type: "cancel"; streamId?: string; stepId?: string; command?: string; reason: "soft" | "timeout" };

export interface ConfirmationToken {
	kind: "explicit";
	approved: boolean;
	scope: string; // must match step.confirmationScope exactly
}

export interface PlanStep {
	tool: string;
	input: unknown;
	description?: string;
	stepId?: string;
	risk_level?: "low" | "medium" | "high";
	requires_confirmation?: boolean;
	verification_plan?: {
		steps: Array<{ tool: string; input: unknown }>;
	};
	confirmationScope?: string;
	verify?: Array<{ tool: string; input: unknown }>;
}

export interface ExecutionReport {
	ok: boolean;
	haltedBecause?:
		| "stop_requested"
		| "invalid_plan"
		| "unknown_tool"
		| "license_block"
		| "confirmation_required"
		| "verification_failed"
		| FailureClass;
	steps: Array<{
		step: PlanStep;
		startedAt: number;
		finishedAt: number;
		result: ToolResult;
		failure_class?: FailureClass;
		audit: {
			tool: string;
			input_redacted: unknown;
			risk_level?: "low" | "medium" | "high";
			requires_confirmation?: boolean;
		};
		verification?: Array<{ tool: string; result: ToolResult }>;
	}>;
}

/**
 * Tool interface - used by tool implementations.
 * EngineCap is typed as unknown here to avoid importing engine-cap.js from tools.
 */
export interface Tool<Input = unknown> {
	name: string;
	category: ToolCategory;
	requiresConfirmation: boolean;
	run(input: Input, ctx: ExecutionContext, cap: unknown): Promise<ToolResult>;
}
