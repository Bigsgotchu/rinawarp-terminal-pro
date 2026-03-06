import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

type VaultRecord = {
  id: string;
  workspace_id: string;
  key_version: number;
  encrypted_data_key: string;
  iv: string;
  ciphertext: string;
  provider: "local" | "aws-kms";
  created_at: string;
  updated_at: string;
};

type VaultState = {
  version: 1;
  key_version: number;
  records: Record<string, VaultRecord>;
};

function filePath(): string {
  return path.join(paths().baseDir, "vault.json");
}

function provider(): "local" | "aws-kms" {
  const value = String(process.env.RINAWARP_VAULT_PROVIDER || "local").trim().toLowerCase();
  return value === "aws-kms" ? "aws-kms" : "local";
}

function masterKey(version = 1): Buffer {
  const envKey = process.env.RINAWARP_VAULT_MASTER_KEY || "";
  if (envKey.trim()) {
    const hash = crypto.createHash("sha256").update(`${envKey}:${version}`, "utf8").digest();
    return hash;
  }
  return crypto.createHash("sha256").update(`rinawarp-vault-dev-key:${version}`, "utf8").digest();
}

function loadState(): VaultState {
  const fp = filePath();
  if (!fs.existsSync(fp)) return { version: 1, key_version: 1, records: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as VaultState;
    if (!parsed || parsed.version !== 1) return { version: 1, key_version: 1, records: {} };
    return { version: 1, key_version: parsed.key_version || 1, records: parsed.records || {} };
  } catch {
    return { version: 1, key_version: 1, records: {} };
  }
}

function saveState(state: VaultState): void {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function encryptWithDataKey(token: string, dataKey: Buffer): { iv: string; ciphertext: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([tag, encrypted]).toString("base64"),
  };
}

function decryptWithDataKey(record: VaultRecord, dataKey: Buffer): string {
  const payload = Buffer.from(record.ciphertext, "base64");
  const tag = payload.subarray(0, 16);
  const encrypted = payload.subarray(16);
  const iv = Buffer.from(record.iv, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function wrapDataKeyLocal(dataKey: Buffer, keyVersion: number): string {
  const wrappedIv = crypto.randomBytes(12);
  const wrapCipher = crypto.createCipheriv("aes-256-gcm", masterKey(keyVersion), wrappedIv);
  const wrapped = Buffer.concat([wrapCipher.update(dataKey), wrapCipher.final()]);
  const wrappedTag = wrapCipher.getAuthTag();
  return Buffer.concat([wrappedIv, wrappedTag, wrapped]).toString("base64");
}

function unwrapDataKeyLocal(bundleBase64: string, keyVersion: number): Buffer {
  const wrappedBundle = Buffer.from(bundleBase64, "base64");
  const wrappedIv = wrappedBundle.subarray(0, 12);
  const wrappedTag = wrappedBundle.subarray(12, 28);
  const wrapped = wrappedBundle.subarray(28);
  const unwrap = crypto.createDecipheriv("aes-256-gcm", masterKey(keyVersion), wrappedIv);
  unwrap.setAuthTag(wrappedTag);
  return Buffer.concat([unwrap.update(wrapped), unwrap.final()]);
}

async function kmsGenerateDataKey(): Promise<{ plaintext: Buffer; encrypted: string }> {
  const keyId = String(process.env.RINAWARP_AWS_KMS_KEY_ID || "").trim();
  if (!keyId) throw new Error("kms_key_id_required");
  const kms = await loadKmsClient();
  const cmd = new kms.GenerateDataKeyCommand({
    KeyId: keyId,
    KeySpec: "AES_256",
  });
  const out = await kms.client.send(cmd);
  const plaintext = out.Plaintext ? Buffer.from(out.Plaintext as Uint8Array) : null;
  const ciphertextBlob = out.CiphertextBlob ? Buffer.from(out.CiphertextBlob as Uint8Array) : null;
  if (!plaintext || !ciphertextBlob) throw new Error("kms_generate_data_key_failed");
  return {
    plaintext,
    encrypted: ciphertextBlob.toString("base64"),
  };
}

async function kmsDecryptDataKey(encryptedKey: string): Promise<Buffer> {
  const kms = await loadKmsClient();
  const cmd = new kms.DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedKey, "base64"),
  });
  const out = await kms.client.send(cmd);
  if (!out.Plaintext) throw new Error("kms_decrypt_failed");
  return Buffer.from(out.Plaintext as Uint8Array);
}

