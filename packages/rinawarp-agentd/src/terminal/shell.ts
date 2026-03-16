/**
 * Shell - Command Execution
 *
 * Executes shell commands and returns output.
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CommandOutput {
  stdout: string
  stderr: string
  exitCode: number | null
  success: boolean
}

export interface ExecuteOptions {
  cwd?: string
  timeoutMs?: number
  env?: Record<string, string>
}

/**
 * Execute a shell command
 */
export async function executeCommand(command: string, options: ExecuteOptions = {}): Promise<CommandOutput> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      env: { ...process.env, ...options.env },
    })

    return {
      stdout,
      stderr,
      exitCode: 0,
      success: true,
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || String(error),
      exitCode: err.code ?? null,
      success: false,
    }
  }
}

/**
 * Execute multiple commands in sequence
 */
export async function executeCommands(commands: string[], options: ExecuteOptions = {}): Promise<CommandOutput[]> {
  const results: CommandOutput[] = []

  for (const cmd of commands) {
    const result = await executeCommand(cmd, options)
    results.push(result)

    // Stop on failure if configured
    if (!result.success && options.timeoutMs === undefined) {
      break
    }
  }

  return results
}

/**
 * Check if a command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${command}`)
    return true
  } catch {
    return false
  }
}

/**
 * Get shell info
 */
export function getShellInfo(): { shell: string; pid: number } {
  return {
    shell: process.env.SHELL?.split('/').pop() || 'bash',
    pid: process.pid,
  }
}
