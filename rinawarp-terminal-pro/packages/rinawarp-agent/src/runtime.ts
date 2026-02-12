/**
 * RinaWarp Agent Runtime
 * 
 * Core execution engine for running agent plans with safety checks.
 */

import type { 
  AgentPlan, 
  ToolCall, 
  PlanResult, 
  StepResult,
  ConfirmFn,
  LoggerFn,
  UserContext,
  WorkspaceContext 
} from "./types.ts";
import { 
  classifyRisk, 
  requiresConfirmation, 
  getRiskDescription,
  type RiskLevel 
} from "@rinawarp/safety";
import { run as runTerminal } from "@rinawarp/tools/terminal";

export interface RuntimeOptions {
  /** User confirmation callback for risky operations */
  confirm?: ConfirmFn;
  /** Logger for runtime events */
  logger?: LoggerFn;
  /** User context for personalized execution */
  userContext?: UserContext;
  /** Workspace context for tool execution */
  workspaceContext?: WorkspaceContext;
  /** Whether to abort on first error (default: true) */
  abortOnError?: boolean;
  /** Default timeout for commands in ms (default: 60000) */
  defaultTimeoutMs?: number;
}

/**
 * Execute an agent plan with safety checks and confirmation.
 * 
 * @param plan - The plan to execute
 * @param options - Runtime configuration options
 * @returns Promise resolving to the plan execution result
 */
export async function runPlan(
  plan: AgentPlan,
  options?: RuntimeOptions
): Promise<PlanResult> {
  const startTime = Date.now();
  const results: StepResult[] = [];
  
  const confirm = options?.confirm ?? (async () => true);
  const logger = options?.logger ?? (() => {});
  const abortOnError = options?.abortOnError ?? true;
  const timeoutMs = options?.defaultTimeoutMs ?? 60_000;
  
  logger(`Starting plan: ${plan.intent}`, "info");
  
  for (const step of plan.steps) {
    // Auto-classify risk if not provided
    const risk = step.risk ?? classifyRisk(step.command);
    const needsConfirmation = requiresConfirmation(risk);
    const riskDescription = getRiskDescription(step.command);
    
    const stepResult: StepResult = {
      step: { ...step, risk },
      ok: false,
    };
    
    // Log the step
    logger(`Executing: ${step.command}`, "info");
    
    // Check for confirmation requirement
    if (needsConfirmation) {
      logger(`Risk level: ${risk}${riskDescription ? ` - ${riskDescription}` : ""}`, "warn");
      
      const userApproved = await confirm({
        ...step,
        risk,
      });
      
      if (!userApproved) {
        stepResult.ok = false;
        stepResult.error = "user_cancelled";
        results.push(stepResult);
        logger("Execution cancelled by user", "warn");
        break;
      }
      
      logger("User approved the operation", "info");
    }
    
    // Execute the step based on tool type
    try {
      let output: string;
      
      switch (step.tool) {
        case "terminal":
          const terminalResult = await runTerminal(step.command, {
            cwd: options?.workspaceContext?.rootPath,
            timeoutMs,
          });
          output = terminalResult.stdout || terminalResult.stderr;
          if (terminalResult.exitCode !== 0 && !output) {
            throw new Error(`Command failed with exit code ${terminalResult.exitCode}`);
          }
          break;
          
        case "filesystem":
          // Filesystem operations would be handled here
          output = "filesystem operation completed";
          break;
          
        case "git":
          // Git operations would be handled here
          output = "git operation completed";
          break;
          
        default:
          throw new Error(`Tool not implemented: ${step.tool}`);
      }
      
      stepResult.ok = true;
      stepResult.output = output;
      results.push(stepResult);
      
      logger(`Step completed successfully`, "info");
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stepResult.ok = false;
      stepResult.error = errorMessage;
      results.push(stepResult);
      
      logger(`Step failed: ${errorMessage}`, "error");
      
      if (abortOnError) {
        break;
      }
    }
  }
  
  const executionTimeMs = Date.now() - startTime;
  const allSuccessful = results.every((r) => r.ok);
  const failedSteps = results.filter((r) => !r.ok);
  
  let summary: string;
  if (allSuccessful) {
    summary = `Successfully completed all ${results.length} steps`;
  } else {
    summary = `Completed ${results.length - failedSteps.length} of ${results.length} steps. ${failedSteps.length} failed.`;
  }
  
  logger(summary, allSuccessful ? "info" : "warn");
  
  return {
    plan,
    results,
    success: allSuccessful,
    summary,
    executionTimeMs,
  };
}

/**
 * Create a confirmation prompt message for a tool call.
 * 
 * @param step - The step to confirm
 * @param userName - Optional user name for personalization
 * @returns Formatted confirmation message
 */
export function createConfirmationMessage(
  step: ToolCall,
  userName?: string
): string {
  const greeting = userName ? `${userName}, ` : "";
  const toolInfo = `Tool: ${step.tool}`;
  const commandInfo = `Command: \`${step.command}\``;
  const riskInfo = `Risk level: ${step.risk ?? "unknown"}`;
  const description = step.description 
    ? `\n\nWhat this does: ${step.description}` 
    : "";
  
  const riskWarning = step.risk === "high" 
    ? "\n\n⚠️ This is a HIGH RISK operation. Please ensure you understand what this will do."
    : step.risk === "medium"
    ? "\n\n⚡ This operation requires elevated privileges or may affect system stability."
    : "";
  
  return `${greeting}I've prepared a ${step.risk ?? ""} risk operation:\n\n${toolInfo}\n${commandInfo}${description}${riskWarning}\n\nDo you want to proceed?`;
}

/**
 * Validate that a plan is well-formed.
 * 
 * @param plan - The plan to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePlan(plan: AgentPlan): string[] {
  const errors: string[] = [];
  
  if (!plan.intent?.trim()) {
    errors.push("Plan must have a non-empty intent");
  }
  
  if (!plan.summary?.trim()) {
    errors.push("Plan must have a non-empty summary");
  }
  
  if (!plan.steps || plan.steps.length === 0) {
    errors.push("Plan must have at least one step");
  }
  
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    
    if (!step.tool) {
      errors.push(`Step ${i + 1}: tool is required`);
    }
    
    if (!step.command?.trim()) {
      errors.push(`Step ${i + 1}: command is required`);
    }
  }
  
  return errors;
}

/**
 * Estimate the total risk level of a plan.
 * 
 * @param plan - The plan to analyze
 * @returns The highest risk level in the plan
 */
export function estimatePlanRisk(plan: AgentPlan): RiskLevel {
  let highest: RiskLevel = "low";
  
  for (const step of plan.steps) {
    const risk = step.risk ?? classifyRisk(step.command);
    if (risk === "high") return "high";
    if (risk === "medium") highest = "medium";
  }
  
  return highest;
}
