/**
 * Agent Sandbox - VM Isolation for Safe Agent Execution
 *
 * Uses Node.js VM to execute agents in isolation.
 * Agents cannot access process, child_process, or system environment
 * unless explicitly granted permission.
 */

import * as vm from 'vm'
import fs from 'fs'
import path from 'path'
import { checkPermission } from './permissions.js'
import type { Permission } from './permissions.js'

/**
 * Sandbox configuration options
 */
export interface SandboxOptions {
  /** Allowed timeout in milliseconds */
  timeout?: number
  /** Maximum memory in bytes */
  maxMemory?: number
  /** Working directory for filesystem operations */
  workingDirectory?: string
  /** Whether to allow network requests */
  allowNetwork?: number
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  executionTimeMs: number
}

/**
 * Default sandbox options
 */
const DEFAULT_TIMEOUT = 30000 // 30 second timeout
const DEFAULT_WORKING_DIR = process.cwd()

/**
 * Safe terminal execution - only runs commands permitted by agent manifest
 */
function createSafeTerminal(permissions: Permission[], workingDir: string) {
  return {
    run: (cmd: string): string => {
      checkPermission(permissions, 'terminal')

      // Additional safety: validate command doesn't contain dangerous patterns
      const dangerousPatterns = [/rm\s+-rf\s+\//i, /:\(\)\{.*:\|:\&\}/i, /dd\s+if=.*of=/i, />\s*\/dev\//i]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(cmd)) {
          throw new Error(`Blocked dangerous command pattern: ${cmd}`)
        }
      }

      // Execute using Node's execSync with restrictions
      const { execSync } = require('child_process')
      try {
        const result = execSync(cmd, {
          cwd: workingDir,
          timeout: 10000, // 10 second max per command
          maxBuffer: 1024 * 1024, // 1MB output max
          encoding: 'utf8',
        })
        return result
      } catch (error) {
        const err = error as { message?: string; stderr?: string }
        throw new Error(`Command failed: ${err.message || err.stderr || 'Unknown error'}`)
      }
    },
  }
}

/**
 * Safe filesystem API
 */
