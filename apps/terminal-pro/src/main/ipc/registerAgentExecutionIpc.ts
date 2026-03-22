import {
  handleExecuteCapability,
  handleExecutePlanStream,
  type ExecuteCapabilityPayload,
  type ExecutePlanPayload,
  type RegisterAgentExecutionArgs,
} from './agentExecutionFlow.js'

export function registerAgentExecutionIpc(args: RegisterAgentExecutionArgs) {
  const { ipcMain } = args

  ipcMain.handle('rina:executePlanStream', async (event, payload: ExecutePlanPayload) =>
    handleExecutePlanStream(args, event.sender, payload)
  )
  ipcMain.handle('rina:capabilities:execute', async (event, payload: ExecuteCapabilityPayload) =>
    handleExecuteCapability(args, event.sender, payload)
  )
  ipcMain.handle('rina:stream:cancel', async (_event, streamId: string) => args.streamCancel(streamId))
  ipcMain.handle('rina:stream:kill', async (_event, streamId: string) => args.streamKill(streamId))
  ipcMain.handle('rina:plan:stop', async (_event, planRunId: string) => args.planStop(planRunId))
}
