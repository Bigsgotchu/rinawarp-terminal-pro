import { registerDaemonHandlers } from './consolidated/registerDaemonHandlers.js'
import { registerRinaCoreHandlers } from './consolidated/registerRinaCoreHandlers.js'
import { registerUtilityHandlers } from './consolidated/registerUtilityHandlers.js'
import type { ConsolidatedIpcArgs } from './consolidated/types.js'

export type {
  ConsolidatedIpcArgs,
  DaemonTask,
  ExecutionMode,
  LicenseVerifyResponse,
  RinaStatus,
  ShellKind,
} from './consolidated/types.js'

/**
 * Register all consolidated IPC handlers
 * This replaces the old registerAllIpc.ts approach
 */
export function registerConsolidatedIpcHandlers({
  ipcMain,
  ...args
}: ConsolidatedIpcArgs): void {
  console.log('[ipc] consolidated handlers registered')
  console.log('[IPC] Registering consolidated IPC handlers...')

  registerDaemonHandlers({ ipcMain, ...args })
  registerRinaCoreHandlers({ ipcMain, ...args })
  registerUtilityHandlers({ ipcMain, ...args })

  console.log('[IPC] Consolidated IPC handlers registered successfully')
}
