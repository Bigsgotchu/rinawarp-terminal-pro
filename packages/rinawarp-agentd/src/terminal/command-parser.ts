/**
 * Command Parser
 *
 * Parses and classifies shell commands.
 */

export type CommandIntent = 'execute' | 'query' | 'error_fix' | 'explain' | 'unknown'

export interface ParsedCommand {
  command: string
  args: string[]
  isAiRequest: boolean
  intent: CommandIntent
  raw: string
}

/**
 * Parse a command string
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()

  // Check for AI request prefix
  const isAiRequest = trimmed.startsWith('!') || trimmed.startsWith('ai ')

  // Extract command and args
  let command: string
  let args: string[]

  if (isAiRequest) {
    // Remove prefix
    const parts = trimmed
      .replace(/^(!|ai\s+)/, '')
      .trim()
      .split(/\s+/)
    command = parts[0] || ''
    args = parts.slice(1)
  } else {
    const parts = trimmed.split(/\s+/)
    command = parts[0] || ''
    args = parts.slice(1)
  }

  const intent = classifyIntent(command, trimmed)

  return {
    command,
    args,
    isAiRequest,
    intent,
    raw: trimmed,
  }
}

/**
 * Classify command intent
 */
function classifyIntent(command: string, fullInput: string): CommandIntent {
  const lower = command.toLowerCase()

  // Error-related keywords
  if (
    fullInput.toLowerCase().includes('error') ||
    fullInput.toLowerCase().includes('failed') ||
    fullInput.toLowerCase().includes('err') ||
    fullInput.toLowerCase().includes('fix')
  ) {
    return 'error_fix'
  }

  // Explain keywords
  if (
    lower.startsWith('what') ||
    lower.startsWith('how') ||
    lower.startsWith('why') ||
    lower.startsWith('explain') ||
    fullInput.includes('?')
  ) {
    return 'explain'
  }

  // Query commands (read-only)
  const queryCommands = ['ls', 'll', 'la', 'ps', 'cat', 'grep', 'find', 'git status', 'git log']
  if (queryCommands.some((q) => lower === q || lower.startsWith(q))) {
    return 'query'
  }

  // Default to execute
  return 'execute'
}

/**
 * Check if command is read-only (safe)
 */
export function isReadOnlyCommand(command: string): boolean {
  const parsed = parseCommand(command)
  return parsed.intent === 'query'
}

/**
 * Extract the actual command from AI request
 */
export function extractAiCommand(input: string): string {
  const parsed = parseCommand(input)
  if (parsed.isAiRequest) {
    return parsed.args.join(' ')
  }
  return input
}
