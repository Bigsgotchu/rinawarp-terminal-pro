import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { IpcMain } from 'electron'

const execAsync = promisify(exec)

export type PortRiskLevel = 'read' | 'safe-write' | 'destructive'

export type PortCommandPlan = {
  label?: string
  command: string
  reason: string
  risk: PortRiskLevel
  requiresApproval: boolean
  expectedEffect?: string
  rollbackAwareness?: string
  verificationHint?: string
}

type PortProcess = {
  port: number
  pid: number
  processName: string
  command?: string
  protocol?: string
  address?: string
}

type PortCommandResult = PortCommandPlan & {
  ok: boolean
  output: string
  error?: string
}

type PortDiagnosticResult = {
  ok: boolean
  title: string
  summary: string
  port: number
  process?: PortProcess
  plan: PortCommandPlan[]
  results: PortCommandResult[]
  findings: string[]
  stopPlan: PortCommandPlan[]
}

type StopPortResult = PortCommandResult & {
  port: number
  pid: number
  verification: PortDiagnosticResult
}

function validatePort(input: unknown): number {
  const port = Number(input)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('A valid port number is required.')
  }
  return port
}

function readPlan(port: number): PortCommandPlan[] {
  return [
    {
      command: `lsof -i :${port} -P -n`,
      reason: `Check which process is listening on port ${port}. This does not stop or change anything.`,
      risk: 'read',
      requiresApproval: false,
      expectedEffect: `Show the process using port ${port}, if one is present.`,
      rollbackAwareness: 'No change; nothing to roll back.',
    },
    {
      command: `ss -ltnp "sport = :${port}"`,
      reason: `Use ss as a read-only listener check for port ${port} when available.`,
      risk: 'read',
      requiresApproval: false,
      expectedEffect: `Confirm whether port ${port} is listening and expose PID details when available.`,
      rollbackAwareness: 'No change; nothing to roll back.',
    },
    {
      command: `netstat -tulpn | grep :${port}`,
      reason: `Use netstat as a read-only fallback for port ${port} when available.`,
      risk: 'read',
      requiresApproval: false,
      expectedEffect: `Confirm whether port ${port} appears in listening network sockets.`,
      rollbackAwareness: 'No change; nothing to roll back.',
    },
  ]
}

function stopPlan(port: number, process: PortProcess): PortCommandPlan[] {
  return [
    {
      label: `Stop ${process.processName} on port ${port}`,
      command: `kill ${process.pid}`,
      reason: `Stop PID ${process.pid}, which is currently using port ${port}.`,
      risk: 'safe-write',
      requiresApproval: true,
      expectedEffect: `Stops the process currently using port ${port}.`,
      rollbackAwareness:
        'This cannot resume the exact process automatically, but you can usually restart it from the project/app that launched it.',
      verificationHint: `Re-check port ${port} after stopping the process.`,
    },
  ]
}

async function runShell(command: string): Promise<{ ok: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash',
      env: process.env,
    })
    return {
      ok: true,
      output: [stdout, stderr].filter(Boolean).join('\n').trim(),
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      ok: false,
      output: [err.stdout, err.stderr].filter(Boolean).join('\n').trim(),
      error: err.message || 'Command failed',
    }
  }
}

async function runCommand(item: PortCommandPlan): Promise<PortCommandResult> {
  const result = await runShell(item.command)
  return {
    ...item,
    ...result,
  }
}

function parseLsof(output: string, port: number): PortProcess | undefined {
  const rows = output.split('\n').map((line) => line.trim()).filter(Boolean)
  for (const row of rows.slice(1)) {
    if (!row.includes(`:${port}`)) continue
    const parts = row.split(/\s+/)
    const pid = Number(parts[1])
    if (!Number.isInteger(pid)) continue
    const nameIndex = parts.findIndex((part) => /\bTCP\b|\bUDP\b/.test(part))
    const endpoint = nameIndex >= 0 ? parts.slice(nameIndex).join(' ') : row
    return {
      port,
      pid,
      processName: parts[0] || 'unknown',
      command: parts[0],
      protocol: endpoint.includes('UDP') ? 'UDP' : 'TCP',
      address: endpoint,
    }
  }
  return undefined
}

