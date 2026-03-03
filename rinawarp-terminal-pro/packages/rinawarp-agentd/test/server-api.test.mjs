import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { createServer } from "../dist/server.js";

let server;
let baseUrl;
const agentHome = path.join(process.cwd(), ".tmp-agentd-test");

async function waitForReport(planRunId, attempts = 20) {
	for (let i = 0; i < attempts; i++) {
		const resp = await fetch(`${baseUrl}/v1/report?planRunId=${encodeURIComponent(planRunId)}`);
		if (resp.status === 200) return resp.json();
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`report not ready for planRunId=${planRunId}`);
}

async function waitForTaskCompletion(taskId, attempts = 60) {
	for (let i = 0; i < attempts; i++) {
		const resp = await fetch(`${baseUrl}/v1/daemon/tasks`);
		if (resp.ok) {
			const body = await resp.json();
			const task = Array.isArray(body.tasks) ? body.tasks.find((t) => t.id === taskId) : null;
			if (task && ["completed", "failed", "canceled"].includes(task.status)) return task;
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`task did not complete: ${taskId}`);
}

function b64url(input) {
	return Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function signLicenseToken(payload, secret) {
	const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
	const sig = createHmac("sha256", secret).update(payloadBytes).digest();
	return `${b64url(payloadBytes)}.${b64url(sig)}`;
}

before(async () => {
	delete process.env.RINAWARP_AGENTD_TOKEN;
	delete process.env.RINAWARP_AGENTD_LICENSE;
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
	process.env.RINAWARP_AGENT_HOME = agentHome;
	fs.rmSync(agentHome, { recursive: true, force: true });
	server = createServer({ port: 0 });
	const port = await server.listen();
	baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
	if (server) {
		await server.close();
	}
	fs.rmSync(agentHome, { recursive: true, force: true });
	delete process.env.RINAWARP_AGENT_HOME;
});

test("POST /v1/plan returns steps with required safety metadata", async () => {
	const resp = await fetch(`${baseUrl}/v1/plan`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			intentText: "build project",
			projectRoot: process.cwd(),
		}),
	});

	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.ok(Array.isArray(body.plan.steps));
	assert.ok(body.plan.steps.length > 0);

	for (const step of body.plan.steps) {
		assert.ok(typeof step.risk_level === "string");
		assert.ok(typeof step.requires_confirmation === "boolean");
		assert.ok(step.verification_plan);
		assert.ok(Array.isArray(step.verification_plan.steps));
	}
});

test("POST /v1/execute-plan rejects malformed safety contract", async () => {
	const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			projectRoot: process.cwd(),
			confirmed: false,
			confirmationText: "",
			plan: [
				{
					stepId: "legacy",
					tool: "terminal.write",
					input: { command: "echo legacy" },
					risk: "inspect",
				},
			],
		}),
	});

	assert.equal(resp.status, 400);
	const body = await resp.json();
	assert.equal(body.ok, false);
	assert.match(body.error, /invalid plan safety contract/i);
});

test("POST /v1/execute-plan accepts valid step contract", async () => {
	delete process.env.NODE_ENV;
	process.env.RINAWARP_AGENTD_LICENSE = "pro";
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
	const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			projectRoot: process.cwd(),
			confirmed: false,
			confirmationText: "",
			plan: [
				{
					stepId: "ok-1",
					description: "Echo success",
					tool: "terminal.write",
					input: { command: "echo ok" },
					risk: "inspect",
					risk_level: "low",
					requires_confirmation: false,
					verification_plan: { steps: [] },
				},
			],
		}),
	});

	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.ok(typeof body.planRunId === "string");
	assert.ok(body.planRunId.length > 0);
	const reportPayload = await waitForReport(body.planRunId);
	assert.equal(reportPayload.ok, true);
	assert.equal(reportPayload.report.planRunId, body.planRunId);
	assert.ok(Array.isArray(reportPayload.report.steps));
	const reportFile = path.join(process.cwd(), ".rinawarp", "reports", `${body.planRunId}.json`);
	assert.equal(fs.existsSync(reportFile), true);
	delete process.env.RINAWARP_AGENTD_LICENSE;
});

