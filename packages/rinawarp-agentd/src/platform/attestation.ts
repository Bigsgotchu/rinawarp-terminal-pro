import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

type AttestationState = {
  version: 1;
  enabled: boolean;
  bucket?: string;
  region?: string;
  webhook_url?: string;
  alert_webhook_url?: string;
  last_run_at?: string;
  last_result?: "ok" | "error";
};

function stateFile(): string {
  return path.join(paths().baseDir, "attestation-state.json");
}

function attestLogFile(): string {
  return path.join(paths().baseDir, "soc2-audit.ndjson");
}

function digestFile(): string {
  return path.join(paths().baseDir, "soc2-digest.json");
}

function attestationOutFile(): string {
  return path.join(paths().baseDir, "soc2-attestations.ndjson");
}

function loadState(): AttestationState {
  const fp = stateFile();
  if (!fs.existsSync(fp)) return { version: 1, enabled: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as AttestationState;
    if (!parsed || parsed.version !== 1) return { version: 1, enabled: false };
    return parsed;
  } catch {
    return { version: 1, enabled: false };
  }
}

function saveState(state: AttestationState): void {
  const fp = stateFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function currentDigest(): string {
  const fp = digestFile();
  if (!fs.existsSync(fp)) return "GENESIS";
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as { last_hash?: string };
    return String(parsed.last_hash || "GENESIS");
  } catch {
    return "GENESIS";
  }
}

export function configureAttestation(args: {
  enabled?: boolean;
  bucket?: string;
  region?: string;
  webhook_url?: string;
  alert_webhook_url?: string;
}) {
  const current = loadState();
  const next: AttestationState = {
    ...current,
    ...(typeof args.enabled === "boolean" ? { enabled: args.enabled } : {}),
    ...(args.bucket ? { bucket: args.bucket } : {}),
    ...(args.region ? { region: args.region } : {}),
    ...(args.webhook_url ? { webhook_url: args.webhook_url } : {}),
    ...(args.alert_webhook_url ? { alert_webhook_url: args.alert_webhook_url } : {}),
  };
  saveState(next);
  return next;
}

export function getAttestationState() {
  return loadState();
}

export async function runAttestation(force = false): Promise<{
  ok: boolean;
  digest: string;
  record_hash: string;
  uploaded?: boolean;
  posted_webhook?: boolean;
  error?: string;
}> {
  const state = loadState();
  if (!force && !state.enabled) return { ok: false, digest: "GENESIS", record_hash: "", error: "attestation_disabled" };
  const logPath = attestLogFile();
  if (!fs.existsSync(logPath)) return { ok: false, digest: "GENESIS", record_hash: "", error: "soc2_log_not_found" };
  const digest = currentDigest();
  const logStats = fs.statSync(logPath);
  const record = {
    ts: new Date().toISOString(),
    digest,
    log_size: logStats.size,
    source: "rinawarp-agentd",
  };
  const recordHash = crypto.createHash("sha256").update(JSON.stringify(record), "utf8").digest("hex");
  const line = JSON.stringify({ ...record, record_hash: recordHash });
  fs.appendFileSync(attestationOutFile(), `${line}\n`, "utf8");

  let uploaded = false;
  let postedWebhook = false;
  if (state.bucket) {
    try {
      const key = `attestations/${record.ts.replace(/[:.]/g, "-")}.json`;
      await putAttestationObject({
        bucket: state.bucket,
        key,
        body: Buffer.from(`${line}\n`, "utf8"),
        region: state.region,
      });
      uploaded = true;
    } catch {
      uploaded = false;
    }
  }
  if (state.webhook_url) {
    try {
      const res = await fetch(state.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, record_hash: recordHash }),
      });
      postedWebhook = res.ok;
    } catch {
      postedWebhook = false;
    }
  }

  saveState({
    ...state,
    last_run_at: new Date().toISOString(),
    last_result: "ok",
  });

  return {
    ok: true,
    digest,
    record_hash: recordHash,
    uploaded,
    posted_webhook: postedWebhook,
  };
}

export async function verifyAttestationChain(): Promise<{
  ok: boolean;
  total: number;
  invalid: number;
  latest_digest?: string;
}> {
  const fp = attestationOutFile();
  if (!fs.existsSync(fp)) return { ok: true, total: 0, invalid: 0 };
  const raw = fs.readFileSync(fp, "utf8");
  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  let invalid = 0;
  let latestDigest = "";
  for (const line of lines) {
    try {
      const rec = JSON.parse(line) as {
        ts?: string;
        digest?: string;
        log_size?: number;
        source?: string;
        record_hash?: string;
      };
      latestDigest = String(rec.digest || latestDigest);
      const expected = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            ts: rec.ts,
            digest: rec.digest,
            log_size: rec.log_size,
            source: rec.source,
          }),
          "utf8",
        )
        .digest("hex");
      if (expected !== String(rec.record_hash || "")) invalid += 1;
    } catch {
      invalid += 1;
    }
  }
  const ok = invalid === 0;
  if (!ok) {
    const state = loadState();
    if (state.alert_webhook_url) {
      try {
        await fetch(state.alert_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "attestation_verification_failed",
            ts: new Date().toISOString(),
            invalid,
            total: lines.length,
          }),
        });
      } catch {
        // no-op
      }
    }
  }
  return {
    ok,
    total: lines.length,
    invalid,
    ...(latestDigest ? { latest_digest: latestDigest } : {}),
  };
}

async function putAttestationObject(args: {
  bucket: string;
  key: string;
  body: Buffer;
  region?: string;
}) {
  const s3 = await loadS3Client(args.region);
  await s3.client.send(
    new s3.PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      Body: args.body,
      ServerSideEncryption: "AES256",
    }),
  );
}

let s3ClientCache: null | { client: any; PutObjectCommand: any } = null;

async function loadS3Client(region?: string): Promise<{ client: any; PutObjectCommand: any }> {
  if (s3ClientCache) return s3ClientCache;
  const importer = new Function("m", "return import(m);") as (m: string) => Promise<any>;
  const mod = await importer("@aws-sdk/client-s3");
  const client = new mod.S3Client({
    region: region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  });
  s3ClientCache = {
    client,
    PutObjectCommand: mod.PutObjectCommand,
  };
  return s3ClientCache;
}