function parseSs(output: string, port: number): PortProcess | undefined {
  const rows = output.split('\n').map((line) => line.trim()).filter(Boolean)
  for (const row of rows) {
    if (!row.includes(`:${port}`)) continue
    const pidMatch = row.match(/pid=(\d+)/)
    const nameMatch = row.match(/users:\(\("([^"]+)"/)
    const pid = pidMatch ? Number(pidMatch[1]) : NaN
    if (!Number.isInteger(pid)) continue
    return {
      port,
      pid,
      processName: nameMatch?.[1] || 'unknown',
      command: nameMatch?.[1],
      protocol: 'TCP',
      address: row,
    }
  }
  return undefined
}

function parseNetstat(output: string, port: number): PortProcess | undefined {
  const rows = output.split('\n').map((line) => line.trim()).filter(Boolean)
  for (const row of rows) {
    if (!row.includes(`:${port}`)) continue
    const parts = row.split(/\s+/)
    const pidProgram = parts.at(-1) || ''
    const [pidRaw, processNameRaw] = pidProgram.split('/')
    const pid = Number(pidRaw)
    if (!Number.isInteger(pid)) continue
    return {
      port,
      pid,
      processName: processNameRaw || 'unknown',
      command: processNameRaw,
      protocol: parts[0]?.toUpperCase(),
      address: parts[3] || row,
    }
  }
  return undefined
}

function findProcess(results: PortCommandResult[], port: number): PortProcess | undefined {
  const lsof = results.find((result) => result.command.startsWith('lsof '))
  const ss = results.find((result) => result.command.startsWith('ss '))
  const netstat = results.find((result) => result.command.startsWith('netstat '))
  return (
    (lsof?.output ? parseLsof(lsof.output, port) : undefined) ||
    (ss?.output ? parseSs(ss.output, port) : undefined) ||
    (netstat?.output ? parseNetstat(netstat.output, port) : undefined)
  )
}

function summarizeProcess(port: number, process?: PortProcess): string {
  if (!process) return `I don't see anything currently listening on port ${port}.`
  return `Port ${port} is being used by ${process.processName}, PID ${process.pid}. That is likely why your app cannot start on this port.`
}

async function inspectPort(port: number): Promise<PortDiagnosticResult> {
  const plan = readPlan(port)
  const results = await Promise.all(plan.map((item) => runCommand(item)))
  const process = findProcess(results, port)
  const summary = summarizeProcess(port, process)
  const findings = [
    summary,
    process?.address ? `Address/protocol: ${process.address}` : null,
    process?.command ? `Command: ${process.command}` : null,
  ].filter((finding): finding is string => Boolean(finding))

  return {
    ok: true,
    title: 'Port conflict diagnostic',
    summary,
    port,
    process,
    plan,
    results,
    findings,
    stopPlan: process ? stopPlan(port, process) : [],
  }
}

export function registerPortConflictDiagnosticIpc(ipcMain: IpcMain): void {
  ipcMain.handle('rina:diagnostic:portConflict', async (_event, input: { port?: number }): Promise<PortDiagnosticResult> => {
    const port = validatePort(input?.port)
    return inspectPort(port)
  })

  ipcMain.handle(
    'rina:diagnostic:stopPortProcess',
    async (_event, input: { port?: number; pid?: number; command?: string; approved?: boolean }): Promise<StopPortResult> => {
      if (!input?.approved) {
        throw new Error('Stop action was not approved.')
      }
      const port = validatePort(input.port)
      const pid = Number(input.pid)
      if (!Number.isInteger(pid) || pid < 1) {
        throw new Error('A valid PID is required.')
      }

      const command = `kill ${pid}`
      if (input.command !== command) {
        throw new Error('Stop command does not match the approved port plan.')
      }

      const before = await inspectPort(port)
      if (!before.process || before.process.pid !== pid) {
        throw new Error(`PID ${pid} is no longer the process using port ${port}.`)
      }

      const action = stopPlan(port, before.process)[0]
      const result = await runCommand(action)
      await new Promise((resolve) => setTimeout(resolve, 500))
      const verification = await inspectPort(port)

      return {
        ...result,
        port,
        pid,
        verification,
      }
    }
  )
}
