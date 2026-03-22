import { terminalTool } from '../tools/terminal.js'
import { filesystemTool } from '../tools/filesystem.js'
import { commandMemory } from '../learning/commandMemory.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import { brainEvents } from '../brain/brainEvents.js'
import { safetyCheck, type ExecutionMode } from '../safety.js'
import type { CreateRinaToolsDeps, RinaToolsInterface, ToolResult } from './types.js'

export async function executeTerminalCommandRuntime(
  command: string,
  _args: string[],
  mode: ExecutionMode,
  workspaceRoot: string
): Promise<ToolResult> {
  const safety = safetyCheck(command, mode)
  if (safety.blocked) {
    return { ok: false, error: safety.reason }
  }

  thinkingStream.stream(`Executing: ${command}`)

  try {
    const result = await terminalTool.execute(
      { intent: 'terminal-execute', tool: 'terminal', input: { command, mode } },
      { mode, workspaceRoot }
    )

    commandMemory.record(command, result.ok)
    brainEvents.emitEvent('execution', `Command executed: ${command}`, { success: result.ok })

    return {
      ok: result.ok,
      output: result.output,
      error: result.error,
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
  workspaceRoot: string
): Promise<ToolResult> {
  thinkingStream.stream(`Filesystem: ${action} ${path}`)

  try {
    const result = await filesystemTool.execute(
      { intent: 'filesystem-operation', tool: 'filesystem', input: { action, path, content } },
      { mode, workspaceRoot }
    )

    return {
      ok: result.ok,
      output: result.output,
      error: result.error,
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
      rebootSystem: async (_mode: string) => ({ ok: false, error: 'System commands disabled for safety' }),
      shutdownSystem: async (_mode: string) => ({ ok: false, error: 'System commands disabled for safety' }),
      runSafeCommand: async (command: string, _args: string[], mode: string) => {
        return deps.executeTerminalCommand(command, [], mode as ExecutionMode)
      },
    },
  }
}
