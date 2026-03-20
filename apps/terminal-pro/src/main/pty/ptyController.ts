import { createRequire } from "node:module"
import { spawn, ChildProcessWithoutNullStreams } from "child_process"

const require = createRequire(import.meta.url)
const electron = require("electron")
const { ipcMain, BrowserWindow } = electron

let shell: ChildProcessWithoutNullStreams | null = null

type RegisterPtyHandlersArgs = {
  resolvePtyCwd: (input?: string) => string
}

export function registerPtyHandlers(args: RegisterPtyHandlersArgs) {
  ipcMain.handle("rina:pty:start", (event: Electron.IpcMainInvokeEvent, payload?: { cwd?: string | null }) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (shell) {
      shell.kill()
    }

    const shellPath = process.env.SHELL || "/bin/bash"
    const cwd = args.resolvePtyCwd(payload?.cwd || undefined)
    shell = spawn(shellPath, [], {
      cwd,
      env: process.env
    })

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
    return { stopped: true }
  })

  console.log("[PTY] PTY handlers registered")
}
