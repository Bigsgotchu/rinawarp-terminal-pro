/**
 * Self-Repair Engine
 *
 * Attempts automatic fixes for common failures.
 * Uses the tool registry to execute repair commands.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'
import { toolRegistry } from '../core/toolRegistry.js'
import { detectFailure, findFailure, getFailureSummary } from '../diagnostics/failureDetector.js'

export type RepairAction = {
  type: string
  command: string
  description: string
  confidence: number
}

export interface RepairResult {
  success: boolean
  actions: RepairAction[]
  output: string
  error?: string
}

/**
 * Determine repair actions based on failure type
 */
export function suggestRepairs(output: string): RepairAction[] {
  const actions: RepairAction[] = []
  const summary = getFailureSummary(output)

  // Missing module - suggest install
  if (summary.types.includes('missing_module')) {
    actions.push({
      type: 'install_deps',
      command: 'pnpm install',
      description: 'Install missing dependencies',
      confidence: 0.95,
    })
  }

  // TypeScript error - suggest type check
  if (summary.types.includes('compilation_error')) {
    actions.push({
      type: 'type_check',
      command: 'pnpm tsc --noEmit',
      description: 'Run TypeScript type check',
      confidence: 0.85,
    })

    actions.push({
      type: 'build',
      command: 'pnpm build',
      description: 'Rebuild the project',
      confidence: 0.8,
    })
  }

  // Test failure - suggest running tests
  if (summary.types.includes('test_failure')) {
    actions.push({
      type: 'test',
      command: 'pnpm test',
      description: 'Run tests to see detailed failures',
      confidence: 0.9,
    })
  }

  // Git errors
  if (summary.types.includes('git_error')) {
    actions.push({
      type: 'git_status',
      command: 'git status',
      description: 'Check git status',
      confidence: 0.7,
    })
  }

  // Docker errors
  if (summary.types.includes('docker_error')) {
    actions.push({
      type: 'docker_build',
      command: 'docker compose build',
      description: 'Rebuild Docker containers',
      confidence: 0.8,
    })
  }

  // Network errors
  if (summary.types.includes('network_error')) {
    actions.push({
      type: 'check_network',
      command: 'ping -c 3 google.com',
      description: 'Check network connectivity',
      confidence: 0.6,
    })
  }

  return actions
}

/**
 * Attempt to automatically repair the failure
 */
export async function selfRepair(output: string): Promise<RepairResult> {
  thinkingStream.emit('thinking', {
    type: 'self_repair',
    status: 'analyzing',
    message: 'Analyzing failure for auto-repair',
  })

  if (!detectFailure(output)) {
    return {
      success: true,
      actions: [],
      output: 'No failure detected',
    }
  }

  const actions = suggestRepairs(output)

  if (actions.length === 0) {
    thinkingStream.emit('thinking', {
      type: 'self_repair',
      status: 'no_actions',
      message: 'No automatic repair actions available for this failure',
    })

    return {
      success: false,
      actions: [],
      output: 'No repair actions available',
      error: 'Unknown failure type',
    }
  }

  // Try the first action with highest confidence
  const bestAction = actions[0]

  thinkingStream.emit('thinking', {
    type: 'self_repair',
    status: 'attempting',
    message: `Attempting: ${bestAction.description}`,
  })

  try {
    const terminal = toolRegistry.get('terminal')

    if (!terminal) {
      return {
        success: false,
        actions,
        output: '',
        error: 'Terminal tool not available',
      }
    }

    const result = await terminal.execute(bestAction.command)

    const repairResult: RepairResult = {
      success: result.success,
      actions,
      output: result.output || '',
      error: result.error,
    }

    if (result.success) {
      thinkingStream.emit('thinking', {
        type: 'self_repair',
        status: 'success',
        message: `Repair successful: ${bestAction.description}`,
      })
    } else {
      thinkingStream.emit('thinking', {
        type: 'self_repair',
        status: 'failed',
        message: `Repair failed: ${result.error}`,
      })
    }

    return repairResult
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    thinkingStream.emit('thinking', {
      type: 'self_repair',
      status: 'error',
      message: `Repair error: ${errorMsg}`,
    })

    return {
      success: false,
      actions,
      output: '',
      error: errorMsg,
    }
  }
}

/**
 * Run a complete diagnostic and repair cycle
 */
export async function diagnoseAndRepair(output: string): Promise<{
  diagnosis: ReturnType<typeof getFailureSummary>
  repair: RepairResult
}> {
  const diagnosis = getFailureSummary(output)
  const repair = await selfRepair(output)

  return { diagnosis, repair }
}
