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

import { exec } from 'child_process'

export interface TerminalResult {
  stdout: string
  stderr: string
  success: boolean
}

/**
 * Standalone safe exec function for direct use in development
 */
export async function safeExec(command: string): Promise<TerminalResult> {
  const safety = safetyCheck(command, 'assist')
  if (safety.blocked) {
    return { stdout: '', stderr: `Blocked: ${safety.reason}`, success: false }
  }

  return new Promise((resolve) => {
    exec(command, { shell: '/bin/bash', timeout: 30000 }, (error: Error | null, stdout: string, stderr: string) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        success: !error,
      })
    })
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
        },
      }
    }

    // Assist mode - requires confirmation (simulated for test)
    if (mode === 'assist') {
      // For testing, we'll execute simple commands
      try {
        const { execSync } = await import('child_process')
        const output = execSync(command, { encoding: 'utf-8', timeout: 5000 }).trim()
        return {
          ok: true,
          output: {
            output,
            command,
            success: true,
          },
        }
      } catch (err) {
        return {
          ok: false,
          output: {
            message: `Command failed: ${err instanceof Error ? err.message : String(err)}`,
            command,
            success: false,
          },
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }

    // Auto mode - execute through IPC to main process
    // Note: This integrates with the existing PTY system
    try {
      // @ts-ignore - window.rina is injected by the preload script
      const result = await window.rina?.ptyWrite?.(`${command}\n`)

      return {
        ok: true,
        output: {
          action: 'executed',
          command,
          result,
        },
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}
