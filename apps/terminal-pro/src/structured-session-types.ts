export type CommandStream = 'stdout' | 'stderr' | 'meta'

export type SessionMeta = {
  id: string
  createdAt: string
  updatedAt: string
  machineId: string
  host: string
  platform: string
  source: string
  projectRoot?: string
}

export type CommandStart = {
  sessionId?: string
  streamId: string
  command: string
  cwd?: string
  shell?: string
  risk?: string
  source?: string
}

export type CommandEnd = {
  streamId: string
  ok: boolean
  code: number | null
  cancelled: boolean
  error?: string | null
}

export type CommandRunRecord = {
  id: string
  session_id: string
  stream_id: string
  input: string
  shell?: string
  cwd?: string
  risk?: string
  source?: string
  started_at: string
  ended_at?: string
  exit_code?: number | null
  ok?: boolean
  cancelled?: boolean
  error?: string | null
  duration_ms?: number
}

export type ArtifactRecord = {
  id: string
  command_id: string
  session_id: string
  type: 'stdout_chunk' | 'stderr_chunk' | 'meta_chunk'
  payload: string
  created_at: string
}

export type EdgeRecord = {
  id: string
  session_id: string
  from_command_id: string
  to_command_id: string
  type: 'followed_by'
  created_at: string
}

export type SessionState = {
  meta: SessionMeta
  lastCommandId?: string
}

export type IndexState = {
  streams: Map<string, CommandRunRecord>
  streamBuffers: Map<string, { stdout: string; stderr: string; meta: string }>
  sessions: Map<string, SessionState>
  latestSessionId?: string
}

export type CommandSearchRecord = {
  session_id: string
  command_id: string
  command: string
  cwd?: string
  risk?: string
  ok?: boolean
  exit_code?: number | null
  duration_ms?: number
  started_at: string
  ended_at?: string
  output_excerpt: string
  tokens: string[]
}

export type IndexDoc = CommandSearchRecord & {
  doc_id: string
  doc_len: number
}

export type InvertedIndex = {
  version: number
  docCount: number
  totalDocLen: number
  docs: Record<string, IndexDoc>
  postings: Record<string, Array<{ docId: string; tf: number }>>
}

export type CommandSearchHit = {
  sessionId: string
  commandId: string
  command: string
  cwd?: string
  risk?: string
  ok?: boolean
  exitCode?: number | null
  durationMs?: number
  startedAt: string
  score: number
  snippet: string
}

export type RunbookJson = {
  id: string
  sessionId: string
  createdAt: string
  source: string
  projectRoot?: string
  parameters: string[]
  steps: Array<{
    stepId: string
    command: string
    cwd?: string
    risk?: string
  }>
}

export type SearchFilters = {
  terms: string[]
  status?: 'ok' | 'failed' | 'unknown'
  risk?: string
  cwd?: string
  session?: string
  afterTs?: number
  beforeTs?: number
}
