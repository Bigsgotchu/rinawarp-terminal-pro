/**
 * LEGACY terminal tool — forwards execution to canonical runtime.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { safetyCheck } from '../safety.js'
import { forwardLegacyPrompt } from '../controller/legacyInputAdapter.js'

export interface TerminalResult {
  stdout: string
  stderr: string
  success: boolean
}

function normalizeCwd(context: ToolContext): string | undefined {
  const cwd = String(context.workspaceRoot || '').trim()
  return cwd || undefined
}

function responseToTerminalResult(output: unknown, error?: string, ok = true): TerminalResult {
  const text = typeof output === 'string' ? output : output == null ? '' : JSON.stringify(output)
  return {
    stdout: ok ? text : '',
    stderr: ok ? '' : error || text,
    success: ok,
  }
}

/**
 * Dev-only direct shell for tool smoke tests (`RINAWARP_TOOL_SMOKE=1`).
 */
export async function safeExec(command: string, cwd?: string): Promise<TerminalResult> {
  const safety = safetyCheck(command, 'assist')
  if (safety.blocked) {
    return { stdout: '', stderr: `Blocked: ${safety.reason}`, success: false }
  }

  if (process.env.RINAWARP_TOOL_SMOKE === '1') {
    try {
      const { execCommand } = await import('../execution/legacyShell.js')
      const { stdout, stderr } = await execCommand(command, { shell: '/bin/bash', timeout: 30000, cwd })
      return { stdout, stderr, success: true }
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string }
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || '',
        success: false,
      }
    }
  }

  const response = await forwardLegacyPrompt(command, cwd || process.cwd(), 'execute')
  return responseToTerminalResult(response.output, response.error, response.ok)
}

export const terminalTool: RinaTool = {
  name: 'terminal',
  description: 'Forward terminal commands to canonical runtime',

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

    const safety = safetyCheck(command, mode as 'explain' | 'assist' | 'auto')
    if (safety.blocked) {
      return {
        ok: false,
        output: { message: `Command blocked: ${safety.reason}`, command, blocked: true },
        blocked: true,
        error: safety.reason,
      }
    }

    if (mode === 'explain') {
      return {
        ok: true,
        output: { message: `Would forward to runtime: ${command}`, command, mode, cwd },
      }
    }

    if (!cwd) {
      return {
        ok: false,
        output: { message: 'Command blocked: missing workspace root', command, success: false },
        error: 'Missing workspace root',
      }
    }

    const result = await safeExec(command, cwd)
    return {
      ok: result.success,
      output: { stdout: result.stdout, stderr: result.stderr, command, cwd, success: result.success },
      error: result.success ? undefined : result.stderr || 'Command failed',
    }
  },
}
