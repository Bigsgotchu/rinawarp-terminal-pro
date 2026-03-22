import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import type { CommandRunRecord, InvertedIndex, SessionMeta } from './structured-session-types.js'

export function nowIso(): string {
  return new Date().toISOString()
}

export function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

export function appendNdjson(file: string, data: unknown): void {
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, 'utf8')
}

export function safeWriteJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

export function stableMachineId(): string {
  const seed = `${os.hostname()}|${os.platform()}|${os.arch()}`
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)
}

export function sessionDir(rootDir: string, sessionId: string): string {
  return path.join(rootDir, 'sessions', sessionId)
}

export function commandsFile(rootDir: string, sessionId: string): string {
  const dir = sessionDir(rootDir, sessionId)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'commands.ndjson')
}

export function artifactsFile(rootDir: string, sessionId: string): string {
  const dir = sessionDir(rootDir, sessionId)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'artifacts.ndjson')
}

export function edgesFile(rootDir: string, sessionId: string): string {
  const dir = sessionDir(rootDir, sessionId)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'edges.ndjson')
}

export function searchFile(rootDir: string, sessionId: string): string {
  const dir = sessionDir(rootDir, sessionId)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'search.ndjson')
}

export function searchIndexFile(rootDir: string): string {
  const dir = path.join(rootDir, 'search')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'inverted-index.json')
}

export function readCommandRecords(commandsPath: string): {
  starts: Map<string, CommandRunRecord>
  ends: Map<string, CommandRunRecord>
} {
  const starts = new Map<string, CommandRunRecord>()
  const ends = new Map<string, CommandRunRecord>()
  const lines = fs
    .readFileSync(commandsPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  for (const line of lines) {
    const row = JSON.parse(line) as CommandRunRecord
    if (row.ended_at) ends.set(row.id, row)
    else starts.set(row.id, row)
  }
  return { starts, ends }
}

export function loadSearchIndexFile(rootDir: string): InvertedIndex | null {
  const file = searchIndexFile(rootDir)
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as InvertedIndex) : null
}

export function pickBestSessionIdForRunbook(args: {
  rootDir: string
  latestSessionId?: string
}): string | undefined {
  const preferred = args.latestSessionId
  if (preferred) {
    const file = commandsFile(args.rootDir, preferred)
    if (fs.existsSync(file) && fs.statSync(file).size > 0) return preferred
  }

  const sessionsRoot = path.join(args.rootDir, 'sessions')
  if (!fs.existsSync(sessionsRoot)) return preferred

  const candidates = fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .map((id) => {
      const sessionFile = path.join(sessionDir(args.rootDir, id), 'session.json')
      const commands = commandsFile(args.rootDir, id)
      if (!fs.existsSync(sessionFile) || !fs.existsSync(commands)) return null
      if (fs.statSync(commands).size <= 0) return null
      try {
        const meta = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as SessionMeta
        return { id, updatedAt: meta.updatedAt || meta.createdAt || '' }
      } catch {
        return null
      }
    })
    .filter((candidate): candidate is { id: string; updatedAt: string } => !!candidate)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  return candidates[0]?.id ?? preferred
}
