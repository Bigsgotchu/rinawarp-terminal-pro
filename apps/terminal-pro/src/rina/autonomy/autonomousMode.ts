/**
 * Autonomous Mode
 *
 * Allows Rina to watch terminal output and respond automatically.
 * This enables self-healing and proactive problem solving.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'
import { detectFailure } from '../diagnostics/failureDetector.js'
import { runAgent } from '../agent/planner.js'

export type AutonomyLevel = 'off' | 'observe' | 'assist' | 'full'

export class AutonomousMode {
  private _enabled = false
  private _level: AutonomyLevel = 'off'
  private _failureCount = 0
  private _lastActionTime = 0
  private _actionCooldownMs = 5000 // 5 seconds between autonomous actions

  get enabled(): boolean {
    return this._enabled
  }

  get level(): AutonomyLevel {
    return this._level
  }

  get failureCount(): number {
    return this._failureCount
  }

  start(level: AutonomyLevel = 'observe') {
    this._enabled = true
    this._level = level
    thinkingStream.emit('thinking', {
      type: 'autonomy',
      status: 'enabled',
      level: this._level,
      message: `Autonomous mode enabled at ${level} level`,
    })
    console.log(`[Autonomy] Enabled at ${level} level`)
  }

  stop() {
    this._enabled = false
    this._level = 'off'
    thinkingStream.emit('thinking', {
      type: 'autonomy',
      status: 'disabled',
      message: 'Autonomous mode disabled',
    })
    console.log('[Autonomy] Disabled')
  }

  setLevel(level: AutonomyLevel) {
    this._level = level
    if (!this._enabled && level !== 'off') {
      this.start(level)
    } else if (level === 'off') {
      this.stop()
    } else {
      thinkingStream.emit('thinking', {
        type: 'autonomy',
        status: 'level_changed',
        level: this._level,
        message: `Autonomy level changed to ${level}`,
      })
    }
  }

  async observe(output: string) {
    if (!this._enabled) return

    // Check for failures
    if (detectFailure(output)) {
      this._failureCount++

      // Only act at assist or full level
      if (this._level === 'assist' || this._level === 'full') {
        await this.handleFailure(output)
      } else if (this._level === 'observe') {
        // Just report the failure
        thinkingStream.emit('thinking', {
          type: 'autonomy',
          status: 'failure_detected',
          message: `Failure detected (total: ${this._failureCount})`,
          output: output.slice(0, 200),
        })
      }
    }
  }

  private async handleFailure(output: string) {
    // Check cooldown to avoid spam
    const now = Date.now()
    if (now - this._lastActionTime < this._actionCooldownMs) {
      return
    }

    this._lastActionTime = now

    // Determine appropriate response based on output
    const diagnosis = this.analyzeFailure(output)

    thinkingStream.emit('thinking', {
      type: 'autonomy',
      status: 'analyzing',
      message: `Analyzing failure: ${diagnosis.type}`,
      details: diagnosis,
    })

    if (this._level === 'full') {
      // Attempt automatic repair
      try {
        await this.attemptRepair(diagnosis)
      } catch (err) {
        thinkingStream.emit('thinking', {
          type: 'autonomy',
          status: 'repair_failed',
          message: `Auto-repair failed: ${err}`,
        })
      }
    } else {
      // At assist level, just suggest the fix
      thinkingStream.emit('thinking', {
        type: 'autonomy',
        status: 'suggestion',
        message: `Suggested action: ${diagnosis.suggestedAction}`,
        details: diagnosis,
      })
    }
  }

  private analyzeFailure(output: string): {
    type: string
    suggestedAction: string
    confidence: number
  } {
    const lower = output.toLowerCase()

    // TypeScript/build failures
    if (lower.includes('ts') || lower.includes('typescript') || lower.includes('compilation')) {
      return {
        type: 'typescript_error',
        suggestedAction: 'fix typescript errors',
        confidence: 0.9,
      }
    }

    // Test failures
    if (lower.includes('test') || (lower.includes('failed') && lower.includes('expect'))) {
      return {
        type: 'test_failure',
        suggestedAction: 'fix failing tests',
        confidence: 0.85,
      }
    }

    // Missing module
    if (lower.includes('cannot find module') || lower.includes('module not found')) {
      return {
        type: 'missing_module',
        suggestedAction: 'install missing dependency',
        confidence: 0.95,
      }
    }

    // Git errors
    if (lower.includes('git') && (lower.includes('error') || lower.includes('failed'))) {
      return {
        type: 'git_error',
        suggestedAction: 'fix git issue',
        confidence: 0.8,
      }
    }

    // Docker errors
    if (lower.includes('docker') && (lower.includes('error') || lower.includes('failed'))) {
      return {
        type: 'docker_error',
        suggestedAction: 'fix docker issue',
        confidence: 0.8,
      }
    }

    // Network errors
    if (lower.includes('econnrefused') || lower.includes('timeout') || lower.includes('network')) {
      return {
        type: 'network_error',
        suggestedAction: 'check network connection',
        confidence: 0.85,
      }
    }

    // Default
    return {
      type: 'unknown',
      suggestedAction: 'diagnose error',
      confidence: 0.5,
    }
  }

  private async attemptRepair(diagnosis: { type: string; suggestedAction: string }) {
    thinkingStream.emit('thinking', {
      type: 'autonomy',
      status: 'attempting_repair',
      message: `Attempting automatic repair for ${diagnosis.type}`,
    })

    // Map diagnosis types to repair actions
    switch (diagnosis.type) {
      case 'missing_module':
        // Would run pnpm install or npm install
        thinkingStream.emit('thinking', {
          type: 'autonomy',
          status: 'repair_action',
          message: 'Running pnpm install...',
        })
        break

      case 'typescript_error':
        thinkingStream.emit('thinking', {
          type: 'autonomy',
          status: 'repair_action',
          message: 'Analyzing TypeScript errors...',
        })
        break

      default:
        thinkingStream.emit('thinking', {
          type: 'autonomy',
          status: 'repair_action',
          message: `Would execute: ${diagnosis.suggestedAction}`,
        })
    }
  }

  resetFailureCount() {
    this._failureCount = 0
  }
}

export const autonomousMode = new AutonomousMode()
