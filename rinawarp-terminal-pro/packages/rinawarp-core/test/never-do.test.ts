/**
 * Never-Do Regression Tests (v1 contract lock).
 * Run with: node --test test/never-do.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
	ToolRegistry,
	ExecutionEngine,
	ToolCategory,
	ConfirmationToken,
	Tool,
	PlanStep,
	ExecutionContext,
	LicensePolicy,
	ConfirmationPolicy,
} from "../src/enforcement/index.js";

// Stub tools for testing
class ReadTool implements Tool<{ msg: string }> {
	name = "logs.read";
	category: ToolCategory = "read";
	requiresConfirmation = false;
	async run(input: { msg: string }) { return { success: true, output: `READ:${input.msg}` }; }
}

class DeleteTool implements Tool<{ path: string }> {
	name = "fs.delete";
	category: ToolCategory = "high-impact";
	requiresConfirmation = true;
	async run(input: { path: string }) { return { success: true, output: `DELETED:${input.path}` }; }
}

class DeployTool implements Tool<{ target: string }> {
	name = "deploy.prod";
	category: ToolCategory = "high-impact";
	requiresConfirmation = true;
	async run(input: { target: string }) { return { success: true, output: `DEPLOYED:${input.target}` }; }
}

class BadSilentSuccessTool implements Tool {
	name = "format.run";
	category: ToolCategory = "safe-write";
	requiresConfirmation = false;
	async run() { return { success: true, output: "   " }; }
}

class VerifyFailTool implements Tool<{ target: string }> {
	name = "verify.health";
	category: ToolCategory = "read";
	requiresConfirmation = false;
	async run(input: { target: string }) { return { success: false, error: `HEALTH_BAD:${input.target}`, output: `HEALTH_BAD:${input.target}` }; }
}

class PermissionFailTool implements Tool {
	name = "fs.protected_write";
	category: ToolCategory = "safe-write";
	requiresConfirmation = false;
	async run() { return { success: false, error: "EACCES: permission denied" }; }
}

class TimeoutFailTool implements Tool {
	name = "build.timeout";
	category: ToolCategory = "safe-write";
	requiresConfirmation = false;
	async run() { return { success: false, error: "command timed out after 60000ms" }; }
}

function makeRegistry(): ToolRegistry {
	const reg = new ToolRegistry();
	reg.register(new ReadTool());
	reg.register(new DeleteTool());
	reg.register(new DeployTool());
	reg.register(new BadSilentSuccessTool());
	reg.register(new VerifyFailTool());
	reg.register(new PermissionFailTool());
	reg.register(new TimeoutFailTool());
	return reg;
}

function makeEngine(): ExecutionEngine {
	return new ExecutionEngine(makeRegistry());
}

function step(input: PlanStep): PlanStep {
	const safetyByTool: Record<string, { risk_level: "low" | "medium" | "high"; requires_confirmation: boolean }> = {
		"logs.read": { risk_level: "low", requires_confirmation: false },
		"verify.health": { risk_level: "low", requires_confirmation: false },
		"format.run": { risk_level: "medium", requires_confirmation: false },
		"fs.protected_write": { risk_level: "medium", requires_confirmation: false },
		"build.timeout": { risk_level: "medium", requires_confirmation: false },
		"fs.delete": { risk_level: "high", requires_confirmation: true },
		"deploy.prod": { risk_level: "high", requires_confirmation: true },
	};
	const safety = safetyByTool[input.tool] ?? { risk_level: "low", requires_confirmation: false };
	return {
		...input,
		description: input.description ?? `Execute ${input.tool}`,
		risk_level: safety.risk_level,
		requires_confirmation: safety.requires_confirmation,
		verification_plan: input.verification_plan ?? { steps: [] },
	};
}

// Never-Do: unknown tool blocked
test("unknown tool must be blocked", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "fs.nuke", input: {} })], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "unknown_tool");
});

// Never-Do: high-impact requires confirmation
test("high-impact cannot run without explicit confirmation token", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "fs.delete", input: { path: "./x" }, confirmationScope: "delete ./x" })], { projectRoot: ".", license: "founder" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "confirmation_required");
});

// Never-Do: wrong scope rejected
test("wrong scope token is rejected", async () => {
	const engine = makeEngine();
	const wrongToken: ConfirmationToken = { kind: "explicit", approved: true, scope: "wrong scope" };
	const report = await engine.execute([step({ tool: "fs.delete", input: { path: "./x" }, confirmationScope: "delete ./x" })], { projectRoot: ".", license: "founder", confirmationToken: wrongToken });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "confirmation_required");
});

// Never-Do: starter blocks high-impact
test("starter license must block ALL high-impact tools", async () => {
	const engine = makeEngine();
	const token: ConfirmationToken = { kind: "explicit", approved: true, scope: "deploy prod" };
	const report = await engine.execute([step({ tool: "deploy.prod", input: { target: "prod" }, confirmationScope: "deploy prod" })], { projectRoot: ".", license: "starter", confirmationToken: token });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "license_block");
});

// License: pro can use deploy.prod, blocks other high-impact
test("pro can use deploy.prod, blocks other high-impact", async () => {
	const engine = makeEngine();

	const okReport = await engine.execute([step({ tool: "deploy.prod", input: { target: "prod" }, confirmationScope: "deploy prod" })], { projectRoot: ".", license: "pro", confirmationToken: { kind: "explicit", approved: true, scope: "deploy prod" } });
	assert.equal(okReport.ok, true);

	const blockedReport = await engine.execute([step({ tool: "fs.delete", input: { path: "./x" }, confirmationScope: "delete ./x" })], { projectRoot: ".", license: "pro", confirmationToken: { kind: "explicit", approved: true, scope: "delete ./x" } });
	assert.equal(blockedReport.ok, false);
	assert.equal(blockedReport.haltedBecause, "license_block");
});

// Never-Do: silent success rejected
test("must not claim success without output", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "format.run", input: {} })], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "verification_failed");
});

// Never-Do: verification failure fails execution
test("verification must fail execution if verification fails", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "deploy.prod", input: { target: "prod" }, confirmationScope: "deploy prod", verification_plan: { steps: [{ tool: "verify.health", input: { target: "prod" } }] } })], { projectRoot: ".", license: "pro", confirmationToken: { kind: "explicit", approved: true, scope: "deploy prod" } });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "verification_failed");
});

// Never-Do: stopRequested halts immediately
test("stopRequested must halt immediately", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "logs.read", input: { msg: "a" } }), step({ tool: "logs.read", input: { msg: "b" } })], { projectRoot: ".", license: "starter", stopRequested: true });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "stop_requested");
	assert.equal(report.steps.length, 0);
});

// Read tool works without confirmation
test("read tool works without confirmation", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "logs.read", input: { msg: "test" } })], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, true);
});

test("missing safety fields must be rejected before execution", async () => {
	const engine = makeEngine();
	const report = await engine.execute([{ tool: "logs.read", input: { msg: "test" } }], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "invalid_plan");
});

test("failed step should map permission errors to permission_denied", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "fs.protected_write", input: {} })], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "permission_denied");
	assert.equal(report.steps[0].failure_class, "permission_denied");
});

test("failed step should map timeout errors to timeout", async () => {
	const engine = makeEngine();
	const report = await engine.execute([step({ tool: "build.timeout", input: {} })], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, false);
	assert.equal(report.haltedBecause, "timeout");
	assert.equal(report.steps[0].failure_class, "timeout");
});

test("step audit should include redacted sensitive inputs", async () => {
	const engine = makeEngine();
	const report = await engine.execute([
		step({
			tool: "logs.read",
			input: { msg: "hello", token: "abc", nested: { password: "p1", keep: "ok" } },
		}),
	], { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, true);
	assert.deepEqual(report.steps[0].audit.input_redacted, {
		msg: "hello",
		token: "[REDACTED]",
		nested: { password: "[REDACTED]", keep: "ok" },
	});
});

test("emergency read-only mode blocks non-read tools", async () => {
	process.env.RINAWARP_EMERGENCY_READ_ONLY = "1";
	try {
		const engine = makeEngine();
		const report = await engine.execute([step({ tool: "format.run", input: {} })], { projectRoot: ".", license: "starter" });
		assert.equal(report.ok, false);
		assert.equal(report.haltedBecause, "permission_denied");
		assert.match(report.steps[0].result.success ? "" : report.steps[0].result.error, /read-only/i);
	} finally {
		delete process.env.RINAWARP_EMERGENCY_READ_ONLY;
	}
});

test("emergency high-impact block denies deploy.prod even for pro", async () => {
	process.env.RINAWARP_DISABLE_HIGH_IMPACT = "1";
	try {
		const engine = makeEngine();
		const report = await engine.execute([step({ tool: "deploy.prod", input: { target: "prod" }, confirmationScope: "deploy prod" })], {
			projectRoot: ".",
			license: "pro",
			confirmationToken: { kind: "explicit", approved: true, scope: "deploy prod" },
		});
		assert.equal(report.ok, false);
		assert.equal(report.haltedBecause, "permission_denied");
	} finally {
		delete process.env.RINAWARP_DISABLE_HIGH_IMPACT;
	}
});

test("emergency tool block list disables specific tools", async () => {
	process.env.RINAWARP_BLOCK_TOOLS = "logs.read,verify.health";
	try {
		const engine = makeEngine();
		const report = await engine.execute([step({ tool: "logs.read", input: { msg: "test" } })], { projectRoot: ".", license: "starter" });
		assert.equal(report.ok, false);
		assert.equal(report.haltedBecause, "tool_unavailable");
	} finally {
		delete process.env.RINAWARP_BLOCK_TOOLS;
	}
});

// ToolRegistry tests
test("ToolRegistry: duplicate registration throws", () => {
	const reg = new ToolRegistry();
	reg.register(new ReadTool());
	assert.throws(() => reg.register(new ReadTool()), /Duplicate tool registration/);
});

test("ToolRegistry: has() returns correct result", () => {
	const reg = new ToolRegistry();
	reg.register(new ReadTool());
	assert.ok(reg.has("logs.read"));
	assert.ok(!reg.has("unknown.tool"));
});

// LicensePolicy tests
test("LicensePolicy: starter cannot use high-impact", () => {
	const reg = new ToolRegistry();
	reg.register(new DeleteTool());
	const tool = reg.get("fs.delete")!;
	assert.strictEqual(LicensePolicy.canUseTool("starter", tool), false);
	assert.strictEqual(LicensePolicy.canUseTool("creator", tool), false);
});

test("LicensePolicy: pro can use only deploy.prod", () => {
	const reg = new ToolRegistry();
	reg.register(new DeleteTool());
	reg.register(new DeployTool());
	assert.strictEqual(LicensePolicy.canUseTool("pro", reg.get("fs.delete")!), false);
	assert.strictEqual(LicensePolicy.canUseTool("pro", reg.get("deploy.prod")!), true);
});

// ConfirmationPolicy tests
test("ConfirmationPolicy: scope validation works", () => {
	const validToken: ConfirmationToken = { kind: "explicit", approved: true, scope: "delete ./x" };
	const planStep: PlanStep = step({ tool: "fs.delete", input: { path: "./x" }, confirmationScope: "delete ./x" });
	assert.strictEqual(ConfirmationPolicy.isTokenValidForStep(validToken, planStep), true);
});

console.log("Run with: node --test test/never-do.test.ts");
