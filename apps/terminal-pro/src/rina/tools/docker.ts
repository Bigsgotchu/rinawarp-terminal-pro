/**
 * Rina OS Control Layer - Docker Tool
 *
 * Safe Docker operations for container management.
 * Fully integrated with safety layer and task queue.
 */

import type { RinaTool, ToolContext, ToolResult } from './registry.js'
import type { RinaTask } from '../brain.js'
import { checkDockerSafety } from './dockerHelpers.js'
import { dockerTaskBuilders, executeDockerCommand, sanitizeDockerInput } from './dockerActions.js'

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
    if (!command || typeof command !== 'string') {
      return { ok: false, error: 'Docker command is required' }
    }

    let sanitized: ReturnType<typeof sanitizeDockerInput>
    try {
      sanitized = sanitizeDockerInput(input)
    } catch (validationError) {
      return {
        ok: false,
        error: validationError instanceof Error ? validationError.message : 'Input validation failed',
      }
    }

    if (
      checkDockerSafety({
        command,
        target: sanitized.container || sanitized.image,
        context,
      }).blocked
    ) {
      return { ok: false, error: 'Operation blocked by safety rules', blocked: true }
    }

    try {
      return await executeDockerCommand({ command, input, sanitized })
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}

export const dockerTools = {
  async build(imageName: string, dockerfilePath: string, tag?: string) {
    return dockerTool.execute(dockerTaskBuilders.build(imageName, dockerfilePath, tag), { mode: 'auto' })
  },

  async run(imageName: string, options = '') {
    return dockerTool.execute(dockerTaskBuilders.run(imageName, options), { mode: 'auto' })
  },

  async listContainers(all = false) {
    return dockerTool.execute(dockerTaskBuilders.listContainers(all), { mode: 'auto' })
  },

  async listImages() {
    return dockerTool.execute(dockerTaskBuilders.listImages(), { mode: 'auto' })
  },

  async stop(containerName: string) {
    return dockerTool.execute(dockerTaskBuilders.stop(containerName), { mode: 'auto' })
  },

  async start(containerName: string) {
    return dockerTool.execute(dockerTaskBuilders.start(containerName), { mode: 'auto' })
  },

  async restart(containerName: string) {
    return dockerTool.execute(dockerTaskBuilders.restart(containerName), { mode: 'auto' })
  },

  async remove(containerName: string) {
    return dockerTool.execute(dockerTaskBuilders.remove(containerName), { mode: 'auto' })
  },

  async removeImage(imageName: string) {
    return dockerTool.execute(dockerTaskBuilders.removeImage(imageName), { mode: 'auto' })
  },

  async exec(containerName: string, execCommand: string, options = '') {
    return dockerTool.execute(dockerTaskBuilders.exec(containerName, execCommand, options), { mode: 'auto' })
  },

  async logs(containerName: string) {
    return dockerTool.execute(dockerTaskBuilders.logs(containerName), { mode: 'auto' })
  },

  async pull(imageName: string) {
    return dockerTool.execute(dockerTaskBuilders.pull(imageName), { mode: 'auto' })
  },
}
