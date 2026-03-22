import type { ExecutionMode } from '../safety.js'

export interface RinaResponse {
  ok: boolean
  intent: string
  output?: unknown
  error?: string
  blocked?: boolean
  requiresConfirmation?: boolean
}

export type TinaResponse = RinaResponse

export interface ToolResult {
  ok: boolean
  output?: unknown
  error?: string
}

interface TerminalToolsInterface {
  runTerminalCommand(command: string, args: string[], mode: string): Promise<ToolResult>
  runCommand(command: string, mode: string): Promise<ToolResult>
}

interface FilesystemToolsInterface {
  writeFileSafe(path: string, content: string): Promise<ToolResult>
  readFileSafe(path: string): Promise<ToolResult>
  listDirSafe(dir: string): Promise<ToolResult>
  deleteFileSafe(path: string): Promise<ToolResult>
}

interface SystemToolsInterface {
  getSystemInfo(): { platform: string; arch: string; version: string }
  rebootSystem(mode: string): Promise<ToolResult>
  shutdownSystem(mode: string): Promise<ToolResult>
  runSafeCommand(command: string, args: string[], mode: string): Promise<ToolResult>
}

export interface RinaToolsInterface {
  terminal: TerminalToolsInterface
  filesystem: FilesystemToolsInterface
  system: SystemToolsInterface
}

export type CreateRinaToolsDeps = {
  executeTerminalCommand: (command: string, args: string[], mode: ExecutionMode) => Promise<ToolResult>
  executeFilesystemOperation: (action: string, path: string, content?: string) => Promise<ToolResult>
  getSystemInfo: () => { platform: string; arch: string; version: string }
}
