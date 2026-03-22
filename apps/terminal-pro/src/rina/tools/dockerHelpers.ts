import { safetyCheck } from '../safety.js'
import type { ToolContext } from './registry.js'

const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_./:-]+$/

export function sanitizeIdentifier(input: string, fieldName: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error(`${fieldName} is required`)
  }

  const trimmed = input.trim()
  if (!SAFE_IDENTIFIER_PATTERN.test(trimmed)) {
    throw new Error(
      `${fieldName} contains invalid characters. Only alphanumeric, dash, underscore, dot, slash, and colon are allowed.`
    )
  }

  const injectionPatterns = [/\$\(/, /`/, /;/, /&&/, /\|\|/, />\s*\//, /<\s*\//, /\n/, /\r/, /\0/]
  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`${fieldName} contains unsafe characters.`)
    }
  }

  return trimmed
}

export function sanitizeOptions(options: string, allowedFlags: string[]): string {
  if (!options) return ''

  const parts = options.split(/\s+/)
  const sanitized: string[] = []
  for (const part of parts) {
    if (!part.startsWith('-')) continue
    const flagName = part.replace(/^-+/, '').split('=')[0]
    if (allowedFlags.includes(flagName) || /^\d+$/.test(part) || part.startsWith('"') || part.startsWith("'")) {
      sanitized.push(part)
    }
  }

  return sanitized.join(' ')
}

export const DOCKER_ALLOWED_OPTIONS: Record<string, string[]> = {
  run: ['d', 'i', 't', 'rm', 'p', 'v', 'e', 'w', 'network', 'name', 'entrypoint', 'env', 'volume', 'port', 'workdir', 'user', 'privileged'],
  ps: ['a', 'l', 'q', 'n', 's', 'format'],
  build: ['t', 'f', 'no-cache', 'pull', 'force-rm', 'rm'],
  exec: ['i', 't', 'd', 'e', 'u', 'w'],
  logs: ['f', 'tail', 'since', 'until', 'timestamps'],
  pull: ['a', 'platform'],
}

export function checkDockerSafety(args: {
  command: string
  target?: string
  context: ToolContext
}): { blocked: boolean } {
  if (!['rm', 'stop', 'kill', 'rmi'].includes(args.command) || !args.target) {
    return { blocked: false }
  }
  return { blocked: !!safetyCheck(args.target, args.context.mode).blocked }
}
