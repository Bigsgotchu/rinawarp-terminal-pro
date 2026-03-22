/**
 * Autonomous Agent Loop
 *
 * Background monitoring loop that can run diagnostics and repairs.
 * Enables proactive system health checks.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'
import { autonomousMode } from './autonomousMode.js'
import { commandMemory } from '../learning/commandMemory.js'

export type HealthCheckResult = {
  timestamp: string
  status: 'healthy' | 'warning' | 'critical'
  checks: HealthCheck[]
}

export type HealthCheck = {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

class AgentLoop {
  private intervalId: NodeJS.Timeout | null = null
  private _running = false
  private _intervalMs = 60000 // Default 60 seconds

  get running(): boolean {
    return this._running
  }

  get intervalMs(): number {
    return this._intervalMs
  }

  /**
   * Start the autonomous agent loop
   */
  start(intervalMs: number = 60000) {
    if (this._running) {
      console.log('[AgentLoop] Already running')
      return
    }

    this._intervalMs = intervalMs
    this._running = true

    thinkingStream.emit('thinking', {
      type: 'agent_loop',
      status: 'started',
      message: `Agent monitoring started (interval: ${intervalMs}ms)`,
    })

    console.log(`[AgentLoop] Started with interval: ${intervalMs}ms`)

    // Run initial health check
    this.runHealthCheck()

    // Set up periodic health checks
    this.intervalId = setInterval(() => {
      this.runHealthCheck()
    }, this._intervalMs)
  }

  /**
   * Stop the autonomous agent loop
   */
  stop() {
    if (!this._running) {
      return
    }

    this._running = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    thinkingStream.emit('thinking', {
      type: 'agent_loop',
      status: 'stopped',
      message: 'Agent monitoring stopped',
    })

    console.log('[AgentLoop] Stopped')
  }

  /**
   * Set a new interval for health checks
   */
  setInterval(intervalMs: number) {
    this._intervalMs = intervalMs

    if (this._running) {
      // Restart with new interval
      this.stop()
      this.start(intervalMs)
    }
  }

  /**
   * Run a health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = []
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check autonomous mode status
    const autonomyStatus = autonomousMode.enabled ? 'pass' : 'warning'

    checks.push({
      name: 'autonomous_mode',
      status: autonomyStatus,
      message: autonomousMode.enabled ? `Autonomous mode active (${autonomousMode.level})` : 'Autonomous mode disabled',
    })

    // Check command memory
    const cmdStats = commandMemory.getStats()
    checks.push({
      name: 'command_memory',
      status: cmdStats.totalCommands > 0 ? 'pass' : 'warning',
      message: `${cmdStats.totalCommands} commands tracked`,
      details: cmdStats.mostUsed ? `Most used: ${cmdStats.mostUsed}` : undefined,
    })

    // Check recent failures
    const failedCmds = commandMemory.failedCommands(3)
    if (failedCmds.length > 0) {
      overallStatus = 'warning'
      checks.push({
        name: 'failed_commands',
        status: 'warning',
        message: `${failedCmds.length} commands with low success rate`,
        details: failedCmds.map((c) => `${c.command}: ${Math.round(c.successRate * 100)}%`).join(', '),
      })
    }

    // Check autonomous mode failures
    if (autonomousMode.failureCount > 0) {
      checks.push({
        name: 'autonomy_failures',
        status: 'warning',
        message: `${autonomousMode.failureCount} failures detected this session`,
      })
    }

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      checks,
    }

    // Emit the health check result
    thinkingStream.emit('thinking', {
      type: 'health_check',
      status: overallStatus,
      message: `Health check: ${overallStatus}`,
      details: result,
    })

    return result
  }

  /**
   * Trigger a manual diagnostic cycle
   */
  async runDiagnostic(): Promise<void> {
    thinkingStream.emit('thinking', {
      type: 'diagnostic',
      status: 'running',
      message: 'Running diagnostic cycle...',
    })

    const health = await this.runHealthCheck()

    // If there are warnings, try to address them
    if (health.status === 'warning' || health.status === 'critical') {
      // Could trigger autonomous repairs here if enabled
      if (autonomousMode.enabled && autonomousMode.level === 'full') {
        // Would run repairs
        console.log('[AgentLoop] Warnings detected, autonomous repair available')
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this._running,
      intervalMs: this._intervalMs,
      autonomousMode: autonomousMode.enabled,
      autonomyLevel: autonomousMode.level,
      failureCount: autonomousMode.failureCount,
    }
  }
}

export const agentLoop = new AgentLoop()
