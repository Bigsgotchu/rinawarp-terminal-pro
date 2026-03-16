import { toolRegistry } from '../core/toolRegistry.js'
import { thinkingStream } from '../thinking/thinkingStream.js'

export async function runAgent(input: string): Promise<{ output: string }> {
  const command = input.toLowerCase().trim()

  // Install dependencies
  if (command.includes('install') || command.includes('add')) {
    thinkingStream.stream('Installing dependencies')
    const terminal = toolRegistry.get('terminal')
    if (terminal) {
      const result = await terminal.execute({ command: 'pnpm install' })
      return { output: result.output || 'Dependencies installed' }
    }
  }

  // Run tests
  if (command.includes('test')) {
    thinkingStream.stream('Running tests')
    const terminal = toolRegistry.get('terminal')
    if (terminal) {
      const result = await terminal.execute({ command: 'pnpm test' })
      return { output: result.output || 'Tests completed' }
    }
  }

  // Build project
  if (command.includes('build')) {
    thinkingStream.stream('Building project')
    const terminal = toolRegistry.get('terminal')
    if (terminal) {
      const result = await terminal.execute({ command: 'pnpm run build' })
      return { output: result.output || 'Build completed' }
    }
  }

  // Run linter
  if (command.includes('lint')) {
    thinkingStream.stream('Running linter')
    const terminal = toolRegistry.get('terminal')
    if (terminal) {
      const result = await terminal.execute({ command: 'pnpm run lint' })
      return { output: result.output || 'Linting completed' }
    }
  }

  // Default: execute the command directly
  thinkingStream.stream('Executing command')
  const terminal = toolRegistry.get('terminal')
  if (terminal) {
    const result = await terminal.execute({ command: input })
    return { output: result.output || 'Command executed' }
  }

  return { output: "I don't know how to do that yet." }
}
