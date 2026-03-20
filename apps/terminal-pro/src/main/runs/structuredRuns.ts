import fs from 'node:fs'
import path from 'node:path'

export type StructuredRunsListItem = {
  sessionId: string
  createdAt: string
  updatedAt: string
  projectRoot?: string
  source?: string
  platform?: string
  commandCount: number
  failedCount: number
  latestCommand?: string
  latestExitCode?: number | null
  latestCwd?: string
  latestReceiptId?: string
  latestStartedAt?: string
  latestEndedAt?: string | null
  interrupted: boolean
}

function safeRealpath(targetPath: string): string | null {
  try {
    return fs.realpathSync.native(targetPath)
  } catch {
    return null
  }
}

function safeJoinUnder(root: string, ...parts: string[]): string | null {
  const joined = path.join(root, ...parts)
  const realRoot = safeRealpath(root)
  const realJoined = safeRealpath(joined)
  if (!realRoot || !realJoined) return null
  return realJoined.startsWith(`${realRoot}${path.sep}`) ? realJoined : null
}

type SessionMeta = {
  id?: string
  createdAt?: string
  updatedAt?: string
  projectRoot?: string
  source?: string
  platform?: string
}

type CommandRow = {
  id?: string
  input?: string
  cwd?: string
  ok?: boolean
  exit_code?: number | null
  started_at?: string
  ended_at?: string
}

function readCommandRows(commandsFile: string): { starts: Map<string, CommandRow>; ends: Map<string, CommandRow> } {
  const starts = new Map<string, CommandRow>()
  const ends = new Map<string, CommandRow>()
  if (!fs.existsSync(commandsFile)) return { starts, ends }

  const lines = fs.readFileSync(commandsFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed) as CommandRow
      const id = String(row.id || '')
      if (!id) continue
      if (row.ended_at) ends.set(id, row)
      else starts.set(id, row)
    } catch {
      continue
    }
  }

  return { starts, ends }
}

export function listStructuredRunsFromSessionsRoot(sessionsRoot: string, limit = 24): StructuredRunsListItem[] {
  if (!fs.existsSync(sessionsRoot)) return []

  const rawEntries = fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sessionId = entry.name
      const sessionDir = path.join(sessionsRoot, sessionId)
      const sessionFile = path.join(sessionDir, 'session.json')
      const commandsFile = path.join(sessionDir, 'commands.ndjson')

      try {
        const sessionMeta = fs.existsSync(sessionFile)
          ? (JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as SessionMeta)
          : {}

        const { starts, ends } = readCommandRows(commandsFile)
        const orderedStarts = Array.from(starts.values()).sort((a, b) =>
          String(a.started_at || '') < String(b.started_at || '') ? 1 : -1
        )
        const latestStart = orderedStarts[0]
        const latestEnd = latestStart?.id ? ends.get(String(latestStart.id)) : undefined
        const failedCount = orderedStarts.reduce((count, row) => {
          const end = row.id ? ends.get(String(row.id)) : undefined
          return count + (end && (end.ok === false || (typeof end.exit_code === 'number' && end.exit_code !== 0)) ? 1 : 0)
        }, 0)

        const createdAt = String(sessionMeta.createdAt || '')
        const latestStartedAt = String(latestStart?.started_at || '')
        const latestEndedAt = latestEnd?.ended_at ? String(latestEnd.ended_at) : null
        const updatedAt = String(sessionMeta.updatedAt || latestEndedAt || latestStartedAt || createdAt || '')

        return {
          sessionId,
          createdAt,
          updatedAt,
          projectRoot: sessionMeta.projectRoot,
          source: sessionMeta.source,
          platform: sessionMeta.platform,
          commandCount: orderedStarts.length,
          failedCount,
          latestCommand: String(latestStart?.input || ''),
          latestExitCode: latestEnd?.exit_code ?? null,
          latestCwd: String(latestStart?.cwd || ''),
          latestReceiptId: String(latestStart?.id || sessionId),
          latestStartedAt,
          latestEndedAt,
          interrupted: Boolean(latestStart && !latestEnd),
        } as StructuredRunsListItem
      } catch {
        return null
      }
    })

  const entries = rawEntries.filter((entry): entry is StructuredRunsListItem => entry !== null)
  entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return entries.slice(0, Math.max(1, Math.min(limit, 100)))
}

export function readStructuredRunTailFromSessionsRoot(
  sessionsRoot: string,
  args: { sessionId: string; runId?: string; maxLines?: number; maxBytes?: number }
): string {
  const sessionId = String(args.sessionId || '').trim()
  const runId = String(args.runId || '').trim()
  if (!sessionId) throw new Error('Missing sessionId')

  const maxLines = Math.max(20, Math.min(Number(args.maxLines || 200), 1000))
  const maxBytes = Math.max(64 * 1024, Math.min(Number(args.maxBytes || 256 * 1024), 2 * 1024 * 1024))
  const sessionDir = safeJoinUnder(sessionsRoot, sessionId)
  if (!sessionDir) throw new Error('Invalid session path')

  const artifactsFile = path.join(sessionDir, 'artifacts.ndjson')
  const commandsFile = path.join(sessionDir, 'commands.ndjson')
  const fallbackFile = path.join(sessionDir, 'session.json')
  if (runId && fs.existsSync(artifactsFile)) {
    const lines = fs.readFileSync(artifactsFile, 'utf8').split(/\r?\n/)
    const matchingPayloads: string[] = []
    let totalBytes = 0

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const trimmed = lines[i].trim()
      if (!trimmed) continue
      try {
        const row = JSON.parse(trimmed) as {
          command_id?: string
          payload?: string
          type?: 'stdout_chunk' | 'stderr_chunk' | 'meta_chunk'
        }
        if (String(row.command_id || '') !== runId) continue
        const payload = String(row.payload || '')
        if (!payload) continue
        totalBytes += Buffer.byteLength(payload, 'utf8')
        matchingPayloads.unshift(payload)
        if (totalBytes >= maxBytes || matchingPayloads.length >= maxLines) break
      } catch {
        continue
      }
    }

    const artifactTail = matchingPayloads.join('')
    if (artifactTail.trim()) {
      const tailLines = artifactTail.split(/\r?\n/)
      return tailLines.slice(Math.max(0, tailLines.length - maxLines)).join('\n')
    }
  }

  const filePath = fs.existsSync(commandsFile) ? commandsFile : fs.existsSync(fallbackFile) ? fallbackFile : null
  if (!filePath) throw new Error('No session log found')

  const stat = fs.statSync(filePath)
  const size = stat.size
  const start = Math.max(0, size - maxBytes)
  const length = size - start
  const buffer = Buffer.alloc(length)
  const fd = fs.openSync(filePath, 'r')

  try {
    fs.readSync(fd, buffer, 0, buffer.length, start)
    const text = buffer.toString('utf8')
    const lines = text.split(/\r?\n/).filter(Boolean)
    return lines.slice(Math.max(0, lines.length - maxLines)).join('\n')
  } finally {
    fs.closeSync(fd)
  }
}
