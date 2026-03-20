import { BaseTool } from './baseTool.js'
import { safetyCheck, ExecutionMode } from '../safety.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import * as pty from 'node-pty'

export class TerminalTool extends BaseTool<{ output: string }> {
  async execute(args?: any) {
    const command = args?.command || ''
    const workspaceRoot = String(args?.workspaceRoot || '').trim()
    // Using assist mode as default for safety checking
    const safetyResult = safetyCheck(command, 'assist')
    if (safetyResult.blocked) throw new Error(safetyResult.reason || 'Blocked command')
    if (!workspaceRoot) throw new Error('Missing workspaceRoot for terminal execution')

    thinkingStream.stream('Executing terminal command')

    try {
      return new Promise<{ output: string }>((resolve, reject) => {
        let output = ''
        let hasFinished = false
        const shell = pty.spawn('bash', [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: workspaceRoot,
          env: process.env,
        })

        const finish = () => {
          if (hasFinished) return
          hasFinished = true
          shell.kill()
          resolve({ output: output.trim() })
        }

        const fail = (error: any) => {
          if (hasFinished) return
          hasFinished = true
          shell.kill()
          reject(error)
        }

        shell.onData((data: string) => {
          output += data
        })

        shell.onExit((event: { exitCode: number; signal?: number }) => {
          if (event.exitCode !== 0) {
            fail(new Error(`Command failed with exit code ${event.exitCode}`))
          } else {
            finish()
          }
        })

        shell.write(command + '\r')

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!hasFinished) {
            shell.kill()
            fail(new Error('Command timed out'))
          }
        }, 30000)
      })
    } catch (err) {
      throw err
    }
  }
}
