import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type WorkspaceEvent = {
  event_id: string
  workspace_id: string
  type: string
  payload: Record<string, unknown>
  version?: number
  ts: string
  source?: string
}

type Subscriber = (event: WorkspaceEvent) => void

const subscribers = new Map<string, Set<Subscriber>>()
let natsPublish: ((subject: string, payload: string, msgId?: string) => Promise<void>) | null = null
let natsReady = false
const instanceId = `agentd_${Math.random().toString(16).slice(2, 10)}`
const processedEventIds = new Map<string, number>()
const processedMax = 10_000
const processedTtlMs = 15 * 60 * 1000

type JetStreamState = {
  version: 1
  last_sequence: number
}

function subjectForWorkspace(workspaceId: string): string {
  return `workspace.${workspaceId}.events`
}

function dlqSubjectForWorkspace(workspaceId: string): string {
  return `workspace.${workspaceId}.dlq`
}

function dynamicImport(moduleName: string): Promise<any> {
  // Avoid hard dependency so local dev/test can run without nats package.
  // eslint-disable-next-line no-new-func
  const importer = new Function('m', 'return import(m);') as (m: string) => Promise<any>
  return importer(moduleName)
}

function jetStreamStateFile(): string {
  return path.join(paths().baseDir, 'eventbus-jetstream-state.json')
}

function readJetStreamState(): JetStreamState {
  const fp = jetStreamStateFile()
  if (!fs.existsSync(fp)) return { version: 1, last_sequence: 0 }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as JetStreamState
    if (!parsed || parsed.version !== 1) return { version: 1, last_sequence: 0 }
    return { version: 1, last_sequence: Math.max(0, Number(parsed.last_sequence || 0)) }
  } catch {
    return { version: 1, last_sequence: 0 }
  }
}

