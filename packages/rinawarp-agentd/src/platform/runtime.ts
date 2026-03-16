import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'
import { publishWorkspaceEvent } from './eventBus.js'

const execAsync = promisify(exec)
const backend = String(process.env.RINAWARP_RUNTIME_BACKEND || 'local')
  .trim()
  .toLowerCase()
const executionMode = String(process.env.RINAWARP_RUNTIME_EXECUTION_MODE || 'inline')
  .trim()
  .toLowerCase()

export type RuntimeTask = {
  id: string
  workspace_id: string
  workspace_region: string
  requested_region: string
  command: string
  status: 'queued' | 'running' | 'retrying' | 'completed' | 'failed'
  created_at: string
  started_at?: string
  completed_at?: string
  attempt?: number
  max_attempts?: number
  initial_delay_sec?: number
  timeout_sec?: number
  last_pod_name?: string
  transitions?: Array<{ status: RuntimeTask['status']; at: string; attempt?: number; reason?: string }>
  result?: string
  error?: string
}

type RuntimeState = {
  version: 1
  tasks: RuntimeTask[]
}

function filePath(): string {
  return path.join(paths().baseDir, 'runtime-tasks.json')
}

function loadState(): RuntimeState {
  const fp = filePath()
  if (!fs.existsSync(fp)) return { version: 1, tasks: [] }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as RuntimeState
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) return { version: 1, tasks: [] }
    return parsed
  } catch {
    return { version: 1, tasks: [] }
  }
}

