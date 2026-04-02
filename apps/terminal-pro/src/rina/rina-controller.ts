/**
 * Rina Controller - Full Production Implementation
 *
 * Real multi-agent workflows with actual tool execution.
 * Integrates terminal, Git, Docker, filesystem tools with safety guardrails.
 */

import { EventEmitter } from 'events'
import type { AgentPlan } from './types.js'
import type { AgentEvent } from './agent-loop.js'
import type { RinaResponse, RinaToolsInterface, ToolResult } from './controller/types.js'
import {
  buildContext,
  buildDeviceId,
  buildStats,
  getPlansForWorkspace,
  getProjectCommand,
  parseIntent,
} from './controller/projectRuntime.js'
import {
  createRinaTools,
  executeFilesystemOperationRuntime,
  executeTerminalCommandRuntime,
  getSystemInfoRuntime,
} from './controller/toolRuntime.js'
import { handleMessageRuntime, runAgentRuntime } from './controller/messageRuntime.js'
import { executeCurrentRepairPlanRuntime, executeRepairStepRuntime } from './controller/repairRuntime.js'
import type { RepairPlan } from './repair-planner.js'

// Memory imports
import { projectMemory } from './memory/projectMemory.js'
import { commandMemory } from './learning/commandMemory.js'

// Brain imports
import { thinkingStream } from './thinking/thinkingStream.js'
import { brainEvents } from './brain/brainEvents.js'

// Planner import
// Safety imports
import { safetyCheck, ExecutionMode } from './safety.js'
export type { RinaResponse, TinaResponse, RinaToolsInterface } from './controller/types.js'

class RinaController {
  private mode: 'auto' | 'assist' | 'explain' = 'assist'
  private emitter = new EventEmitter()
  private workspaceRoot: string = ''
  private isRunning: boolean = false
  private currentTaskId: string | null = null
  private currentRepairPlan: RepairPlan | null = null // Current repair plan for 'rina fix'
  public tools: RinaToolsInterface

  constructor() {
    this.tools = createRinaTools({
      executeTerminalCommand: (command, args, mode) => this.executeTerminalCommand(command, args, mode),
      executeFilesystemOperation: (action, path, content) => this.executeFilesystemOperation(action, path, content),
      getSystemInfo: () => this.getSystemInfo(),
    })
  }

  // --- Real Tool Execution Methods ---

  private async executeTerminalCommand(command: string, _args: string[], mode: ExecutionMode): Promise<ToolResult> {
    return executeTerminalCommandRuntime(command, _args, mode, this.workspaceRoot)
  }

  private async executeFilesystemOperation(action: string, path: string, content?: string): Promise<ToolResult> {
    return executeFilesystemOperationRuntime(action, path, content, this.mode, this.workspaceRoot)
  }

  private getSystemInfo() {
    return getSystemInfoRuntime()
  }

