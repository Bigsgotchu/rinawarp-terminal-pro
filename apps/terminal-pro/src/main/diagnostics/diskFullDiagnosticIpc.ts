import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { IpcMain } from 'electron'

const execAsync = promisify(exec)

export type RiskLevel = 'read' | 'safe-write' | 'destructive'

export type CommandPlan = {
  label?: string
  command: string
  reason: string
  risk: RiskLevel
  requiresApproval: boolean
}

type CommandResult = CommandPlan & {
  ok: boolean
  output: string
  error?: string
}

type DiskFullDiagnosticResult = {
  ok: boolean
  title: string
  summary: string
  plan: CommandPlan[]
  results: CommandResult[]
  findings: string[]
  cleanupPlan: CommandPlan[]
}

const readPlan: CommandPlan[] = [
  {
    command: 'df -h',
    reason: 'Check mounted filesystem usage and find disks near capacity.',
    risk: 'read',
    requiresApproval: false,
  },
  {
    command: 'du -sh ~/Downloads/* 2>/dev/null | sort -h',
    reason: 'Estimate the largest visible items in Downloads without deleting anything.',
    risk: 'read',
    requiresApproval: false,
  },
  {
    command: 'docker system df',
    reason: 'Check Docker image, container, volume, and build-cache usage.',
    risk: 'read',
    requiresApproval: false,
  },
  {
    command: 'npm cache verify',
    reason: 'Check npm cache health and size without changing cache contents.',
    risk: 'read',
    requiresApproval: false,
  },
]

const cleanupPlan: CommandPlan[] = [
  {
    label: 'Clean npm cache',
    command: 'npm cache clean --force',
    reason: 'Remove npm cache files after you approve the cleanup.',
    risk: 'safe-write',
    requiresApproval: true,
  },
  {
    label: 'Remove Docker unused data',
    command: 'docker system prune',
    reason: 'Remove unused Docker images, containers, networks, and build cache after you approve.',
    risk: 'destructive',
    requiresApproval: true,
  },
]

function plan(command: string, reason: string, risk: RiskLevel): CommandPlan {
  return {
    command,
    reason,
    risk,
    requiresApproval: risk !== 'read',
  }
}

function normalizePlan(item: CommandPlan): CommandPlan {
  return {
    ...plan(item.command, item.reason, item.risk),
    label: item.label,
  }
}

async function runCommand(item: CommandPlan): Promise<CommandResult> {
  const command =
    item.command === 'docker system prune'
      ? 'printf "y\\n" | docker system prune'
      : item.command

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash',
      env: process.env,
    })
    return {
      ...item,
      ok: true,
      output: [stdout, stderr].filter(Boolean).join('\n').trim(),
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      ...item,
      ok: false,
      output: [err.stdout, err.stderr].filter(Boolean).join('\n').trim(),
      error: err.message || 'Command failed',
    }
  }
}

function findRootDiskUsage(dfOutput: string): string | null {
  const lines = dfOutput.split('\n').map((line) => line.trim()).filter(Boolean)
  const rootLine = lines.find((line) => /\s\/$/.test(line)) || lines.find((line) => /\d+%/.test(line))
  if (!rootLine) return null
  const parts = rootLine.split(/\s+/)
  const percent = parts.find((part) => /^\d+%$/.test(part))
  const size = parts[1]
  const used = parts[2]
  const available = parts[3]
  if (!percent) return rootLine
  return `Main disk is ${percent} full (${used || 'unknown'} used, ${available || 'unknown'} available of ${size || 'unknown'}).`
}

function summarizeDownloads(duOutput: string): string | null {
  const rows = duOutput.split('\n').map((line) => line.trim()).filter(Boolean)
  if (!rows.length) return null
  const largest = rows.slice(-3).reverse()
  return `Largest Downloads items: ${largest.join('; ')}.`
}

function summarizeDocker(output: string, ok: boolean): string {
  if (!ok) return 'Docker usage could not be read. Docker may not be installed or running.'
  if (!output.trim()) return 'Docker usage returned no data.'
  return `Docker space summary: ${output.split('\n').slice(0, 5).join(' | ')}.`
}

function summarizeNpm(output: string, ok: boolean): string {
  if (!ok) return 'npm cache could not be verified.'
  if (!output.trim()) return 'npm cache verification returned no output.'
  return `npm cache check: ${output.split('\n').slice(-3).join(' | ')}.`
}

function buildFindings(results: CommandResult[]): string[] {
  const df = results.find((result) => result.command === 'df -h')
  const downloads = results.find((result) => result.command.startsWith('du -sh'))
  const docker = results.find((result) => result.command === 'docker system df')
  const npm = results.find((result) => result.command === 'npm cache verify')

  return [
    df?.output ? findRootDiskUsage(df.output) : null,
    downloads?.output ? summarizeDownloads(downloads.output) : 'Downloads did not show readable large files.',
    docker ? summarizeDocker(docker.output, docker.ok) : null,
    npm ? summarizeNpm(npm.output, npm.ok) : null,
  ].filter((finding): finding is string => Boolean(finding))
}

export function registerDiskFullDiagnosticIpc(ipcMain: IpcMain): void {
  ipcMain.handle('rina:diagnostic:diskFull', async (): Promise<DiskFullDiagnosticResult> => {
    const normalizedPlan = readPlan.map(normalizePlan)
    const results = await Promise.all(normalizedPlan.map(runCommand))
    const findings = buildFindings(results)

    return {
      ok: true,
      title: 'Disk full diagnostic',
      summary:
        findings[0] ||
        'I checked disk usage, Downloads, Docker, and npm cache. Review the command output before approving any cleanup.',
      plan: normalizedPlan,
      results,
      findings,
      cleanupPlan: cleanupPlan.map(normalizePlan),
    }
  })

  ipcMain.handle(
    'rina:diagnostic:runCleanup',
    async (_event, input: { command?: string; approved?: boolean }): Promise<CommandResult> => {
      if (!input?.approved) {
        throw new Error('Cleanup was not approved.')
      }

      const item = cleanupPlan.find((candidate) => candidate.command === input.command)
      if (!item) {
        throw new Error('Cleanup command is not in the approved diagnostic plan.')
      }

      return runCommand(normalizePlan(item))
    }
  )
}
