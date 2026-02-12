/**
 * RinaWarp Terminal Pro - Warp-like UI Implementation Plan
 * =========================================================
 * 
 * This document provides detailed pseudocode for implementing a Warp-inspired
 * block-based terminal UI with Rina AI assistant integration.
 */

// ============================================================================
// PART 1: BLOCK MODEL - Source of Truth
// ============================================================================

export namespace BlockModel {
  // Block types representing different content in the timeline
  export type BlockType = 
    | "user"        // User input/prompt
    | "assistant"   // Rina's response
    | "plan"        // Plan preview (before execution)
    | "step"        // Individual execution step
    | "outcome"     // Final result/execution report
    | "error";      // Error state

  // Block lifecycle status
  export type BlockStatus = 
    | "queued"      // Created but not started
    | "running"     // Currently executing
    | "ok"          // Completed successfully
    | "failed"      // Execution failed
    | "cancelled";  // User cancelled

  // Main Block interface
  export interface Block {
    // Identity
    id: string;
    type: BlockType;
    status: BlockStatus;
    createdAt: number;
    parentBlockId?: string;     // For nesting steps under plans

    // Display content
    title?: string;
    markdown?: string;          // Rich text content
    icon?: string;              // Emoji or icon identifier

    // Execution metadata
    tool?: string;              // "terminal.write", "deps.install", "file.edit"
    stepId?: string;
    streamId?: string;          // For live stdout/stderr streaming

    // Streaming buffer (accumulated during execution)
    stdout?: string[];
    stderr?: string[];
    exitCode?: number;

    // Plan/Report attachments
    plan?: AgentPlan;
    report?: ExecutionReport;

    // Risk assessment
    riskLevel?: "safe" | "medium" | "high";
    confirmationRequired?: boolean;
  }

  // Block creation factory
  export function createBlock(params: {
    type: BlockType;
    title?: string;
    markdown?: string;
    tool?: string;
    parentBlockId?: string;
  }): Block {
    return {
      id: generateUUID(),
      type: params.type,
      status: "queued",
      createdAt: Date.now(),
      parentBlockId: params.parentBlockId,
      title: params.title,
      markdown: params.markdown,
      tool: params.tool,
      stdout: [],
      stderr: [],
    };
  }
}

// ============================================================================
// PART 2: AGENT PLAN TYPES - Planning Phase (No Execution)
// ============================================================================

export namespace AgentPlan {
  export interface PlanStep {
    stepId: string;
    tool: string;               // Maps to tool registry
    input: Record<string, unknown>;
    riskLevel: "safe" | "medium" | "high";
    confirmationScope?: "project" | "system" | "global";
    estimatedDuration?: number; // ms
    description?: string;
  }

  export interface AgentPlan {
    id: string;
    intent: string;             // Original user intent
    reasoning: string;          // Why this plan makes sense
    steps: PlanStep[];
    estimatedTotalTime?: number;
    riskSummary?: {
      highImpactSteps: number;
      confirmationNeeded: boolean;
    };
  }

