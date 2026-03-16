import { BrowserWindow } from "electron"
import os from "os"
import fs from "fs"
import path from "path"
import { safeHandle, getRegisteredChannels } from "./safe-handler.js"

export function registerIpcHandlers() {
  console.log("[Router] Starting IPC handler registration...")

  // ------------------------------------------------
  // Status / Mode
  // ------------------------------------------------

  safeHandle("rina:getStatus", () => {
    return {
      ready: true,
      platform: process.platform,
      version: "1.0.0"
    }
  })

  let mode = "assist"

  safeHandle("rina:getMode", () => mode)

  safeHandle("rina:setMode", (_e, m: string) => {
    mode = m
    return { ok: true }
  })

  // ------------------------------------------------
  // Diagnostics
  // ------------------------------------------------

  safeHandle("rina:diagnostics:paths", () => ({
    home: os.homedir(),
    tmp: os.tmpdir(),
    cwd: process.cwd()
  }))

  safeHandle("rina:support:bundle", () => {
    const bundle = path.join(os.tmpdir(), `rinawarp-${Date.now()}.zip`)
    fs.writeFileSync(bundle, "support bundle placeholder")
    return { path: bundle }
  })

  // ------------------------------------------------
  // Telemetry (stubs - always succeed)
  // ------------------------------------------------

  safeHandle("telemetry:sessionStart", () => true)
  safeHandle("telemetry:sessionEnd", () => true)
  safeHandle("telemetry:commandRun", () => true)
  safeHandle("telemetry:aiMessage", () => true)
  safeHandle("telemetry:quickFix", () => true)

  // ------------------------------------------------
  // Agent
  // ------------------------------------------------

  safeHandle("rina:runAgent", async (event: Electron.IpcMainInvokeEvent, command: string) => {
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

  safeHandle("rina:getPlans", () => {
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

  safeHandle("rina:getTools", () => {
    return [
      { id: "terminal", name: "Terminal", description: "Execute shell commands" },
      { id: "editor", name: "Editor", description: "Edit files" },
      { id: "git", name: "Git", description: "Git operations" },
      { id: "docker", name: "Docker", description: "Docker container management" }
    ]
  })

  console.log("[Router] Registered IPC channels:", getRegisteredChannels())
  console.log("[Router] All handlers registered")
}
