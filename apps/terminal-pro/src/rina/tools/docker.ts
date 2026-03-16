/**
 * Rina OS Control Layer - Docker Tool
 *
 * Safe Docker operations for container management.
 * Fully integrated with safety layer and task queue.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { safetyCheck } from '../safety.js'

/**
 * Shell-safe identifier pattern: alphanumeric, dash, underscore, dot, slash, colon
 * Docker image names can contain: a-z, A-Z, 0-9, dash, underscore, dot, slash, colon
 * Container names: a-z, A-Z, 0-9, dash, underscore
 */
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_./:-]+$/

/**
 * Validate that a string is a safe Docker identifier (no shell injection)
 */
function sanitizeIdentifier(input: string, fieldName: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error(`${fieldName} is required`)
  }

  // Trim whitespace
  const trimmed = input.trim()

  // Check for shell metacharacters that could enable injection
  if (!SAFE_IDENTIFIER_PATTERN.test(trimmed)) {
    throw new Error(
      `${fieldName} contains invalid characters. Only alphanumeric, dash, underscore, dot, slash, and colon are allowed.`
    )
  }

  // Additional check: reject common injection patterns
  const injectionPatterns = [
    /\$\(/, // Command substitution $(...)
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
 * Validate options string for docker commands (whitelist approach)
 */
function sanitizeOptions(options: string, allowedFlags: string[]): string {
  if (!options) return ''

  // Only allow specific flags that we know are safe
  const parts = options.split(/\s+/)
  const sanitized: string[] = []

  for (const part of parts) {
    // Allow flags that start with - or -- and are in allowed list
    if (part.startsWith('-')) {
      const flagName = part.replace(/^-+/, '').split('=')[0]
      if (allowedFlags.includes(flagName)) {
        sanitized.push(part)
      }
      // Allow numeric values and quoted strings
      else if (/^\d+$/.test(part) || part.startsWith('"') || part.startsWith("'")) {
        sanitized.push(part)
      }
    }
  }

  return sanitized.join(' ')
}

/**
 * Terminal command runner
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

  return {
    stdout: (result.output as string) || '',
    stderr: result.error || '',
    success: result.ok,
  }
}

/**
 * Docker operations tool
 */
export const dockerTool: RinaTool = {
  name: 'docker',
  description: 'Execute Docker operations (build, run, stop, rm, ps, images)',

  canHandle(task: RinaTask): boolean {
    return task.tool === 'docker' && !!task.input.command
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command
    if (!command || typeof command !== 'string') {
      return { valid: false, error: 'Docker command is required' }
    }
    return { valid: true }
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const input = task.input as {
      command?: string
      image?: string
      container?: string
      options?: string
      execCommand?: string
      path?: string
      tag?: string
    }

    const command = input.command

    // Validate command type
    if (!command || typeof command !== 'string') {
      return { ok: false, error: 'Docker command is required' }
    }

    // Validate and sanitize inputs BEFORE building command
    let sanitizedImage: string | undefined
    let sanitizedContainer: string | undefined
    let sanitizedPath: string | undefined
    let sanitizedTag: string | undefined

    try {
      if (input.image) {
        sanitizedImage = sanitizeIdentifier(input.image, 'image')
      }
      if (input.container) {
        sanitizedContainer = sanitizeIdentifier(input.container, 'container')
      }
      if (input.path) {
        sanitizedPath = sanitizeIdentifier(input.path, 'path')
      }
      if (input.tag) {
        sanitizedTag = sanitizeIdentifier(input.tag, 'tag')
      }
    } catch (validationError) {
      return {
        ok: false,
        error: validationError instanceof Error ? validationError.message : 'Input validation failed',
      }
    }

    // Safety check for dangerous operations
    if (['rm', 'stop', 'kill', 'rmi'].includes(command) && (sanitizedContainer || sanitizedImage)) {
      const target = sanitizedContainer || sanitizedImage || ''
      if (safetyCheck(target, context.mode).blocked) {
        return { ok: false, error: 'Operation blocked by safety rules', blocked: true }
      }
    }

    try {
      let result: { stdout: string; stderr: string; success: boolean }

      // Allowed options flags for each command (whitelist)
      const allowedOptions: Record<string, string[]> = {
        run: [
          'd',
          'i',
          't',
          'rm',
          'p',
          'v',
          'e',
          'w',
          'network',
          'name',
          'entrypoint',
          'env',
          'volume',
          'port',
          'workdir',
          'user',
          'privileged',
        ],
        ps: ['a', 'l', 'q', 'n', 's', 'format'],
        build: ['t', 'f', 'no-cache', 'pull', 'force-rm', 'rm'],
        exec: ['i', 't', 'd', 'e', 'u', 'w'],
        logs: ['f', 'tail', 'since', 'until', 'timestamps'],
        pull: ['a', 'platform'],
      }

      switch (command) {
        case 'build':
          if (!sanitizedImage || !sanitizedPath) {
            return { ok: false, error: 'Build requires image name and path' }
          }
          const tag = sanitizedTag ? `-t ${sanitizedTag}` : ''
          result = await runCommand(`docker build ${tag} ${sanitizedPath}`)
          break

        case 'run':
          if (!sanitizedImage) {
            return { ok: false, error: 'Run requires image name' }
          }
          const options = sanitizeOptions(input.options || '', allowedOptions.run || [])
          result = await runCommand(`docker run ${options} ${sanitizedImage}`)
          break

        case 'ps':
          const psOptions = sanitizeOptions(input.options || '', allowedOptions.ps || [])
          result = await runCommand(`docker ps ${psOptions}`)
          break

        case 'images':
          result = await runCommand('docker images')
          break

        case 'stop':
          if (!sanitizedContainer) {
            return { ok: false, error: 'Stop requires container name or ID' }
          }
          result = await runCommand(`docker stop ${sanitizedContainer}`)
          break

        case 'start':
          if (!sanitizedContainer) {
            return { ok: false, error: 'Start requires container name or ID' }
          }
          result = await runCommand(`docker start ${sanitizedContainer}`)
          break

        case 'restart':
          if (!sanitizedContainer) {
            return { ok: false, error: 'Restart requires container name or ID' }
          }
          result = await runCommand(`docker restart ${sanitizedContainer}`)
          break

        case 'rm':
          if (!sanitizedContainer) {
            return { ok: false, error: 'Remove requires container name or ID' }
          }
          result = await runCommand(`docker rm ${sanitizedContainer}`)
          break

        case 'rmi':
          if (!sanitizedImage) {
            return { ok: false, error: 'Remove image requires image name or ID' }
          }
          result = await runCommand(`docker rmi ${sanitizedImage}`)
          break

        case 'logs':
          if (!sanitizedContainer) {
            return { ok: false, error: 'Logs requires container name or ID' }
          }
          const logsOptions = sanitizeOptions(input.options || '', allowedOptions.logs || [])
          result = await runCommand(`docker logs ${logsOptions} ${sanitizedContainer}`)
          break

        case 'exec': {
          if (!sanitizedContainer || !input.execCommand) {
            return { ok: false, error: 'Exec requires container and execCommand' }
          }
          let sanitizedExecCommand: string
          try {
            sanitizedExecCommand = sanitizeIdentifier(input.execCommand, 'execCommand')
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'Invalid execCommand' }
          }
          const execOptions = sanitizeOptions(input.options || '', allowedOptions.exec || [])
          result = await runCommand(`docker exec ${execOptions} ${sanitizedContainer} ${sanitizedExecCommand}`)
          break
        }

        case 'pull':
          if (!sanitizedImage) {
            return { ok: false, error: 'Pull requires image name' }
          }
          const pullOptions = sanitizeOptions(input.options || '', allowedOptions.pull || [])
          result = await runCommand(`docker pull ${pullOptions} ${sanitizedImage}`)
          break

        case 'info':
          result = await runCommand('docker info')
          break

        case 'version':
          result = await runCommand('docker version')
          break

        default:
          return { ok: false, error: `Unknown docker command: ${command}` }
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
 * Docker tool singleton for direct usage
 */
export const dockerTools = {
  async build(imageName: string, dockerfilePath: string, tag?: string) {
    const task: RinaTask = {
      intent: 'docker-build',
      tool: 'docker',
      input: { command: 'build', image: imageName, path: dockerfilePath, tag },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async run(imageName: string, options = '') {
    const task: RinaTask = {
      intent: 'docker-run',
      tool: 'docker',
      input: { command: 'run', image: imageName, options },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async listContainers(all = false) {
    const task: RinaTask = {
      intent: 'docker-ps',
      tool: 'docker',
      input: { command: 'ps', options: all ? '-a' : '' },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async listImages() {
    const task: RinaTask = {
      intent: 'docker-images',
      tool: 'docker',
      input: { command: 'images' },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async stop(containerName: string) {
    const task: RinaTask = {
      intent: 'docker-stop',
      tool: 'docker',
      input: { command: 'stop', container: containerName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async start(containerName: string) {
    const task: RinaTask = {
      intent: 'docker-start',
      tool: 'docker',
      input: { command: 'start', container: containerName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async restart(containerName: string) {
    const task: RinaTask = {
      intent: 'docker-restart',
      tool: 'docker',
      input: { command: 'restart', container: containerName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async remove(containerName: string) {
    const task: RinaTask = {
      intent: 'docker-rm',
      tool: 'docker',
      input: { command: 'rm', container: containerName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async removeImage(imageName: string) {
    const task: RinaTask = {
      intent: 'docker-rmi',
      tool: 'docker',
      input: { command: 'rmi', image: imageName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async exec(containerName: string, execCommand: string, options = '') {
    const task: RinaTask = {
      intent: 'docker-exec',
      tool: 'docker',
      input: { command: 'exec', container: containerName, execCommand, options },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async logs(containerName: string) {
    const task: RinaTask = {
      intent: 'docker-logs',
      tool: 'docker',
      input: { command: 'logs', container: containerName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },

  async pull(imageName: string) {
    const task: RinaTask = {
      intent: 'docker-pull',
      tool: 'docker',
      input: { command: 'pull', image: imageName },
    }
    return dockerTool.execute(task, { mode: 'auto' })
  },
}