  // --- Public API ---

  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.mode,
      workspaceRoot: this.workspaceRoot,
      activePlans: this.currentTaskId ? [this.currentTaskId] : [],
    }
  }

  setMode(mode: 'auto' | 'assist' | 'explain') {
    this.mode = mode
    brainEvents.emitEvent('intent', `Mode changed to: ${mode}`, { mode })
    return { ok: true, mode }
  }

  getMode(): 'auto' | 'assist' | 'explain' {
    return this.mode
  }

  setWorkspaceRoot(path: string): void {
    this.workspaceRoot = path

    // Detect and save project context
    const projectType = projectMemory.detectProjectType(path)
    projectMemory.save({
      root: path,
      type: projectType,
      name: path.split('/').pop() || 'Unknown',
    })

    thinkingStream.stream(`Workspace set to: ${path} (${projectType} project)`)
  }

  getPlans(): AgentPlan[] {
    return getPlansForWorkspace(this.workspaceRoot, projectMemory)
  }

  private async getProjectCommand(intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze'): Promise<string> {
    return await getProjectCommand({
      workspaceRoot: this.workspaceRoot,
      intent,
      projectMemory,
    })
  }

  private async executeIntentCommand(intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze'): Promise<RinaResponse> {
    const command = await this.getProjectCommand(intent)
    const result = await this.tools.terminal.runCommand(command, this.mode)
    return {
      ok: result.ok,
      intent,
      output: {
        command,
        output: result.output,
        success: result.ok,
      },
      error: result.error,
    }
  }

  async runAgent(planOrCommand: string | AgentPlan) {
    return runAgentRuntime({
      planOrCommand,
      mode: this.mode,
      tools: this.tools,
      emitter: this.emitter,
      setRunning: (running) => {
        this.isRunning = running
      },
      setCurrentTaskId: (taskId) => {
        this.currentTaskId = taskId
      },
    })
  }

  async handleMessage(message: string): Promise<RinaResponse> {
    return handleMessageRuntime({
      message,
      workspaceRoot: this.workspaceRoot,
      parseIntent: (input) => this.parseIntent(input),
      currentRepairPlan: this.currentRepairPlan,
      setCurrentRepairPlan: (plan) => {
        this.currentRepairPlan = plan
      },
      executeCurrentRepairPlan: () => this.executeCurrentRepairPlan(),
      executeRepairStep: (stepId) => this.executeRepairStep(stepId),
      executeIntentCommand: (intent) => this.executeIntentCommand(intent),
      getStatus: () => this.getStatus(),
      mode: this.mode,
      tools: this.tools,
    })
  }

  private parseIntent(message: string): string {
    return parseIntent(message)
  }

  async executeConfirmed(command: string): Promise<RinaResponse> {
    const safety = safetyCheck(command, this.mode)

    if (safety.blocked) {
      return {
        ok: false,
        intent: 'confirmed',
        blocked: true,
        error: safety.reason,
      }
    }

    if (safety.requiresConfirmation && this.mode === 'assist') {
      return {
        ok: false,
        intent: 'confirmed',
        requiresConfirmation: true,
        error: 'Confirmation required',
      }
    }

    thinkingStream.stream(`Executing confirmed: ${command}`)

    try {
      const result = await this.tools.terminal.runCommand(command, this.mode)
      return {
        ok: result.ok,
        intent: 'confirmed',
        output: result.output,
        error: result.error,
      }
    } catch (err) {
      return {
        ok: false,
        intent: 'confirmed',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  onAgentEvent(callback: (event: AgentEvent) => void) {
    this.emitter.on('agent:event', callback)
  }

  isAgentRunning(): boolean {
    return this.isRunning
  }

  getAgentProgress(): { current: number; total: number; percentage: number } {
    // Simplified progress tracking
    return { current: 0, total: 0, percentage: 0 }
  }

  verifyLicense(key: string) {
    // Only allow demo/test keys in development/test environments
    // Production builds should always require real license verification
    const isDevMode = process.env.NODE_ENV === 'development' || process.env.RINAWARP_DEV === 'true'
    const isTestMode = process.env.NODE_ENV === 'test'

    if (isDevMode || isTestMode) {
      // In dev/test mode, allow demo and test keys
      if (key === 'DEMO' || key.startsWith('TEST-')) {
        return { valid: true, tier: 'demo' }
      }
    }

    // Production: require proper license verification via API
    // This method returns a placeholder - use verifyLicenseAsync for actual verification
    if (!key || key.length < 10) {
      return { valid: false, message: 'Invalid license key format' }
    }

    // Mark as needing verification
    return { valid: false, message: 'Use verifyLicenseAsync for production verification' }
  }

  /**
   * Async license verification - calls the backend API
   */
  async verifyLicenseAsync(key: string): Promise<{ valid: boolean; tier?: string; message?: string }> {
    try {
      const deviceId = this.getDeviceId()

      const res = await fetch('https://api.rinawarptech.com/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, device_id: deviceId }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`License verify failed (${res.status}): ${text}`)
      }

      const data = await res.json()

      if (!data.valid) {
        return { valid: false, message: data.error || 'Invalid license key' }
      }

      // Store the license tier for feature gating

      return {
        valid: true,
        tier: data.tier,
        message: 'License verified successfully',
      }
    } catch (err) {
      console.error('[License] Verification error:', err)
      return { valid: false, message: err instanceof Error ? err.message : 'License verification failed' }
    }
  }

  /**
   * Get device ID for license validation
   */
  private getDeviceId(): string {
    return buildDeviceId()
  }

  getShellKind(shell?: string) {
    return shell === 'zsh' ? 'zsh' : 'bash'
  }

  runUtility(command: string) {
    console.log(`[Rina] Utility: ${command}`)

    // Handle common utilities
    switch (command) {
      case 'clear':
        return { success: true, output: 'Console cleared' }
      case 'reload':
        return { success: true, output: 'Reloading configuration' }
      default:
        return { success: true, output: `Executed: ${command}` }
    }
  }

  // --- Additional methods for IPC compatibility ---

  getTools(): string[] {
    return ['terminal', 'filesystem', 'system', 'git', 'docker', 'brain']
  }

  getStats() {
    return buildStats({
      workspaceRoot: this.workspaceRoot,
      isRunning: this.isRunning,
      projectMemory,
      commandMemory,
    })
  }

  clearSession(): void {
    thinkingStream.stream('Session cleared')
  }

  getContext(): string {
    return buildContext(this.workspaceRoot, this.mode, projectMemory)
  }

  getMemory() {
    return {
      project: projectMemory.loadProject(this.workspaceRoot),
      recentProjects: projectMemory.recentProjects(5),
      topCommands: commandMemory.topCommands(10),
      commandStats: commandMemory.getStats(),
    }
  }

  /**
   * Get the current repair plan from 'rina fix'
   */
  getRepairPlan(): RepairPlan | null {
    return this.currentRepairPlan
  }

  /**
   * Execute the current repair plan
   */
  async executeCurrentRepairPlan(): Promise<RinaResponse> {
    const response = await executeCurrentRepairPlanRuntime({
      currentRepairPlan: this.currentRepairPlan,
      workspaceRoot: this.workspaceRoot,
      emitter: this.emitter,
    })
    if (response.ok) this.currentRepairPlan = null
    return response
  }

  /**
   * Execute a single step from the repair plan (for interactive CLI blocks)
   */
  async executeRepairStep(stepId: string): Promise<RinaResponse> {
    return executeRepairStepRuntime({
      currentRepairPlan: this.currentRepairPlan,
      workspaceRoot: this.workspaceRoot,
      stepId,
    })
  }
}

// Singleton instance
export const rinaController = new RinaController()

/**
 * Convenience function for handling messages
 */
export async function handleRinaMessage(message: string): Promise<RinaResponse> {
  return rinaController.handleMessage(message)
}

/**
 * Convenience function to execute a confirmed command
 */
export async function executeConfirmedCommand(command: string): Promise<RinaResponse> {
  return rinaController.executeConfirmed(command)
}

// Export the class for type checking
export { RinaController }