function writeJetStreamState(state: JetStreamState): void {
  const fp = jetStreamStateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function rememberEventId(id: string): void {
  const now = Date.now()
  processedEventIds.set(id, now)
  if (processedEventIds.size <= processedMax) return
  for (const [eventId, ts] of processedEventIds) {
    if (now - ts > processedTtlMs || processedEventIds.size > processedMax) {
      processedEventIds.delete(eventId)
    }
    if (processedEventIds.size <= processedMax) break
  }
}

function wasEventProcessed(id: string): boolean {
  const ts = processedEventIds.get(id)
  if (!ts) return false
  if (Date.now() - ts > processedTtlMs) {
    processedEventIds.delete(id)
    return false
  }
  return true
}

function emitLocal(evt: WorkspaceEvent): void {
  if (!evt?.workspace_id || !evt?.type || !evt?.event_id) return
  if (wasEventProcessed(evt.event_id)) return
  rememberEventId(evt.event_id)
  const local = subscribers.get(evt.workspace_id)
  if (!local) return
  for (const fn of local) {
    try {
      fn(evt)
    } catch {
      // no-op for subscriber failures
    }
  }
}

export async function initEventBus(): Promise<void> {
  if (natsReady) return
  natsReady = true
  const servers = String(process.env.RINAWARP_NATS_URL || '').trim()
  if (!servers) return
  const mode = String(process.env.RINAWARP_NATS_MODE || 'core')
    .trim()
    .toLowerCase()
  try {
    const nats = await dynamicImport('nats')
    const nc = await nats.connect({ servers })
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    if (mode === 'jetstream') {
      const js = nc.jetstream()
      const jsm = await nc.jetstreamManager()
      const streamName = String(process.env.RINAWARP_JETSTREAM_STREAM || 'WORKSPACE_EVENTS').trim()
      const maxAgeHours = Math.max(1, Number(process.env.RINAWARP_JETSTREAM_MAX_AGE_HOURS || 168))
      const maxBytes = Math.max(
        1024 * 1024,
        Number(process.env.RINAWARP_JETSTREAM_MAX_BYTES || 50 * 1024 * 1024 * 1024)
      )
      try {
        await jsm.streams.add({
          name: streamName,
          subjects: ['workspace.*.events'],
          retention: 'limits',
          max_age: maxAgeHours * 60 * 60 * 1_000_000_000,
          max_bytes: maxBytes,
          storage: 'file',
          num_replicas: 3,
          discard: 'old',
          duplicate_window: 120 * 1_000_000_000,
        })
      } catch {
        // stream likely already exists
      }

      natsPublish = async (subject: string, payload: string, msgId?: string) => {
        const headers = msgId ? nats.headers() : undefined
        if (headers && msgId) headers.set('Nats-Msg-Id', msgId)
        await js.publish(subject, encoder.encode(payload), headers ? { headers } : undefined)
      }

      const durable = String(process.env.RINAWARP_JETSTREAM_DURABLE || 'rinawarp-agentd').trim()
      const state = readJetStreamState()
      const opts = nats.consumerOpts()
      opts.durable(durable)
      opts.ackExplicit()
      opts.manualAck()
      opts.ackWait(30_000)
      opts.maxDeliver(5)
      if (state.last_sequence > 0) opts.startSequence(state.last_sequence + 1)
      else opts.deliverAll()
      const sub = await js.subscribe('workspace.*.events', opts)
      ;(async () => {
        for await (const msg of sub as AsyncIterable<any>) {
          try {
            const payload = decoder.decode(msg.data)
            const evt = JSON.parse(payload) as WorkspaceEvent
            if (!evt || !evt.workspace_id || !evt.type || !evt.event_id) {
              throw new Error('invalid_workspace_event_payload')
            }
            if (!evt.source || evt.source !== instanceId) emitLocal(evt)
            msg.ack()
            const streamSeq = Number(msg?.seq || msg?.info?.streamSequence || 0)
            if (streamSeq > 0) writeJetStreamState({ version: 1, last_sequence: streamSeq })
          } catch (error) {
            const fallbackWorkspaceId =
              (() => {
                const subj = String(msg?.subject || '')
                const match = subj.match(/^workspace\.([^.]+)\.events$/)
                return match ? match[1] : 'unknown'
              })() || 'unknown'
            const dlq = {
              event_id: `dlq_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
              workspace_id: fallbackWorkspaceId,
              type: 'workspace_event_dlq',
              ts: new Date().toISOString(),
              payload: {
                error: error instanceof Error ? error.message : String(error),
                original_subject: String(msg?.subject || ''),
              },
            }
            try {
              await natsPublish?.(dlqSubjectForWorkspace(fallbackWorkspaceId), JSON.stringify(dlq), dlq.event_id)
            } catch {
              // no-op
            }
            try {
              msg.term()
            } catch {
              // no-op
            }
          }
        }
      })().catch(() => {
        // no-op
      })
      return
    }

    natsPublish = async (subject: string, payload: string) => {
      nc.publish(subject, encoder.encode(payload))
    }
    const sub = nc.subscribe('workspace.*.events')
    ;(async () => {
      for await (const msg of sub as AsyncIterable<any>) {
        try {
          const evt = JSON.parse(decoder.decode(msg.data)) as WorkspaceEvent
          if (!evt || !evt.workspace_id || !evt.type || !evt.event_id) continue
          if (evt.source && evt.source === instanceId) continue
          emitLocal(evt)
        } catch {
          // no-op
        }
      }
    })().catch(() => {
      // no-op
    })
  } catch {
    natsPublish = null
  }
}

export function subscribeWorkspaceEvents(workspaceId: string, fn: Subscriber): () => void {
  const key = String(workspaceId)
  const set = subscribers.get(key) || new Set<Subscriber>()
  set.add(fn)
  subscribers.set(key, set)
  return () => {
    const current = subscribers.get(key)
    if (!current) return
    current.delete(fn)
    if (current.size === 0) subscribers.delete(key)
  }
}

export async function publishWorkspaceEvent(args: {
  workspace_id: string
  type: string
  payload?: Record<string, unknown>
  version?: number
}): Promise<WorkspaceEvent> {
  const evt: WorkspaceEvent = {
    event_id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    workspace_id: String(args.workspace_id),
    type: String(args.type),
    payload: args.payload || {},
    version: args.version,
    ts: new Date().toISOString(),
    source: instanceId,
  }
  emitLocal(evt)
  if (natsPublish) {
    try {
      await natsPublish(subjectForWorkspace(evt.workspace_id), JSON.stringify(evt), evt.event_id)
    } catch {
      // no-op: local bus still works if NATS publish fails
    }
  }
  return evt
}
