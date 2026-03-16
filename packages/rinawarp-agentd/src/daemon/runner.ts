import { exec } from 'node:child_process'
import { appendFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { readTaskRegistry, updateTask } from './state.js'
import { validateTaskPayload } from './task-contracts.js'
import {
  commit,
  createOrSwitchBranch,
  ensureGitRepo,
  hasStagedChanges,
  push,
  stageAll,
} from '../orchestrator/gitProvider.js'
import { createPullRequest } from '../orchestrator/githubAdapter.js'
import { recordPullRequestStatus, recordWorkflowTaskStatus } from '../orchestrator/workspaceGraph.js'

const execAsync = promisify(exec)
const BASE_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 30_000
const concurrencyRaw = Number(process.env.RINAWARP_AGENT_CONCURRENCY || '1')
const CONCURRENCY = Number.isFinite(concurrencyRaw) ? Math.max(1, Math.min(8, concurrencyRaw)) : 1
const watchEventsPath = process.env.RINAWARP_AGENT_WATCH_EVENTS || '/tmp/rinawarp-agent-watch-events.ndjson'
const activeWatchers = new Map<string, fs.FSWatcher>()

function backoffDelayMs(attempt: number): number {
  const delay = BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1)
  return Math.min(delay, MAX_RETRY_DELAY_MS)
}

async function executeTask(taskId: string, type: string, payload: Record<string, unknown>): Promise<void> {
  if (type === 'run_command') {
    if (String(payload.mode || '') === 'issue_to_pr') {
      await executeIssueToPrTask(taskId, payload)
      return
    }
    const command = String(payload.command || '').trim()
    const cwd = payload.cwd ? String(payload.cwd) : process.cwd()
    if (!command) {
      updateTask({ id: taskId, status: 'failed', error: 'payload.command is required for run_command' })
      return
    }
    try {
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: 120_000, maxBuffer: 1024 * 1024 })
      updateTask({
        id: taskId,
        status: 'completed',
        result: {
          stdout: String(stdout || '').slice(0, 4000),
          stderr: String(stderr || '').slice(0, 4000),
          cwd,
          command,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTask({ id: taskId, status: 'failed', error: message, result: { cwd, command } })
    }
    return
  }

  if (type === 'repo_watch') {
    const repo = String(payload.repo || '').trim()
    if (!repo) {
      updateTask({ id: taskId, status: 'failed', error: 'repo_watch requires payload.repo' })
      return
    }
    if (!fs.existsSync(repo)) {
      updateTask({ id: taskId, status: 'failed', error: `repo path does not exist: ${repo}` })
      return
    }
    if (activeWatchers.has(taskId)) {
      updateTask({
        id: taskId,
        status: 'running',
        result: { watcher: 'active', repo },
      })
      return
    }
    const watcher = fs.watch(repo, { recursive: true }, (eventType, filename) => {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        taskId,
        repo,
        eventType,
        filename: filename ? String(filename) : '',
      })
      void appendFile(watchEventsPath, `${line}\n`, 'utf8')
    })
    activeWatchers.set(taskId, watcher)
    updateTask({
      id: taskId,
      status: 'running',
      result: {
        watcher: 'active',
        repo,
        eventsFile: watchEventsPath,
      },
    })
    return
  }

  updateTask({
    id: taskId,
    status: 'failed',
    error: `unsupported task type: ${type}`,
  })
}

