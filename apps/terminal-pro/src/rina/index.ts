/**
 * Rina OS Control Layer - Main Export
 * 
 * This is the public API for the Rina OS Control Layer.
 * Import this file to use Rina OS in your application.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import { rinaController } from "./rina-controller.js";
import { rinaPersona, type RinaPersonaContext, type RinaMood } from "./personality.js";

// Brain - Intent interpretation
export { rinaBrain, type RinaTask, type ExecutionMode } from "./brain.js";

// Safety - Execution guardrails
export { 
  safetyCheck, 
  isCommandBlocked, 
  requiresConfirmation,
  getExecutionPolicy, 
  setExecutionPolicy, 
  resetExecutionPolicy,
  type SafetyCheckResult,
  type ExecutionPolicy
} from "./safety.js";

// Memory - Session memory
export { 
  remember, 
  getMemory, 
  getMemoryByRole, 
  getRecentMemory, 
  getLastUserMessage,
  getLastRinaResponse,
  clearMemory, 
  getMemoryContext, 
  getMemoryStats,
  type MemoryEntry,
  type MemoryRole
} from "./memory/session.js";

// Planner
export {
  taskPlanner,
  type RinaPlan,
  type RinaPlanStep
} from "./planner/task-planner.js";

// Task Queue
export {
  taskQueue,
  type TaskQueueState,
  type StepExecutionResult
} from "./executor/task-queue.js";

// Agent Loop
export {
  agentLoop,
  type AgentResult,
  type AgentEvent,
  type AgentEventCallback
} from "./agent-loop.js";

// Tools - Tool registry
export { 
  RinaTools, 
  getTool, 
  getAvailableTools, 
  findToolForTask, 
  executeToolTask,
  type RinaTool,
  type ToolContext,
  type ToolResult,
  type ValidationResult
} from "./tools/registry.js";

// Terminal tool
export { terminalTool } from "./tools/terminal.js";

// Filesystem tool  
export { filesystemTool } from "./tools/filesystem.js";

// System tool
export { systemTool } from "./tools/system.js";

// Main controller - re-export from rina-controller
export { 
  rinaController, 
  handleRinaMessage, 
  executeConfirmedCommand,
  type RinaController,
  type RinaResponse 
} from "./rina-controller.js";

// Reflection Engine
export {
  reflectionEngine,
  type ReflectionInsight,
  type ReflectionResult
} from "./reflection.js";

// Personality - re-export from personality module
export {
  rinaPersona,
  type RinaPersonaContext,
  type RinaMood
} from "./personality.js";

/**
 * Handle a message from the user - main entry point
 * Combines personality, chat responses, and agent execution
 * 
 * @deprecated Use handleRinaMessage from rina-controller instead
 */
export async function handleRinaMessageWithPersonality(
  message: string, 
  context?: RinaPersonaContext
): Promise<import("./rina-controller.js").RinaResponse> {
  // Use provided context or get from persona
  context = context || rinaPersona.getContext();
  
  // Check if this is a command (needs agent execution)
  const isCommand = /(run|create|build|setup|init|install|start)/i.test(message);

  if (isCommand) {
    // Use agent for task execution
    const result = await rinaController.runAgent(message);
    
    // Check if we need confirmation for retry
    const needsRetry = result.reflection?.nextActions.some((a) => 
      a.includes("Retry")
    );

    return {
      ok: result.success,
      intent: "agent-execution",
      output: {
        type: "agent",
        text: `Rina (mood: ${context.mood}): Task executed. See reflection for details.`,
        reflection: result.reflection
      },
      error: result.success ? undefined : "One or more steps failed",
      requiresConfirmation: needsRetry && rinaController.getMode() === "assist"
    };
  }

  // Chat response
  const chatResponse = getChatReply(message, context);
  
  return {
    ok: true,
    intent: "chat",
    output: {
      type: "chat",
      text: `Rina (mood: ${context.mood}): ${chatResponse}`
    }
  };
}

/**
 * Generate a chat reply based on mood
 */
function getChatReply(message: string, ctx: RinaPersonaContext): string {
  const lowerMessage = message.toLowerCase();
  
  switch (ctx.mood) {
    case "playful":
      return `Haha! I see you said: "${message}". 😄 What else can I help you with?`;
    case "curious":
      return `Interesting! "${message}" — tell me more about what you'd like to do? 🤔`;
    case "helpful":
    default:
      return `Got it! "${message}" — I can help you with that. Would you like me to execute any commands?`;
  }
}