function saveState(state: RuntimeState): void {
  const fp = filePath()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function updateTask(taskId: string, updater: (task: RuntimeTask) => RuntimeTask): RuntimeTask | null {
  const state = loadState()
  const idx = state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return null
  state.tasks[idx] = updater(state.tasks[idx])
  saveState(state)
  return state.tasks[idx]
}

function nowIso(): string {
  return new Date().toISOString()
}

function appendTransition(task: RuntimeTask, status: RuntimeTask['status'], reason?: string): RuntimeTask {
  const transitions = Array.isArray(task.transitions) ? [...task.transitions] : []
  transitions.push({ status, at: nowIso(), attempt: task.attempt, ...(reason ? { reason } : {}) })
  return {
    ...task,
    transitions: transitions.slice(-50),
  }
}

async function runTask(taskId: string): Promise<void> {
  const task = updateTask(taskId, (t) => {
    const started = {
      ...t,
      status: 'running' as const,
      started_at: t.started_at || nowIso(),
      attempt: 1,
    }
    return appendTransition(started, 'running')
  })
  if (!task) return
  if (backend === 'k8s') {
    return runTaskK8s(task)
  }
  return runTaskLocal(task)
}

async function runTaskLocal(task: RuntimeTask): Promise<void> {
  try {
    const timeoutSec = Math.max(60, Number(task.timeout_sec || process.env.RINAWARP_RUNTIME_TIMEOUT_SEC || 20 * 60))
    const timeoutMs = timeoutSec * 1000
    const { stdout, stderr } = await execAsync(task.command, {
      timeout: Math.max(1_000, timeoutMs),
      maxBuffer: 1024 * 1024,
    })
    updateTask(task.id, (t) =>
      appendTransition(
        {
          ...t,
          status: 'completed',
          completed_at: nowIso(),
          result: `${stdout || ''}${stderr || ''}`.slice(0, 50_000),
        },
        'completed'
      )
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateTask(task.id, (t) =>
      appendTransition(
        {
          ...t,
          status: 'failed',
          completed_at: nowIso(),
          error: message,
        },
        'failed',
        message
      )
    )
  }
}

async function runTaskK8s(task: RuntimeTask): Promise<void> {
  const apiServer = String(process.env.RINAWARP_K8S_API_SERVER || '').trim()
  const token = String(process.env.RINAWARP_K8S_TOKEN || '').trim()
  if (!apiServer || !token) {
    updateTask(task.id, (t) => ({
      ...t,
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: 'k8s_api_not_configured',
    }))
    return
  }
  const namespace = String(process.env.RINAWARP_K8S_NAMESPACE || 'default')
  const image = String(process.env.RINAWARP_RUNTIME_IMAGE || 'alpine:3.20')
  const timeoutSec = Math.max(60, Number(task.timeout_sec || process.env.RINAWARP_RUNTIME_TIMEOUT_SEC || 20 * 60))
  const maxAttempts = Math.max(1, Number(task.max_attempts || process.env.RINAWARP_RUNTIME_MAX_ATTEMPTS || 3))
  const initialDelaySec = Math.max(
    1,
    Number(task.initial_delay_sec || process.env.RINAWARP_RUNTIME_INITIAL_DELAY_SEC || 10)
  )
  const successTtlSec = Math.max(30, Number(process.env.RINAWARP_RUNTIME_SUCCESS_TTL_SEC || 10 * 60))
  const failedTtlSec = Math.max(successTtlSec, Number(process.env.RINAWARP_RUNTIME_FAILED_TTL_SEC || 60 * 60))

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const jobName = `rinawarp-${task.id}-a${attempt}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      const manifest = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          name: jobName,
          namespace,
          labels: {
            'app.kubernetes.io/name': 'rinawarp-agent-runtime',
            'rinawarp/task-id': task.id,
            'rinawarp/workspace-id': task.workspace_id,
            'rinawarp/attempt': String(attempt),
          },
        },
        spec: {
          ttlSecondsAfterFinished: successTtlSec,
          backoffLimit: 0,
          activeDeadlineSeconds: timeoutSec,
          template: {
            metadata: {
              labels: {
                'rinawarp/task-id': task.id,
                'rinawarp/attempt': String(attempt),
              },
            },
            spec: {
              restartPolicy: 'Never',
              containers: [
                {
                  name: 'agent-runner',
                  image,
                  command: ['/bin/sh', '-lc', task.command],
                  resources: {
                    requests: {
                      cpu: String(process.env.RINAWARP_RUNTIME_CPU_REQUEST || '500m'),
                      memory: String(process.env.RINAWARP_RUNTIME_MEMORY_REQUEST || '1Gi'),
                    },
                    limits: {
                      cpu: String(process.env.RINAWARP_RUNTIME_CPU_LIMIT || '2'),
                      memory: String(process.env.RINAWARP_RUNTIME_MEMORY_LIMIT || '4Gi'),
                    },
                  },
                  securityContext: {
                    runAsNonRoot: true,
                    allowPrivilegeEscalation: false,
                    readOnlyRootFilesystem: true,
                  },
                },
              ],
            },
          },
        },
      }
      updateTask(task.id, (t) =>
        appendTransition(
          {
            ...t,
            status: attempt === 1 ? 'running' : 'retrying',
            attempt,
            max_attempts: maxAttempts,
            initial_delay_sec: initialDelaySec,
            timeout_sec: timeoutSec,
          },
          attempt === 1 ? 'running' : 'retrying',
          attempt === 1 ? undefined : 'retry_attempt'
        )
      )
      await k8sRequest({
        apiServer,
        token,
        method: 'POST',
        path: `/apis/batch/v1/namespaces/${encodeURIComponent(namespace)}/jobs`,
        body: manifest,
      })

      const podName = await waitForPodName({
        apiServer,
        token,
        namespace,
        taskId: task.id,
        attempt,
      })
      if (!podName) throw new Error('pod_not_created')
      updateTask(task.id, (t) => ({ ...t, last_pod_name: podName }))
      streamPodLogs({
        apiServer,
        token,
        namespace,
        podName,
        task,
      }).catch(() => {
        // no-op
      })

      const finalPhase = await waitForPodPhase({
        apiServer,
        token,
        namespace,
        podName,
        timeoutSec,
      })
      if (finalPhase === 'Succeeded') {
        updateTask(task.id, (t) =>
          appendTransition(
            {
              ...t,
              status: 'completed',
              completed_at: nowIso(),
              result: `k8s job ${jobName} completed`,
              attempt,
            },
            'completed'
          )
        )
        await publishWorkspaceEvent({
          workspace_id: task.workspace_id,
          type: 'runtime_task_completed',
          payload: { task_id: task.id, pod_name: podName, attempt },
        })
        return
      }
      if (attempt < maxAttempts) {
        await publishWorkspaceEvent({
          workspace_id: task.workspace_id,
          type: 'runtime_task_retrying',
          payload: { task_id: task.id, pod_name: podName, attempt, max_attempts: maxAttempts },
        })
        // Set failed-job TTL longer so failed attempts remain inspectable for a short window.
        setJobTtlAfterFinished({
          apiServer,
          token,
          namespace,
          jobName,
          ttlSecondsAfterFinished: failedTtlSec,
        }).catch(() => {
          // no-op
        })
        const backoffMs = initialDelaySec * 1000 * Math.pow(2, attempt - 1)
        await delay(backoffMs)
        continue
      }
      throw new Error(`pod_failed_phase:${finalPhase}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < maxAttempts) {
        await publishWorkspaceEvent({
          workspace_id: task.workspace_id,
          type: 'runtime_task_retrying',
          payload: { task_id: task.id, attempt, max_attempts: maxAttempts, error: message },
        })
        const backoffMs = initialDelaySec * 1000 * Math.pow(2, attempt - 1)
        await delay(backoffMs)
        continue
      }
      updateTask(task.id, (t) =>
        appendTransition(
          {
            ...t,
            status: 'failed',
            completed_at: nowIso(),
            error: message,
            attempt,
          },
          'failed',
          message
        )
      )
      await publishWorkspaceEvent({
        workspace_id: task.workspace_id,
        type: 'runtime_task_failed',
        payload: { task_id: task.id, error: message, attempts: attempt },
      })
    }
  }
}

