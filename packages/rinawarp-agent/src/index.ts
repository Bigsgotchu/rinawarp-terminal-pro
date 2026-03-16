/**
 * @rinawarp/agent
 *
 * Agent runtime, types, and skills for RinaWarp.
 */

// Types
export type {
  ToolName,
  ToolCall,
  AgentPlan,
  StepResult,
  PlanResult,
  ConfirmFn,
  LoggerFn,
  UserContext,
  WorkspaceContext,
} from './types.js'

// Runtime
export { runPlan, createConfirmationMessage, validatePlan, estimatePlanRisk, type RuntimeOptions } from './runtime.js'

// Skills
export { planHotComputer, type DiagnosticResult, parseDiagnostics } from './skills/hot-computer.js'
