import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { trackCommandRun } from '../telemetry.js'

interface TerminalRunResult {
  output: string
  error?: string
  exitCode: number | null
  duration?: number
}

export function registerTerminalIpc() {
  ipcMain.handle('terminal:run', async (_event, command: string): Promise<TerminalRunResult> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      // Security: Basic command validation
      if (!command || typeof command !== 'string') {
        resolve({
          output: '',
          error: 'Invalid command',
          exitCode: 1,
          duration: 0
        })
        return
      }
      
      // Dangerous command detection (basic)
      const dangerousPatterns = [
        /rm\s+-rf\s+\/(?!tmp|var\/tmp)/i,
        /:\(\)\{.*:\|:/i,  // Fork bomb
        /dd\s+if=\/dev\/zero\s+of=\/dev\/sd/i,
      ]
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          resolve({
            output: '',
            error: 'Command blocked for safety',
            exitCode: 1,
            duration: Date.now() - startTime
          })
          return
        }
      }

      exec(command, { 
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime
        
        // Track command execution
        trackCommandRun()
        
        if (error) {
          // Check if it's a timeout
          if (error.killed) {
            resolve({
              output: '',
              error: 'Command timed out after 60 seconds',
              exitCode: 124,
              duration
            })
          } else {
            resolve({
              output: stdout,
              error: stderr || error.message,
              exitCode: error.code ?? 1,
              duration
            })
          }
        } else {
          resolve({
            output: stdout,
            error: stderr || undefined,
            exitCode: 0,
            duration
          })
        }
      })
    })
  })
  
  // Register streaming terminal run handler
  ipcMain.handle('terminal:run-stream', async (event, command: string) => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      // Security validation
      if (!command || typeof command !== 'string') {
        resolve({ 
          output: '', 
          error: 'Invalid command', 
          exitCode: 1,
          duration: 0 
        })
        return
      }
      
      const child = exec(command, {
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
      })
      
      let output = ''
      let errorOutput = ''
      
      child.stdout?.on('data', (data) => {
        output += data
        // Send streaming output to renderer
        event.sender.send('terminal:stream-data', { type: 'stdout', data: data.toString() })
      })
      
      child.stderr?.on('data', (data) => {
        errorOutput += data
        event.sender.send('terminal:stream-data', { type: 'stderr', data: data.toString() })
      })
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime
        // Track command execution
        trackCommandRun()
        resolve({
          output,
          error: errorOutput || undefined,
          exitCode: code,
          duration
        })
      })
      
      child.on('error', (err) => {
        const duration = Date.now() - startTime
        resolve({
          output: '',
          error: err.message,
          exitCode: 1,
          duration
        })
      })
    })
  })
}
