/**
 * Rina OS Control Layer - Main Export
 * 
 * This is the public API for the Rina OS Control Layer.
 * Import this file to use Rina OS in your application.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

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

// Main controller
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
