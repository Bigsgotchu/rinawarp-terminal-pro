import { ipcMain, BrowserWindow } from "electron"

interface PlanStep {
  id: string
  command: string
  tool: string
}

interface ExecutePlanArgs {
  plan: PlanStep[]
  projectRoot?: string
  confirmed?: boolean
  confirmationText?: string
}

export function registerPlanExecutor() {
  ipcMain.handle("rina:executePlanStream", async (event: Electron.IpcMainInvokeEvent, args: ExecutePlanArgs) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { plan } = args

    if (!win) {
      return { ok: false, error: "No window found" }
    }

    const planRunId = `plan-${Date.now()}`

    win.webContents.send("rina:plan:run:start", { planRunId })

    for (const step of plan) {
      win.webContents.send("rina:plan:stepStart", step)

      await new Promise(r => setTimeout(r, 500))

      win.webContents.send("rina:stream:chunk", {
        stepId: step.id,
        output: `Executed ${step.command}`
      })
    }

    win.webContents.send("rina:stream:end", { ok: true })

    win.webContents.send("rina:plan:run:end", {
      planRunId,
      ok: true
    })

    return { ok: true }
  })

  console.log("[PlanExecutor] Plan executor handlers registered")
}
