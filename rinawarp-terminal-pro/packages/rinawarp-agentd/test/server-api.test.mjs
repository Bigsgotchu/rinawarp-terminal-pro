import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "../dist/server.js";

let server;
let baseUrl;

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
	server = createServer({ port: 0 });
	const port = await server.listen();
	baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
	if (server) {
		await server.close();
	}
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