let kmsClientCache: null | { client: any; GenerateDataKeyCommand: any; DecryptCommand: any } = null;

async function loadKmsClient(): Promise<{ client: any; GenerateDataKeyCommand: any; DecryptCommand: any }> {
  if (kmsClientCache) return kmsClientCache;
  const importer = new Function("m", "return import(m);") as (m: string) => Promise<any>;
  const mod = await importer("@aws-sdk/client-kms");
  const client = new mod.KMSClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  });
  kmsClientCache = {
    client,
    GenerateDataKeyCommand: mod.GenerateDataKeyCommand,
    DecryptCommand: mod.DecryptCommand,
  };
  return kmsClientCache;
}

async function encryptToken(token: string, keyVersion: number): Promise<Pick<VaultRecord, "encrypted_data_key" | "iv" | "ciphertext" | "provider">> {
  if (provider() === "aws-kms") {
    const kms = await kmsGenerateDataKey();
    const encryptedPayload = encryptWithDataKey(token, kms.plaintext);
    return {
      provider: "aws-kms",
      encrypted_data_key: kms.encrypted,
      iv: encryptedPayload.iv,
      ciphertext: encryptedPayload.ciphertext,
    };
  }
  const dataKey = crypto.randomBytes(32);
  const payload = encryptWithDataKey(token, dataKey);
  return {
    provider: "local",
    encrypted_data_key: wrapDataKeyLocal(dataKey, keyVersion),
    iv: payload.iv,
    ciphertext: payload.ciphertext,
  };
}

async function decryptToken(record: VaultRecord): Promise<string> {
  if (record.provider === "aws-kms") {
    const dataKey = await kmsDecryptDataKey(record.encrypted_data_key);
    return decryptWithDataKey(record, dataKey);
  }
  const dataKey = unwrapDataKeyLocal(record.encrypted_data_key, record.key_version);
  return decryptWithDataKey(record, dataKey);
}

export async function vaultStore(args: {
  id?: string;
  workspace_id: string;
  token: string;
}): Promise<{ id: string; key_version: number; provider: "local" | "aws-kms" }> {
  const state = loadState();
  const id = String(args.id || `vlt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`);
  const encrypted = await encryptToken(String(args.token), state.key_version);
  const now = new Date().toISOString();
  state.records[id] = {
    id,
    workspace_id: String(args.workspace_id),
    key_version: state.key_version,
    ...encrypted,
    created_at: state.records[id]?.created_at || now,
    updated_at: now,
  };
  saveState(state);
  return { id, key_version: state.key_version, provider: encrypted.provider };
}

export async function vaultRetrieve(id: string): Promise<{ id: string; token: string; key_version: number } | null> {
  const state = loadState();
  const record = state.records[String(id)];
  if (!record) return null;
  const token = await decryptToken(record);
  return { id: record.id, token, key_version: record.key_version };
}

export async function vaultRotate(): Promise<{ key_version: number; rotated: number }> {
  const state = loadState();
  const nextVersion = state.key_version + 1;
  let rotated = 0;
  for (const record of Object.values(state.records)) {
    const token = await decryptToken(record);
    const encrypted = await encryptToken(token, nextVersion);
    record.key_version = nextVersion;
    record.encrypted_data_key = encrypted.encrypted_data_key;
    record.iv = encrypted.iv;
    record.ciphertext = encrypted.ciphertext;
    record.provider = encrypted.provider;
    record.updated_at = new Date().toISOString();
    rotated += 1;
  }
  state.key_version = nextVersion;
  saveState(state);
  return { key_version: nextVersion, rotated };
}
