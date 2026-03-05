import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

function mkRecord(rec) {
	const base = JSON.stringify({
		ts: rec.ts,
		digest: rec.digest,
		log_size: rec.log_size,
		source: rec.source,
	});
	const record_hash = crypto.createHash("sha256").update(base, "utf8").digest("hex");
	return JSON.stringify({ ...rec, record_hash });
}

test("external attestation verifier validates good records", async () => {
	const verifier = await import(`../dist/platform/attestationVerifier.js?ts=${Date.now()}`);
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-att-verify-"));
	try {
		const fp = path.join(tmp, "att.ndjson");
		const line = mkRecord({
			ts: new Date().toISOString(),
			digest: "abc123",
			log_size: 10,
			source: "rinawarp-agentd",
		});
		fs.writeFileSync(fp, `${line}\n`, "utf8");
		const out = verifier.verifyAttestationFile(fp);
		assert.equal(out.ok, true);
		assert.equal(out.invalid, 0);
		assert.equal(out.total, 1);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("external attestation verifier flags tampered records", async () => {
	const verifier = await import(`../dist/platform/attestationVerifier.js?ts=${Date.now()}`);
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-att-verify-bad-"));
	try {
		const fp = path.join(tmp, "att.ndjson");
		const bad = JSON.stringify({
			ts: new Date().toISOString(),
			digest: "tampered",
			log_size: 10,
			source: "rinawarp-agentd",
			record_hash: "deadbeef",
		});
		fs.writeFileSync(fp, `${bad}\n`, "utf8");
		const out = verifier.verifyAttestationFile(fp);
		assert.equal(out.ok, false);
		assert.equal(out.invalid, 1);
		assert.equal(out.total, 1);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("parseS3Uri parses valid s3 uri", async () => {
	const verifier = await import(`../dist/platform/attestationVerifier.js?ts=${Date.now()}`);
	const parsed = verifier.parseS3Uri("s3://bucket-a/path/to/object.ndjson");
	assert.ok(parsed);
	assert.equal(parsed.bucket, "bucket-a");
	assert.equal(parsed.key, "path/to/object.ndjson");
});
