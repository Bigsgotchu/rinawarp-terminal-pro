import { BaseTool } from './baseTool.js'
import { safetyCheck, ExecutionMode } from '../safety.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import * as pty from 'node-pty'

export class TerminalTool extends BaseTool<{ output: string }> {
  private shell = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
  })

  async execute(args?: any) {
    const command = args?.command || ''
    // Using assist mode as default for safety checking
    const safetyResult = safetyCheck(command, 'assist')
    if (safetyResult.blocked) throw new Error(safetyResult.reason || 'Blocked command')

    thinkingStream.stream('Executing terminal command')

    try {
      return new Promise<{ output: string }>((resolve, reject) => {
        let output = ''
        let hasFinished = false

        const finish = () => {
          if (hasFinished) return
          hasFinished = true
          resolve({ output: output.trim() })
        }

        const fail = (error: any) => {
          if (hasFinished) return
          hasFinished = true
          reject(error)
        }

        this.shell.onData((data: string) => {
          output += data
        })

        this.shell.onExit((event: { exitCode: number; signal?: number }) => {
          if (event.exitCode !== 0) {
            fail(new Error(`Command failed with exit code ${event.exitCode}`))
          } else {
            finish()
          }
        })

        this.shell.write(command + '\r')

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!hasFinished) {
            this.shell.kill()
            fail(new Error('Command timed out'))
          }
        }, 30000)
      })
    } catch (err) {
      throw err
    }
  }
}
