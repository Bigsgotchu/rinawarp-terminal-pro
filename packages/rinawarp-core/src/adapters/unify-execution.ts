/**
 * @rinawarp/core
 *
 * Unified execution adapter - routes all execution through the engine
 */

import type {
	ConfirmationToken,
	ExecutionContext,
	ExecutionReport,
	LicenseTier,
	PlanStep,
	ToolEvent,
} from "../enforcement/types.js";
import type { ExecutionEngine } from "../enforcement/index.js";

export function buildExecutionContext(args: {
	projectRoot: string;
	license: LicenseTier;
	confirmationToken?: ConfirmationToken;
	stopRequested?: boolean;
	emit?: (event: ToolEvent) => void;
}): ExecutionContext {
	const validTiers: LicenseTier[] = ["starter", "creator", "pro", "pioneer", "founder", "enterprise"];
	if (!validTiers.includes(args.license)) {
		throw new Error(`Invalid license tier: ${args.license}`);
	}

	return {
		projectRoot: args.projectRoot,
		license: args.license,
		confirmationToken: args.confirmationToken,
		stopRequested: args.stopRequested,
		emit: args.emit,
	};
}

export async function executeViaEngine(args: {
	engine: ExecutionEngine;
	plan: PlanStep[];
	projectRoot: string;
	license: LicenseTier;
	confirmationToken?: ConfirmationToken;
	stopRequested?: boolean;
	emit?: (event: ToolEvent) => void;
}): Promise<ExecutionReport> {
	const ctx = buildExecutionContext({
		projectRoot: args.projectRoot,
		license: args.license,
		confirmationToken: args.confirmationToken,
		stopRequested: args.stopRequested,
		emit: args.emit,
	});

	return args.engine.execute(args.plan, ctx);
}
