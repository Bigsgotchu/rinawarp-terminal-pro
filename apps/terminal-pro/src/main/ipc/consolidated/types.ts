import type { IpcMain } from 'electron'
import type {
  CodeListFilesArgs,
  CodeListFilesResult,
  CodeReadFileArgs,
  CodeReadFileResult,
} from '../../startup/runtimeTypes.js'

export interface LicenseVerifyResponse {
  valid: boolean
  message?: string
  tier?: string
  expires_at?: number
  customer_id?: string
  status?: string
  ok?: boolean
}

export type ShellKind = 'bash' | 'zsh' | 'fish' | 'pwsh' | 'unknown'

export interface DaemonTask {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
  command: string
  meta?: Record<string, unknown>
}

export interface RinaStatus {
  mode: string
  tools: string[]
  agentRunning: boolean
  memoryStats: {
    conversation: number
    longterm: number
  }
  ok?: boolean
  error?: string
  degraded?: boolean
}

export type ExecutionMode = 'assist' | 'auto' | 'explain'

export interface ConsolidatedIpcArgs {
  ipcMain: IpcMain
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: { status?: string; deadLetter?: boolean }) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
  runAgent?: (prompt: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) => Promise<any>
  conversationRoute?: (prompt: string, opts?: { workspaceRoot?: string | null }) => Promise<any>
  getStatus?: () => Promise<any>
  getMode?: () => Promise<any>
  setMode?: (mode: string) => Promise<any>
  getPlans?: () => Promise<any>
  getTools?: () => Promise<any>
  runsList?: (args?: { limit?: number }) => Promise<any>
  runsTail?: (args?: { runId?: string; sessionId?: string; maxLines?: number; maxBytes?: number }) => Promise<any>
  runsArtifacts?: (args?: { runId?: string; sessionId?: string }) => Promise<any>
  codeListFiles?: (args: CodeListFilesArgs) => Promise<CodeListFilesResult>
  codeReadFile?: (args: CodeReadFileArgs) => Promise<CodeReadFileResult>
}