test("POST /v1/execute-plan rejects invalid x-rinawarp-license", async () => {
	delete process.env.NODE_ENV;
	delete process.env.RINAWARP_AGENTD_LICENSE;
	process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER = "true";
	const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
		method: "POST",
		headers: { "content-type": "application/json", "x-rinawarp-license": "invalid-tier" },
		body: JSON.stringify({
			projectRoot: process.cwd(),
			confirmed: false,
			confirmationText: "",
			plan: [
				{
					stepId: "ok-2",
					description: "Echo success",
					tool: "terminal.write",
					input: { command: "echo ok" },
					risk: "inspect",
					risk_level: "low",
					requires_confirmation: false,
					verification_plan: { steps: [] },
				},
			],
		}),
	});

	assert.equal(resp.status, 400);
	const body = await resp.json();
	assert.equal(body.ok, false);
	assert.match(body.error, /invalid x-rinawarp-license/i);
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
});

test("POST /v1/execute-plan requires signed entitlement token in production", async () => {
	delete process.env.RINAWARP_AGENTD_LICENSE;
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";

	const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			projectRoot: process.cwd(),
			confirmed: false,
			confirmationText: "",
			plan: [
				{
					stepId: "prod-missing-token",
					description: "Echo failure case",
					tool: "terminal.write",
					input: { command: "echo nope" },
					risk: "inspect",
					risk_level: "low",
					requires_confirmation: false,
					verification_plan: { steps: [] },
				},
			],
		}),
	});

	assert.equal(resp.status, 401);
	const body = await resp.json();
	assert.equal(body.ok, false);
	assert.match(body.error, /missing x-rinawarp-license-token/i);
	delete process.env.NODE_ENV;
	delete process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET;
});

test("POST /v1/execute-plan accepts valid signed entitlement token in production", async () => {
	delete process.env.RINAWARP_AGENTD_LICENSE;
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";

	const token = signLicenseToken(
		{ typ: "license", tier: "pro", customer_id: "cus_123", exp: Date.now() + 60_000 },
		"test-secret",
	);

	const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-rinawarp-license-token": token,
		},
		body: JSON.stringify({
			projectRoot: process.cwd(),
			confirmed: false,
			confirmationText: "",
			plan: [
				{
					stepId: "prod-token-ok",
					description: "Echo success",
					tool: "terminal.write",
					input: { command: "echo ok" },
					risk: "inspect",
					risk_level: "low",
					requires_confirmation: false,
					verification_plan: { steps: [] },
				},
			],
		}),
	});

	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.ok(typeof body.planRunId === "string");
	delete process.env.NODE_ENV;
	delete process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET;
});

test("GET /v1/report returns 404 for unknown planRunId", async () => {
	const resp = await fetch(`${baseUrl}/v1/report?planRunId=unknown-id`);
	assert.equal(resp.status, 404);
	const body = await resp.json();
	assert.equal(body.ok, false);
	assert.match(body.error, /report not found/i);
});

test("GET /v1/metrics returns runtime counters", async () => {
	const resp = await fetch(`${baseUrl}/v1/metrics`);
	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.ok(typeof body.metrics.runs_total === "number");
	assert.ok(typeof body.metrics.completion_rate === "number");
	assert.ok(typeof body.metrics.mttr_unblock_ms === "number");
});

test("POST /v1/daemon/tasks registers task and GET /v1/daemon/tasks lists it", async () => {
	const createResp = await fetch(`${baseUrl}/v1/daemon/tasks`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			type: "run_command",
			payload: { command: "echo from-server-api-test" },
			maxAttempts: 2,
		}),
	});
	assert.equal(createResp.status, 200);
	const createBody = await createResp.json();
	assert.equal(createBody.ok, true);
	assert.equal(createBody.task.type, "run_command");
	assert.equal(createBody.task.maxAttempts, 2);

	const listResp = await fetch(`${baseUrl}/v1/daemon/tasks?status=queued`);
	assert.equal(listResp.status, 200);
	const listBody = await listResp.json();
	assert.equal(listBody.ok, true);
	assert.ok(Array.isArray(listBody.tasks));
	assert.ok(listBody.tasks.some((t) => t.id === createBody.task.id));
});

