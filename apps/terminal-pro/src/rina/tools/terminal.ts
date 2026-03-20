/**
 * Rina OS Control Layer - Terminal Tool
 *
 * Safe terminal command execution with safety guardrails.
 * Integrates with the existing PTY system.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { safetyCheck } from '../safety.js'
import { execCommand } from '../execution/legacyShell.js'

export interface TerminalResult {
  stdout: string
  stderr: string
  success: boolean
}

function normalizeCwd(context: ToolContext): string | undefined {
  const cwd = String(context.workspaceRoot || '').trim()
  return cwd || undefined
}

/**
 * Standalone safe exec function for direct use in development
 */
export async function safeExec(command: string, cwd?: string): Promise<TerminalResult> {
  const safety = safetyCheck(command, 'assist')
  if (safety.blocked) {
    return { stdout: '', stderr: `Blocked: ${safety.reason}`, success: false }
  }

  return new Promise((resolve) => {
    execCommand(command, { shell: '/bin/bash', timeout: 30000, cwd })
      .then(({ stdout, stderr }) =>
        resolve({
          stdout,
          stderr,
          success: true,
        })
      )
      .catch((error: any) =>
        resolve({
          stdout: error?.stdout || '',
          stderr: error?.stderr || error?.message || '',
          success: false,
        })
      )
  })
}

export const terminalTool: RinaTool = {
  name: 'terminal',
  description: 'Execute terminal commands safely',

  canHandle(task: RinaTask): boolean {
    return task.tool === 'terminal' && !!task.input.command
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command

    if (!command || typeof command !== 'string') {
      return { valid: false, error: 'Command is required' }
    }

    if (command.length > 10000) {
      return { valid: false, error: 'Command too long (max 10000 chars)' }
    }

    return { valid: true }
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const command = task.input.command as string
    const mode = (task.input.mode as string) || context.mode
    const cwd = normalizeCwd(context)

    // Safety check
    const safety = safetyCheck(command, mode as 'explain' | 'assist' | 'auto')

    if (safety.blocked) {
      return {
        ok: false,
        output: { message: `Command blocked: ${safety.reason}`, command, blocked: true },
        blocked: true,
        error: safety.reason,
      }
    }

    // Explain mode - show what would be executed
    if (mode === 'explain') {
      return {
        ok: true,
        output: {
          message: `Would run: ${command}`,
          command,
          mode,
          cwd,
        },
      }
    }

    if (!cwd) {
      return {
        ok: false,
        output: {
          message: 'Command blocked: missing workspace root',
          command,
          success: false,
        },
        error: 'Missing workspace root',
      }
    }

    try {
      const result = await safeExec(command, cwd)

      return {
        ok: result.success,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          command,
          cwd,
          success: result.success,
        },
        error: result.success ? undefined : result.stderr || 'Command failed',
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}
