/**
 * Rina OS Control Layer - Task Queue
 * 
 * Manages multi-step task execution with progress tracking.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaPlan, RinaPlanStep } from "../planner/task-planner.js";
import type { RinaTask } from "../brain.js";
import { executeToolTask, type ToolContext, type ToolResult } from "../tools/registry.js";

/**
 * Result of executing a single step
 */
export type StepExecutionResult = {
  step: RinaPlanStep;
  result: ToolResult;
  success: boolean;
  error?: string;
  durationMs?: number;
};

/**
 * Task queue state
 */
export type TaskQueueState = {
  plan: RinaPlan | null;
  currentIndex: number;
  results: StepExecutionResult[];
  isRunning: boolean;
  isPaused: boolean;
};

/**
 * Task Queue - Manages execution of plan steps
 */
export class TaskQueue {
  private plan: RinaPlan | null = null;
  private currentIndex = 0;
  private results: StepExecutionResult[] = [];
  private isRunning = false;
  private isPaused = false;
  private context: ToolContext = { mode: "auto" };

  /**
   * Set the execution context
   */
  setContext(context: ToolContext): void {
    this.context = context;
  }

  /**
   * Load a plan into the queue
   */
  loadPlan(plan: RinaPlan): void {
    this.plan = plan;
    this.currentIndex = 0;
    this.results = [];
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Get current state
   */
  getState(): TaskQueueState {
    return {
      plan: this.plan,
      currentIndex: this.currentIndex,
      results: [...this.results],
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }

  /**
   * Check if there are more steps to execute
   */
  hasNext(): boolean {
    return this.plan !== null && this.currentIndex < this.plan.steps.length;
  }

  /**
   * Get current step number (1-indexed for display)
   */
  getCurrentStepNumber(): number {
    return this.currentIndex + 1;
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.plan?.steps.length || 0;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const total = this.getTotalSteps();
    if (total === 0) return 0;
    return Math.round((this.currentIndex / total) * 100);
  }

  /**
   * Get current step
   */
  getCurrentStep(): RinaPlanStep | null {
    if (!this.plan || this.currentIndex >= this.plan.steps.length) {
      return null;
    }
    return this.plan.steps[this.currentIndex];
  }

  /**
   * Execute the next step
   */
  async runNext(): Promise<{ done: boolean; stepResult?: StepExecutionResult }> {
    if (!this.hasNext() || this.isPaused) {
      return { done: true };
    }

    this.isRunning = true;
    const step = this.getCurrentStep()!;
    
    const startTime = Date.now();
    
    try {
      // Execute the step - convert plan step to task
      const task = {
        intent: step.description,
        tool: step.tool,
        input: step.input
      };
      const result = await executeToolTask(task, {
        ...this.context,
        mode: this.context.mode === "assist" ? "assist" : "auto"
      });

      const durationMs = Date.now() - startTime;

      const stepResult: StepExecutionResult = {
        step,
        result,
        success: result.ok,
        error: result.error,
        durationMs
      };

      this.results.push(stepResult);
      this.currentIndex++;

      this.isRunning = false;

      return {
        done: !this.hasNext(),
        stepResult
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      
      const stepResult: StepExecutionResult = {
        step,
        result: { ok: false, error: String(err) },
        success: false,
        error: String(err),
        durationMs
      };

      this.results.push(stepResult);
      this.currentIndex++;

      this.isRunning = false;

      return {
        done: !this.hasNext(),
        stepResult
      };
    }
  }

  /**
   * Run all remaining steps
   */
  async runAll(
    onStepComplete?: (result: StepExecutionResult) => void
  ): Promise<StepExecutionResult[]> {
    while (this.hasNext() && !this.isPaused) {
      const { stepResult } = await this.runNext();
      
      if (stepResult && onStepComplete) {
        onStepComplete(stepResult);
      }
    }

    return this.results;
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Reset the queue
   */
  reset(): void {
    this.currentIndex = 0;
    this.results = [];
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Skip current step
   */
  skipStep(): void {
    if (this.hasNext()) {
      this.currentIndex++;
    }
  }

  /**
   * Get all results
   */
  getResults(): StepExecutionResult[] {
    return [...this.results];
  }

  /**
   * Get summary
   */
  getSummary(): {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    progress: number;
  } {
    const total = this.getTotalSteps();
    const completed = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    return {
      total,
      completed,
      successful,
      failed,
      progress: this.getProgress()
    };
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();