test("GET /v1/daemon/status returns daemon/task summary", async () => {
	const resp = await fetch(`${baseUrl}/v1/daemon/status`);
	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.ok(typeof body.daemon.running === "boolean");
	assert.ok(typeof body.tasks.total === "number");
});

test("POST /v1/daemon/start and /v1/daemon/stop control background daemon", async () => {
	const startResp = await fetch(`${baseUrl}/v1/daemon/start`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{}",
	});
	assert.equal(startResp.status, 200);
	const startBody = await startResp.json();
	assert.equal(startBody.ok, true);
	assert.ok(typeof startBody.pid === "number" || startBody.alreadyRunning === true);

	const statusResp = await fetch(`${baseUrl}/v1/daemon/status`);
	assert.equal(statusResp.status, 200);
	const statusBody = await statusResp.json();
	assert.equal(statusBody.ok, true);
	assert.equal(typeof statusBody.daemon.running, "boolean");

	const stopResp = await fetch(`${baseUrl}/v1/daemon/stop`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{}",
	});
	assert.equal(stopResp.status, 200);
	const stopBody = await stopResp.json();
	assert.equal(stopBody.ok, true);
});

test("POST /v1/orchestrator/issue-to-pr creates workflow and graph is queryable", async () => {
	const createResp = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "143",
			repoPath: process.cwd(),
			command: "echo orchestrator-smoke",
		}),
	});
	assert.equal(createResp.status, 200);
	const createBody = await createResp.json();
	assert.equal(createBody.ok, true);
	assert.ok(typeof createBody.workflowId === "string");
	assert.ok(typeof createBody.taskId === "string");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	assert.ok(Array.isArray(graphBody.graph.nodes));
	assert.ok(Array.isArray(graphBody.graph.edges));
	assert.ok(graphBody.graph.nodes.length >= 1);
	assert.ok(graphBody.graph.edges.length >= 1);
});

test("POST /v1/orchestrator/git/prepare-branch creates/switches branch in git repo", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-agentd-git-"));
	try {
		execSync("git init", { cwd: tmp, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: "ignore" });
		execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: "ignore" });
		fs.writeFileSync(path.join(tmp, "README.md"), "# test\n", "utf8");
		execSync("git add README.md", { cwd: tmp, stdio: "ignore" });
		execSync('git commit -m "init"', { cwd: tmp, stdio: "ignore" });

		const resp = await fetch(`${baseUrl}/v1/orchestrator/git/prepare-branch`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				repoPath: tmp,
				issueId: "144",
			}),
		});
		assert.equal(resp.status, 200);
		const body = await resp.json();
		assert.equal(body.ok, true);
		assert.equal(body.after, "rina/fix-144");
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("POST /v1/orchestrator/github/create-pr returns dry-run payload", async () => {
	const resp = await fetch(`${baseUrl}/v1/orchestrator/github/create-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			repoSlug: "owner/repo",
			head: "rina/fix-144",
			base: "main",
			title: "Fix issue 144",
			body: "Automated PR draft.",
			dryRun: true,
		}),
	});
	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.equal(body.mode, "dry_run");
	assert.equal(body.payload.title, "Fix issue 144");
});

test("POST /v1/orchestrator/github/create-pr records PR planned status when workflowId is provided", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "170",
			repoPath: process.cwd(),
			branchName: "rina/fix-170",
			command: "echo pr-plan-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const resp = await fetch(`${baseUrl}/v1/orchestrator/github/create-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			repoSlug: "owner/repo",
			head: "rina/fix-170",
			base: "main",
			title: "Fix issue 170",
			dryRun: true,
			workflowId: startBody.workflowId,
			issueId: "170",
			branchName: "rina/fix-170",
		}),
	});
	assert.equal(resp.status, 200);
	const body = await resp.json();
	assert.equal(body.ok, true);
	assert.equal(body.mode, "dry_run");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const prNode = graphBody.graph.nodes.find((n) => n.id === `pr_${startBody.workflowId}`);
	assert.ok(prNode);
	assert.equal(prNode.type, "pull_request");
	assert.equal(prNode.data.status, "planned");
});

