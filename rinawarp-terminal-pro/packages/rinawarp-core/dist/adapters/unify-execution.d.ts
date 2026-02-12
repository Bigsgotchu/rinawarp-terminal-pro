/**
 * @rinawarp/core
 *
 * Unified execution adapter - routes all execution through the engine
 */
import type { ConfirmationToken, ExecutionContext, ExecutionReport, LicenseTier, PlanStep, ToolEvent } from "../enforcement/types.js";
import type { ExecutionEngine } from "../enforcement/index.js";
export declare function buildExecutionContext(args: {
    projectRoot: string;
    license: LicenseTier;
    confirmationToken?: ConfirmationToken;
    stopRequested?: boolean;
    emit?: (event: ToolEvent) => void;
}): ExecutionContext;
export declare function executeViaEngine(args: {
    engine: ExecutionEngine;
    plan: PlanStep[];
    projectRoot: string;
    license: LicenseTier;
    confirmationToken?: ConfirmationToken;
    stopRequested?: boolean;
    emit?: (event: ToolEvent) => void;
}): Promise<ExecutionReport>;
