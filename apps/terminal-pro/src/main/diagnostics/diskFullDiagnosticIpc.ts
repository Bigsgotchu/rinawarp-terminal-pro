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
  expectedEffect?: string
  rollbackAwareness?: 'not-applicable' | 'regenerable' | 're-downloadable' | 'irreversible'
}

type CommandResult = CommandPlan & {
  ok: boolean
  output: string
  error?: string
  evidence?: DiskEvidence
}

type DiskFullDiagnosticResult = {
  ok: boolean
  title: string
  summary: string
  evidence?: DiskEvidence
  plan: CommandPlan[]
  results: CommandResult[]
  findings: string[]
  cleanupPlan: CommandPlan[]
}

const readPlan: CommandPlan[] = [
  {
    command: 'df -h',
    reason: 'Inspect mounted filesystem usage. This does not change anything.',
    risk: 'read',
    requiresApproval: false,
    expectedEffect: 'Show current disk pressure before any cleanup is proposed.',
    rollbackAwareness: 'not-applicable',
  },
  {
    command: 'du -sh ~/Downloads/* 2>/dev/null | sort -h',
    reason: 'Inspect the largest visible Downloads items without deleting anything.',
    risk: 'read',
    requiresApproval: false,
    expectedEffect: 'Identify large files that may need manual review.',
    rollbackAwareness: 'not-applicable',
  },
  {
    command: 'docker system df',
    reason: 'Inspect Docker image, container, volume, and build-cache usage.',
    risk: 'read',
    requiresApproval: false,
    expectedEffect: 'Estimate whether Docker cleanup could recover meaningful space.',
    rollbackAwareness: 'not-applicable',
  },
  {
    command: 'npm cache verify',
    reason: 'Inspect npm cache health and size without changing cache contents.',
    risk: 'read',
    requiresApproval: false,
    expectedEffect: 'Estimate whether npm cache cleanup is worth approving.',
    rollbackAwareness: 'not-applicable',
  },
]

const cleanupPlan: CommandPlan[] = [
  {
    label: 'Clean npm cache',
    command: 'npm cache clean --force',
    reason: 'Remove npm cache files only after you approve this action.',
    risk: 'safe-write',
    requiresApproval: true,
    expectedEffect: 'Recover space used by npm cache files. npm can recreate this cache later.',
    rollbackAwareness: 'regenerable',
  },
  {
    label: 'Remove Docker unused data',
    command: 'docker system prune',
    reason: 'Remove unused Docker images, containers, networks, and build cache only after you approve this action.',
    risk: 'destructive',
    requiresApproval: true,
    expectedEffect: 'Recover space used by Docker data that is not currently attached to running containers.',
    rollbackAwareness: 're-downloadable',
  },
]

type DiskEvidence = {
  percent?: string
  size?: string
  used?: string
  available?: string
  raw?: string
}

function plan(item: CommandPlan): CommandPlan {
  return {
    command: item.command,
    reason: item.reason,
    risk: item.risk,
    requiresApproval: item.risk !== 'read',
    expectedEffect: item.expectedEffect,
    rollbackAwareness: item.rollbackAwareness,
    label: item.label,
  }
}

function normalizePlan(item: CommandPlan): CommandPlan {
  return plan(item)
}

async function runShell(command: string): Promise<{ ok: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 15_000,
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

async function runCommand(item: CommandPlan, options?: { verifyDiskAfter?: boolean }): Promise<CommandResult> {
  const command =
    item.command === 'docker system prune'
      ? 'printf "y\\n" | docker system prune'
      : item.command

  const result = await runShell(command)
  const evidence = options?.verifyDiskAfter ? await collectDiskEvidence() : undefined
  return {
    ...item,
    ...result,
    evidence,
  }
}

function parseRootDiskUsage(dfOutput: string): DiskEvidence | null {
  const lines = dfOutput.split('\n').map((line) => line.trim()).filter(Boolean)
  const rootLine = lines.find((line) => /\s\/$/.test(line)) || lines.find((line) => /\d+%/.test(line))
  if (!rootLine) return null
  const parts = rootLine.split(/\s+/)
  const percent = parts.find((part) => /^\d+%$/.test(part))
  const size = parts[1]
  const used = parts[2]
  const available = parts[3]
  if (!percent) return { raw: rootLine }
  return { percent, used, available, size, raw: rootLine }
}

async function collectDiskEvidence(): Promise<DiskEvidence | undefined> {
  const result = await runShell('df -h')
  if (!result.output) return undefined
  return parseRootDiskUsage(result.output) || { raw: result.output.split('\n').find(Boolean) }
}

function formatDiskEvidence(evidence?: DiskEvidence): string | null {
  if (!evidence) return null
  if (!evidence.percent) return evidence.raw || null
  return `Main disk is ${evidence.percent} full (${evidence.used || 'unknown'} used, ${evidence.available || 'unknown'} available of ${evidence.size || 'unknown'}).`
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
    df?.output ? formatDiskEvidence(parseRootDiskUsage(df.output) || undefined) : null,
    downloads?.output ? summarizeDownloads(downloads.output) : 'Downloads did not show readable large files.',
    docker ? summarizeDocker(docker.output, docker.ok) : null,
    npm ? summarizeNpm(npm.output, npm.ok) : null,
  ].filter((finding): finding is string => Boolean(finding))
}

export function registerDiskFullDiagnosticIpc(ipcMain: IpcMain): void {
  ipcMain.handle('rina:diagnostic:diskFull', async (): Promise<DiskFullDiagnosticResult> => {
    const normalizedPlan = readPlan.map(normalizePlan)
    const results = await Promise.all(normalizedPlan.map((item) => runCommand(item)))
    const findings = buildFindings(results)
    const evidence = results.find((result) => result.command === 'df -h')?.output
      ? parseRootDiskUsage(results.find((result) => result.command === 'df -h')?.output || '') || undefined
      : undefined

    return {
      ok: true,
      title: 'Disk full diagnostic',
      summary:
        findings[0] ||
        'Rina inspected disk usage, Downloads, Docker, and npm cache with read-only checks. No cleanup has run.',
      evidence,
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

      return runCommand(normalizePlan(item), { verifyDiskAfter: true })
    }
  )
}
