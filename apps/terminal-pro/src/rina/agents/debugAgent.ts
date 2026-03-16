/**
 * Debugger Agent
 *
 * Specialized agent for analyzing errors and providing debugging insights.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'

export type ErrorType = 'dependency' | 'typescript' | 'runtime' | 'syntax' | 'network' | 'permission' | 'unknown'

export type DebugResult = {
  errorType: ErrorType
  confidence: number
  diagnosis: string
  suggestions: string[]
  relatedFiles?: string[]
}

/**
 * Analyze an error log and determine the issue type
 */
export function analyzeError(log: string): DebugResult {
  thinkingStream.emit('thinking', {
    type: 'debugger',
    status: 'analyzing',
    message: 'Debugger agent: Analyzing error...',
  })

  const lower = log.toLowerCase()

  // Check for different error types
  if (lower.includes('module not found') || lower.includes('cannot find module')) {
    return {
      errorType: 'dependency',
      confidence: 0.95,
      diagnosis: 'Missing dependency or incorrect import path',
      suggestions: [
        "Run 'pnpm install' to install dependencies",
        'Check if the import path is correct',
        'Verify the package is in package.json',
      ],
    }
  }

  if (lower.includes('typescript') || lower.includes('ts') || lower.includes('@types')) {
    return {
      errorType: 'typescript',
      confidence: 0.9,
      diagnosis: 'TypeScript compilation error',
      suggestions: [
        "Run 'pnpm tsc --noEmit' to see detailed errors",
        'Check type annotations',
        'Verify all required types are installed',
      ],
    }
  }

  if (lower.includes('referenceerror') || lower.includes('typeerror') || lower.includes('is not defined')) {
    return {
      errorType: 'runtime',
      confidence: 0.85,
      diagnosis: 'Runtime error - variable not defined',
      suggestions: [
        'Check if variable is declared before use',
        'Verify scope of the variable',
        'Check for typos in variable names',
      ],
    }
  }

  if (lower.includes('syntaxerror') || lower.includes('unexpected token')) {
    return {
      errorType: 'syntax',
      confidence: 0.95,
      diagnosis: 'Syntax error in code',
      suggestions: [
        'Check for missing brackets or parentheses',
        'Verify proper ES6+ syntax',
        'Look for missing semicolons or commas',
      ],
    }
  }

  if (lower.includes('econnrefused') || lower.includes('timeout') || lower.includes('fetch')) {
    return {
      errorType: 'network',
      confidence: 0.9,
      diagnosis: 'Network or API connection error',
      suggestions: [
        'Check if the server is running',
        'Verify API endpoints are correct',
        'Check firewall or network settings',
      ],
    }
  }

  if (lower.includes('permission denied') || lower.includes('eacces')) {
    return {
      errorType: 'permission',
      confidence: 0.95,
      diagnosis: 'Permission denied error',
      suggestions: [
        'Check file/folder permissions',
        'Try running with appropriate permissions',
        'Verify the user has access to the resource',
      ],
    }
  }

  // Default unknown error
  thinkingStream.emit('thinking', {
    type: 'debugger',
    status: 'unknown',
    message: 'Debugger agent: Could not determine error type',
  })

  return {
    errorType: 'unknown',
    confidence: 0.3,
    diagnosis: 'Unable to determine error type',
    suggestions: [
      'Review the error message carefully',
      'Check the stack trace for more details',
      'Search for the error message online',
    ],
  }
}

/**
 * Get detailed debugging information
 */
export function getDebugInfo(error: string): {
  category: string
  likelyCause: string
  fixCommand?: string
} {
  const result = analyzeError(error)

  const fixCommands: Record<ErrorType, string | undefined> = {
    dependency: 'pnpm install',
    typescript: 'pnpm tsc --noEmit',
    runtime: undefined,
    syntax: undefined,
    network: undefined,
    permission: 'chmod +x script.sh',
    unknown: undefined,
  }

  return {
    category: result.errorType,
    likelyCause: result.diagnosis,
    fixCommand: fixCommands[result.errorType],
  }
}
