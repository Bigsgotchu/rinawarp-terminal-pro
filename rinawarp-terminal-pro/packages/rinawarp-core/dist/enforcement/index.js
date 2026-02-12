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
// Re-export pure types - tools import from types.js to avoid cycles
export * from "./types.js";
export * from "./engine-cap.js";
import { createEngineCap } from "./engine-cap.js";
/**
 * ToolRegistry: single authoritative allowlist for all tools.
 * Unknown tools are hard-blocked at execution time.
 */
export class ToolRegistry {
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Duplicate tool registration: ${tool.name}`);
        }
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    has(name) {
        return this.tools.has(name);
    }
    list() {
        return [...this.tools.keys()].sort();
    }
    /**
     * Register multiple tools at once (batch operation)
     */
    registerMany(tools) {
        for (const tool of tools) {
            this.register(tool);
        }
    }
}
/**
 * License matrix (v1 locked):
 * - starter/creator: no high-impact
 * - pro/pioneer: allow only deploy.prod among high-impact
 * - founder/enterprise: all tools
 */
export class LicensePolicy {
    static canUseTool(license, tool) {
        if (tool.category !== "high-impact")
            return true;
        // High-impact tools are gated by license tier
        if (license === "starter" || license === "creator") {
            return false;
        }
        // pro/pioneer: allow only deploy.prod
        if (license === "pro" || license === "pioneer") {
            return tool.name === "deploy.prod";
        }
        // founder/enterprise: allow all high-impact tools
        return true;
    }
    static getAllowedCategories(license) {
        const allCategories = ["read", "safe-write", "planning"];
        if (license === "starter" || license === "creator") {
            return allCategories;
        }
        // pro+ can use all categories
        return [...allCategories, "high-impact"];
    }
}
/**
 * ConfirmationPolicy: determines when explicit user confirmation is required.
 */
export class ConfirmationPolicy {
    static needsExplicitConfirmation(tool) {
        return tool.category === "high-impact" || tool.requiresConfirmation;
    }
    static isTokenValidForStep(token, step) {
        if (!step.confirmationScope)
            return false;
        if (!token)
            return false;
        if (token.kind !== "explicit")
            return false;
        if (!token.approved)
            return false;
        return token.scope === step.confirmationScope;
    }
    static generateScope(action, target) {
        return `${action} ${target}`;
    }
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
export class ExecutionEngine {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async execute(plan, ctx) {
        const report = { ok: true, steps: [] };
        for (const step of plan) {
            // 1. Stop requested check
            if (ctx.stopRequested) {
                report.ok = false;
                report.haltedBecause = "stop_requested";
                break;
            }
            // 2. Registry allowlist check
            const tool = this.registry.get(step.tool);
            if (!tool) {
                report.ok = false;
                report.haltedBecause = "unknown_tool";
                report.steps.push({
                    step,
                    startedAt: Date.now(),
                    finishedAt: Date.now(),
                    result: { success: false, error: `Unknown tool: ${step.tool}` },
                });
                break;
            }
            // 3. License gating
            if (!LicensePolicy.canUseTool(ctx.license, tool)) {
                report.ok = false;
                report.haltedBecause = "license_block";
                report.steps.push({
                    step,
                    startedAt: Date.now(),
                    finishedAt: Date.now(),
                    result: { success: false, error: `Blocked by license (${ctx.license}): ${tool.name}` },
                });
                break;
            }
            // 4. Plan safety contract enforcement
            const safetyErrors = validateSafetyFields(step, tool);
            if (safetyErrors.length > 0) {
                report.ok = false;
                report.haltedBecause = "invalid_plan";
                report.steps.push({
                    step,
                    startedAt: Date.now(),
                    finishedAt: Date.now(),
                    result: { success: false, error: `Invalid step safety fields: ${safetyErrors.join("; ")}` },
                });
                break;
            }
            // 5. Scoped explicit confirmation
            if (step.requires_confirmation) {
                const ok = ConfirmationPolicy.isTokenValidForStep(ctx.confirmationToken, step);
                if (!ok) {
                    report.ok = false;
                    report.haltedBecause = "confirmation_required";
                    report.steps.push({
                        step,
                        startedAt: Date.now(),
                        finishedAt: Date.now(),
                        result: { success: false, error: `Explicit confirmation required: ${tool.name}` },
                    });
                    break;
                }
            }
            // 6. Tool execution
            const startedAt = Date.now();
            const cap = createEngineCap();
            const result = await tool.run(step.input, ctx, cap);
            const finishedAt = Date.now();
            // 7. Output surfacing (Never-Do: silent success)
            if (result.success && (!result.output || result.output.trim().length === 0)) {
                report.ok = false;
                report.haltedBecause = "verification_failed";
                report.steps.push({
                    step,
                    startedAt,
                    finishedAt,
                    result: { success: false, error: "Tool claimed success without surfaced output" },
                });
                break;
            }
            const entry = { step, startedAt, finishedAt, result };
            // 8. Verification enforcement
            const verificationSteps = step.verification_plan?.steps ?? step.verify ?? [];
            if (result.success && verificationSteps.length) {
                entry.verification = [];
                for (const v of verificationSteps) {
                    const vtool = this.registry.get(v.tool);
                    if (!vtool) {
                        report.ok = false;
                        report.haltedBecause = "unknown_tool";
                        entry.verification.push({
                            tool: v.tool,
                            result: { success: false, error: `Unknown verification tool: ${v.tool}` },
                        });
                        break;
                    }
                    const vres = await vtool.run(v.input, ctx, cap);
                    entry.verification.push({ tool: v.tool, result: vres });
                    if (!vres.success) {
                        report.ok = false;
                        report.haltedBecause = "verification_failed";
                        break;
                    }
                }
            }
            report.steps.push(entry);
            // Early exit on failure
            if (!report.ok)
                break;
            if (!result.success) {
                report.ok = false;
                break;
            }
        }
        return report;
    }
}
function validateSafetyFields(step, tool) {
    const errors = [];
    const allowedRiskLevels = new Set(["low", "medium", "high"]);
    const expectedRiskLevel = getExpectedRiskLevel(tool.category);
    const expectedRequiresConfirmation = ConfirmationPolicy.needsExplicitConfirmation(tool);
    if (!step.risk_level) {
        errors.push("risk_level is required");
    }
    else if (!allowedRiskLevels.has(step.risk_level)) {
        errors.push(`risk_level must be one of: low, medium, high`);
    }
    else if (step.risk_level !== expectedRiskLevel) {
        errors.push(`risk_level mismatch (expected ${expectedRiskLevel}, got ${step.risk_level})`);
    }
    if (typeof step.requires_confirmation !== "boolean") {
        errors.push("requires_confirmation is required");
    }
    else if (step.requires_confirmation !== expectedRequiresConfirmation) {
        errors.push(`requires_confirmation mismatch (expected ${String(expectedRequiresConfirmation)}, got ${String(step.requires_confirmation)})`);
    }
    if (!step.verification_plan) {
        errors.push("verification_plan is required");
    }
    else if (!Array.isArray(step.verification_plan.steps)) {
        errors.push("verification_plan.steps must be an array");
    }
    if (step.requires_confirmation && !step.confirmationScope) {
        errors.push("confirmationScope is required when requires_confirmation=true");
    }
    return errors;
}
function getExpectedRiskLevel(category) {
    if (category === "high-impact")
        return "high";
    if (category === "safe-write")
        return "medium";
    return "low";
}
