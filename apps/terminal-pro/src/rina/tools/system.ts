/**
 * Rina OS Control Layer - System Tool
 *
 * System operations like mode switching, status, etc.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { rinaBrain } from '../brain.js'
import os from 'os'

export type Mode = 'explain' | 'assist' | 'auto'
let currentMode: Mode = 'assist'

export function setMode(mode: Mode): void {
  currentMode = mode
  rinaBrain.setMode(mode)
}

export function getMode(): Mode {
  return currentMode
}

// Placeholder dev-only actions
export function safeShutdown(): string {
  // Block real shutdown - dev safe only
  return 'Simulated shutdown (dev-only) - set RINAWARP_DEV=1 to use'
}

export function safeRestart(): string {
  // Block real restart - dev safe only
  return 'Simulated restart (dev-only) - set RINAWARP_DEV=1 to use'
}

export const systemTool: RinaTool = {
  name: 'system',
  description: 'System operations like mode switching and status',

  canHandle(task: RinaTask): boolean {
    return task.tool === 'system'
  },

  execute(task: RinaTask, _context: ToolContext): Promise<ToolResult> {
    const action = (task.input.action as string) || (task.input.mode as string)
    const mode = task.input.mode as 'explain' | 'assist' | 'auto'

    // Handle reboot action
    if (action === 'reboot') {
      if (mode === 'explain') {
        return Promise.resolve({
          ok: true,
          output: {
            message: 'Reboot triggered (simulated in test)',
            action: 'reboot',
            mode,
          },
        })
      }
      return Promise.resolve({
        ok: false,
        error: 'Reboot is blocked for safety - use explain mode',
        blocked: true,
      })
    }

    // Handle shutdown action
    if (action === 'shutdown') {
      if (mode === 'explain') {
        return Promise.resolve({
          ok: true,
          output: {
            message: 'Shutdown triggered (simulated in test)',
            action: 'shutdown',
            mode,
          },
        })
      }
      return Promise.resolve({
        ok: false,
        error: 'Shutdown is blocked for safety - use explain mode',
        blocked: true,
      })
    }

    if (action === 'set-mode' || task.input.mode) {
      const newMode = (task.input.mode || task.input.newMode) as 'explain' | 'assist' | 'auto'

      if (!newMode || !['explain', 'assist', 'auto'].includes(newMode)) {
        return Promise.resolve({
          ok: false,
          error: 'Invalid mode. Must be: explain, assist, or auto',
        })
      }

      rinaBrain.setMode(newMode)

      return Promise.resolve({
        ok: true,
        output: {
          action: 'mode-changed',
          previousMode: rinaBrain.getMode(),
          newMode,
        },
      })
    }

    if (action === 'status') {
      return Promise.resolve({
        ok: true,
        output: {
          mode: rinaBrain.getMode(),
          system: 'Rina OS Control Layer',
          version: '1.0.0',
          platform: os.platform(),
          arch: os.arch(),
        },
      })
    }

    // Default: return system info
    return Promise.resolve({
      ok: true,
      output: {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
      },
    })
  },
}
