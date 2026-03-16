/**
 * API Proxy - Safe APIs injected into agent sandbox
 *
 * Provides controlled access to system resources based on agent permissions.
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { checkPermission, type Permission } from './permissions.js'

/**
 * Create safe terminal API
 */
export function createTerminalAPI(permissions: Permission[], cwd: string) {
  return {
    run: (cmd: string): string => {
      checkPermission(permissions, 'terminal')

      // Block dangerous patterns
      const blocked = [/rm\s+-rf\s+\//i, /:\(\)\{.*:\|:\&\}/i, /dd\s+if=.*of=/i, />\s*\/dev\//i]

      for (const pattern of blocked) {
        if (pattern.test(cmd)) {
          throw new Error(`Blocked: ${cmd}`)
        }
      }

      try {
        return execSync(cmd, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 })
      } catch (err) {
        const e = err as { message?: string; stderr?: string }
        throw new Error(`Command failed: ${e.message || e.stderr}`)
      }
    },

    runAsync: async (cmd: string): Promise<string> => {
      // For async execution, return promise wrapper
      return new Promise((resolve, reject) => {
        checkPermission(permissions, 'terminal')

        const blocked = [/rm\s+-rf\s+\//i, /:\(\)\{.*:\|:\&\}/i]
        for (const pattern of blocked) {
          if (pattern.test(cmd)) {
            reject(new Error(`Blocked: ${cmd}`))
            return
          }
        }

        const { exec } = require('child_process')
        const child = exec(
          cmd,
          { cwd, encoding: 'utf8', timeout: 30000 },
          (error: Error | null, stdout: string, stderr: string) => {
            if (error) reject(new Error(stderr || error.message))
            else resolve(stdout)
          }
        )

        // Allow cancellation
        child.on('error', reject)
      })
    },
  }
}

/**
 * Create safe filesystem API
 */
export function createFilesystemAPI(permissions: Permission[], baseDir: string) {
  const resolveSafe = (target: string): string => {
    const resolved = path.resolve(baseDir, target)
    if (!resolved.startsWith(baseDir)) {
      throw new Error('Access outside workspace denied')
    }
    return resolved
  }

  return {
    read: (filePath: string): string => {
      checkPermission(permissions, 'filesystem:read')
      return fs.readFileSync(resolveSafe(filePath), 'utf8')
    },

    readBuffer: (filePath: string): Buffer => {
      checkPermission(permissions, 'filesystem:read')
      return fs.readFileSync(resolveSafe(filePath))
    },

    write: (filePath: string, content: string): void => {
      checkPermission(permissions, 'filesystem:write')
      const safePath = resolveSafe(filePath)
      const dir = path.dirname(safePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(safePath, content, 'utf8')
    },

    writeBuffer: (filePath: string, data: Buffer): void => {
      checkPermission(permissions, 'filesystem:write')
      const safePath = resolveSafe(filePath)
      const dir = path.dirname(safePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(safePath, data)
    },

    exists: (filePath: string): boolean => {
      checkPermission(permissions, 'filesystem:read')
      return fs.existsSync(resolveSafe(filePath))
    },

    stat: (filePath: string): { size: number; isDirectory: boolean; isFile: boolean; mtime: string } => {
      checkPermission(permissions, 'filesystem:read')
      const stat = fs.statSync(resolveSafe(filePath))
      return {
        size: stat.size,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        mtime: stat.mtime.toISOString(),
      }
    },

    list: (dirPath: string): string[] => {
      checkPermission(permissions, 'filesystem:read')
      const safePath = resolveSafe(dirPath)
      if (!fs.existsSync(safePath)) return []
      if (!fs.statSync(safePath).isDirectory()) return []
      return fs.readdirSync(safePath)
    },

    mkdir: (dirPath: string): void => {
      checkPermission(permissions, 'filesystem:write')
      const safePath = resolveSafe(dirPath)
      fs.mkdirSync(safePath, { recursive: true })
    },

    remove: (filePath: string): void => {
      checkPermission(permissions, 'filesystem:write')
      const safePath = resolveSafe(filePath)
      const stat = fs.statSync(safePath)
      if (stat.isDirectory()) fs.rmdirSync(safePath, { recursive: true })
      else fs.unlinkSync(safePath)
    },
  }
}

/**
 * Create safe git API
 */
export function createGitAPI(permissions: Permission[], cwd: string) {
  const runGit = (args: string): string => {
    checkPermission(permissions, 'git')
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', timeout: 30000 })
  }

  return {
    status: (): string => runGit('status'),
    diff: (): string => runGit('diff'),
    diffStaged: (): string => runGit('diff --staged'),
    log: (count?: number): string => runGit(`log -${count || 10} --oneline`),
    branch: (): string => runGit('branch -a'),
    currentBranch: (): string => runGit('rev-parse --abbrev-ref HEAD').trim(),
    remote: (): string => runGit('remote -v'),
    statusShort: (): string => runGit('status --short'),
    diffNameOnly: (): string => runGit('diff --name-only'),
    diffCachedNameOnly: (): string => runGit('diff --cached --name-only'),
    listFiles: (): string => runGit('ls-files'),
    user: (): string => runGit('config user.name').trim(),
    email: (): string => runGit('config user.email').trim(),
  }
}

/**
 * Create safe docker API
 */
export function createDockerAPI(permissions: Permission[]) {
  const runDocker = (args: string): string => {
    checkPermission(permissions, 'docker')
    return execSync(`docker ${args}`, { encoding: 'utf8', timeout: 60000 })
  }

  return {
    ps: (all?: boolean): string => runDocker(`ps ${all ? '-a' : ''}`),
    psJson: (): string => runDocker("ps --format '{{json .}}'"),
    images: (): string => runDocker('images'),
    imagesJson: (): string => runDocker("images --format '{{json .}}'"),
    logs: (containerId: string, tail?: number): string =>
      runDocker(`logs ${containerId} ${tail ? `--tail ${tail}` : ''}`),
    inspect: (containerId: string): string => runDocker(`inspect ${containerId}`),
    stats: (noStream?: boolean): string => runDocker(`stats ${noStream ? '--no-stream' : '--no-trunc'}`),
    version: (): string => runDocker("version --format '{{json .}}'"),
    info: (): string => runDocker("info --format '{{json .}}'"),
  }
}

/**
 * Create safe network API
 */
export function createNetworkAPI(permissions: Permission[]) {
  return {
    fetch: async (
      url: string,
      options?: {
        method?: string
        headers?: Record<string, string>
        body?: string
      }
    ): Promise<{ status: number; statusText: string; body: string; json: unknown }> => {
      checkPermission(permissions, 'network')

      const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
      })

      const body = await response.text()

      return {
        status: response.status,
        statusText: response.statusText,
        body,
        json: body ? JSON.parse(body) : null,
      }
    },

    getJson: async (url: string, headers?: Record<string, string>): Promise<unknown> => {
      checkPermission(permissions, 'network')

      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json()
    },
  }
}

/**
 * Create complete API proxy for sandbox
 */
export function createApiProxy(permissions: Permission[], cwd: string): Record<string, unknown> {
  const api: Record<string, unknown> = {}

  if (permissions.includes('terminal')) {
    api.terminal = createTerminalAPI(permissions, cwd)
  }

  if (permissions.includes('filesystem:read') || permissions.includes('filesystem:write')) {
    api.filesystem = createFilesystemAPI(permissions, cwd)
  }

  if (permissions.includes('git')) {
    api.git = createGitAPI(permissions, cwd)
  }

  if (permissions.includes('docker')) {
    api.docker = createDockerAPI(permissions)
  }

  if (permissions.includes('network')) {
    api.network = createNetworkAPI(permissions)
  }

  return api
}

export default {
  createTerminalAPI,
  createFilesystemAPI,
  createGitAPI,
  createDockerAPI,
  createNetworkAPI,
  createApiProxy,
}
