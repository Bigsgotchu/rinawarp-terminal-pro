import type { IpcMain, IpcMainInvokeEvent } from 'electron'

type PlanStep = {
  stepId: string
  tool: string
  input: {
    command: string
    cwd: string
    timeoutMs: number
  }
  risk: string
  risk_level: string
  requires_confirmation: boolean
  description: string
}

type PlanResult = {
  id: string
  reasoning: string
  steps: PlanStep[]
}

type RegisterRinaPlanIpcDeps = {
  ipcMain: IpcMain
  resolveProjectRootSafe: (input: unknown) => string
  fetchRemotePlanForIpc: (args: { intentText: string; projectRoot: string }) => Promise<unknown>
}

type PlanRequest = {
  projectRoot?: unknown
  intentText?: unknown
}

type IpcHandler = Parameters<IpcMain['handle']>[1]

const SELF_CHECK_INTENT_PATTERN =
  /\b(scan yourself|check yourself|self-check|inspect current state|check the workbench|diagnose the app|what is broken right now)\b/i

function replaceHandler(
  ipcMain: IpcMain,
  channel: string,
  handler: IpcHandler,
): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

function isSelfCheckIntent(intentText: string): boolean {
  return SELF_CHECK_INTENT_PATTERN.test(intentText)
}

function buildSelfCheckPlan(projectRoot: string): PlanResult {
  return {
    id: `plan_self_check_${Date.now()}`,
    reasoning: 'Running Rina self-check against policy checklist.',
    steps: [
      {
        stepId: 's1',
        tool: 'selfCheck',
        input: {
          command: 'executeSelfCheck',
          cwd: projectRoot,
          timeoutMs: 60_000,
        },
        risk: 'inspect',
        risk_level: 'low',
        requires_confirmation: false,
        description: 'Run self-check tool',
      },
    ],
  }
}

function buildPlanError(error: unknown): PlanResult {
  return {
    id: `plan_error_${Date.now()}`,
    reasoning: error instanceof Error ? error.message : String(error),
    steps: [],
  }
}

export function registerRinaPlanIpc(deps: RegisterRinaPlanIpcDeps): void {
  const { ipcMain, resolveProjectRootSafe, fetchRemotePlanForIpc } = deps

  replaceHandler(ipcMain, 'rina:agent:plan', async (_event: IpcMainInvokeEvent, args: PlanRequest | undefined) => {
    try {
      const projectRoot = resolveProjectRootSafe(args?.projectRoot)
      const intentText = String(args?.intentText || '')

      if (isSelfCheckIntent(intentText)) {
        return buildSelfCheckPlan(projectRoot)
      }

      return await fetchRemotePlanForIpc({
        intentText,
        projectRoot,
      })
    } catch (error) {
      return buildPlanError(error)
    }
  })
}
