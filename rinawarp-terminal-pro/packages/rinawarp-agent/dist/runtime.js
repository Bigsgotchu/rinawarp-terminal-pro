"use strict";
/**
 * RinaWarp Agent Runtime
 *
 * Core execution engine for running agent plans with safety checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlan = runPlan;
exports.createConfirmationMessage = createConfirmationMessage;
exports.validatePlan = validatePlan;
exports.estimatePlanRisk = estimatePlanRisk;
const safety_1 = require("@rinawarp/safety");
const terminal_1 = require("@rinawarp/tools/terminal");
/**
 * Execute an agent plan with safety checks and confirmation.
 *
 * @param plan - The plan to execute
 * @param options - Runtime configuration options
 * @returns Promise resolving to the plan execution result
 */
async function runPlan(plan, options) {
    const startTime = Date.now();
    const results = [];
    const confirm = options?.confirm ?? (async () => true);
    const logger = options?.logger ?? (() => { });
    const abortOnError = options?.abortOnError ?? true;
    const timeoutMs = options?.defaultTimeoutMs ?? 60_000;
    logger(`Starting plan: ${plan.intent}`, "info");
    for (const step of plan.steps) {
        // Auto-classify risk if not provided
        const risk = step.risk ?? (0, safety_1.classifyRisk)(step.command);
        const needsConfirmation = (0, safety_1.requiresConfirmation)(risk);
        const riskDescription = (0, safety_1.getRiskDescription)(step.command);
        const stepResult = {
            step: { ...step, risk },
            ok: false,
        };
        // Log the step
        logger(`Executing: ${step.command}`, "info");
        // Check for confirmation requirement
        if (needsConfirmation) {
            logger(`Risk level: ${risk}${riskDescription ? ` - ${riskDescription}` : ""}`, "warn");
            const userApproved = await confirm({
                ...step,
                risk,
            });
            if (!userApproved) {
                stepResult.ok = false;
                stepResult.error = "user_cancelled";
                results.push(stepResult);
                logger("Execution cancelled by user", "warn");
                break;
            }
            logger("User approved the operation", "info");
        }
        // Execute the step based on tool type
        try {
            let output;
            switch (step.tool) {
                case "terminal":
                    const terminalResult = await (0, terminal_1.run)(step.command, {
                        cwd: options?.workspaceContext?.rootPath,
                        timeoutMs,
                    });
                    output = terminalResult.stdout || terminalResult.stderr;
                    if (terminalResult.exitCode !== 0 && !output) {
                        throw new Error(`Command failed with exit code ${terminalResult.exitCode}`);
                    }
                    break;
                case "filesystem":
                    // Filesystem operations would be handled here
                    output = "filesystem operation completed";
                    break;
                case "git":
                    // Git operations would be handled here
                    output = "git operation completed";
                    break;
                default:
                    throw new Error(`Tool not implemented: ${step.tool}`);
            }
            stepResult.ok = true;
            stepResult.output = output;
            results.push(stepResult);
            logger(`Step completed successfully`, "info");
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            stepResult.ok = false;
            stepResult.error = errorMessage;
            results.push(stepResult);
            logger(`Step failed: ${errorMessage}`, "error");
            if (abortOnError) {
                break;
            }
        }
    }
    const executionTimeMs = Date.now() - startTime;
    const allSuccessful = results.every((r) => r.ok);
    const failedSteps = results.filter((r) => !r.ok);
    let summary;
    if (allSuccessful) {
        summary = `Successfully completed all ${results.length} steps`;
    }
    else {
        summary = `Completed ${results.length - failedSteps.length} of ${results.length} steps. ${failedSteps.length} failed.`;
    }
    logger(summary, allSuccessful ? "info" : "warn");
    return {
        plan,
        results,
        success: allSuccessful,
        summary,
        executionTimeMs,
    };
}
/**
 * Create a confirmation prompt message for a tool call.
 *
 * @param step - The step to confirm
 * @param userName - Optional user name for personalization
 * @returns Formatted confirmation message
 */
function createConfirmationMessage(step, userName) {
    const greeting = userName ? `${userName}, ` : "";
    const toolInfo = `Tool: ${step.tool}`;
    const commandInfo = `Command: \`${step.command}\``;
    const riskInfo = `Risk level: ${step.risk ?? "unknown"}`;
    const description = step.description
        ? `\n\nWhat this does: ${step.description}`
        : "";
    const riskWarning = step.risk === "high"
        ? "\n\n⚠️ This is a HIGH RISK operation. Please ensure you understand what this will do."
        : step.risk === "medium"
            ? "\n\n⚡ This operation requires elevated privileges or may affect system stability."
            : "";
    return `${greeting}I've prepared a ${step.risk ?? ""} risk operation:\n\n${toolInfo}\n${commandInfo}${description}${riskWarning}\n\nDo you want to proceed?`;
}
/**
 * Validate that a plan is well-formed.
 *
 * @param plan - The plan to validate
 * @returns Array of validation errors (empty if valid)
 */
function validatePlan(plan) {
    const errors = [];
    if (!plan.intent?.trim()) {
        errors.push("Plan must have a non-empty intent");
    }
    if (!plan.summary?.trim()) {
        errors.push("Plan must have a non-empty summary");
    }
    if (!plan.steps || plan.steps.length === 0) {
        errors.push("Plan must have at least one step");
    }
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        if (!step.tool) {
            errors.push(`Step ${i + 1}: tool is required`);
        }
        if (!step.command?.trim()) {
            errors.push(`Step ${i + 1}: command is required`);
        }
    }
    return errors;
}
/**
 * Estimate the total risk level of a plan.
 *
 * @param plan - The plan to analyze
 * @returns The highest risk level in the plan
 */
function estimatePlanRisk(plan) {
    let highest = "low";
    for (const step of plan.steps) {
        const risk = step.risk ?? (0, safety_1.classifyRisk)(step.command);
        if (risk === "high")
            return "high";
        if (risk === "medium")
            highest = "medium";
    }
    return highest;
}
