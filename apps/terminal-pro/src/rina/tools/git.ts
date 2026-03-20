/**
 * Rina OS Control Layer - Git Tool
 *
 * Safe Git operations for repository management.
 * Fully integrated with safety layer and task queue.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { safetyCheck } from '../safety.js'

/**
 * Shell-safe identifier pattern: alphanumeric, dash, underscore, dot, slash, colon, at sign
 * Git references can contain: a-z, A-Z, 0-9, dash, underscore, dot, slash, colon, @
 */
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_./:-@]+$/

/**
 * Validate that a string is a safe Git identifier (no shell injection)
 */
function sanitizeIdentifier(input: string, fieldName: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error(`${fieldName} is required`)
  }

  const trimmed = input.trim()

  if (!SAFE_IDENTIFIER_PATTERN.test(trimmed)) {
    throw new Error(`${fieldName} contains invalid characters.`)
  }

  // Check for shell metacharacters that could enable injection
  const injectionPatterns = [
    /\$\(/, // Command substitution
    /`/, // Backtick command substitution
    /;/, // Command chaining
    /&&/, // AND chaining
    /\|\|/, // OR chaining
    />\s*\//, // Redirect to absolute path
    /<\s*\//, // Input from absolute path
    /\n/, // Newline
    /\r/, // Carriage return
    /\0/, // Null byte
  ]

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`${fieldName} contains unsafe characters.`)
    }
  }

  return trimmed
}

/**
 * Sanitize a commit message - allows more characters but still safe
 */
function sanitizeCommitMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    throw new Error('Commit message is required')
  }

  // Remove null bytes and control characters (except newline, tab)
  const sanitized = message.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

  // Check for command injection patterns
  if (/\$\(|`|;\s*rm|;\s*git/.test(sanitized)) {
    throw new Error('Commit message contains unsafe characters.')
  }

  // Limit length
  return sanitized.substring(0, 5000)
}

/**
 * Terminal command runner (imported from terminal tool)
 */
async function runCommand(
  command: string,
  cwd?: string
): Promise<{
  stdout: string
  stderr: string
  success: boolean
}> {
  // Use dynamic import to avoid circular dependencies
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

/**
 * Git operations tool
 */
export const gitTool: RinaTool = {
  name: 'git',
  description: 'Execute Git operations (init, clone, add, commit, push, pull, status)',

  canHandle(task: RinaTask): boolean {
    return task.tool === 'git' && !!task.input.command
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command
    if (!command || typeof command !== 'string') {
      return { valid: false, error: 'Git command is required' }
    }
    return { valid: true }
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const input = task.input as {
      command?: string
      repo?: string
      path?: string
      message?: string
      remote?: string
      branch?: string
    }

    const command = input.command

    // Validate command type
    if (!command || typeof command !== 'string') {
      return { ok: false, error: 'Git command is required' }
    }

    // Validate and sanitize inputs
    let sanitizedRepo: string | undefined
    let sanitizedPath: string | undefined
    let sanitizedMessage: string | undefined
    let sanitizedRemote: string | undefined
    let sanitizedBranch: string | undefined

    try {
      if (input.repo) {
        sanitizedRepo = sanitizeIdentifier(input.repo, 'repo')
      }
      if (input.path) {
        sanitizedPath = sanitizeIdentifier(input.path, 'path')
      }
      if (input.message) {
        sanitizedMessage = sanitizeCommitMessage(input.message)
      }
      if (input.remote) {
        sanitizedRemote = sanitizeIdentifier(input.remote, 'remote')
      }
      if (input.branch) {
        sanitizedBranch = sanitizeIdentifier(input.branch, 'branch')
      }
    } catch (validationError) {
      return {
        ok: false,
        error: validationError instanceof Error ? validationError.message : 'Input validation failed',
      }
    }

    const path = sanitizedPath || context.workspaceRoot

    // Safety check the path and command
    if (path && safetyCheck(path, context.mode).blocked) {
      return { ok: false, error: 'Path blocked by safety rules', blocked: true }
    }

    try {
      let result: { stdout: string; stderr: string; success: boolean }

      switch (command) {
        case 'init':
          result = await runCommand('git init', path)
          break

        case 'clone':
          if (!sanitizedRepo || !sanitizedPath) {
            return { ok: false, error: 'Clone requires repo and path' }
          }
          result = await runCommand(`git clone ${sanitizedRepo} ${sanitizedPath}`, path)
          break

        case 'add':
          result = await runCommand('git add .', path)
          break

        case 'commit':
          if (!sanitizedMessage) {
            return { ok: false, error: 'Commit requires a message' }
          }
          // Message already sanitized
          result = await runCommand(`git commit -m "${sanitizedMessage}"`, path)
          break

        case 'push':
          const remote = sanitizedRemote || 'origin'
          const branch = sanitizedBranch || 'main'
          result = await runCommand(`git push ${remote} ${branch}`, path)
          break

        case 'pull':
          const pullRemote = sanitizedRemote || 'origin'
          const pullBranch = sanitizedBranch || 'main'
          result = await runCommand(`git pull ${pullRemote} ${pullBranch}`, path)
          break

        case 'status':
          result = await runCommand('git status', path)
          break

        case 'log':
          result = await runCommand('git log --oneline -10', path)
          break

        case 'diff':
          result = await runCommand('git diff', path)
          break

        case 'branch':
          result = await runCommand('git branch -a', path)
          break

        case 'checkout':
          if (!sanitizedBranch) {
            return { ok: false, error: 'Checkout requires branch name' }
          }
          result = await runCommand(`git checkout ${sanitizedBranch}`, path)
          break

        case 'fetch':
          result = await runCommand('git fetch --all', path)
          break

        default:
          return { ok: false, error: `Unknown git command: ${command}` }
      }

      return {
        ok: result.success,
        output: {
          command,
          stdout: result.stdout,
          stderr: result.stderr,
        },
        error: result.success ? undefined : result.stderr,
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}

/**
 * Git tool singleton for direct usage
 */
export const gitTools = {
  async initRepo(path: string) {
    const task: RinaTask = {
      intent: 'git-init',
      tool: 'git',
      input: { command: 'init', path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async cloneRepo(repoUrl: string, targetPath: string) {
    const task: RinaTask = {
      intent: 'git-clone',
      tool: 'git',
      input: { command: 'clone', repo: repoUrl, path: targetPath },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: targetPath })
  },

  async addAll(path: string) {
    const task: RinaTask = {
      intent: 'git-add',
      tool: 'git',
      input: { command: 'add', path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async commit(path: string, message: string) {
    const task: RinaTask = {
      intent: 'git-commit',
      tool: 'git',
      input: { command: 'commit', message, path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async push(path: string, remote = 'origin', branch = 'main') {
    const task: RinaTask = {
      intent: 'git-push',
      tool: 'git',
      input: { command: 'push', remote, branch, path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async status(path: string) {
    const task: RinaTask = {
      intent: 'git-status',
      tool: 'git',
      input: { command: 'status', path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async log(path: string) {
    const task: RinaTask = {
      intent: 'git-log',
      tool: 'git',
      input: { command: 'log', path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async branch(path: string) {
    const task: RinaTask = {
      intent: 'git-branch',
      tool: 'git',
      input: { command: 'branch', path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },

  async checkout(path: string, branch: string) {
    const task: RinaTask = {
      intent: 'git-checkout',
      tool: 'git',
      input: { command: 'checkout', branch, path },
    }
    return gitTool.execute(task, { mode: 'auto', workspaceRoot: path })
  },
}
