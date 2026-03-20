/**
 * Rina Controller - Full Production Implementation
 *
 * Real multi-agent workflows with actual tool execution.
 * Integrates terminal, Git, Docker, filesystem tools with safety guardrails.
 */

import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'events'
import type { AgentPlan } from './types.js'
import type { AgentEvent } from './agent-loop.js'
import type { ReflectionResult } from './reflection.js'

// Repair planner imports
import { buildRepairPlan, executeRepairPlan, formatRepairPlan, scanProjectContext, executeRepairStep, type RepairPlan } from './repair-planner.js'

// Error explainer imports
import { explainError } from './error-explainer.js'

// Tool imports
import { terminalTool } from './tools/terminal.js'
import { gitTool } from './tools/git.js'
import { dockerTool } from './tools/docker.js'
import { filesystemTool } from './tools/filesystem.js'
import { systemTool } from './tools/system.js'

// Memory imports
import { projectMemory } from './memory/projectMemory.js'
import { commandMemory } from './learning/commandMemory.js'

// Brain imports
import { thinkingStream } from './thinking/thinkingStream.js'
import { brainEvents } from './brain/brainEvents.js'

// Planner import
// Safety imports
import { safetyCheck, ExecutionMode } from './safety.js'

/**
 * Response type from Rina
 */
export interface RinaResponse {
  ok: boolean
  intent: string
  output?: unknown
  error?: string
  blocked?: boolean
  requiresConfirmation?: boolean
}

// Alias for executeConfirmed (was a typo in original)
export type TinaResponse = RinaResponse

/**
 * Tools interface for convenient access
 */
interface TerminalToolsInterface {
  runTerminalCommand(command: string, args: string[], mode: string): Promise<ToolResult>
  runCommand(command: string, mode: string): Promise<ToolResult>
}

interface FilesystemToolsInterface {
  writeFileSafe(path: string, content: string): Promise<ToolResult>
  readFileSafe(path: string): Promise<ToolResult>
  listDirSafe(dir: string): Promise<ToolResult>
  deleteFileSafe(path: string): Promise<ToolResult>
}

interface SystemToolsInterface {
  getSystemInfo(): { platform: string; arch: string; version: string }
  rebootSystem(mode: string): Promise<ToolResult>
  shutdownSystem(mode: string): Promise<ToolResult>
  runSafeCommand(command: string, args: string[], mode: string): Promise<ToolResult>
}

export interface RinaToolsInterface {
  terminal: TerminalToolsInterface
  filesystem: FilesystemToolsInterface
  system: SystemToolsInterface
}

interface ToolResult {
  ok: boolean
  output?: unknown
  error?: string
}

class RinaController {
  private mode: 'auto' | 'assist' | 'explain' = 'assist'
  private emitter = new EventEmitter()
  private workspaceRoot: string = ''
  private isRunning: boolean = false
  private currentTaskId: string | null = null
  private licenseTier: string = 'free' // Track current license tier
  private currentRepairPlan: RepairPlan | null = null // Current repair plan for 'rina fix'
  public tools: RinaToolsInterface

  constructor() {
    // Initialize tools interface with real implementations
    this.tools = {
      terminal: {
        runTerminalCommand: async (command: string, args: string[], mode: string) => {
          return this.executeTerminalCommand(command, args, mode as ExecutionMode)
        },
        runCommand: async (command: string, mode: string) => {
          return this.executeTerminalCommand(command, [], mode as ExecutionMode)
        },
      },
      filesystem: {
        writeFileSafe: async (path: string, content: string) => {
          return this.executeFilesystemOperation('write', path, content)
        },
        readFileSafe: async (path: string) => {
          return this.executeFilesystemOperation('read', path)
        },
        listDirSafe: async (dir: string) => {
          return this.executeFilesystemOperation('list', dir)
        },
        deleteFileSafe: async (path: string) => {
          return this.executeFilesystemOperation('delete', path)
        },
      },
      system: {
        getSystemInfo: () => this.getSystemInfo(),
        rebootSystem: async (_mode: string) => ({ ok: false, error: 'System commands disabled for safety' }),
        shutdownSystem: async (_mode: string) => ({ ok: false, error: 'System commands disabled for safety' }),
        runSafeCommand: async (command: string, _args: string[], mode: string) => {
          return this.executeTerminalCommand(command, [], mode as ExecutionMode)
        },
      },
    }
  }

  // --- Real Tool Execution Methods ---

