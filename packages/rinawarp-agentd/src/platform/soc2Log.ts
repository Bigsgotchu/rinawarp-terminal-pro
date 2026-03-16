import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type Soc2Event = {
  request_id: string
  user_id: string
  workspace_id: string
  ip: string
  action: string
  result: string
  timestamp: string
  details?: Record<string, unknown>
}

function logFile(): string {
  return path.join(paths().baseDir, 'soc2-audit.ndjson')
}

function digestFile(): string {
  return path.join(paths().baseDir, 'soc2-digest.json')
}

function readLastHash(): string {
  const fp = digestFile()
  if (!fs.existsSync(fp)) return 'GENESIS'
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as { last_hash?: string }
    return parsed.last_hash || 'GENESIS'
  } catch {
    return 'GENESIS'
  }
}

function writeLastHash(lastHash: string): void {
  const fp = digestFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(
    fp,
    `${JSON.stringify({ last_hash: lastHash, updated_at: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  )
}

export function appendSoc2Event(evt: Soc2Event): { chain_hash: string } {
  const prev = readLastHash()
  const payload = JSON.stringify(evt)
  const chainHash = crypto.createHash('sha256').update(`${prev}:${payload}`, 'utf8').digest('hex')
  const line = JSON.stringify({
    ...evt,
    previous_hash: prev,
    chain_hash: chainHash,
  })
  const fp = logFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.appendFileSync(fp, `${line}\n`, 'utf8')
  writeLastHash(chainHash)
  return { chain_hash: chainHash }
}
