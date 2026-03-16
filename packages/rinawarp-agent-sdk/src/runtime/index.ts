/**
 * RinaWarp Agent SDK Runtime
 *
 * Core runtime for executing agents in sandbox with permissions.
 */

import fs from 'fs'
import path from 'path'
import * as vm from 'vm'

/**
 * Execute agent in sandbox
 */
export async function runAgent(
  agentPath: string,
  permissions: string[],
  options?: {
    timeout?: number
    workingDirectory?: string
  }
): Promise<{
  success: boolean
  output?: string
  error?: string
  executionTimeMs: number
}> {
  const startTime = Date.now()
  const timeout = options?.timeout || 30000
  const cwd = options?.workingDirectory || path.dirname(agentPath)

  try {
    // Load agent code
    const manifestPath = path.join(agentPath, 'agent.json')
    const entryPath = path.join(agentPath, 'index.js')

    if (!fs.existsSync(manifestPath)) {
      throw new Error('agent.json not found')
    }

    if (!fs.existsSync(entryPath)) {
      throw new Error('index.js not found')
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const code = fs.readFileSync(entryPath, 'utf8')

    // Create safe API based on permissions
    const api = createSandboxAPI(permissions, cwd)

    // Create sandbox context
    const sandbox = {
      api,
      console: {
        log: (...args: unknown[]) => console.log('[Agent]', ...args),
        error: (...args: unknown[]) => console.error('[Agent]', ...args),
        warn: (...args: unknown[]) => console.warn('[Agent]', ...args),
      },
      setTimeout: (fn: () => void, ms: number) => {
        if (ms > timeout) throw new Error('Timeout exceeds limit')
        return setTimeout(fn, ms)
      },
      clearTimeout,
      require: undefined,
      module: undefined,
      exports: undefined,
      process: undefined,
      global: undefined,
      Buffer: undefined,
    }

    // Run in VM
    const context = vm.createContext(sandbox)
    const wrappedCode = `(function(api, console) { ${code} })(this.api, this.console)`

    const result = vm.runInContext(wrappedCode, context, { timeout })

    return {
      success: true,
      output: typeof result === 'string' ? result : JSON.stringify(result),
      executionTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Create sandbox API based on permissions
 */
function createSandboxAPI(permissions: string[], cwd: string): Record<string, unknown> {
  const api: Record<string, unknown> = {}

  // Terminal API
  if (permissions.includes('terminal')) {
    api.terminal = {
      run: (cmd: string): string => {
        const blocked = [/rm\s+-rf\s+\//i, /:\(\)\{.*:\|:\&\}/i]
        for (const pattern of blocked) {
          if (pattern.test(cmd)) throw new Error(`Blocked: ${cmd}`)
        }
        const { execSync } = require('child_process')
        return execSync(cmd, { cwd, encoding: 'utf8', timeout: 30000 })
      },
    }
  }

  // Filesystem API
  if (permissions.includes('filesystem:read') || permissions.includes('filesystem:write')) {
    const resolveSafe = (target: string): string => {
      const resolved = path.resolve(cwd, target)
      if (!resolved.startsWith(cwd)) throw new Error('Access denied')
      return resolved
    }

    api.filesystem = {
      read: (filePath: string): string => {
        if (!permissions.includes('filesystem:read')) throw new Error('Permission denied')
        return fs.readFileSync(resolveSafe(filePath), 'utf8')
      },
      write: (filePath: string, content: string): void => {
        if (!permissions.includes('filesystem:write')) throw new Error('Permission denied')
        const safePath = resolveSafe(filePath)
        const dir = path.dirname(safePath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(safePath, content, 'utf8')
      },
      exists: (filePath: string): boolean => fs.existsSync(resolveSafe(filePath)),
      list: (dirPath: string): string[] => {
        const safePath = resolveSafe(dirPath)
        if (!fs.existsSync(safePath) || !fs.statSync(safePath).isDirectory()) return []
        return fs.readdirSync(safePath)
      },
    }
  }

  // Git API
  if (permissions.includes('git')) {
    api.git = {
      status: (): string => {
        const { execSync } = require('child_process')
        return execSync('git status', { cwd, encoding: 'utf8' })
      },
    }
  }

  return api
}

export default { runAgent }
