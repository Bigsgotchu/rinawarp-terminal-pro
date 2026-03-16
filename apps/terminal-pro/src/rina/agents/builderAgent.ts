/**
 * Builder Agent
 *
 * Specialized agent for compiling and building code.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'
import { toolRegistry } from '../core/toolRegistry.js'

export type BuildResult = {
  success: boolean
  output: string
  duration: number
  errors?: string[]
}

/**
 * Run a build for the project
 */
export async function runBuild(cwd?: string): Promise<BuildResult> {
  const startTime = Date.now()

  thinkingStream.emit('thinking', {
    type: 'builder',
    status: 'starting',
    message: 'Builder agent: Starting build...',
  })

  const terminal = toolRegistry.get('terminal')

  if (!terminal) {
    return {
      success: false,
      output: 'Terminal tool not available',
      duration: 0,
      errors: ['Terminal tool not available'],
    }
  }

  try {
    // Determine build command based on project
    const buildCmd = 'pnpm build'

    thinkingStream.emit('thinking', {
      type: 'builder',
      status: 'running',
      message: `Builder agent: Running ${buildCmd}...`,
    })

    const output = await terminal.execute(buildCmd, { cwd })

    const duration = Date.now() - startTime
    const success = output.toLowerCase().includes('error') === false

    thinkingStream.emit('thinking', {
      type: 'builder',
      status: success ? 'success' : 'failed',
      message: `Builder agent: ${success ? 'Build successful' : 'Build failed'}`,
      output: output.slice(0, 200),
    })

    return {
      success,
      output,
      duration,
      errors: success ? undefined : extractErrors(output),
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)

    thinkingStream.emit('thinking', {
      type: 'builder',
      status: 'error',
      message: `Builder agent error: ${errorMsg}`,
    })

    return {
      success: false,
      output: errorMsg,
      duration,
      errors: [errorMsg],
    }
  }
}

/**
 * Run tests for the project
 */
export async function runTests(cwd?: string): Promise<BuildResult> {
  const startTime = Date.now()

  thinkingStream.emit('thinking', {
    type: 'builder',
    status: 'starting',
    message: 'Builder agent: Running tests...',
  })

  const terminal = toolRegistry.get('terminal')

  if (!terminal) {
    return {
      success: false,
      output: 'Terminal tool not available',
      duration: 0,
    }
  }

  try {
    const testCmd = 'pnpm test'
    const output = await terminal.execute(testCmd, { cwd })
    const duration = Date.now() - startTime
    const success = output.toLowerCase().includes('fail') === false

    thinkingStream.emit('thinking', {
      type: 'builder',
      status: success ? 'success' : 'failed',
      message: `Builder agent: Tests ${success ? 'passed' : 'failed'}`,
    })

    return {
      success,
      output,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Extract error lines from output
 */
function extractErrors(output: string): string[] {
  const lines = output.split('\n')
  return lines
    .filter((line) => line.toLowerCase().includes('error') || line.toLowerCase().includes('failed'))
    .slice(0, 10)
}
