import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { paths } from "../daemon/state.js";

type ArchiveState = {
  version: 1;
  enabled: boolean;
  bucket?: string;
  region?: string;
  object_lock_mode?: "GOVERNANCE" | "COMPLIANCE";
  object_lock_days?: number;
  last_run_at?: string;
  last_result?: string;
};

function stateFile(): string {
  return path.join(paths().baseDir, "archive-state.json");
}

function soc2LogFile(): string {
  return path.join(paths().baseDir, "soc2-audit.ndjson");
}

function archiveDir(): string {
  return path.join(paths().baseDir, "archive");
}

function loadState(): ArchiveState {
  const fp = stateFile();
  if (!fs.existsSync(fp)) return { version: 1, enabled: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as ArchiveState;
    if (!parsed || parsed.version !== 1) return { version: 1, enabled: false };
    return parsed;
  } catch {
    return { version: 1, enabled: false };
  }
}

function saveState(state: ArchiveState): void {
  const fp = stateFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function configureArchive(args: {
  enabled?: boolean;
  bucket?: string;
  region?: string;
  object_lock_mode?: "GOVERNANCE" | "COMPLIANCE";
  object_lock_days?: number;
}) {
  const current = loadState();
  const next: ArchiveState = {
    ...current,
    ...(typeof args.enabled === "boolean" ? { enabled: args.enabled } : {}),
    ...(args.bucket ? { bucket: args.bucket } : {}),
    ...(args.region ? { region: args.region } : {}),
    ...(args.object_lock_mode ? { object_lock_mode: args.object_lock_mode } : {}),
    ...(Number.isFinite(args.object_lock_days) ? { object_lock_days: Number(args.object_lock_days) } : {}),
  };
  saveState(next);
  return next;
}

export function getArchiveState() {
  return loadState();
}

export async function runArchiveJob(force = false): Promise<{
  ok: boolean;
  archived_file?: string;
  sha256?: string;
  uploaded?: boolean;
  upload_etag?: string;
  upload_version_id?: string;
  error?: string;
}> {
  const state = loadState();
  if (!force && !state.enabled) return { ok: false, error: "archive_disabled" };
  const src = soc2LogFile();
  if (!fs.existsSync(src)) return { ok: false, error: "soc2_log_not_found" };
  const raw = fs.readFileSync(src);
  const sha = crypto.createHash("sha256").update(raw).digest("hex");
  const gz = gzipSync(raw);
  fs.mkdirSync(archiveDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(archiveDir(), `soc2-audit-${stamp}.ndjson.gz`);
  fs.writeFileSync(out, gz);

  let uploaded = false;
  let uploadEtag: string | undefined;
  let uploadVersionId: string | undefined;
  if (state.bucket) {
    try {
      const objectKey = `soc2/${path.basename(out)}`;
      const upload = await putObjectViaSdk({
        bucket: state.bucket,
        key: objectKey,
        body: fs.readFileSync(out),
        objectLockMode: state.object_lock_mode,
        objectLockDays: state.object_lock_days,
        region: state.region,
      });
      uploaded = Boolean(upload?.etag && upload?.versionId);
      uploadEtag = upload?.etag;
      uploadVersionId = upload?.versionId;
    } catch {
      uploaded = false;
    }
  }

  state.last_run_at = new Date().toISOString();
  state.last_result = uploaded ? "uploaded" : "archived_local";
  saveState(state);

  // rotate/clear current log only after successful local archive creation.
  fs.writeFileSync(src, "", "utf8");
  return {
    ok: true,
    archived_file: out,
    sha256: sha,
    uploaded,
    ...(uploadEtag ? { upload_etag: uploadEtag } : {}),
    ...(uploadVersionId ? { upload_version_id: uploadVersionId } : {}),
  };
}

export async function provisionArchiveBucket(args: {
  bucket: string;
  region?: string;
  objectLockMode?: "GOVERNANCE" | "COMPLIANCE";
  retentionDays?: number;
}): Promise<{ ok: boolean; bucket: string; error?: string }> {
  try {
    const s3 = await loadS3Client(args.region);
    const bucket = args.bucket;
    const mode = args.objectLockMode || "GOVERNANCE";
    const retentionDays = Math.max(1, Number(args.retentionDays || 90));

    await s3.client.send(
      new s3.CreateBucketCommand({
        Bucket: bucket,
        ...(args.region && args.region !== "us-east-1"
          ? { CreateBucketConfiguration: { LocationConstraint: args.region } }
          : {}),
        ObjectLockEnabledForBucket: true,
      }),
    );
    await s3.client.send(
      new s3.PutBucketVersioningCommand({
        Bucket: bucket,
        VersioningConfiguration: { Status: "Enabled" },
      }),
    );
    await s3.client.send(
      new s3.PutObjectLockConfigurationCommand({
        Bucket: bucket,
        ObjectLockConfiguration: {
          ObjectLockEnabled: "Enabled",
          Rule: {
            DefaultRetention: {
              Mode: mode,
              Days: retentionDays,
            },
          },
        },
      }),
    );
    await s3.client.send(
      new s3.PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: "rinawarp-audit-lifecycle",
              Status: "Enabled",
              Filter: { Prefix: "" },
              Transitions: [{ Days: 90, StorageClass: "GLACIER" }],
              Expiration: { Days: 2555 },
            },
          ],
        },
      }),
    );
    await s3.client.send(
      new s3.PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    return { ok: true, bucket };
  } catch (error) {
    return { ok: false, bucket: args.bucket, error: error instanceof Error ? error.message : String(error) };
  }
}

