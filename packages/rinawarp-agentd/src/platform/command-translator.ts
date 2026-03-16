/**
 * Command Translator
 *
 * Problem #1: Command Translation
 * Converts natural language to shell commands.
 *
 * "find all .js files modified today" → find . -name "*.js" -mtime -1
 */

import { generateFixPlan } from './llm.js'
import type { LLMConfig } from './llm.js'

export interface CommandTranslationInput {
  userInput: string
  os: 'linux' | 'darwin' | 'win32'
  shell: string
  context?: {
    workingDirectory?: string
    gitBranch?: string
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'pip'
    dockerAvailable?: boolean
    kubernetesAvailable?: boolean
  }
}

export interface CommandSuggestion {
  command: string
  explanation: string
  risk: 'low' | 'medium' | 'high'
  confidence: number
  dryRun?: string
}

/**
 * Translate natural language to shell command
 */
export async function translateToCommand(
  config: LLMConfig,
  input: CommandTranslationInput
): Promise<CommandSuggestion> {
  const osHints = getOsHints(input.os)
  const contextHints = getContextHints(input.context)

  const prompt = `You are a Linux/macOS shell command translator.

Rules:
1. Only produce real commands that exist on ${input.os}
2. If unsure, output empty command and ask for clarification
3. Never produce destructive commands (rm -rf, mkfs, dd) unless explicitly requested
4. Prefer common CLI tools (find, grep, ls, cat, sed, awk, etc.)

User's shell: ${input.shell}
${osHints}
${contextHints}

User request: "${input.userInput}"

Respond with ONLY valid JSON:
{
  "command": "the shell command",
  "explanation": "what this command does",
  "risk": "low|medium|high",
  "confidence": 0.0-1.0,
  "dryRun": "optional preview command (e.g., add | head)"
}`

  try {
    const result = await generateFixPlan(
      config,
      {
        userPrompt: input.userInput,
        systemContext: {
          os: input.os,
          kernel: '',
          hostname: '',
          uptime: '',
          cpu: '',
          memory: '',
          disk: '',
          processes: '',
          services: '',
          git: input.context?.gitBranch
            ? {
                branch: input.context.gitBranch,
                status: '',
              }
            : undefined,
        },
      },
      {
        systemPrompt: prompt,
        maxRetries: 2,
      }
    )

    return {
      command: result.commands[0] || '',
      explanation: result.reasoning || result.analysis,
      risk: result.risk,
      confidence: result.confidence,
    }
  } catch (error) {
    return {
      command: '',
      explanation: error instanceof Error ? error.message : 'Failed to generate command',
      risk: 'low',
      confidence: 0,
    }
  }
}

function getOsHints(os: string): string {
  switch (os) {
    case 'darwin':
      return 'Available: brew, port, gnu-sed, gawk, launchctl'
    case 'win32':
      return 'Available: powershell, cmd, choco, winget'
    default:
      return 'Available: apt, yum, dnf, systemctl, journalctl'
  }
}

function getContextHints(ctx?: CommandTranslationInput['context']): string {
  if (!ctx) return ''

  const hints: string[] = []

  if (ctx.packageManager) {
    hints.push(`Package manager: ${ctx.packageManager}`)
  }

  if (ctx.dockerAvailable) {
    hints.push('Docker available')
  }

  if (ctx.kubernetesAvailable) {
    hints.push('Kubernetes available')
  }

  if (ctx.workingDirectory) {
    hints.push(`Working directory: ${ctx.workingDirectory}`)
  }

  return hints.join('\n')
}

/**
 * Validate command before execution
 */
export function validateCommand(command: string): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for dangerous patterns
  const dangerous = [
    { pattern: /rm\s+-rf\s+\//, message: 'Deletes entire filesystem' },
    { pattern: /rm\s+-rf\s+\./, message: 'Deletes current directory recursively' },
    { pattern: /mkfs/, message: 'Formats disk' },
    { pattern: /dd\s+if=/, message: 'Direct disk write' },
    { pattern: />\s*\/dev\/sd/, message: 'Writing to block device' },
    { pattern: /chmod\s+777/, message: 'World-writable permissions' },
    { pattern: /shutdown|reboot/, message: 'System shutdown' },
  ]

  for (const { pattern, message } of dangerous) {
    if (pattern.test(command)) {
      issues.push(`DANGEROUS: ${message}`)
    }
  }

  // Check for scope escape
  if (command.includes('../../../') || command.includes('..\\')) {
    issues.push('WARNING: Directory traversal detected')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
