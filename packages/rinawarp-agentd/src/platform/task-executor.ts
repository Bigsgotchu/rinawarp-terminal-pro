/**
 * Task Executor
 * 
 * Problem #6: Multi-Step Dev Tasks
 * Executes sequences of commands with human approval.
 * 
 * "create react app" → [npx create-vite, npm install, npm install tailwind]
 * User confirms → execute step by step
 */

import { run } from "@rinawarp/tools/terminal";
import type { TerminalResult } from "@rinawarp/tools/terminal";

export interface TaskStep {
  id: number;
  command: string;
  description: string;
  status: "pending" | "approved" | "running" | "completed" | "failed" | "skipped";
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface TaskPlan {
  id: string;
  title: string;
  steps: TaskStep[];
  currentStep: number;
  status: "planning" | "awaiting_approval" | "running" | "completed" | "failed" | "cancelled";
}

export interface ExecutionListener {
  onStepStart?: (step: TaskStep) => void;
  onStepComplete?: (step: TaskStep, result: TerminalResult) => void;
  onStepFail?: (step: TaskStep, error: string) => void;
  onApprovalRequired?: (step: TaskStep) => Promise<boolean>;
  onTaskComplete?: (task: TaskPlan) => void;
  onTaskFail?: (task: TaskPlan, error: string) => void;
}

/**
 * Create a multi-step task from natural language
 */
export function createTaskPlan(commands: string[], title: string): TaskPlan {
  const steps: TaskStep[] = commands.map((cmd, idx) => ({
    id: idx,
    command: cmd,
    description: `Step ${idx + 1}`,
    status: "pending",
  }));

  return {
    id: `task-${Date.now()}`,
    title,
    steps,
    currentStep: 0,
    status: "planning",
  };
}

/**
 * Execute a task plan with approval callbacks
 */
export async function executeTaskPlan(
  plan: TaskPlan,
  listener?: ExecutionListener,
  options?: {
    autoApproveLowRisk?: boolean;
    continueOnError?: boolean;
    cwd?: string;
  }
): Promise<TaskPlan> {
  const { autoApproveLowRisk = false, continueOnError = false, cwd = process.cwd() } = options || {};

  plan.status = "running";

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStep = i;
    
    // Check if we need approval BEFORE setting status to running
    const needsApproval = step.status === "pending";
    
    if (needsApproval && !autoApproveLowRisk) {
      plan.status = "awaiting_approval";
      
      // Request approval
      if (listener?.onApprovalRequired) {
        const approved = await listener.onApprovalRequired(step);
        if (!approved) {
          step.status = "skipped";
          plan.status = "cancelled";
          listener?.onTaskFail?.(plan, "User cancelled task");
          return plan;
        }
        step.status = "approved";
      }
    }
    
    // Now set to running
    step.status = "running";

    // Notify step start
    listener?.onStepStart?.(step);

    // Execute the command
    let commandStatus: TaskStep["status"] = "running";
    
    try {
      const result = await run(step.command, { cwd, timeoutMs: 120000 });
      
      step.output = result.stdout || "";
      step.error = result.stderr || "";
      step.exitCode = result.exitCode ?? undefined;

      if (result.exitCode === 0 || result.exitCode === null) {
        step.status = "completed";
        listener?.onStepComplete?.(step, result);
      } else {
        step.status = "failed";
        listener?.onStepFail?.(step, result.stderr || `Exit code: ${result.exitCode}`);
        
        if (!continueOnError) {
          plan.status = "failed";
          listener?.onTaskFail?.(plan, `Step ${i + 1} failed: ${step.command}`);
          return plan;
        }
      }
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : String(error);
      listener?.onStepFail?.(step, step.error);
      
      if (!continueOnError) {
        plan.status = "failed";
        listener?.onTaskFail?.(plan, `Step ${i + 1} failed: ${step.command}`);
        return plan;
      }
    }
  }

  // Check if all steps completed
  const failedSteps = plan.steps.filter(s => s.status === "failed");
  if (failedSteps.length > 0) {
    plan.status = "failed";
    listener?.onTaskFail?.(plan, `${failedSteps.length} steps failed`);
  } else {
    plan.status = "completed";
    listener?.onTaskComplete?.(plan);
  }

  return plan;
}

/**
 * Generate a preview of what will be executed
 */
export function previewTaskPlan(plan: TaskPlan): string {
  const lines = [
    `📋 Task: ${plan.title}`,
    "",
    "Steps:",
  ];

  for (const step of plan.steps) {
    const icon = step.status === "completed" ? "✅" 
               : step.status === "failed" ? "❌" 
               : step.status === "running" ? "🔄"
               : step.status === "skipped" ? "⏭️"
               : "⏳";
    
    lines.push(`${icon} ${step.id + 1}. ${step.command}`);
  }

  lines.push("");
  lines.push(`Total: ${plan.steps.length} steps`);

  return lines.join("\n");
}

/**
 * Format step output for display
 */
export function formatStepOutput(step: TaskStep): string {
  const lines = [
    `> ${step.command}`,
    "",
  ];

  if (step.output) {
    lines.push("Output:");
    lines.push(step.output.slice(0, 2000)); // Limit output
  }

  if (step.error) {
    lines.push("");
    lines.push("Error:");
    lines.push(step.error.slice(0, 1000));
  }

  lines.push("");
  lines.push(`Exit code: ${step.exitCode ?? "N/A"}`);

  return lines.join("\n");
}

/**
 * Abort a running task
 */
export function abortTask(plan: TaskPlan): TaskPlan {
  if (plan.status === "running" || plan.status === "awaiting_approval") {
    plan.status = "cancelled";
    
    // Mark remaining steps as skipped
    for (const step of plan.steps) {
      if (step.status === "pending" || step.status === "running") {
        step.status = "skipped";
      }
    }
  }
  
  return plan;
}