async function putObjectViaSdk(args: {
  bucket: string;
  key: string;
  body: Buffer;
  objectLockMode?: "GOVERNANCE" | "COMPLIANCE";
  objectLockDays?: number;
  region?: string;
}): Promise<{ etag?: string; versionId?: string }> {
  const s3 = await loadS3Client(args.region);
  const retainUntil =
    args.objectLockDays && args.objectLockDays > 0
      ? new Date(Date.now() + args.objectLockDays * 24 * 60 * 60 * 1000)
      : undefined;
  const out = await s3.client.send(
    new s3.PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      Body: args.body,
      ServerSideEncryption: "AES256",
      ...(args.objectLockMode ? { ObjectLockMode: args.objectLockMode } : {}),
      ...(retainUntil ? { ObjectLockRetainUntilDate: retainUntil } : {}),
    }),
  );
  return {
    etag: typeof out?.ETag === "string" ? out.ETag : undefined,
    versionId: typeof out?.VersionId === "string" ? out.VersionId : undefined,
  };
}

let s3ClientCache: null | {
  client: any;
  CreateBucketCommand: any;
  PutBucketVersioningCommand: any;
  PutObjectLockConfigurationCommand: any;
  PutBucketLifecycleConfigurationCommand: any;
  PutPublicAccessBlockCommand: any;
  PutObjectCommand: any;
} = null;

async function loadS3Client(region?: string): Promise<{
  client: any;
  CreateBucketCommand: any;
  PutBucketVersioningCommand: any;
  PutObjectLockConfigurationCommand: any;
  PutBucketLifecycleConfigurationCommand: any;
  PutPublicAccessBlockCommand: any;
  PutObjectCommand: any;
}> {
  if (s3ClientCache) return s3ClientCache;
  const importer = new Function("m", "return import(m);") as (m: string) => Promise<any>;
  const mod = await importer("@aws-sdk/client-s3");
  const client = new mod.S3Client({
    region: region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  });
  s3ClientCache = {
    client,
    CreateBucketCommand: mod.CreateBucketCommand,
    PutBucketVersioningCommand: mod.PutBucketVersioningCommand,
    PutObjectLockConfigurationCommand: mod.PutObjectLockConfigurationCommand,
    PutBucketLifecycleConfigurationCommand: mod.PutBucketLifecycleConfigurationCommand,
    PutPublicAccessBlockCommand: mod.PutPublicAccessBlockCommand,
    PutObjectCommand: mod.PutObjectCommand,
  };
  return s3ClientCache;
}
