#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateTaskPayload } from './task-contracts.js'
import {
  addTask,
  clearPid,
  clearState,
  ensureStore,
  isPidAlive,
  paths,
  readPid,
  readState,
  readTaskRegistry,
  writePid,
  writeState,
} from './state.js'

function usage(): void {
  process.stdout.write(
    [
      'rinawarp-agent commands:',
      '  start [--port <num>]       Start daemon in background',
      '  stop                       Stop daemon',
      '  status                     Show daemon status',
      '  task add <type> [json] [--max-attempts <n>]  Register background task',
      '  task list                  List task registry',
      '  task dlq                   List dead-letter tasks',
      '',
    ].join('\n')
  )
}

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx < 0 || idx + 1 >= process.argv.length) return null
  return process.argv[idx + 1] || null
}

function distRunnerPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, 'runner.js')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function commandStart(): Promise<void> {
  ensureStore()
  const port = Number(argValue('--port') || process.env.RINAWARP_AGENTD_PORT || '5055')
  const existingPid = readPid()
  if (existingPid && isPidAlive(existingPid)) {
    process.stdout.write(`already running (pid=${existingPid})\n`)
    process.exit(0)
  }

  const child = spawn(process.execPath, [distRunnerPath()], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      RINAWARP_AGENTD_PORT: String(port),
      RINAWARP_AGENT_MODE: 'daemon',
    },
  })
  child.unref()
  if (typeof child.pid !== 'number') {
    process.stderr.write('failed to spawn daemon process\n')
    process.exit(1)
  }
  await sleep(300)
  if (!isPidAlive(child.pid)) {
    process.stderr.write('daemon exited immediately; check runtime logs/config\n')
    process.exit(1)
  }
  const now = new Date().toISOString()
  writePid(child.pid)
  writeState({
    version: 1,
    pid: child.pid,
    port,
    mode: 'local',
    startedAt: now,
    updatedAt: now,
  })
  process.stdout.write(`started rinawarp-agent daemon pid=${child.pid} port=${port}\n`)
}

function commandStop(): void {
  const pid = readPid()
  if (!pid) {
    process.stdout.write('not running\n')
    return
  }
  if (!isPidAlive(pid)) {
    clearPid()
    clearState()
    process.stdout.write('stale pid removed\n')
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
    clearPid()
    clearState()
    process.stdout.write(`stopped daemon pid=${pid}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`failed to stop daemon: ${message}\n`)
    process.exitCode = 1
  }
}

function commandStatus(): void {
  const state = readState()
  const pid = readPid()
  if (!state || !pid) {
    process.stdout.write('status: stopped\n')
    return
  }
  const alive = isPidAlive(pid)
  const output = {
    status: alive ? 'running' : 'stopped',
    pid,
    port: state.port,
    startedAt: state.startedAt,
    storeDir: paths().baseDir,
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

function commandTaskAdd(type: string, payloadRaw: string | null): void {
  if (!type) {
    process.stderr.write('task type required\n')
    process.exit(1)
  }
  let payload: Record<string, unknown> = {}
  if (payloadRaw) {
    try {
      payload = JSON.parse(payloadRaw) as Record<string, unknown>
    } catch {
      process.stderr.write('invalid json payload\n')
      process.exit(1)
    }
  }
  const payloadError = validateTaskPayload(type, payload)
  if (payloadError) {
    process.stderr.write(`${payloadError}\n`)
    process.exit(1)
  }
  const maxAttemptsRaw = argValue('--max-attempts')
  const maxAttempts = maxAttemptsRaw ? Math.max(1, Number(maxAttemptsRaw)) : 3
  if (!Number.isFinite(maxAttempts)) {
    process.stderr.write('--max-attempts must be a positive number\n')
    process.exit(1)
  }
  const task = addTask({ type, payload, maxAttempts })
  process.stdout.write(`${JSON.stringify(task, null, 2)}\n`)
}

function commandTaskList(): void {
  const registry = readTaskRegistry()
  process.stdout.write(`${JSON.stringify(registry, null, 2)}\n`)
}

function commandTaskDlq(): void {
  const registry = readTaskRegistry()
  const dead = registry.tasks.filter((task) => task.deadLetter === true)
  process.stdout.write(
    `${JSON.stringify({ version: registry.version, tasks: dead, updatedAt: registry.updatedAt }, null, 2)}\n`
  )
}

async function main(): Promise<void> {
  const [command, subcommand, ...rest] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h') {
    usage()
    return
  }
  if (command === 'start') return commandStart()
  if (command === 'stop') return commandStop()
  if (command === 'status') return commandStatus()
  if (command === 'task' && subcommand === 'add') return commandTaskAdd(rest[0] || '', rest[1] || null)
  if (command === 'task' && subcommand === 'list') return commandTaskList()
  if (command === 'task' && subcommand === 'dlq') return commandTaskDlq()

  usage()
  process.exitCode = 1
}

void main()