async function executeIssueToPrTask(taskId: string, payload: Record<string, unknown>): Promise<void> {
  const repoPath = String(payload.cwd || payload.repoPath || '').trim() || process.cwd()
  const workflowId = String(payload.workflowId || '').trim()
  const issueId = String(payload.issueId || '').trim() || 'unknown'
  const branchName = String(payload.branchName || `rina/fix-${issueId}`).trim()
  const command = String(payload.command || '').trim()
  const repoSlug = String(payload.repoSlug || '').trim()
  const baseBranch = String(payload.baseBranch || 'main').trim()
  const shouldPush = payload.push === true
  const prDryRun = payload.prDryRun !== false

  if (!command) {
    updateTask({ id: taskId, status: 'failed', error: 'issue_to_pr mode requires payload.command' })
    if (workflowId) {
      recordWorkflowTaskStatus({
        workflowId,
        taskId,
        status: 'failed',
        issueId,
        branchName,
        error: 'issue_to_pr mode requires payload.command',
      })
    }
    return
  }

  try {
    if (workflowId) {
      recordWorkflowTaskStatus({
        workflowId,
        taskId,
        status: 'running',
        issueId,
        branchName,
        metadata: { command, repoPath },
      })
    }
    await ensureGitRepo(repoPath)
    await createOrSwitchBranch(repoPath, branchName)

    const { stdout, stderr } = await execAsync(command, { cwd: repoPath, timeout: 120_000, maxBuffer: 1024 * 1024 })
    await stageAll(repoPath)
    const staged = await hasStagedChanges(repoPath)

    if (!staged) {
      updateTask({
        id: taskId,
        status: 'completed',
        result: {
          mode: 'issue_to_pr',
          issueId,
          branchName,
          repoPath,
          command,
          noChanges: true,
          stdout: String(stdout || '').slice(0, 4000),
          stderr: String(stderr || '').slice(0, 4000),
        },
      })
      if (workflowId) {
        recordWorkflowTaskStatus({
          workflowId,
          taskId,
          status: 'completed',
          issueId,
          branchName,
          metadata: { noChanges: true, command, repoPath },
        })
      }
      return
    }

    const commitMessage = String(payload.commitMessage || `fix: issue ${issueId}`)
    await commit(repoPath, commitMessage)

    let pushResult: 'skipped' | 'ok' = 'skipped'
    if (shouldPush) {
      await push(repoPath, branchName)
      pushResult = 'ok'
    }

    let prResult: unknown = null
    if (repoSlug) {
      const title = String(payload.prTitle || `Fix issue ${issueId}`)
      const body = String(payload.prBody || `Automated fix for issue ${issueId}.`)
      const pr = await createPullRequest(
        { repoSlug, head: branchName, base: baseBranch, title, body, draft: Boolean(payload.prDraft) },
        { dryRun: prDryRun }
      )
      if (!pr.ok) {
        updateTask({
          id: taskId,
          status: 'failed',
          error: pr.error,
          result: { mode: 'issue_to_pr', issueId, branchName, repoPath, pushResult, prResult: pr },
        })
        if (workflowId) {
          recordPullRequestStatus({
            workflowId,
            issueId,
            branchName,
            repoSlug,
            status: 'failed',
            error: pr.error,
          })
          recordWorkflowTaskStatus({
            workflowId,
            taskId,
            status: 'failed',
            issueId,
            branchName,
            error: pr.error,
          })
        }
        return
      }
      prResult = pr
      if (workflowId) {
        recordPullRequestStatus({
          workflowId,
          issueId,
          branchName,
          repoSlug,
          status: 'opened',
          mode: pr.mode,
          number: pr.mode === 'live' ? pr.number : null,
          url: pr.mode === 'live' ? pr.url : null,
        })
      }
    } else if (workflowId) {
      recordPullRequestStatus({
        workflowId,
        issueId,
        branchName,
        status: 'planned',
        mode: 'dry_run',
      })
    }

    updateTask({
      id: taskId,
      status: 'completed',
      result: {
        mode: 'issue_to_pr',
        issueId,
        branchName,
        repoPath,
        command,
        commitMessage,
        pushResult,
        prResult,
        stdout: String(stdout || '').slice(0, 4000),
        stderr: String(stderr || '').slice(0, 4000),
      },
    })
    if (workflowId) {
      recordWorkflowTaskStatus({
        workflowId,
        taskId,
        status: 'completed',
        issueId,
        branchName,
        metadata: {
          command,
          repoPath,
          commitMessage,
          pushResult,
        },
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateTask({
      id: taskId,
      status: 'failed',
      error: message,
      result: { mode: 'issue_to_pr', issueId, branchName, repoPath, command },
    })
    if (workflowId) {
      recordWorkflowTaskStatus({
        workflowId,
        taskId,
        status: 'failed',
        issueId,
        branchName,
        error: message,
      })
    }
  }
}

async function processQueuedTask(task: ReturnType<typeof readTaskRegistry>['tasks'][number]): Promise<void> {
  const payloadError = validateTaskPayload(task.type, task.payload)
  if (payloadError) {
    updateTask({
      id: task.id,
      status: 'failed',
      error: payloadError,
      deadLetter: true,
    })
    return
  }
  const attemptsUsed = task.attempts + 1
  updateTask({ id: task.id, attempts: attemptsUsed, status: 'running', nextRunAt: null })

  try {
    await executeTask(task.id, task.type, task.payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const shouldRetry = attemptsUsed < task.maxAttempts
    if (!shouldRetry) {
      updateTask({ id: task.id, status: 'failed', error: message, deadLetter: true })
      return
    }
    const delayMs = backoffDelayMs(attemptsUsed)
    updateTask({
      id: task.id,
      status: 'queued',
      error: message,
      nextRunAt: new Date(Date.now() + delayMs).toISOString(),
    })
  }
  const after = readTaskRegistry().tasks.find((t) => t.id === task.id)
  const failed = after?.status === 'failed'
  const hasRetriesLeft = attemptsUsed < task.maxAttempts
  if (failed && hasRetriesLeft) {
    const delayMs = backoffDelayMs(attemptsUsed)
    updateTask({
      id: task.id,
      status: 'queued',
      nextRunAt: new Date(Date.now() + delayMs).toISOString(),
    })
  } else if (failed && !hasRetriesLeft) {
    updateTask({ id: task.id, deadLetter: true })
  }
}

async function tick(): Promise<void> {
  const registry = readTaskRegistry()
  const now = Date.now()
  const queued = registry.tasks.filter((task) => {
    if (task.status !== 'queued') return false
    if (!task.nextRunAt) return true
    return Date.parse(task.nextRunAt) <= now
  })
  if (queued.length === 0) return
  const selected = queued.slice(0, CONCURRENCY)
  await Promise.all(selected.map((task) => processQueuedTask(task)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  try {
    const dir = path.dirname(watchEventsPath)
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    // non-fatal
  }

  process.on('SIGTERM', () => {
    for (const watcher of activeWatchers.values()) {
      try {
        watcher.close()
      } catch {
        // best-effort close
      }
    }
    process.exit(0)
  })

  // Run forever until terminated by signal.
  while (true) {
    await tick()
    await sleep(1000)
  }
}

void main()
