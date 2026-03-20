import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electron = require('electron')
const { ipcMain } = electron

export function registerTerminalIpc(): void {
  // Terminal execution via direct `exec()` is intentionally disabled.
  // The only blessed execution path is the Rina plan/receipt pipeline.
  ipcMain.removeHandler('terminal:run')
  ipcMain.removeHandler('terminal:run-stream')
}
