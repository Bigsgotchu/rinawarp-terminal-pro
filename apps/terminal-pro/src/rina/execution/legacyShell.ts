import { exec as nodeExec, execSync as nodeExecSync } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(nodeExec)

export type LegacyExecOptions = {
  cwd?: string
  timeout?: number
  maxBuffer?: number
  env?: NodeJS.ProcessEnv
  shell?: string
}

export async function execCommand(
  command: string,
  options?: LegacyExecOptions
): Promise<{ stdout: string; stderr: string }> {
  const result = await execAsync(command, options)
  return {
    stdout:
      typeof result.stdout === 'string' ? result.stdout : (result.stdout?.toString('utf8') ?? ''),
    stderr:
      typeof result.stderr === 'string' ? result.stderr : (result.stderr?.toString('utf8') ?? ''),
  }
}

export function execCommandSync(command: string, options?: LegacyExecOptions): string {
  return nodeExecSync(command, {
    encoding: 'utf8',
    ...options,
  })
}
