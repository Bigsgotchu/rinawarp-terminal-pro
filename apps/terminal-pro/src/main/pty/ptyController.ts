import { createRequire } from "node:module"
import { spawn, ChildProcessWithoutNullStreams } from "child_process"
import { resolveSharedWorkspaceCwd } from "../runtime/runtimeAccess.js"

const require = createRequire(import.meta.url)
const electron = require("electron")
const { ipcMain, BrowserWindow } = electron

let shell: ChildProcessWithoutNullStreams | null = null
let lastShellPid: number | null = null
let lastShellCwd: string | null = null
let lastShellStartedAt: string | null = null

function resolvePtyCwd(input?: string): string {
  return resolveSharedWorkspaceCwd(input)
}

export function registerPtyHandlers() {
  ipcMain.handle("rina:pty:start", (event: Electron.IpcMainInvokeEvent, payload?: { cwd?: string | null }) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (shell) {
      shell.kill()
    }

    const shellPath = process.env.SHELL || "/bin/bash"
    const cwd = resolvePtyCwd(payload?.cwd || undefined)
    lastShellCwd = cwd
    lastShellStartedAt = new Date().toISOString()
    shell = spawn(shellPath, [], {
      cwd,
      env: process.env
    })
    lastShellPid = shell.pid ?? null

    shell.stdout.on("data", (data: Buffer) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send("rina:pty:data", data.toString())
      }
    })

    shell.stderr.on("data", (data: Buffer) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send("rina:pty:data", data.toString())
      }
    })

    shell.on("exit", (code: number | null) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send("rina:pty:exit", {
          exitCode: code ?? 0,
          signal: 0
        })
      }
      shell = null
      lastShellPid = null
    })

    return { started: true, cwd }
  })

  ipcMain.handle("rina:pty:write", (_e: unknown, data: string) => {
    if (shell) {
      shell.stdin.write(data)
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
    return {
      ok: true,
      supported: false,
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
      transport: 'child_process',
      resizeSupported: false,
    }
  })

  console.log("[PTY] PTY handlers registered")
}