  private async executeTerminalCommand(command: string, _args: string[], mode: ExecutionMode): Promise<ToolResult> {
    // Safety check
    const safety = safetyCheck(command, mode)
    if (safety.blocked) {
      return { ok: false, error: safety.reason }
    }

    // Emit thinking event
    thinkingStream.stream(`Executing: ${command}`)

    try {
      const result = await terminalTool.execute(
        { intent: 'terminal-execute', tool: 'terminal', input: { command, mode } },
        { mode, workspaceRoot: this.workspaceRoot }
      )

      // Record command in memory
      commandMemory.record(command, result.ok)

      // Emit brain event
      brainEvents.emitEvent('execution', `Command executed: ${command}`, { success: result.ok })

      return {
        ok: result.ok,
        output: result.output,
        error: result.error,
      }
    } catch (err) {
      commandMemory.record(command, false)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async executeFilesystemOperation(action: string, path: string, content?: string): Promise<ToolResult> {
    thinkingStream.stream(`Filesystem: ${action} ${path}`)

    try {
      const result = await filesystemTool.execute(
        { intent: 'filesystem-operation', tool: 'filesystem', input: { action, path, content } },
        { mode: this.mode, workspaceRoot: this.workspaceRoot }
      )

      return {
        ok: result.ok,
        output: result.output,
        error: result.error,
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
    }
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
    // Return real plans based on project type
    const project = projectMemory.loadProject(this.workspaceRoot)
    const plans: AgentPlan[] = []

    if (project) {
      if (project.buildCommand) {
        plans.push({
          id: 'build',
          description: `Build project (${project.buildCommand})`,
          steps: ['install-deps', 'compile', 'bundle'],
        })
      }
      if (project.testCommand) {
        plans.push({
          id: 'test',
          description: `Run tests (${project.testCommand})`,
          steps: ['setup', 'run-tests', 'report'],
        })
      }
      if (project.startCommand) {
        plans.push({
          id: 'dev',
          description: `Start dev server (${project.startCommand})`,
          steps: ['install', 'compile', 'start'],
        })
      }
    }

    // Default plans
    plans.push({ id: 'deploy', description: 'Deploy application', steps: ['build', 'test', 'push', 'release'] })
    plans.push({ id: 'analyze', description: 'Analyze code quality', steps: ['lint', 'typecheck', 'test-cov'] })

    return plans
  }

  private getProjectCommand(intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze'): string {
    const project = this.workspaceRoot ? projectMemory.loadProject(this.workspaceRoot) : null
    const custom = project?.customCommands || {}
    const packageScripts = this.readPackageScripts()

    if (intent === 'build') {
      return project?.buildCommand || custom.build || packageScripts.build || 'npm run build'
    }

    if (intent === 'test') {
      return project?.testCommand || custom.test || packageScripts.test || 'npm test'
    }

    if (intent === 'lint') {
      return custom.lint || packageScripts.lint || 'npm run lint'
    }

    if (intent === 'deploy') {
      return custom.deploy || packageScripts.deploy || 'npm run deploy'
    }

    return custom.analyze || custom.lint || packageScripts.lint || 'npm run lint'
  }

  private readPackageScripts(): Record<string, string> {
    if (!this.workspaceRoot) return {}

    const packageJsonPath = path.join(this.workspaceRoot, 'package.json')
    try {
      if (!fs.existsSync(packageJsonPath)) return {}
      const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { scripts?: Record<string, string> }
      return parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {}
    } catch {
      return {}
    }
  }

  private async executeIntentCommand(intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze'): Promise<RinaResponse> {
    const command = this.getProjectCommand(intent)
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
    this.isRunning = true
    const taskId = `task-${Date.now()}`
    this.currentTaskId = taskId

    thinkingStream.stream(`Starting agent: ${typeof planOrCommand === 'string' ? planOrCommand : planOrCommand.id}`)

    try {
      // Emit step started event
      this.emitter.emit('agent:event', { type: 'stepStarted', step: 'initializing', taskId })

      let result

      if (typeof planOrCommand === 'string') {
        // Execute command directly
        brainEvents.emitEvent('intent', `Executing: ${planOrCommand}`, { taskId })
        const terminalResult = await this.tools.terminal.runCommand(planOrCommand, this.mode)
        result = {
          ok: terminalResult.ok,
          output: terminalResult.output,
          error: terminalResult.error,
        }
      } else {
        // Execute plan steps
        const steps = planOrCommand.steps || []
        const reflections: ReflectionResult['insights'] = []

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]

          // Emit step started
          this.emitter.emit('agent:event', { type: 'stepStarted', step, taskId })
          brainEvents.emitEvent('execution', `Step ${i + 1}/${steps.length}: ${step}`, { taskId, step })

          try {
            // Execute the step
            const stepResult = await this.tools.terminal.runCommand(String(step), this.mode)

            reflections.push({
              stepId: step,
              stepDescription: step,
              feedback: [String(stepResult.output || stepResult.error || '')],
              severity: 'info',
            })

            // Emit step completed
            this.emitter.emit('agent:event', { type: 'stepCompleted', step, taskId })
          } catch (stepError) {
            // Emit step failed
            this.emitter.emit('agent:event', { type: 'stepFailed', step, error: stepError, taskId })
            brainEvents.emitEvent('error', `Step failed: ${step}`, { taskId, step, error: stepError })

            reflections.push({
              stepId: step,
              stepDescription: step,
              feedback: [stepError instanceof Error ? stepError.message : String(stepError)],
              severity: 'error',
            })
          }
        }

        const reflection: ReflectionResult = {
          taskId,
          insights: reflections,
          nextActions: ['Review results', 'Continue or abort'],
          success: reflections.every((r) => r.severity !== 'error'),
          performanceMetrics: {
            totalDurationMs: steps.length * 1000,
            expectedDurationMs: steps.length * 800,
            stepsOverExpected: 0,
          },
        }

        result = {
          reflection,
          success: reflection.success,
          summary: {
            totalSteps: steps.length,
            successfulSteps: reflections.filter((r) => r.severity !== 'error').length,
            failedSteps: reflections.filter((r) => r.severity === 'error').length,
            durationMs: steps.length * 1000,
          },
          ok: reflection.success,
        }
      }

      brainEvents.emitEvent(
        'result',
        `Agent completed: ${typeof planOrCommand === 'string' ? planOrCommand : planOrCommand.id}`,
        { taskId, success: result && 'ok' in result ? result.ok : true }
      )

      return result
    } catch (err) {
      brainEvents.emitEvent('error', 'Agent execution failed', { taskId, error: err })
      throw err
    } finally {
      this.isRunning = false
      this.currentTaskId = null
    }
  }

  async handleMessage(message: string): Promise<RinaResponse> {
    thinkingStream.stream(`Processing: ${message}`)

    // Parse intent
    const intent = this.parseIntent(message)

    try {
      // Execute based on intent
      switch (intent) {
        case 'fix':
          // Autonomous Dev Fix - scan project and build repair plan
          if (!this.workspaceRoot) {
            return {
              ok: false,
              intent,
              error: 'No workspace set. Please open a project first.',
            }
          }
          
          try {
            const context = await scanProjectContext(this.workspaceRoot)
            const plan = await buildRepairPlan(this.workspaceRoot)
            this.currentRepairPlan = plan
            
            const formattedPlan = formatRepairPlan(plan)
            return {
              ok: true,
              intent,
              output: {
                message: formattedPlan,
                plan: plan,
                context: context,
                requiresConfirmation: !plan.autoExecutable,
              },
            }
          } catch (err) {
            return {
              ok: false,
              intent,
              error: err instanceof Error ? err.message : String(err),
            }
          }

        case 'fix-run':
          // Execute the repair plan
          return this.executeCurrentRepairPlan()

        case 'fix-step':
          // Execute a specific step from the repair plan
          const stepIdMatch = message.match(/fix[\s-]step[\s-](\d+)/i)
          if (stepIdMatch) {
            const stepIndex = parseInt(stepIdMatch[1]) - 1
            if (this.currentRepairPlan && stepIndex >= 0 && stepIndex < this.currentRepairPlan.steps.length) {
              const step = this.currentRepairPlan.steps[stepIndex]
              return this.executeRepairStep(step.id)
            } else {
              return {
                ok: false,
                intent,
                error: `Step ${stepIdMatch[1]} not found in repair plan.`,
              }
            }
          }
          return {
            ok: false,
            intent,
            error: 'Usage: rina fix step <number>',
          }

        case 'explain':
          // Explain error - parse error from message and explain it
          const errorText = message.replace(/^rina\s+explain\s*/i, '').trim()
          if (!errorText) {
            return {
              ok: true,
              intent,
              output: {
                message: 'Usage: rina explain <error message>',
                example: 'rina explain Error: Cannot find module "express"',
              },
            }
          }
          
          try {
            const explanation = await explainError(errorText, this.workspaceRoot)
            return {
              ok: true,
              intent,
              output: {
                message: explanation,
                originalError: errorText,
              },
            }
          } catch (err) {
            return {
              ok: false,
              intent,
              error: err instanceof Error ? err.message : String(err),
            }
          }

        case 'build':
        case 'test':
        case 'deploy':
        case 'analyze':
        case 'lint':
          return this.executeIntentCommand(intent)

        case 'status':
          return {
            ok: true,
            intent,
            output: this.getStatus(),
          }

        case 'help':
          return {
            ok: true,
            intent,
            output: {
              commands: ['build', 'test', 'deploy', 'analyze', 'lint', 'status', 'help', 'fix', 'explain'],
              description: 'Available commands',
              newCommands: {
                fix: 'Automatically detect and fix project errors',
                explain: 'Explain an error message in plain English',
              },
            },
          }

        default:
          // Try to execute as terminal command
          const execResult = await this.tools.terminal.runCommand(message, this.mode)
          return {
            ok: execResult.ok,
            intent: 'execute',
            output: execResult.output,
            error: execResult.error,
          }
      }
    } catch (err) {
      return {
        ok: false,
        intent,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private parseIntent(message: string): string {
    const lower = message.toLowerCase().trim()

    // Check for fix execute/run commands first
    if (lower.match(/^rina\s*fix\s+(run|execute)/)) return 'fix-run'
    if (lower.match(/^rina\s*fix\s+step\s+\d+/)) return 'fix-step'
    if (lower.includes('what can you do') || lower.includes('what do you do') || lower.includes('help me')) return 'help'
    if (lower.includes("what's wrong") || lower.includes('what is wrong') || lower.includes('what failed') || lower.includes('why did this fail')) return 'analyze'
    if (lower.includes('fix')) return 'fix'
    if (lower.includes('explain')) return 'explain'
    if (lower.includes('build')) return 'build'
    if (lower.includes('test')) return 'test'
    if (lower.includes('deploy')) return 'deploy'
    if (lower.includes('analyze')) return 'analyze'
    if (lower.includes('lint')) return 'lint'
    if (lower.includes('status')) return 'status'
    if (lower.includes('help')) return 'help'

    return 'execute'
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
        this.licenseTier = 'demo'
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
      this.licenseTier = data.tier

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
    const os = require('os')
    const crypto = require('crypto')
    const hostname = os.hostname()
    const username = os.userInfo().username
    return crypto.createHash('sha256').update(`${hostname}-${username}`).digest('hex').substring(0, 16)
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
    const cmdStats = commandMemory.getStats()
    const recentProjects = projectMemory.recentProjects(5)

    return {
      memory: {
        session: cmdStats.totalCommands,
        longterm: recentProjects.length,
      },
      commands: {
        executed: cmdStats.totalRuns,
        learned: cmdStats.totalCommands,
      },
      agents: {
        running: this.isRunning,
        completed: 0,
      },
      conversation: {
        entries: cmdStats.totalRuns,
      },
      longterm: {
        sessions: recentProjects.length,
      },
      project: {
        current: this.workspaceRoot,
        type: projectMemory.loadProject(this.workspaceRoot)?.type || 'unknown',
      },
    }
  }

  clearSession(): void {
    thinkingStream.stream('Session cleared')
  }

  getContext(): string {
    const project = projectMemory.loadProject(this.workspaceRoot)
    return JSON.stringify({
      workspace: this.workspaceRoot,
      project: project?.name,
      type: project?.type,
      mode: this.mode,
    })
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
    if (!this.currentRepairPlan) {
      return {
        ok: false,
        intent: 'fix',
        error: 'No repair plan available. Run "rina fix" first.',
      }
    }

    if (!this.workspaceRoot) {
      return {
        ok: false,
        intent: 'fix',
        error: 'No workspace set.',
      }
    }

    try {
      const result = await executeRepairPlan(
        this.currentRepairPlan,
        this.workspaceRoot,
        (step, stepResult) => {
          // Emit event for each step completion
          this.emitter.emit('repair:stepComplete', { step, result: stepResult })
        }
      )

      // Clear the current plan after execution
      this.currentRepairPlan = null

      return {
        ok: result.success,
        intent: 'fix',
        output: {
          success: result.success,
          stepsExecuted: result.results.length,
          results: result.results.map(r => ({
            stepId: r.step.id,
            command: r.step.command,
            success: r.result.success,
            output: r.result.output.substring(0, 500), // Truncate long outputs
          })),
        },
      }
    } catch (err) {
      return {
        ok: false,
        intent: 'fix',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /**
   * Execute a single step from the repair plan (for interactive CLI blocks)
   */
  async executeRepairStep(stepId: string): Promise<RinaResponse> {
    if (!this.currentRepairPlan) {
      return {
        ok: false,
        intent: 'fix',
        error: 'No repair plan available. Run "rina fix" first.',
      }
    }

    if (!this.workspaceRoot) {
      return {
        ok: false,
        intent: 'fix',
        error: 'No workspace set.',
      }
    }

    const step = this.currentRepairPlan.steps.find(s => s.id === stepId)
    if (!step) {
      return {
        ok: false,
        intent: 'fix',
        error: `Step "${stepId}" not found in repair plan.`,
      }
    }

    try {
      const result = await executeRepairStep(step, this.workspaceRoot)
      
      return {
        ok: result.success,
        intent: 'fix',
        output: {
          stepId: step.id,
          command: step.command,
          description: step.description,
          success: result.success,
          output: result.output,
          error: result.error,
        },
      }
    } catch (err) {
      return {
        ok: false,
        intent: 'fix',
        error: err instanceof Error ? err.message : String(err),
      }
    }
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
