import { ipcMain } from 'electron'
import { spawn } from 'child_process'

// Re-export types and functions expected by registerAllIpc
export type AgentPlan = {
  id: string
  intent: string
  reasoning: string
  steps: Array<{
    id: string
    tool: string
    command: string
    risk: string
    description?: string
  }>
  playbookId?: string
}

export { registerAgentIpc } from './registerAgentIpc.js'

// Register the rina:runAgent handler for CLI command execution
export function registerAgentHandlers() {
  ipcMain.handle('rina:runAgent', async (event, input: string) => {
    console.log('[rina:runAgent] Request:', input)

    // Simple fallback: treat input as shell command
    const proc = spawn(input, { shell: true })

    proc.stdout.on('data', (data: Buffer) => {
      event.sender.send('rina:stream:chunk', data.toString())
    })

    proc.stderr.on('data', (data: Buffer) => {
      event.sender.send('rina:stream:chunk', data.toString())
    })

    proc.on('close', (code: number | null) => {
      event.sender.send('rina:stream:end', {
        exitCode: code,
      })
    })

    return {
      success: true,
    }
  })
}
