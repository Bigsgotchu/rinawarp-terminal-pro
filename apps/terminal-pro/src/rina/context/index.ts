/**
 * RinaWarp Context System - Main Export
 *
 * Unified export for context engine, terminal history, and error tracking.
 */

export * from './contextEngine.js'
export * from './terminalHistory.js'
export * from './errorTracker.js'

// Create default instances
import { ContextEngine } from './contextEngine.js'
import { terminalHistory } from './terminalHistory.js'
import { errorTracker } from './errorTracker.js'

/**
 * Initialize context system with workspace
 */
export function initContextSystem(workspacePath: string): ContextEngine {
  const engine = new ContextEngine(workspacePath)
  console.log('[ContextSystem] Initialized with workspace:', workspacePath)
  return engine
}

/**
 * Get context for AI planning
 */
export function getContextForAI(): string {
  const contextParts: string[] = []

  // Add terminal history
  const history = terminalHistory.getContextString()
  if (history && history !== 'No recent commands') {
    contextParts.push('Recent Terminal Commands:\n' + history)
  }

  // Add errors
  const errors = errorTracker.getContextString()
  if (errors && errors !== 'No unresolved errors') {
    contextParts.push('Recent Errors:\n' + errors)
  }

  return contextParts.join('\n\n')
}

export { terminalHistory, errorTracker }