test("daemon run_command issue_to_pr mode creates commit on branch (dry-run PR)", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-agentd-flow-"));
	try {
		execSync("git init", { cwd: tmp, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: "ignore" });
		execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: "ignore" });
		fs.writeFileSync(path.join(tmp, "README.md"), "# flow\n", "utf8");
		execSync("git add README.md", { cwd: tmp, stdio: "ignore" });
		execSync('git commit -m "init"', { cwd: tmp, stdio: "ignore" });

		const startResp = await fetch(`${baseUrl}/v1/daemon/start`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{}",
		});
		assert.equal(startResp.status, 200);
		const startBody = await startResp.json();
		assert.equal(startBody.ok, true);

		let statusResp = await fetch(`${baseUrl}/v1/daemon/status`);
		assert.equal(statusResp.status, 200);
		let statusBody = await statusResp.json();
		if (!statusBody?.daemon?.running) {
			const retryStart = await fetch(`${baseUrl}/v1/daemon/start`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
			assert.equal(retryStart.status, 200);
			statusResp = await fetch(`${baseUrl}/v1/daemon/status`);
			assert.equal(statusResp.status, 200);
			statusBody = await statusResp.json();
		}
		assert.equal(Boolean(statusBody?.daemon?.running), true);

		const addResp = await fetch(`${baseUrl}/v1/daemon/tasks`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				type: "run_command",
				payload: {
					mode: "issue_to_pr",
					issueId: "145",
					branchName: "rina/fix-145",
					command: "printf 'autofix\\n' >> README.md",
					cwd: tmp,
					repoSlug: "owner/repo",
					prDryRun: true,
					push: false,
				},
			}),
		});
		assert.equal(addResp.status, 200);
		const addBody = await addResp.json();
		assert.equal(addBody.ok, true);
		const taskId = addBody.task.id;

		const completed = await waitForTaskCompletion(taskId);
		assert.equal(completed.status, "completed");
		assert.equal(completed.result.mode, "issue_to_pr");
		assert.equal(completed.result.branchName, "rina/fix-145");
		assert.equal(completed.result.prResult.mode, "dry_run");

		const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: tmp }).toString("utf8").trim();
		assert.equal(branch, "rina/fix-145");
		const log = execSync("git log --oneline -n 1", { cwd: tmp }).toString("utf8");
		assert.match(log, /fix: issue 145/i);
	} finally {
		try {
			await fetch(`${baseUrl}/v1/daemon/stop`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
		} catch {}
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("POST /v1/orchestrator/ci/status records CI node in workspace graph", async () => {
	const createResp = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "150",
			repoPath: process.cwd(),
			command: "echo ci-seed",
		}),
	});
	assert.equal(createResp.status, 200);
	const createBody = await createResp.json();
	assert.equal(createBody.ok, true);

	const ciResp = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId: createBody.workflowId,
			provider: "github-actions",
			status: "failed",
			url: "https://ci.example/run/1",
		}),
	});
	assert.equal(ciResp.status, 200);
	const ciBody = await ciResp.json();
	assert.equal(ciBody.ok, true);
	assert.ok(typeof ciBody.ciNodeId === "string");
});