  // Plan validation
  export function validatePlan(plan: AgentPlan): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.steps.length) {
      errors.push("Plan must have at least one step");
    }

    const highImpactCount = plan.steps.filter(s => s.riskLevel === "high").length;
    if (highImpactCount > 3) {
      warnings.push("Plan has many high-impact steps - consider breaking it up");
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ============================================================================
// PART 3: IPC SURFACE - Renderer ↔ Main Process Communication
// ============================================================================

export namespace IPCSurface {
  // Channel constants
  const CHANNELS = {
    // Plan generation (no execution)
    AGENT_PLAN: "rina:agent:plan",
    
    // Plan execution with streaming
    EXECUTE_PLAN: "rina:executePlanStream",
    
    // Streaming events (already exist)
    STREAM_CHUNK: "rina:stream:chunk",
    STREAM_END: "rina:stream:end",
    
    // New: Plan lifecycle events
    PLAN_STEP_START: "rina:plan:stepStart",
    PLAN_STEP_END: "rina:plan:stepEnd",
    PLAN_PROGRESS: "rina:plan:progress",
  } as const;

  // Request: Generate a plan (planner-only, safe)
  export interface PlanRequest {
    intentText: string;
    projectRoot: string;
    context?: {
      recentCommands?: string[];
      openFiles?: string[];
      gitBranch?: string;
    };
  }

  // Request: Execute a plan sequentially with streaming
  export interface ExecutePlanRequest {
    plan: AgentPlan;
    projectRoot: string;
    confirmed?: boolean;        // User confirmed high-impact steps
    confirmationText?: string;  // User's confirmation statement
  }

  // Response: Plan generation result
  export interface PlanResponse {
    plan: AgentPlan;
    suggestions?: string[];     // Alternative approaches
  }

  // Streaming event: New chunk of output
  export interface StreamChunkEvent {
    streamId: string;
    stream: "stdout" | "stderr";
    data: string;
    timestamp: number;
  }

  // Streaming event: Step/stream completed
  export interface StreamEndEvent {
    streamId: string;
    ok: boolean;
    cancelled: boolean;
    error?: string;
    exitCode?: number;
    report?: ExecutionReport;
  }

  // Plan lifecycle events
  export interface StepStartEvent {
    runId: string;
    streamId: string;
    step: AgentPlan.PlanStep;
    stepIndex: number;
    totalSteps: number;
  }

  export interface StepEndEvent {
    runId: string;
    streamId: string;
    stepId: string;
    ok: boolean;
    duration: number;
  }

  export interface PlanProgressEvent {
    runId: string;
    completedSteps: number;
    totalSteps: number;
    currentStepDescription: string;
  }
}

// ============================================================================
// PART 4: MAIN PROCESS - executePlanStream Implementation
// ============================================================================

export namespace MainProcess {
  /**
   * Executes steps sequentially using secure startStreamingStepViaEngine().
   * Creates a streamId per step for Warp-like block streaming.
   */
  export async function handleExecutePlanStream(
    event: Electron.IpcMainInvokeEvent,
    args: IPCSurface.ExecutePlanRequest
  ): Promise<{ runId: string }> {
    const { plan, projectRoot, confirmed, confirmationText } = args;
    
    const runId = generateRunId();
    let totalDuration = 0;

    // Send initial progress
    event.sender.send(IPCSurface.CHANNELS.PLAN_PROGRESS, {
      runId,
      completedSteps: 0,
      totalSteps: plan.steps.length,
      currentStepDescription: "Starting plan execution...",
    });

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const streamId = generateStreamId();
      const stepStartTime = Date.now();

      // Notify renderer: new step block starting
      event.sender.send(IPCSurface.CHANNELS.PLAN_STEP_START, {
        runId,
        streamId,
        step,
        stepIndex: i,
        totalSteps: plan.steps.length,
      } satisfies IPCSurface.StepStartEvent);

      try {
        // Convert PlanStep to ToolStep expected by startStreamingStepViaEngine
        const toolStep: ToolStep = {
          id: step.stepId ?? generateUUID(),
          tool: mapToolName(step.tool),
          command: step.input.command as string ?? "",
          cwd: step.input.cwd as string ?? projectRoot,
          risk: step.riskLevel === "high" ? "high-impact" : "safe-write",
        };

        // Execute with streaming through the secure engine
        await securityEngine.startStreamingStepViaEngine({
          webContents: event.sender,
          streamId,
          step: toolStep,
          confirmed: confirmed ?? false,
          confirmationText: confirmationText ?? "",
          projectRoot,
        });

        // Step completed successfully
        const stepDuration = Date.now() - stepStartTime;
        totalDuration += stepDuration;

        event.sender.send(IPCSurface.CHANNELS.PLAN_STEP_END, {
          runId,
          streamId,
          stepId: step.stepId,
          ok: true,
          duration: stepDuration,
        } satisfies IPCSurface.StepEndEvent);

      } catch (error) {
        // Step failed - decide whether to continue or stop
        const stepDuration = Date.now() - stepStartTime;
        
        event.sender.send(IPCSurface.CHANNELS.PLAN_STEP_END, {
          runId,
          streamId,
          stepId: step.stepId,
          ok: false,
          duration: stepDuration,
        } satisfies IPCSurface.StepEndEvent);

        // Policy: Stop on first failure for build fixes
        if (shouldStopOnFailure(step)) {
          break;
        }
      }

      // Update progress
      event.sender.send(IPCSurface.CHANNELS.PLAN_PROGRESS, {
        runId,
        completedSteps: i + 1,
        totalSteps: plan.steps.length,
        currentStepDescription: plan.steps[i + 1]?.description ?? "Complete",
      });
    }

    return { runId };
  }

  // Helper: Determine if execution should stop on step failure
  function shouldStopOnFailure(step: AgentPlan.PlanStep): boolean {
    const criticalTools = ["terminal.write", "file.edit", "git.commit"];
    return criticalTools.includes(step.tool);
  }

  // Helper: Map tool names between layers
  function mapToolName(tool: string): string {
    const mapping: Record<string, string> = {
      "terminal.write": "terminal",
      "deps.install": "npm",
      "file.edit": "editor",
      "git.commit": "git",
    };
    return mapping[tool] ?? tool;
  }
}

