import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type AttestationRecord = {
  ts?: string
  digest?: string
  log_size?: number
  source?: string
  record_hash?: string
}

function defaultInputPath(): string {
  return path.join(paths().baseDir, 'soc2-attestations.ndjson')
}

export function parseS3Uri(uri: string): { bucket: string; key: string } | null {
  const raw = String(uri || '').trim()
  if (!raw.startsWith('s3://')) return null
  const noScheme = raw.slice('s3://'.length)
  const slash = noScheme.indexOf('/')
  if (slash <= 0 || slash === noScheme.length - 1) return null
  const bucket = noScheme.slice(0, slash).trim()
  const key = noScheme.slice(slash + 1).trim()
  if (!bucket || !key) return null
  return { bucket, key }
}

function canonicalRecord(rec: AttestationRecord): string {
  return JSON.stringify({
    ts: rec.ts,
    digest: rec.digest,
    log_size: rec.log_size,
    source: rec.source,
  })
}

function expectedRecordHash(rec: AttestationRecord): string {
  return crypto.createHash('sha256').update(canonicalRecord(rec), 'utf8').digest('hex')
}

export function verifyAttestationLines(lines: string[]): {
  ok: boolean
  total: number
  invalid: number
  latest_digest?: string
} {
  let invalid = 0
  let latestDigest = ''
  for (const raw of lines) {
    const line = String(raw || '').trim()
    if (!line) continue
    try {
      const rec = JSON.parse(line) as AttestationRecord
      const expected = expectedRecordHash(rec)
      if (expected !== String(rec.record_hash || '')) {
        invalid += 1
        continue
      }
      if (rec.digest) latestDigest = String(rec.digest)
    } catch {
      invalid += 1
    }
  }
  return {
    ok: invalid === 0,
    total: lines.filter((x) => String(x || '').trim().length > 0).length,
    invalid,
    ...(latestDigest ? { latest_digest: latestDigest } : {}),
  }
}

export function verifyAttestationFile(filePath?: string): {
  ok: boolean
  total: number
  invalid: number
  latest_digest?: string
  source_file: string
  error?: string
} {
  const src = String(filePath || process.env.RINAWARP_VERIFIER_INPUT || defaultInputPath()).trim()
  if (!fs.existsSync(src)) {
    return { ok: false, total: 0, invalid: 0, source_file: src, error: 'attestation_file_not_found' }
  }
  try {
    const lines = fs.readFileSync(src, 'utf8').split('\n')
    const out = verifyAttestationLines(lines)
    return {
      ...out,
      source_file: src,
    }
  } catch (error) {
    return {
      ok: false,
      total: 0,
      invalid: 0,
      source_file: src,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function readAttestationLinesFromS3(s3Uri: string): Promise<{ lines: string[]; source: string }> {
  const parsed = parseS3Uri(s3Uri)
  if (!parsed) throw new Error('invalid_s3_uri')
  const importer = new Function('m', 'return import(m);') as (m: string) => Promise<any>
  const mod = await importer('@aws-sdk/client-s3')
  const s3 = new mod.S3Client({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  })
  const out = await s3.send(
    new mod.GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    })
  )
  const body = out?.Body
  if (!body) throw new Error('s3_object_body_missing')
  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return {
    lines: text.split('\n'),
    source: s3Uri,
  }
}

export async function runExternalVerifier(args?: { filePath?: string; alertWebhook?: string }) {
  const s3Uri = String(process.env.RINAWARP_VERIFIER_INPUT_S3_URI || '').trim()
  let result:
    | {
        ok: boolean
        total: number
        invalid: number
        latest_digest?: string
        source_file: string
        error?: string
      }
    | {
        ok: boolean
        total: number
        invalid: number
        latest_digest?: string
        source_file: string
      }
  if (s3Uri) {
    try {
      const { lines, source } = await readAttestationLinesFromS3(s3Uri)
      const out = verifyAttestationLines(lines)
      result = {
        ...out,
        source_file: source,
      }
    } catch (error) {
      result = {
        ok: false,
        total: 0,
        invalid: 0,
        source_file: s3Uri,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  } else {
    result = verifyAttestationFile(args?.filePath)
  }
  const alertWebhook = String(args?.alertWebhook || process.env.RINAWARP_VERIFIER_ALERT_WEBHOOK || '').trim()
  if (!result.ok && alertWebhook) {
    try {
      await fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'external_attestation_verifier_failed',
          ts: new Date().toISOString(),
          ...result,
        }),
      })
    } catch {
      // no-op
    }
  }
  return result
}