test("POST /v1/orchestrator/review/comment queues revision task", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-agentd-review-"));
	try {
		execSync("git init", { cwd: tmp, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: "ignore" });
		execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: "ignore" });
		fs.writeFileSync(path.join(tmp, "README.md"), "# review\n", "utf8");
		execSync("git add README.md", { cwd: tmp, stdio: "ignore" });
		execSync('git commit -m "init"', { cwd: tmp, stdio: "ignore" });

		const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				issueId: "151",
				repoPath: tmp,
				branchName: "rina/fix-151",
				command: "printf 'seed\\n' >> README.md",
			}),
		});
		assert.equal(start.status, 200);
		const startBody = await start.json();
		assert.equal(startBody.ok, true);

		const reviewResp = await fetch(`${baseUrl}/v1/orchestrator/review/comment`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				workflowId: startBody.workflowId,
				repoPath: tmp,
				issueId: "151",
				branchName: "rina/fix-151",
				comment: "Please update README wording",
				command: "printf 'review update\\n' >> README.md",
				prDryRun: true,
			}),
		});
		assert.equal(reviewResp.status, 200);
		const reviewBody = await reviewResp.json();
		assert.equal(reviewBody.ok, true);
		assert.ok(typeof reviewBody.taskId === "string");
		assert.ok(typeof reviewBody.reviewNodeId === "string");
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("POST /v1/orchestrator/ci/status with autoRetry queues revision task on failure", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-agentd-ci-auto-"));
	try {
		execSync("git init", { cwd: tmp, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: "ignore" });
		execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: "ignore" });
		fs.writeFileSync(path.join(tmp, "README.md"), "# ci auto\n", "utf8");
		execSync("git add README.md", { cwd: tmp, stdio: "ignore" });
		execSync('git commit -m "init"', { cwd: tmp, stdio: "ignore" });

		const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				issueId: "152",
				repoPath: tmp,
				branchName: "rina/fix-152",
				command: "printf 'seed\\n' >> README.md",
			}),
		});
		assert.equal(start.status, 200);
		const startBody = await start.json();
		assert.equal(startBody.ok, true);

		const ci = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				workflowId: startBody.workflowId,
				provider: "github-actions",
				status: "failed",
				url: "https://ci.example/run/152",
				autoRetry: true,
				repoPath: tmp,
				issueId: "152",
				branchName: "rina/fix-152",
				command: "printf 'ci retry\\n' >> README.md",
				prDryRun: true,
			}),
		});
		assert.equal(ci.status, 200);
		const ciBody = await ci.json();
		assert.equal(ciBody.ok, true);
		assert.ok(ciBody.autoRevision);
		assert.equal(ciBody.autoRevision.ok, true);
		assert.ok(typeof ciBody.autoRevision.taskId === "string");
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("POST /v1/orchestrator/ci/status reconciles missing workflow node", async () => {
	const workflowId = `wf_missing_${Date.now()}`;
	const ciResp = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId,
			provider: "github-actions",
			status: "queued",
		}),
	});
	assert.equal(ciResp.status, 200);
	const ciBody = await ciResp.json();
	assert.equal(ciBody.ok, true);

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const workflowNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${workflowId}`);
	assert.ok(workflowNode);
	assert.equal(workflowNode.type, "workflow");
});

test("POST /v1/orchestrator/review/comment reconciles missing workflow state", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-agentd-review-reconcile-"));
	try {
		execSync("git init", { cwd: tmp, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: "ignore" });
		execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: "ignore" });
		fs.writeFileSync(path.join(tmp, "README.md"), "# reconcile\n", "utf8");
		execSync("git add README.md", { cwd: tmp, stdio: "ignore" });
		execSync('git commit -m "init"', { cwd: tmp, stdio: "ignore" });

		const workflowId = `wf_review_missing_${Date.now()}`;
		const reviewResp = await fetch(`${baseUrl}/v1/orchestrator/review/comment`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				workflowId,
				repoPath: tmp,
				issueId: "199",
				branchName: "rina/fix-199",
				comment: "adjust wording",
				command: "printf 'reconcile\\n' >> README.md",
				prDryRun: true,
			}),
		});
		assert.equal(reviewResp.status, 200);
		const reviewBody = await reviewResp.json();
		assert.equal(reviewBody.ok, true);

		const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
		assert.equal(graphResp.status, 200);
		const graphBody = await graphResp.json();
		assert.equal(graphBody.ok, true);
		const workflowNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${workflowId}`);
		assert.ok(workflowNode);
		assert.equal(workflowNode.type, "workflow");
		assert.equal(workflowNode.data.state, "needs_revision");
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("workflow state machine rejects invalid CI transition regression", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "260",
			repoPath: process.cwd(),
			command: "echo transition-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const passed = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			provider: "github-actions",
			status: "passed",
		}),
	});
	assert.equal(passed.status, 200);

	const queued = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			provider: "github-actions",
			status: "queued",
		}),
	});
	assert.equal(queued.status, 200);

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "verified");
	assert.ok(wfNode.data.lastTransitionRejected);
	assert.equal(wfNode.data.lastTransitionRejected.from, "verified");
	assert.equal(wfNode.data.lastTransitionRejected.to, "active");
});

