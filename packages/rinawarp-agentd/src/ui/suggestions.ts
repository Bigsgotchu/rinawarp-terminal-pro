/**
 * Suggestions
 *
 * AI suggestion display types.
 */

import type { RiskLevel } from '../safety/risk.js'

export interface Suggestion {
  command: string
  explanation: string
  risk: RiskLevel
  originalCommand?: string
}

export interface DiffSuggestion {
  original: string
  suggested: string
  explanation: string
  risk: RiskLevel
}

export function createSuggestion(command: string, explanation: string, risk: RiskLevel): Suggestion {
  return { command, explanation, risk }
}

export function createDiffSuggestion(
  original: string,
  suggested: string,
  explanation: string,
  risk: RiskLevel
): DiffSuggestion {
  return { original, suggested, explanation, risk }
}

export function requiresConfirmation(suggestion: Suggestion): boolean {
  return suggestion.risk === 'medium' || suggestion.risk === 'high'
}

export function formatSuggestion(suggestion: Suggestion): string {
  return `Suggested:
  ${suggestion.command}

Explanation:
  ${suggestion.explanation}

Risk: ${suggestion.risk.toUpperCase()}`
}