// ============================================================================
// PART 5: BUILD FIXER PLAYBOOK - v1 Implementation
// ============================================================================

export namespace BuildFixer {
  /**
   * Generates a plan to detect and fix broken builds.
   * This is PLANNING-ONLY - no execution happens here.
   */
  export async function planFixBrokenBuild(
    intentText: string,
    projectRoot: string
  ): Promise<AgentPlan.AgentPlan> {
    const steps: AgentPlan.PlanStep[] = [];

    // Step 1: Detect ecosystem (read-only, safe)
    steps.push({
      stepId: "detect-ecosystem",
      tool: "terminal.read",
      input: {
        commands: [
          // Check for Node.js
          { command: "test -f package.json && echo 'node' || echo 'no-node'"},
          // Check for Python
          { command: "test -f pyproject.toml -o -f requirements.txt && echo 'python' || echo 'no-python'"},
          // Check for Rust
          { command: "test -f Cargo.toml && echo 'rust' || echo 'no-rust'"},
          // Check for Go
          { command: "test -f go.mod && echo 'go' || echo 'no-go'"},
        ],
        cwd: projectRoot,
      },
      riskLevel: "safe",
      description: "Detect project ecosystem",
    });

    // Step 2: Inspect package.json / config files (read-only)
    steps.push({
      stepId: "inspect-config",
      tool: "file.read",
      input: {
        patterns: ["package.json", "pyproject.toml", "Cargo.toml", "go.mod"],
        cwd: projectRoot,
      },
      riskLevel: "safe",
      description: "Read project configuration files",
    });

    // Step 3: Check git status (read-only)
    steps.push({
      stepId: "check-git",
      tool: "git.status",
      input: { cwd: projectRoot },
      riskLevel: "safe",
      description: "Check git working tree status",
    });

    // Step 4: Run canonical build command (depends on ecosystem)
    // This step will be dynamically generated based on detection
    const buildStep = createBuildStep(projectRoot);
    if (buildStep) {
      steps.push(buildStep);
    }

    // Step 5: If build fails, apply targeted fix (conditional, high-impact)
    steps.push({
      stepId: "apply-fix",
      tool: "terminal.write",
      input: {
        // Placeholder - actual fix determined by analysis
        command: "echo 'Fix will be determined by build output analysis'",
        cwd: projectRoot,
      },
      riskLevel: "medium",
      confirmationScope: "project",
      description: "Apply identified fix",
    });

    // Step 6: Re-run build for verification (mandatory)
    steps.push({
      stepId: "verify-build",
      tool: "terminal.write",
      input: {
        command: "echo 'Re-run build command for verification'",
        cwd: projectRoot,
      },
      riskLevel: "safe",
      description: "Verify build succeeds after fix",
    });

    return {
      id: generateUUID(),
      intent: intentText,
      reasoning: `
        I detected your project structure, identified the correct build command
        for your ecosystem, and will run it to diagnose the failure. If there's
        an error, I'll apply the smallest possible fix and re-run to verify.
      `.trim(),
      steps,
      estimatedTotalTime: 120000, // 2 minutes estimate
      riskSummary: {
        highImpactSteps: 1, // The apply-fix step
        confirmationNeeded: true,
      },
    };
  }

  function createBuildStep(projectRoot: string): AgentPlan.PlanStep | null {
    // Heuristic: detect and return appropriate build step
    // In production, this would be determined by Step 1-2 results
    
    return {
      stepId: "run-build",
      tool: "terminal.write",
      input: {
        command: "npm run build",
        cwd: projectRoot,
      },
      riskLevel: "safe",
      description: "Run build command",
    };
  }
}

// ============================================================================
// PART 6: RENDERER - Block Timeline Component (Pseudocode)
// ============================================================================

export namespace Renderer {
  export class BlockTimeline {
    private blocks: Map<string, BlockModel.Block> = new Map();
    private activeStreamIds: Set<string> = new Set();
    private planExecutionMode: boolean = false;

    // Add a new block to the timeline
    addBlock(block: BlockModel.Block): void {
      this.blocks.set(block.id, block);
      this.renderBlock(block);
    }

    // Update block state and re-render
    updateBlock(blockId: string, updates: Partial<BlockModel.Block>): void {
      const block = this.blocks.get(blockId);
      if (!block) return;

      Object.assign(block, updates);
      this.renderBlock(block);
    }

    // Append streaming output to a block
    appendStreamOutput(streamId: string, stream: "stdout" | "stderr", data: string): void {
      const block = this.findBlockByStreamId(streamId);
      if (!block) return;

      if (stream === "stdout") {
        block.stdout?.push(data);
      } else {
        block.stderr?.push(data);
      }

      this.renderBlockStreamContent(block);
    }

