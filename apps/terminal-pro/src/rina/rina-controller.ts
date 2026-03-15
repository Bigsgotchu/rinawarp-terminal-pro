/**
 * Rina OS Control Layer - Main Controller
 * 
 * Central controller that coordinates brain, tools, and memory.
 * This is the main entry point for using Rina OS.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import { rinaBrain, type RinaTask, type ExecutionMode } from "./brain.js";
import { safetyCheck, type SafetyCheckResult } from "./safety.js";
import { executeToolTask, getAvailableTools, type ToolContext, type ToolResult } from "./tools/registry.js";
import { remember, getMemoryContext, getMemoryStats, clearMemory, type MemoryEntry } from "./memory/session.js";
import { agentLoop, type AgentResult, type AgentEvent, type AgentEventCallback } from "./agent-loop.js";
import { reflectionEngine, type ReflectionResult } from "./reflection.js";

/**
 * Rina Controller - Main entry point for Rina OS
 */
export class RinaController {
  private context: ToolContext;

  constructor() {
    this.context = {
      mode: "assist",  // Default to assist mode for safety
      workspaceRoot: undefined,
      userId: undefined,
      sessionId: undefined
    };
  }

  /**
   * Set the execution mode
   */
  setMode(mode: ExecutionMode): void {
    this.context.mode = mode;
    rinaBrain.setMode(mode);
  }

  /**
   * Get current execution mode
   */
  getMode(): ExecutionMode {
    return this.context.mode;
  }

  /**
   * Set workspace root
   */
  setWorkspaceRoot(path: string): void {
    this.context.workspaceRoot = path;
  }

  /**
   * Handle a message from the user
   */
  async handleMessage(message: string): Promise<RinaResponse> {
    // Store user message in memory
    remember("user", message);

    try {
      // Check if this is a complex request that needs the agent
      const lower = message.toLowerCase();
      const isComplexRequest = 
        lower.includes("create") ||
        lower.includes("build") ||
        lower.includes("setup") ||
        lower.includes("start project") ||
        lower.includes("init") ||
        lower.includes("install and") ||
        lower.includes("run and then");
      
      // For complex multi-step requests, use the agent
      if (isComplexRequest && this.context.mode !== "explain") {
        const agentResult = await this.runAgent(message);
        return {
          ok: agentResult.success,
          intent: "agent-execution",
          output: agentResult,
          error: agentResult.success ? undefined : "One or more steps failed"
        };
      }

      // Interpret the message
      const task = await rinaBrain.interpret(message);

      // If no tool needed, just respond
      if (task.tool === "none") {
        const response: RinaResponse = {
          ok: true,
          intent: task.intent,
          output: {
            type: "chat",
            message: `I understand you want to: ${task.intent}. How can I help you with this?`
          }
        };
        remember("rina", JSON.stringify(response.output));
        return response;
      }

      // Safety check before execution
      if (task.tool === "terminal" && task.input.command) {
        const safety = safetyCheck(task.input.command as string, this.context.mode);
        
        if (safety.blocked) {
          const response: RinaResponse = {
            ok: false,
            intent: task.intent,
            error: safety.reason || "Command blocked for safety",
            blocked: true
          };
          remember("rina", JSON.stringify({ error: response.error }));
          return response;
        }

        if (safety.requiresConfirmation && this.context.mode === "assist") {
          const response: RinaResponse = {
            ok: false,
            intent: task.intent,
            error: safety.reason || "Confirmation required",
            requiresConfirmation: true
          };
          remember("rina", JSON.stringify({ confirmation: response.requiresConfirmation }));
          return response;
        }
      }

      // Execute the task
      const result = await executeToolTask(task, this.context);

      // Store response in memory
      remember("rina", JSON.stringify(result));

      return {
        ok: result.ok,
        intent: task.intent,
        output: result.output,
        error: result.error,
        blocked: result.blocked,
        requiresConfirmation: result.requiresConfirmation
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      remember("rina", JSON.stringify({ error: errorMsg }));
      
      return {
        ok: false,
        intent: "error",
        error: errorMsg
      };
    }
  }

  /**
   * Execute a confirmed command (after user confirmation)
   */
  async executeConfirmed(command: string): Promise<TinaResponse> {
    // Override mode to auto for confirmed execution
    const originalMode = this.context.mode;
    this.context.mode = "auto";
    
    try {
      const task: RinaTask = {
        intent: "terminal-command-confirmed",
        tool: "terminal",
        input: { command, mode: "auto" }
      };

      const result = await executeToolTask(task, this.context);
      
      return {
        ok: result.ok,
        intent: task.intent,
        output: result.output,
        error: result.error
      };
    } finally {
      this.context.mode = originalMode;
    }
  }

  /**
   * Get conversation context for AI
   */
  getContext(): string {
    return getMemoryContext();
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return getMemoryStats();
  }

  /**
   * Clear conversation memory
   */
  clearSession(): void {
    clearMemory();
  }

  /**
   * Get available tools
   */
  getTools(): string[] {
    return getAvailableTools();
  }

  /**
   * Run the agent for complex multi-step tasks
   */
  async runAgent(goal: string): Promise<AgentResult> {
    return agentLoop.run(goal);
  }

  /**
   * Run agent with adaptive reflection-based retry
   * In auto mode, automatically retries failed steps
   */
  async runAgentWithReflection(goal: string): Promise<AgentResult> {
    const result = await agentLoop.run(goal);
    
    // Log reflection insights
    if (result.reflection) {
      console.log("Reflection Insights:", result.reflection.insights.map(i => i.feedback).flat());
      console.log("Recommended Next Actions:", result.reflection.nextActions);
      
      // Auto-retry in auto mode if there are failures
      if (this.context.mode === "auto" && result.reflection.nextActions.some(a => a.includes("Retry"))) {
        console.log("Rina: Automatically retrying failed steps in auto mode...");
        
        // Reset failure counts for retry
        for (const step of result.plan.steps) {
          reflectionEngine.resetFailures(step.id);
        }
        
        return agentLoop.run(goal);
      }
    }
    
    return result;
  }

  /**
   * Subscribe to agent events
   */
  onAgentEvent(callback: AgentEventCallback): () => void {
    return agentLoop.onEvent(callback);
  }

  /**
   * Check if agent is running
   */
  isAgentRunning(): boolean {
    return agentLoop.getRunning();
  }

  /**
   * Get agent progress
   */
  getAgentProgress(): { current: number; total: number; percentage: number } {
    return agentLoop.getProgress();
  }
}

/**
 * Response type from Rina
 */
export interface RinaResponse {
  ok: boolean;
  intent: string;
  output?: unknown;
  error?: string;
  blocked?: boolean;
  requiresConfirmation?: boolean;
}

// Alias for executeConfirmed (was a typo in original)
export type TinaResponse = RinaResponse;

// Singleton instance
export const rinaController = new RinaController();

/**
 * Convenience function for handling messages
 */
export async function handleRinaMessage(message: string): Promise<RinaResponse> {
  return rinaController.handleMessage(message);
}

/**
 * Convenience function to execute a confirmed command
 */
export async function executeConfirmedCommand(command: string): Promise<RinaResponse> {
  return rinaController.executeConfirmed(command);
}