test("POST /v1/orchestrator/github/pr-status merged marks workflow completed", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "261",
			repoPath: process.cwd(),
			command: "echo merge-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const opened = await fetch(`${baseUrl}/v1/orchestrator/github/pr-status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			status: "opened",
			repoSlug: "owner/repo",
			branchName: "rina/fix-261",
			number: 261,
			url: "https://github.com/owner/repo/pull/261",
			mode: "live",
		}),
	});
	assert.equal(opened.status, 200);
	const openedBody = await opened.json();
	assert.equal(openedBody.ok, true);

	const merged = await fetch(`${baseUrl}/v1/orchestrator/github/pr-status`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			status: "merged",
			repoSlug: "owner/repo",
			branchName: "rina/fix-261",
			number: 261,
			url: "https://github.com/owner/repo/pull/261",
			mode: "live",
		}),
	});
	assert.equal(merged.status, 200);
	const mergedBody = await merged.json();
	assert.equal(mergedBody.ok, true);

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "completed");
});

test("POST /v1/orchestrator/github/event maps pull_request closed+merged to completed workflow", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "262",
			repoPath: process.cwd(),
			command: "echo webhook-pr-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const eventResp = await fetch(`${baseUrl}/v1/orchestrator/github/event`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			event: "pull_request",
			workflowId: startBody.workflowId,
			action: "closed",
			merged: true,
			repoSlug: "owner/repo",
			branchName: "rina/fix-262",
			number: 262,
			url: "https://github.com/owner/repo/pull/262",
			mode: "live",
		}),
	});
	assert.equal(eventResp.status, 200);
	const eventBody = await eventResp.json();
	assert.equal(eventBody.ok, true);
	assert.equal(eventBody.mapped, "pr_status");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "completed");
});

test("POST /v1/orchestrator/github/event maps ci failure to blocked state", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "263",
			repoPath: process.cwd(),
			command: "echo webhook-ci-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const eventResp = await fetch(`${baseUrl}/v1/orchestrator/github/event`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			event: "ci",
			workflowId: startBody.workflowId,
			ciProvider: "github-actions",
			ciStatus: "failure",
			url: "https://ci.example/runs/263",
		}),
	});
	assert.equal(eventResp.status, 200);
	const eventBody = await eventResp.json();
	assert.equal(eventBody.ok, true);
	assert.equal(eventBody.mapped, "ci_status");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	assert.equal(graphBody.ok, true);
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "blocked");
});

test("POST /v1/orchestrator/github/webhook maps pull_request merged event", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "264",
			repoPath: process.cwd(),
			command: "echo webhook-raw-pr-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const webhookResp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-github-event": "pull_request",
		},
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			repository: { full_name: "owner/repo" },
			action: "closed",
			pull_request: {
				number: 264,
				merged: true,
				head: { ref: "rina/fix-264" },
				html_url: "https://github.com/owner/repo/pull/264",
			},
		}),
	});
	assert.equal(webhookResp.status, 200);
	const webhookBody = await webhookResp.json();
	assert.equal(webhookBody.ok, true);
	assert.equal(webhookBody.mapped, "pr_status");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "completed");
});

test("POST /v1/orchestrator/github/webhook maps workflow_run failure to blocked", async () => {
	const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			issueId: "265",
			repoPath: process.cwd(),
			command: "echo webhook-raw-ci-seed",
		}),
	});
	assert.equal(start.status, 200);
	const startBody = await start.json();
	assert.equal(startBody.ok, true);

	const webhookResp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-github-event": "workflow_run",
		},
		body: JSON.stringify({
			workflowId: startBody.workflowId,
			workflow_run: {
				status: "completed",
				conclusion: "failure",
				html_url: "https://github.com/owner/repo/actions/runs/265",
			},
		}),
	});
	assert.equal(webhookResp.status, 200);
	const webhookBody = await webhookResp.json();
	assert.equal(webhookBody.ok, true);
	assert.equal(webhookBody.mapped, "ci_status");

	const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`);
	assert.equal(graphResp.status, 200);
	const graphBody = await graphResp.json();
	const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`);
	assert.ok(wfNode);
	assert.equal(wfNode.data.state, "blocked");
});