function createSafeFilesystem(permissions: Permission[], baseDir: string) {
  return {
    read: (filePath: string): string => {
      checkPermission(permissions, 'filesystem:read')
      const safePath = resolveSafePath(baseDir, filePath)
      return fs.readFileSync(safePath, 'utf8')
    },

    write: (filePath: string, content: string): void => {
      checkPermission(permissions, 'filesystem:write')
      const safePath = resolveSafePath(baseDir, filePath)

      // Ensure directory exists
      const dir = path.dirname(safePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(safePath, content, 'utf8')
    },

    exists: (filePath: string): boolean => {
      // Read permission check for existence
      checkPermission(permissions, 'filesystem:read')
      const safePath = resolveSafePath(baseDir, filePath)
      return fs.existsSync(safePath)
    },

    list: (dirPath: string): string[] => {
      checkPermission(permissions, 'filesystem:read')
      const safePath = resolveSafePath(baseDir, dirPath)

      if (!fs.existsSync(safePath)) {
        return []
      }

      const stat = fs.statSync(safePath)
      if (!stat.isDirectory()) {
        return []
      }

      return fs.readdirSync(safePath)
    },
  }
}

/**
 * Safe git API
 */
function createSafeGit(permissions: Permission[], workingDir: string) {
  return {
    status: (): string => {
      checkPermission(permissions, 'git')
      const { execSync } = require('child_process')
      return execSync('git status', { cwd: workingDir, encoding: 'utf8' })
    },

    diff: (): string => {
      checkPermission(permissions, 'git')
      const { execSync } = require('child_process')
      return execSync('git diff', { cwd: workingDir, encoding: 'utf8' })
    },

    log: (limit?: number): string => {
      checkPermission(permissions, 'git')
      const { execSync } = require('child_process')
      const n = limit ? Math.min(limit, 100) : 10
      return execSync(`git log -${n}`, { cwd: workingDir, encoding: 'utf8' })
    },

    branch: (): string => {
      checkPermission(permissions, 'git')
      const { execSync } = require('child_process')
      return execSync('git branch', { cwd: workingDir, encoding: 'utf8' })
    },
  }
}

/**
 * Safe docker API
 */
function createSafeDocker(permissions: Permission[]) {
  return {
    ps: (): string => {
      checkPermission(permissions, 'docker')
      const { execSync } = require('child_process')
      return execSync('docker ps', { encoding: 'utf8' })
    },

    images: (): string => {
      checkPermission(permissions, 'docker')
      const { execSync } = require('child_process')
      return execSync('docker images', { encoding: 'utf8' })
    },

    logs: (containerId: string): string => {
      checkPermission(permissions, 'docker')
      const { execSync } = require('child_process')
      return execSync(`docker logs ${containerId}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 })
    },
  }
}

/**
 * Resolve a path safely, ensuring it stays within the base directory
 */
function resolveSafePath(baseDir: string, targetPath: string): string {
  const resolved = path.resolve(baseDir, targetPath)

  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Access outside workspace denied: ${targetPath}`)
  }

  return resolved
}

/**
 * Create the sandbox API for an agent
 */
function createSandboxAPI(permissions: Permission[], workingDir: string): Record<string, unknown> {
  const api: Record<string, unknown> = {}

  // Terminal API
  if (permissions.includes('terminal')) {
    api.terminal = createSafeTerminal(permissions, workingDir)
  }

  // Filesystem APIs
  if (permissions.includes('filesystem:read') || permissions.includes('filesystem:write')) {
    api.filesystem = createSafeFilesystem(permissions, workingDir)
  }

  // Git API
  if (permissions.includes('git')) {
    api.git = createSafeGit(permissions, workingDir)
  }

  // Docker API
  if (permissions.includes('docker')) {
    api.docker = createSafeDocker(permissions)
  }

  return api
}

/**
 * Run an agent in the sandbox
 * @param code - Agent code to execute
 * @param permissions - Agent's declared permissions
 * @param options - Sandbox configuration
 * @returns Execution result
 */
export function runInSandbox(code: string, permissions: Permission[], options: SandboxOptions = {}): ExecutionResult {
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const workingDir = options.workingDirectory || DEFAULT_WORKING_DIR
  const startTime = Date.now()

  try {
    // Create sandbox API based on permissions
    const sandboxAPI = createSandboxAPI(permissions, workingDir)

    // Create the sandbox context
    const sandbox = {
      api: sandboxAPI,
      console: {
        log: (...args: unknown[]) => console.log('[Agent]', ...args),
        error: (...args: unknown[]) => console.error('[Agent Error]', ...args),
        warn: (...args: unknown[]) => console.warn('[Agent Warning]', ...args),
      },
      setTimeout: (fn: () => void, ms: number) => {
        if (ms > timeout) {
          throw new Error('Timeout exceeds sandbox limit')
        }
        return setTimeout(fn, ms)
      },
      setInterval: () => {
        throw new Error('setInterval not allowed in sandbox')
      },
      clearInterval: () => {
        throw new Error('clearInterval not allowed in sandbox')
      },
      require: undefined, // Disable require
      module: undefined,
      exports: undefined,
      process: undefined,
      global: undefined,
    }

    // Create the VM context
    const context = vm.createContext(sandbox)

    // Wrap the code to capture the result
    const wrappedCode = `
      (function(api, console) {
        ${code}
      })(this.api, this.console);
    `

    // Run with timeout
    const result = vm.runInContext(wrappedCode, context, {
      timeout: timeout,
      displayErrors: true,
    })

    const executionTimeMs = Date.now() - startTime

    return {
      success: true,
      output: typeof result === 'string' ? result : JSON.stringify(result),
      executionTimeMs,
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      error: errorMessage,
      executionTimeMs,
    }
  }
}

/**
 * Run agent from a file
 */
export async function runAgentFile(
  agentPath: string,
  permissions: Permission[],
  options: SandboxOptions = {}
): Promise<ExecutionResult> {
  // Read the agent code
  const code = fs.readFileSync(agentPath, 'utf8')

  // Use the directory containing the agent as working directory
  const workingDir = options.workingDirectory || path.dirname(agentPath)

  return runInSandbox(code, permissions, { ...options, workingDirectory: workingDir })
}

/**
 * Check if dangerous modules are being accessed in code
 */
export function scanForDangerousPatterns(code: string): string[] {
  const warnings: string[] = []

  const dangerousPatterns = [
    { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, message: 'Uses child_process' },
    { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, message: 'Uses fs module directly' },
    { pattern: /process\.env/, message: 'Accesses process.env' },
    { pattern: /process\.exit/, message: 'Calls process.exit' },
    { pattern: /eval\s*\(/, message: 'Uses eval()' },
    { pattern: /Function\s*\(/, message: 'Uses Function constructor' },
    { pattern: /__dirname/, message: 'Accesses __dirname' },
    { pattern: /__filename/, message: 'Accesses __filename' },
  ]

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      warnings.push(message)
    }
  }

  return warnings
}
