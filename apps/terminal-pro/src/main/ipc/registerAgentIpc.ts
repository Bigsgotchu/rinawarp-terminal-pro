import type { IpcMain } from 'electron'
import { handleRinaMessage, rinaController, type RinaResponse, type AgentEvent } from '../../rina/index.js'

type DaemonTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'

export function registerAgentIpc(args: {
  ipcMain: IpcMain
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: { status?: DaemonTaskStatus; deadLetter?: boolean }) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
  rinaStatus?: () => { isRunning: boolean; progress: any; mode: string; tools: string[] }
  rinaSetMode?: (mode: 'auto' | 'assist' | 'explain') => void
  rinaGetTools?: () => string[]
  rinaExecutePlan?: (planId: string) => Promise<{ ok: boolean; message: string }>
  rinaLoadSession?: (id: string) => Promise<{ ok: boolean; message: string }>
  rinaInterpret?: (input: string) => Promise<unknown>
  rinaGetSessions?: () => Array<{ id: string; name: string; status: string }>
  rinaGetPlans?: () => unknown[]
}) {
  const { ipcMain } = args

  ipcMain.handle('rina:daemon:status', async () => args.daemonStatus())
  ipcMain.handle('rina:daemon:tasks', async (_event, payload) => args.daemonTasks(payload))
  ipcMain.handle('rina:daemon:task:add', async (_event, payload) => args.daemonTaskAdd(payload))
  ipcMain.handle('rina:daemon:start', async () => args.daemonStart())
  ipcMain.handle('rina:daemon:stop', async () => args.daemonStop())

  // Get Rina status for status panel
  ipcMain.handle('rina:status', async () => {
    return {
      isRunning: rinaController.isAgentRunning(),
      progress: rinaController.getAgentProgress(),
      mode: rinaController.getMode(),
      tools: rinaController.getTools(),
    }
  })

  // Set Rina execution mode
  ipcMain.handle('rina:setMode', async (_event, mode: string) => {
    if (['auto', 'assist', 'explain'].includes(mode)) {
      rinaController.setMode(mode as 'auto' | 'assist' | 'explain')
      return { ok: true, mode }
    }
    return { ok: false, error: 'Invalid mode. Use: auto, assist, or explain' }
  })

  // Subscribe to agent events (for status panel updates)
  ipcMain.handle('rina:subscribeEvents', async (event) => {
    // Return success - actual subscription happens in renderer via preload
    return { ok: true }
  })
  ipcMain.removeHandler('agent:getSessions')
  ipcMain.handle('agent:getSessions', async () => {
    // Return mock sessions for now
    return [
      { id: '1', name: 'Main Session', status: 'active' },
      { id: '2', name: 'Debug Session', status: 'idle' },
    ]
  })

  ipcMain.removeHandler('agent:getPlans')
  ipcMain.handle('agent:getPlans', async () => {
    // Return mock plans for now
    return [
      { id: '1', title: 'Fix Build Errors' },
      { id: '2', title: 'Add Tests' },
    ]
  })

  ipcMain.handle('agent:loadSession', async (_event, id: string) => {
    return { ok: true, message: `Loaded session ${id}` }
  })

  ipcMain.handle('agent:executePlan', async (_event, id: string) => {
    return { ok: true, message: `Executing plan ${id}` }
  })

  ipcMain.handle('agent:interpret', async (_event, input: string) => {
    // Use Rina OS for message interpretation
    try {
      const response: RinaResponse = await handleRinaMessage(input)

      // Convert RinaResponse to actions format for the UI
      const actions: any[] = []

      // Handle different response types
      if (response.output) {
        const output = response.output as Record<string, unknown>

        if (output.type === 'chat') {
          // Chat response - just reply to user
          actions.push({
            type: 'reply',
            payload: {
              text: (output.message as string) || "I'm here to help!",
            },
          })
        } else if (response.intent === 'agent-execution') {
          // Agent execution result
          const agentResult = output as Record<string, unknown>
          if (agentResult.success) {
            actions.push({
              type: 'reply',
              payload: {
                text: "I've completed that task for you.",
                agentResult,
              },
            })
          } else {
            actions.push({
              type: 'reply',
              payload: {
                text: `I encountered an issue: ${response.error || 'Some steps failed'}`,
                agentResult,
              },
            })
          }
        } else {
          // Tool execution result
          const toolOutput = output.output as string | undefined
          actions.push({
            type: 'reply',
            payload: {
              text: toolOutput || 'Done!',
              details: response,
            },
          })
        }
      } else if (response.error) {
        // Error response
        if (response.blocked) {
          actions.push({
            type: 'reply',
            payload: {
              text: `🚫 ${response.error}`,
              blocked: true,
            },
          })
        } else if (response.requiresConfirmation) {
          actions.push({
            type: 'reply',
            payload: {
              text: `⚠️ ${response.error}`,
              requiresConfirmation: true,
            },
          })
        } else {
          actions.push({
            type: 'reply',
            payload: {
              text: `❌ ${response.error}`,
            },
          })
        }
      } else {
        // Fallback response
        actions.push({
          type: 'reply',
          payload: {
            text: `I received: "${input}". How would you like me to proceed?`,
          },
        })
      }

      return { actions, rina: response }
    } catch (error) {
      // Fallback to simple response on error
      return {
        actions: [
          {
            type: 'reply',
            payload: {
              text: `Error processing your request: ${error instanceof Error ? error.message : String(error)}`,
            },
          },
        ],
      }
    }
  })
}
