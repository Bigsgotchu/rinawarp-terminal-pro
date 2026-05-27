import { commandMemory } from '../learning/commandMemory.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import { brainEvents } from '../brain/brainEvents.js'
import { safetyCheck, type ExecutionMode } from '../safety.js'
import type { CreateRinaToolsDeps, RinaToolsInterface, ToolResult } from './types.js'
import { forwardLegacyPrompt } from './legacyInputAdapter.js'

function responseOutputText(output: unknown): string {
  if (typeof output === 'string') return output
  if (output == null) return ''
  try {
    return JSON.stringify(output)
  } catch {
    return String(output)
  }
}

export async function executeTerminalCommandRuntime(
  command: string,
  _args: string[],
  mode: ExecutionMode,
  workspaceRoot: string,
): Promise<ToolResult> {
  const safety = safetyCheck(command, mode)
  if (safety.blocked) {
    return { ok: false, error: safety.reason }
  }

  if (mode === 'explain') {
    return { ok: true, output: `Would run via runtime: ${command}` }
  }

  thinkingStream.stream(`Forwarding command to runtime: ${command}`)

  try {
    const response = await forwardLegacyPrompt(command, workspaceRoot || process.cwd(), 'execute')
    const ok = response.ok
    commandMemory.record(command, ok)
    brainEvents.emitEvent('execution', `Command forwarded: ${command}`, { success: ok })

    return {
      ok,
      output: responseOutputText(response.output),
      error: response.error,
    }
  } catch (err) {
    commandMemory.record(command, false)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function executeFilesystemOperationRuntime(
  action: string,
  path: string,
  content: string | undefined,
  mode: 'auto' | 'assist' | 'explain',
  workspaceRoot: string,
): Promise<ToolResult> {
  thinkingStream.stream(`Filesystem ${action}: ${path}`)

  if (mode === 'explain') {
    return { ok: true, output: `Would ${action} ${path} via runtime` }
  }

  if (mode === 'assist') {
    return {
      ok: true,
      output: `Ready to ${action} ${path} through runtime after approval`,
      requiresConfirmation: true,
    } as ToolResult
  }

  const prompt = [
    `Filesystem ${action} request.`,
    `Path: ${path}`,
    content != null ? `Content length: ${content.length} chars` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await forwardLegacyPrompt(prompt, workspaceRoot || process.cwd(), 'mutate')
    return {
      ok: response.ok,
      output: responseOutputText(response.output),
      error: response.error,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function getSystemInfoRuntime() {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
  }
}

export function createRinaTools(deps: CreateRinaToolsDeps): RinaToolsInterface {
  return {
    terminal: {
      runTerminalCommand: async (command: string, args: string[], mode: string) => {
        return deps.executeTerminalCommand(command, args, mode as ExecutionMode)
      },
      runCommand: async (command: string, mode: string) => {
        return deps.executeTerminalCommand(command, [], mode as ExecutionMode)
      },
    },
    filesystem: {
      writeFileSafe: async (path: string, content: string) => {
        return deps.executeFilesystemOperation('write', path, content)
      },
      readFileSafe: async (path: string) => {
        return deps.executeFilesystemOperation('read', path)
      },
      listDirSafe: async (dir: string) => {
        return deps.executeFilesystemOperation('list', dir)
      },
      deleteFileSafe: async (path: string) => {
        return deps.executeFilesystemOperation('delete', path)
      },
    },
    system: {
      getSystemInfo: () => deps.getSystemInfo(),
      rebootSystem: async () => ({ ok: false, error: 'System reboot is not available in legacy tools layer' }),
      shutdownSystem: async () => ({ ok: false, error: 'System shutdown is not available in legacy tools layer' }),
      runSafeCommand: async (command: string, args: string[], mode: string) => {
        return deps.executeTerminalCommand(command, args, mode as ExecutionMode)
      },
    },
  }
}
