import { ipcMain, BrowserWindow } from "electron"
import { spawn, ChildProcessWithoutNullStreams } from "child_process"

let shell: ChildProcessWithoutNullStreams | null = null

export function registerPtyHandlers() {
  ipcMain.handle("rina:pty:start", (event: Electron.IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (shell) {
      shell.kill()
    }

    const shellPath = process.env.SHELL || "/bin/bash"
    shell = spawn(shellPath, [], {
      cwd: process.cwd(),
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

    return { started: true }
  })

  ipcMain.handle("rina:pty:write", (_e, data: string) => {
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
