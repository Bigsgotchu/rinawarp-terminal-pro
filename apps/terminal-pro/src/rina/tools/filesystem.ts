/**
 * Rina OS Control Layer - Filesystem Tool
 *
 * Safe filesystem operations with safety guardrails.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import fs from 'fs/promises'
import path from 'path'

/**
 * Standalone safe filesystem functions for direct use in development
 */
export async function safeRead(filePath: string): Promise<string | null> {
  // Safety check for dangerous paths
  if (filePath.includes('/dev/') || filePath.includes('/sys/') || filePath.startsWith('/proc/')) {
    return null
  }
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function safeWrite(filePath: string, content: string): Promise<boolean> {
  // Safety check for dangerous paths
  if (filePath.includes('/dev/') || filePath.includes('/sys/') || filePath.startsWith('/proc/')) {
    return false
  }
  try {
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
}

export async function safeDelete(filePath: string): Promise<boolean> {
  // Safety check for dangerous paths
  if (filePath === '/' || filePath === '/home' || filePath.startsWith('/usr/') || filePath.startsWith('/bin/')) {
    return false
  }
  try {
    await fs.rm(filePath, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export async function safeListDir(dirPath: string): Promise<string[] | null> {
  // Safety check
  if (dirPath.includes('/dev/') || dirPath.includes('/sys/') || dirPath.startsWith('/proc/')) {
    return null
  }
  try {
    return await fs.readdir(dirPath)
  } catch {
    return null
  }
}

export const filesystemTool: RinaTool = {
  name: 'filesystem',
  description: 'Browse and manage filesystem',

  canHandle(task: RinaTask): boolean {
    return task.tool === 'filesystem'
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const action = input.action as string

    const allowedActions = ['browse', 'read', 'list', 'info', 'write', 'delete']
    if (action && !allowedActions.includes(action)) {
      return { valid: false, error: `Action must be one of: ${allowedActions.join(', ')}` }
    }

    return { valid: true }
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const action = (task.input.action as string) || 'browse'
    const targetPath = task.input.path as string
    const content = task.input.content as string
    const mode = (task.input.mode as string) || context.mode

    // In explain/assist modes, show what would happen
    if (mode === 'explain') {
      return {
        ok: true,
        output: {
          action: `would-${action}`,
          mode,
          targetPath,
          explanation: `In explain mode, I would ${action} the file at: ${targetPath}`,
        },
      }
    }

    if (mode === 'assist') {
      return {
        ok: true,
        output: {
          requestedAction: action,
          targetPath,
          mode,
          message: `Ready to ${action} filesystem`,
        },
        requiresConfirmation: true,
      }
    }

    // Auto mode - execute filesystem operations
    try {
      switch (action) {
        case 'write': {
          if (!targetPath || !content) {
            return { ok: false, error: 'Path and content are required for write' }
          }
          // Ensure directory exists
          const dir = path.dirname(targetPath)
          await fs.mkdir(dir, { recursive: true })
          await fs.writeFile(targetPath, content, 'utf-8')
          return {
            ok: true,
            output: { action: 'written', path: targetPath, success: true },
          }
        }
        case 'read': {
          if (!targetPath) {
            return { ok: false, error: 'Path is required for read' }
          }
          const fileContent = await fs.readFile(targetPath, 'utf-8')
          return {
            ok: true,
            output: { action: 'read', path: targetPath, content: fileContent },
          }
        }
        case 'list': {
          if (!targetPath) {
            return { ok: false, error: 'Path is required for list' }
          }
          const files = await fs.readdir(targetPath)
          return {
            ok: true,
            output: { action: 'listed', path: targetPath, files },
          }
        }
        case 'delete': {
          if (!targetPath) {
            return { ok: false, error: 'Path is required for delete' }
          }
          await fs.unlink(targetPath)
          return {
            ok: true,
            output: { action: 'deleted', path: targetPath, success: true },
          }
        }
        default: {
          // Use existing code API for browse/info
          const projectRoot = context.workspaceRoot

          if (!projectRoot) {
            return {
              ok: false,
              error: 'No workspace selected',
            }
          }

          // @ts-ignore
          const result = await window.rina?.codeListFiles?.({
            projectRoot,
            limit: 100,
          })

          return {
            ok: !!result?.ok,
            output: result || { files: [] },
          }
        }
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}
