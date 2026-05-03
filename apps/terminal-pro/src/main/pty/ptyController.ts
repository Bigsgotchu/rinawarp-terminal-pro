import { createRequire } from "node:module"
import { spawn } from "node-pty"
import { resolveSharedWorkspaceCwd } from "../runtime/runtimeAccess.js"

const require = createRequire(import.meta.url)
const electron = require("electron")
const { ipcMain, BrowserWindow } = electron

let shell: ReturnType<typeof spawn> | null = null
let lastShellPid: number | null = null
let lastShellCwd: string | null = null
let lastShellStartedAt: string | null = null

function resolvePtyCwd(input?: string): string {
  return resolveSharedWorkspaceCwd(input)
}

export function registerPtyHandlers() {
  ipcMain.handle("rina:pty:start", (event: Electron.IpcMainInvokeEvent, payload?: { cols?: number; rows?: number; cwd?: string | null }) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (shell) {
      shell.kill()
    }

    const shellPath = process.env.SHELL || "/bin/bash"
    const cwd = resolvePtyCwd(payload?.cwd || undefined)
    lastShellCwd = cwd
    lastShellStartedAt = new Date().toISOString()
    shell = spawn(shellPath, [], {
      name: "xterm-color",
      cols: Math.max(20, Number(payload?.cols || 80)),
      rows: Math.max(5, Number(payload?.rows || 30)),
      cwd,
      env: process.env
    })
    lastShellPid = shell.pid ?? null

    shell.onData((data: string) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send("rina:pty:data", data)
      }
    })

    shell.onExit(({ exitCode, signal }) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send("rina:pty:exit", {
          exitCode,
          signal,
        })
      }
      shell = null
      lastShellPid = null
    })

    return { started: true, cwd }
  })

  ipcMain.handle("rina:pty:write", (_e: unknown, data: string) => {
    if (shell) {
      shell.write(data)
    }
  })

  ipcMain.handle("rina:pty:stop", () => {
    if (shell) {
      shell.kill()
      shell = null
    }
    lastShellPid = null
    return { stopped: true }
  })

  ipcMain.handle("rina:pty:resize", (_e: unknown, cols: number, rows: number) => {
    if (shell) {
      shell.resize(Math.max(20, Number(cols || 80)), Math.max(5, Number(rows || 30)))
    }
    return {
      ok: true,
      supported: true,
      running: Boolean(shell),
      cols: Number(cols || 0),
      rows: Number(rows || 0),
    }
  })

  ipcMain.handle("rina:pty:metrics", () => {
    return {
      running: Boolean(shell),
      pid: lastShellPid,
      cwd: lastShellCwd,
      startedAt: lastShellStartedAt,
      transport: 'node-pty',
      resizeSupported: true,
    }
  })

  console.log("[PTY] PTY handlers registered")
}
