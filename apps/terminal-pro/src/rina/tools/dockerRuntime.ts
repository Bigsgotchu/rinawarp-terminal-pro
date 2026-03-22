import type { RinaTask } from '../brain.js'

export async function runDockerCommand(
  command: string,
  cwd?: string
): Promise<{
  stdout: string
  stderr: string
  success: boolean
}> {
  const { terminalTool } = await import('./terminal.js')
  const task: RinaTask = {
    intent: 'run-command',
    tool: 'terminal',
    input: { command },
  }
  const result = await terminalTool.execute(task, { mode: 'auto', workspaceRoot: cwd })
  const payload = (result.output && typeof result.output === 'object' ? result.output : {}) as {
    stdout?: string
    stderr?: string
    output?: string
    message?: string
  }

  return {
    stdout: String(payload.stdout || payload.output || ''),
    stderr: String(payload.stderr || result.error || payload.message || ''),
    success: result.ok,
  }
}
