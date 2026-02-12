import test from "node:test";
import assert from "node:assert/strict";
import {
	ExecutionEngine,
	ToolRegistry,
	type Tool,
	type ToolCategory,
	type ToolResult,
	type ConfirmationToken,
	type PlanStep,
} from "../src/enforcement/index.js";

class StubTool implements Tool<Record<string, unknown>> {
	constructor(
		public name: string,
		public category: ToolCategory,
		public requiresConfirmation: boolean,
		private readonly impl: (input: Record<string, unknown>) => ToolResult,
	) {}

	async run(input: Record<string, unknown>): Promise<ToolResult> {
		return this.impl(input);
	}
}

function makeEngine(): ExecutionEngine {
	const reg = new ToolRegistry();
	reg.register(
		new StubTool("doctor.sensors", "read", false, () => ({ success: true, output: "cpu_temp=93" })),
	);
	reg.register(new StubTool("doctor.ps", "read", false, () => ({ success: true, output: "pid list" })));
	reg.register(
		new StubTool("doctor.cooldown", "safe-write", false, () => ({ success: true, output: "reduced thermal load" })),
	);
	reg.register(
		new StubTool("verify.temp", "read", false, () => ({ success: true, output: "cpu_temp=68" })),
	);
	reg.register(
		new StubTool("dev.build.log", "read", false, () => ({ success: true, output: "missing package xyz" })),
	);
	reg.register(
		new StubTool("deps.install", "safe-write", false, (input) => {
			if (input.package === "bad") return { success: false, error: "dependency conflict" };
			return { success: true, output: "dependencies installed" };
		}),
	);
	reg.register(
		new StubTool("verify.build", "read", false, () => ({ success: true, output: "build ok" })),
	);
	reg.register(
		new StubTool("project.scaffold", "safe-write", false, () => ({ success: true, output: "project scaffolded" })),
	);
	reg.register(
		new StubTool("deploy.prod", "high-impact", true, () => ({ success: true, output: "deployed prod" })),
	);
	reg.register(
		new StubTool("rollback.last", "safe-write", false, () => ({ success: true, output: "rollback complete" })),
	);
	return new ExecutionEngine(reg);
}

function baseStep(partial: PlanStep): PlanStep {
	return {
		description: partial.description ?? `Run ${partial.tool}`,
		tool: partial.tool,
		input: partial.input ?? {},
		risk_level: partial.risk_level ?? "low",
		requires_confirmation: partial.requires_confirmation ?? false,
		verification_plan: partial.verification_plan ?? { steps: [] },
		confirmationScope: partial.confirmationScope,
	};
}

test("scenario: system doctor flow diagnose->prove->fix->verify", async () => {
	const engine = makeEngine();
	const plan: PlanStep[] = [
		baseStep({ tool: "doctor.sensors", risk_level: "low" }),
		baseStep({ tool: "doctor.ps", risk_level: "low" }),
		baseStep({
			tool: "doctor.cooldown",
			risk_level: "medium",
			requires_confirmation: false,
			verification_plan: { steps: [{ tool: "verify.temp", input: {} }] },
		}),
	];
	const report = await engine.execute(plan, { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, true);
	assert.equal(report.steps.length, 3);
	assert.equal(report.steps[2].verification?.[0]?.result.success, true);
});

test("scenario: dev fixer flow inspect->repair->verify", async () => {
	const engine = makeEngine();
	const plan: PlanStep[] = [
		baseStep({ tool: "dev.build.log", risk_level: "low" }),
		baseStep({ tool: "deps.install", input: { package: "typescript" }, risk_level: "medium" }),
		baseStep({
			tool: "deps.install",
			input: { package: "eslint" },
			risk_level: "medium",
			verification_plan: { steps: [{ tool: "verify.build", input: {} }] },
		}),
	];
	const report = await engine.execute(plan, { projectRoot: ".", license: "starter" });
	assert.equal(report.ok, true);
	assert.equal(report.steps.at(-1)?.verification?.[0]?.result.success, true);
});

test("scenario: project builder requires explicit confirmation for prod deploy", async () => {
	const engine = makeEngine();
	const deployStep = baseStep({
		tool: "deploy.prod",
		risk_level: "high",
		requires_confirmation: true,
		confirmationScope: "deploy prod",
	});
	const noToken = await engine.execute([deployStep], { projectRoot: ".", license: "pro" });
	assert.equal(noToken.ok, false);
	assert.equal(noToken.haltedBecause, "confirmation_required");

	const token: ConfirmationToken = { kind: "explicit", approved: true, scope: "deploy prod" };
	const withToken = await engine.execute([deployStep], { projectRoot: ".", license: "pro", confirmationToken: token });
	assert.equal(withToken.ok, true);
});

test("scenario: builder rollback path executes after failed build step", async () => {
	const engine = makeEngine();
	const failingPlan: PlanStep[] = [
		baseStep({ tool: "project.scaffold", risk_level: "medium" }),
		baseStep({ tool: "deps.install", input: { package: "bad" }, risk_level: "medium" }),
	];
	const failed = await engine.execute(failingPlan, { projectRoot: ".", license: "starter" });
	assert.equal(failed.ok, false);

	const rollbackPlan: PlanStep[] = [baseStep({ tool: "rollback.last", risk_level: "medium" })];
	const rollback = await engine.execute(rollbackPlan, { projectRoot: ".", license: "starter" });
	assert.equal(rollback.ok, true);
});
