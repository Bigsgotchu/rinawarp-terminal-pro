/**
 * Rina OS Control Layer - Reflection & Self-Improvement Engine
 * 
 * Analyzes execution results, detects errors, optimizes steps,
 * and improves performance over time.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import { type RinaPlanStep } from "./planner/task-planner.js";
import { type StepExecutionResult } from "./executor/task-queue.js";
import { remember } from "./memory/session.js";

/**
 * Reflection insight after analyzing results
 */
export interface ReflectionInsight {
  stepId: string;
  stepDescription: string;
  feedback: string[];
  severity: "info" | "warning" | "error";
}

/**
 * Complete reflection result for a task
 */
export interface ReflectionResult {
  taskId: string;
  insights: ReflectionInsight[];
  nextActions: string[];
  success: boolean;
  performanceMetrics: {
    totalDurationMs: number;
    expectedDurationMs: number;
    stepsOverExpected: number;
  };
}

/**
 * ReflectionEngine observes executed tasks and suggests improvements
 */
export class ReflectionEngine {
  private failureCounts: Map<string, number> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();

  /**
   * Analyze a single step execution
   */
  async analyzeStep(step: RinaPlanStep, result: StepExecutionResult): Promise<ReflectionInsight> {
    const feedback: string[] = [];
    let severity: "info" | "warning" | "error" = "info";

    // 1. Detect errors
    if (!result.success && result.error) {
      feedback.push(`Step "${step.description}" failed with error: ${result.error}`);
      severity = "error";

      // Track failures
      const currentFailures = this.failureCounts.get(step.id) || 0;
      this.failureCounts.set(step.id, currentFailures + 1);

      // Suggest improvements for repeated failures
      if (currentFailures + 1 > 2) {
        feedback.push(`Step "${step.description}" has failed multiple times. Consider alternative tools or commands.`);
        severity = "warning";
      }
    }

    // 2. Track performance
    const duration = result.durationMs || 0;
    
    // Get expected duration from history or use default
    const history = this.performanceHistory.get(step.id) || [];
    const avgDuration = history.length > 0 
      ? history.reduce((a, b) => a + b, 0) / history.length 
      : 5000; // Default 5 seconds

    // Update performance history
    if (duration > 0) {
      history.push(duration);
      if (history.length > 10) history.shift(); // Keep last 10 entries
      this.performanceHistory.set(step.id, history);
    }

    // Warn if significantly slower than average
    if (duration > avgDuration * 1.5 && duration > 0) {
      feedback.push(`Step "${step.description}" took longer than expected (${duration}ms vs avg ${Math.round(avgDuration)}ms).`);
      if (severity !== "error") severity = "warning";
    }

    // 3. Success feedback
    if (result.success && feedback.length === 0) {
      feedback.push(`Step "${step.description}" completed successfully.`);
    }

    return {
      stepId: step.id,
      stepDescription: step.description,
      feedback,
      severity
    };
  }

  /**
   * Reflect on an entire task execution
   */
  async reflectOnTask(taskId: string, steps: RinaPlanStep[], results: StepExecutionResult[]): Promise<ReflectionResult> {
    const insights: ReflectionInsight[] = [];
    let totalDuration = 0;
    let expectedDuration = 0;
    let stepsOverExpected = 0;

    // Analyze each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const result = results[i] || { 
        step, 
        result: { ok: false, error: "No result" },
        success: false, 
        error: "No result",
        durationMs: 0 
      };
      
      const insight = await this.analyzeStep(step, result);
      insights.push(insight);

      // Calculate metrics
      const duration = result.durationMs || 0;
      totalDuration += duration;
      
      const history = this.performanceHistory.get(step.id) || [];
      const avgDuration = history.length > 0 
        ? history.reduce((a, b) => a + b, 0) / history.length 
        : 5000;
      
      expectedDuration += avgDuration;
      if (duration > avgDuration * 1.5 && duration > 0) {
        stepsOverExpected++;
      }
    }

    // 4. Suggest next actions based on insights
    const nextActions: string[] = [];
    const hasErrors = insights.some(i => i.severity === "error");
    const hasWarnings = insights.some(i => i.severity === "warning");

    if (hasErrors) {
      nextActions.push(`Retry failed steps, or switch to assist mode for task ${taskId}`);
      nextActions.push("Review error messages and fix underlying issues before retrying");
    }

    if (hasWarnings && !hasErrors) {
      nextActions.push(`Task ${taskId} completed but with warnings. Consider optimizing for better performance.`);
    }

    if (!hasErrors && !hasWarnings) {
      nextActions.push(`Task ${taskId} executed successfully. Consider optimizing steps for speed.`);
    }

    // Store reflection in memory
    remember("system", JSON.stringify({
      type: "reflection",
      taskId,
      insights: insights.map(i => i.feedback),
      nextActions
    }));

    return {
      taskId,
      insights,
      nextActions,
      success: !hasErrors,
      performanceMetrics: {
        totalDurationMs: totalDuration,
        expectedDurationMs: expectedDuration,
        stepsOverExpected
      }
    };
  }

  /**
   * Get failure count for a step
   */
  getFailureCount(stepId: string): number {
    return this.failureCounts.get(stepId) || 0;
  }

  /**
   * Reset failure tracking for a step (e.g., after successful retry)
   */
  resetFailures(stepId: string): void {
    this.failureCounts.delete(stepId);
  }

  /**
   * Clear all failure and performance history
   */
  clearHistory(): void {
    this.failureCounts.clear();
    this.performanceHistory.clear();
  }

  /**
   * Get performance statistics for a step
   */
  getPerformanceStats(stepId: string): { avgDuration: number; samples: number } | null {
    const history = this.performanceHistory.get(stepId);
    if (!history || history.length === 0) return null;

    return {
      avgDuration: history.reduce((a, b) => a + b, 0) / history.length,
      samples: history.length
    };
  }
}

// Singleton instance
export const reflectionEngine = new ReflectionEngine();