    // Handle stream completion
    handleStreamEnd(streamId: string, event: IPCSurface.StreamEndEvent): void {
      this.activeStreamIds.delete(streamId);
      const block = this.findBlockByStreamId(streamId);
      if (!block) return;

      block.status = event.ok ? "ok" : "failed";
      block.exitCode = event.exitCode;
      block.report = event.report;

      this.renderBlock(block);
    }

    // Generate a plan preview block (user sees this before execution)
    createPlanPreviewBlock(plan: AgentPlan.AgentPlan): BlockModel.Block {
      const block = BlockModel.createBlock({
        type: "plan",
        title: "Execution Plan",
        markdown: this.formatPlanAsMarkdown(plan),
      });

      block.plan = plan;
      block.riskLevel = plan.riskSummary?.highImpactSteps ? "medium" : "safe";

      return block;
    }

    // Format plan for display
    private formatPlanAsMarkdown(plan: AgentPlan.AgentPlan): string {
      const stepsList = plan.steps
        .map((step, i) => {
          const riskIcon = step.riskLevel === "high" ? "⚠️ " : "";
          const confirmNote = step.confirmationScope ? " *(confirmation required)*" : "";
          return `${i + 1}. ${riskIcon}${step.description}${confirmNote}`;
        })
        .join("\n");

      return `
### ${plan.intent}

**Reasoning:** ${plan.reasoning}

**Estimated time:** ${Math.round((plan.estimatedTotalTime ?? 0) / 1000)}s

---

### Steps

${stepsList}

---
${plan.riskSummary?.highImpactSteps ? "⚠️ Some steps require your confirmation" : "✅ All steps are safe to run"}
      `.trim();
    }

    // Find block by associated streamId
    private findBlockByStreamId(streamId: string): BlockModel.Block | undefined {
      for (const block of this.blocks.values()) {
        if (block.streamId === streamId) {
          return block;
        }
      }
      return undefined;
    }

    // Render block to DOM (framework-agnostic pseudocode)
    private renderBlock(block: BlockModel.Block): void {
      // This would be implemented in React/Vue/Svelte
      console.log(`[Renderer] Render block ${block.id}: ${block.type}`);
      // renderBlockToDOM(block);
    }

    private renderBlockStreamContent(block: BlockModel.Block): void {
      // Update only the streaming content portion
      console.log(`[Renderer] Update stream content for block ${block.id}`);
      // updateBlockStreamContentDOM(block);
    }
  }
}

// ============================================================================
// PART 7: UX FLOW - "Fix my broken build" Example
// ============================================================================

export namespace UXFlow {
  /**
   * Complete UX flow for: User submits "fix my broken build"
   */
  export async function handleFixBrokenBuild(
    intentText: string,
    projectRoot: string
  ): Promise<void> {
    const timeline = new Renderer.BlockTimeline();

    // === BLOCK 1: User Input ===
    const userBlock = BlockModel.createBlock({
      type: "user",
      title: "User Input",
      markdown: intentText,
    });
    timeline.addBlock(userBlock);

    // === BLOCK 2: Rina Plan Preview ===
    // Call planner (NO execution happens here)
    const plan = await BuildFixer.planFixBrokenBuild(intentText, projectRoot);
    
    const planBlock = timeline.createPlanPreviewBlock(plan);
    timeline.addBlock(planBlock);

    // === WAIT FOR USER CONFIRMATION ===
    // UI shows "Run plan" button
    // User clicks "Run plan" or modifies the plan

    // === BLOCK 3-N: Step Execution Blocks ===
    // For each step in the plan, a block is created
    // Output streams in real-time to the step block
    // Each step block shows: title, streaming output, status

    // === BLOCK N+1: Outcome Block ===
    // Shows:
    // - Root cause analysis
    // - Changes made
    // - Build verification result
    // - "Save as workflow?" button
  }
}

// ============================================================================
// PART 8: TYPE EXPORTS FOR REFERENCE
// ============================================================================

// Utility types used throughout
type UUID = string;
type StreamId = string;
type RunId = string;

function generateUUID(): UUID {
  return crypto.randomUUID();
}

function generateStreamId(): StreamId {
  return `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateRunId(): RunId {
  return `run-${Date.now()}`;
}

// Execution report structure
export interface ExecutionReport {
  stepId: string;
  command: string;
  exitCode: number;
  duration: number;
  outputSummary: string;
  changes?: FileChange[];
}

export interface FileChange {
  path: string;
  type: "create" | "modify" | "delete";
  diff?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
