import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { resolveRequestLicense } from "../dist/license.js";

function reqWithHeaders(headers = {}) {
	return { headers };
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

function clearLicenseEnv() {
	delete process.env.NODE_ENV;
	delete process.env.RINAWARP_AGENTD_LICENSE;
	delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER;
	delete process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET;
}

test("defaults to starter when no env/header override is active", () => {
	clearLicenseEnv();
	const tier = resolveRequestLicense(reqWithHeaders());
	assert.equal(tier, "starter");
});

test("uses env license when provided and valid", () => {
	clearLicenseEnv();
	process.env.RINAWARP_AGENTD_LICENSE = "founder";
	const tier = resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license": "starter" }));
	assert.equal(tier, "founder");
	clearLicenseEnv();
});

test("ignores header override by default (no allow flag)", () => {
	clearLicenseEnv();
	const tier = resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license": "enterprise" }));
	assert.equal(tier, "starter");
});

test("production mode does not permit header override path", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER = "true";
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license": "enterprise" })),
		/missing RINAWARP_AGENTD_ENTITLEMENT_SECRET in production/i,
	);
	clearLicenseEnv();
});

test("allows header override only in non-production when allow flag is enabled", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "development";
	process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER = "true";
	const tier = resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license": "pioneer" }));
	assert.equal(tier, "pioneer");
	clearLicenseEnv();
});

test("throws on invalid env tier", () => {
	clearLicenseEnv();
	process.env.RINAWARP_AGENTD_LICENSE = "invalid-tier";
	assert.throws(() => resolveRequestLicense(reqWithHeaders()), /invalid RINAWARP_AGENTD_LICENSE/i);
	clearLicenseEnv();
});

test("throws on invalid header tier when header override is enabled", () => {
	clearLicenseEnv();
	process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER = "1";
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license": "invalid-tier" })),
		/invalid x-rinawarp-license/i,
	);
	clearLicenseEnv();
});

test("accepts valid signed license token in non-production", () => {
	clearLicenseEnv();
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";
	const token = signLicenseToken(
		{ typ: "license", tier: "enterprise", exp: Date.now() + 60_000, customer_id: "cus_123" },
		process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET,
	);
	const tier = resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license-token": token }));
	assert.equal(tier, "enterprise");
	clearLicenseEnv();
});

test("rejects signed token when secret is missing", () => {
	clearLicenseEnv();
	const token = signLicenseToken({ typ: "license", tier: "pro", exp: Date.now() + 60_000 }, "test-secret");
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license-token": token })),
		/RINAWARP_AGENTD_ENTITLEMENT_SECRET is not configured/i,
	);
	clearLicenseEnv();
});

test("production mode requires entitlement secret", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "production";
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders()),
		/missing RINAWARP_AGENTD_ENTITLEMENT_SECRET in production/i,
	);
	clearLicenseEnv();
});

test("production mode requires signed license token", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders()),
		/missing x-rinawarp-license-token/i,
	);
	clearLicenseEnv();
});

test("production mode accepts valid signed entitlement token", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";
	const token = signLicenseToken({ typ: "license", tier: "pioneer", exp: Date.now() + 60_000 }, "test-secret");
	const tier = resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license-token": token }));
	assert.equal(tier, "pioneer");
	clearLicenseEnv();
});

test("production mode rejects invalid entitlement signature", () => {
	clearLicenseEnv();
	process.env.NODE_ENV = "production";
	process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = "test-secret";
	const token = signLicenseToken({ typ: "license", tier: "pioneer", exp: Date.now() + 60_000 }, "wrong-secret");
	assert.throws(
		() => resolveRequestLicense(reqWithHeaders({ "x-rinawarp-license-token": token })),
		/invalid license token signature/i,
	);
	clearLicenseEnv();
});