async function k8sRequest(args: {
  apiServer: string
  token: string
  method: 'GET' | 'POST'
  path: string
  body?: unknown
}): Promise<any> {
  const res = await fetch(`${args.apiServer}${args.path}`, {
    method: args.method,
    headers: {
      Authorization: `Bearer ${args.token}`,
      'Content-Type': 'application/json',
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`k8s_${args.method.toLowerCase()}_${res.status}:${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

async function waitForPodName(args: {
  apiServer: string
  token: string
  namespace: string
  taskId: string
  attempt?: number
}): Promise<string | null> {
  const parts = [`rinawarp/task-id=${args.taskId}`]
  if (args.attempt && args.attempt > 0) parts.push(`rinawarp/attempt=${args.attempt}`)
  const label = encodeURIComponent(parts.join(','))
  const url = `${args.apiServer}/api/v1/namespaces/${encodeURIComponent(args.namespace)}/pods?watch=1&labelSelector=${label}&timeoutSeconds=30`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
    },
  })
  if (!res.ok || !res.body) return null
  for await (const line of streamJsonLines(res.body)) {
    const podName = String(line?.object?.metadata?.name || '')
    if (podName) return podName
  }
  return null
}

async function waitForPodPhase(args: {
  apiServer: string
  token: string
  namespace: string
  podName: string
  timeoutSec: number
}): Promise<string> {
  const field = encodeURIComponent(`metadata.name=${args.podName}`)
  const url = `${args.apiServer}/api/v1/namespaces/${encodeURIComponent(args.namespace)}/pods?watch=1&fieldSelector=${field}&timeoutSeconds=${args.timeoutSec}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
    },
  })
  if (!res.ok || !res.body) throw new Error('k8s_watch_failed')
  for await (const line of streamJsonLines(res.body)) {
    const phase = String(line?.object?.status?.phase || '')
    if (phase === 'Succeeded' || phase === 'Failed') return phase
  }
  return 'Unknown'
}

async function streamPodLogs(args: {
  apiServer: string
  token: string
  namespace: string
  podName: string
  task: RuntimeTask
}) {
  const url = `${args.apiServer}/api/v1/namespaces/${encodeURIComponent(args.namespace)}/pods/${encodeURIComponent(args.podName)}/log?follow=true&timestamps=true`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
    },
  })
  if (!res.ok || !res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  const maxBytes = Math.max(1024, Number(process.env.RINAWARP_RUNTIME_LOG_MAX_BYTES || 256_000))
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    total += Buffer.byteLength(chunk, 'utf8')
    const data = total > maxBytes ? chunk.slice(0, Math.max(0, maxBytes - (total - chunk.length))) : chunk
    if (data) {
      await publishWorkspaceEvent({
        workspace_id: args.task.workspace_id,
        type: 'runtime_log_chunk',
        payload: {
          task_id: args.task.id,
          pod_name: args.podName,
          data,
        },
      })
    }
    if (total >= maxBytes) break
  }
}

async function setJobTtlAfterFinished(args: {
  apiServer: string
  token: string
  namespace: string
  jobName: string
  ttlSecondsAfterFinished: number
}): Promise<void> {
  const body = {
    spec: {
      ttlSecondsAfterFinished: Math.max(30, Math.floor(args.ttlSecondsAfterFinished)),
    },
  }
  await fetch(
    `${args.apiServer}/apis/batch/v1/namespaces/${encodeURIComponent(args.namespace)}/jobs/${encodeURIComponent(args.jobName)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${args.token}`,
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(body),
    }
  )
}

