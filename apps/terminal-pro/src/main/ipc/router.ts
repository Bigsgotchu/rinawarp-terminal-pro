import { ipcMain, BrowserWindow } from "electron"
import os from "os"
import fs from "fs"
import path from "path"

export function registerIpcHandlers() {
  // ------------------------------------------------
  // Status / Mode
  // ------------------------------------------------

  ipcMain.handle("rina:getStatus", () => {
    return {
      ready: true,
      platform: process.platform,
      version: "1.0.0"
    }
  })

  let mode = "assist"

  ipcMain.handle("rina:getMode", () => mode)

  ipcMain.handle("rina:setMode", (_e, m: string) => {
    mode = m
    return { ok: true }
  })

  // ------------------------------------------------
  // Diagnostics
  // ------------------------------------------------

  ipcMain.handle("rina:diagnostics:paths", () => ({
    home: os.homedir(),
    tmp: os.tmpdir(),
    cwd: process.cwd()
  }))

  ipcMain.handle("rina:support:bundle", () => {
    const bundle = path.join(os.tmpdir(), `rinawarp-${Date.now()}.zip`)
    fs.writeFileSync(bundle, "support bundle placeholder")
    return { path: bundle }
  })

  // ------------------------------------------------
  // Telemetry
  // ------------------------------------------------

  ipcMain.handle("telemetry:sessionStart", () => true)
  ipcMain.handle("telemetry:sessionEnd", () => true)
  ipcMain.handle("telemetry:commandRun", () => true)
  ipcMain.handle("telemetry:aiMessage", () => true)
  ipcMain.handle("telemetry:quickFix", () => true)

  // ------------------------------------------------
  // Agent
  // ------------------------------------------------

  ipcMain.handle("rina:runAgent", async (event: Electron.IpcMainInvokeEvent, command: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (!win) {
      return { success: false, error: "No window found" }
    }

    win.webContents.send("rina:thinking", {
      time: Date.now(),
      message: "Analyzing request..."
    })

    await new Promise(r => setTimeout(r, 400))

    win.webContents.send("rina:thinking", {
      time: Date.now(),
      message: "Generating execution plan..."
    })

    return {
      success: true,
      summary: `Executed agent command: ${command}`,
      steps: [
        {
          id: "step-1",
          tool: "terminal",
          command
        }
      ]
    }
  })

  // ------------------------------------------------
  // Plans
  // ------------------------------------------------

  ipcMain.handle("rina:getPlans", () => {
    return [
      {
        id: "plan-1",
        name: "Deploy Application",
        steps: [
          { id: "s1", command: "git status", tool: "terminal" },
          { id: "s2", command: "pnpm build", tool: "terminal" }
        ]
      }
    ]
  })

  // ------------------------------------------------
  // Tools
  // ------------------------------------------------

  ipcMain.handle("rina:getTools", () => {
    return [
      { id: "terminal", name: "Terminal", description: "Execute shell commands" },
      { id: "editor", name: "Editor", description: "Edit files" },
      { id: "git", name: "Git", description: "Git operations" },
      { id: "docker", name: "Docker", description: "Docker container management" }
    ]
  })

  console.log("[IPC] All handlers registered")
}
