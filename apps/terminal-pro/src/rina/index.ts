/**
 * Rina OS - Main Export File
 *
 * Central export point for all Rina OS modules.
 * This enables convenient imports like:
 *   import { rinaController, rinaPersona, handleRinaMessage } from "../../src/rina/index.js";
 *
 * Additive architecture - does not modify existing core functionality.
 */

// Controller and main entry points
export {
  RinaController,
  rinaController,
  handleRinaMessage,
  executeConfirmedCommand,
  type RinaResponse,
  type TinaResponse,
} from './rina-controller.js'

// Brain and intent interpretation
export { rinaBrain, type RinaTask, type ExecutionMode } from './brain.js'

// Personality module
export { RinaPersona, rinaPersona, type RinaMood, type RinaPersonaContext } from './personality.js'

// Agent and planning
export { agentLoop, type AgentResult, type AgentEvent, type AgentEventCallback } from './agent-loop.js'
export { taskPlanner, type RinaPlan, type RinaPlanStep } from './planner/task-planner.js'
export { taskQueue, type StepExecutionResult, type TaskQueueState } from './executor/task-queue.js'

// Reflection engine
export { reflectionEngine, type ReflectionResult, type ReflectionInsight } from './reflection.js'

// Memory - session based
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
  searchMemory,
  type MemoryEntry,
  type MemoryRole,
} from './memory/session.js'

// Memory - new layered system
export {
  memoryManager,
  conversationMemory,
  workspaceMemory,
  longtermMemory,
  type MemoryStats,
} from './memory/memory-manager.js'
export { ConversationMemory, type ConversationEntry } from './memory/conversation.js'
export { WorkspaceMemory, type WorkspaceMemoryData, type CommandRecord } from './memory/workspace.js'
export { LongTermMemory, type LongTermMemoryData } from './memory/longterm.js'

// Legacy persistent memory (used by smoke-test)
export { rinaMemory } from './memory/persistent-memory.js'

// Safety
export { safetyCheck, type SafetyCheckResult } from './safety.js'

// Tools
export {
  getAvailableTools,
  executeToolTask,
  getTool,
  findToolForTask,
  type ToolContext,
  type ToolResult,
  type RinaTool,
  type ValidationResult,
} from './tools/registry.js'

// Tools - individual modules (for direct access)
export { terminalTool } from './tools/terminal.js'
export { filesystemTool } from './tools/filesystem.js'
export { systemTool } from './tools/system.js'
export { gitTool, gitTools } from './tools/git.js'
export { dockerTool, dockerTools } from './tools/docker.js'

// Dev diagnostics
export { initDevDiagnostics } from './dev-diagnostics.js'

// Repair planner (Autonomous Dev Fix)
export {
  scanProjectContext,
  buildRepairPlan,
  executeRepairPlan,
  formatRepairPlan,
  type ProjectContext,
  type RepairPlan,
  type RepairStep,
} from './repair-planner.js'

// Error explainer
export { explainError, explainErrorPattern } from './error-explainer.js'