async function* streamJsonLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<any> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    let idx = carry.indexOf('\n')
    while (idx >= 0) {
      const line = carry.slice(0, idx).trim()
      carry = carry.slice(idx + 1)
      if (line) {
        try {
          yield JSON.parse(line)
        } catch {
          // skip malformed line
        }
      }
      idx = carry.indexOf('\n')
    }
  }
  const last = carry.trim()
  if (last) {
    try {
      yield JSON.parse(last)
    } catch {
      // skip malformed trailing line
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function enqueueRuntimeTask(args: {
  workspace_id: string
  workspace_region: string
  requested_region: string
  command: string
  max_attempts?: number
  initial_delay_sec?: number
  timeout_sec?: number
}): RuntimeTask {
  const state = loadState()
  const task: RuntimeTask = {
    id: `rt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    workspace_id: args.workspace_id,
    workspace_region: args.workspace_region,
    requested_region: args.requested_region,
    command: args.command,
    status: 'queued',
    created_at: nowIso(),
    max_attempts: Math.max(1, Number(args.max_attempts || process.env.RINAWARP_RUNTIME_MAX_ATTEMPTS || 3)),
    initial_delay_sec: Math.max(
      1,
      Number(args.initial_delay_sec || process.env.RINAWARP_RUNTIME_INITIAL_DELAY_SEC || 10)
    ),
    timeout_sec: Math.max(60, Number(args.timeout_sec || process.env.RINAWARP_RUNTIME_TIMEOUT_SEC || 20 * 60)),
    transitions: [{ status: 'queued', at: nowIso() }],
  }
  state.tasks.unshift(task)
  state.tasks = state.tasks.slice(0, 2000)
  saveState(state)
  if (executionMode === 'inline') {
    runTask(task.id).catch(() => {
      // swallow scheduler execution errors
    })
  }
  return task
}

export async function processRuntimeQueue(maxTasks = 1): Promise<{ picked: number }> {
  const state = loadState()
  const queued = state.tasks.filter((t) => t.status === 'queued').slice(0, Math.max(1, maxTasks))
  for (const task of queued) {
    await runTask(task.id)
  }
  return { picked: queued.length }
}

export function listRuntimeTasks(workspaceId?: string): RuntimeTask[] {
  const state = loadState()
  return workspaceId ? state.tasks.filter((t) => t.workspace_id === workspaceId) : state.tasks
}

export function getRuntimeTask(taskId: string): RuntimeTask | null {
  const state = loadState()
  return state.tasks.find((t) => t.id === taskId) || null
}

export function reconcileRuntimeTasks(args?: {
  queueStuckAfterSec?: number
  runningStuckGraceSec?: number
  autoRemediate?: boolean
  maxRemediations?: number
}): {
  ok: boolean
  scanned: number
  flagged_stuck: number
  remediated: number
  skipped: number
} {
  const state = loadState()
  const now = Date.now()
  const queueStuckAfterSec = Math.max(
    60,
    Number(args?.queueStuckAfterSec || process.env.RINAWARP_RUNTIME_QUEUE_STUCK_AFTER_SEC || 15 * 60)
  )
  const runningStuckGraceSec = Math.max(
    30,
    Number(args?.runningStuckGraceSec || process.env.RINAWARP_RUNTIME_RUNNING_STUCK_GRACE_SEC || 5 * 60)
  )
  const autoRemediate =
    args?.autoRemediate ??
    String(process.env.RINAWARP_RUNTIME_AUTO_REMEDIATE || 'true')
      .trim()
      .toLowerCase() === 'true'
  const maxRemediations = Math.max(
    1,
    Number(args?.maxRemediations || process.env.RINAWARP_RUNTIME_MAX_REMEDIATIONS || 50)
  )

  let scanned = 0
  let flagged = 0
  let remediated = 0
  let dirty = false
  for (let i = 0; i < state.tasks.length; i += 1) {
    const task = state.tasks[i]
    scanned += 1
    if (!['queued', 'running', 'retrying'].includes(task.status)) continue
    const createdMs = Date.parse(String(task.created_at || ''))
    const startedMs = Date.parse(String(task.started_at || task.created_at || ''))
    const timeoutSec = Math.max(60, Number(task.timeout_sec || process.env.RINAWARP_RUNTIME_TIMEOUT_SEC || 20 * 60))
    const queueAgeSec = Number.isFinite(createdMs) ? (now - createdMs) / 1000 : 0
    const runAgeSec = Number.isFinite(startedMs) ? (now - startedMs) / 1000 : 0
    const stuckQueued = task.status === 'queued' && queueAgeSec > queueStuckAfterSec
    const stuckRunning =
      (task.status === 'running' || task.status === 'retrying') && runAgeSec > timeoutSec + runningStuckGraceSec
    if (!stuckQueued && !stuckRunning) continue
    flagged += 1
    if (!autoRemediate || remediated >= maxRemediations) continue
    const reason = stuckQueued ? 'runtime_reconciler_stuck_queued' : 'runtime_reconciler_stuck_running'
    const next = appendTransition(
      {
        ...task,
        status: 'failed',
        completed_at: nowIso(),
        error: reason,
      },
      'failed',
      reason
    )
    state.tasks[i] = next
    remediated += 1
    dirty = true
  }
  if (dirty) saveState(state)
  return {
    ok: true,
    scanned,
    flagged_stuck: flagged,
    remediated,
    skipped: Math.max(0, flagged - remediated),
  }
}
