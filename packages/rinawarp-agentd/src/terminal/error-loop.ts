/**
 * Agent Error Loop
 * 
 * Self-healing command execution system.
 * When a command fails, the agent:
 * 1. Analyzes the error using AI
 * 2. Suggests corrective commands
 * 3. Optionally auto-retries with fixes
 * 4. Reports final status
 * 
 * This enables autonomous error recovery without user intervention.
 */

import { getAiConfig, streamChat, type StreamChunk, type AiConfig } from "../ai/client.js";
import { explainError, type ErrorContext, type ErrorExplanation } from "../platform/error-explainer.js";
import type { LLMConfig } from "../platform/llm.js";
import { BlockManager, CommandBlock, getBlockManager } from "./blocks.js";
import { PtyTerminal, type PtyExit } from "./pty.js";

/**
 * Error loop configuration
 */
export interface ErrorLoopConfig {
  /** Maximum retry attempts (0 = no retry) */
  maxRetries: number;
  /** Whether to auto-execute suggested fixes */
  autoRetry: boolean;
  /** Whether to use streaming for AI analysis */
  streaming: boolean;
  /** Callback for when error analysis is complete */
  onAnalysis?: (explanation: ErrorExplanation) => void;
  /** Callback for when a retry is about to execute */
  onRetry?: (attempt: number, command: string) => void;
  /** Callback for when command succeeds after fixes */
  onRecovered?: (originalCommand: string, fixedCommand: string) => void;
  /** Callback for when all retries exhausted */
  onExhausted?: (originalCommand: string, attempts: ErrorExplanation[]) => void;
}

/**
 * Default error loop configuration
 */
export const DEFAULT_ERROR_LOOP_CONFIG: ErrorLoopConfig = {
  maxRetries: 2,
  autoRetry: false,
  streaming: true,
};

/**
 * Error loop state
 */
export interface ErrorLoopState {
  /** Current attempt number (0 = original attempt) */
  attempt: number;
  /** Original command that failed */
  originalCommand: string;
  /** Current command being executed */
  currentCommand: string;
  /** All error explanations from attempts */
  explanations: ErrorExplanation[];
  /** Whether the command succeeded */
  succeeded: boolean;
  /** The block associated with this error loop */
  blockId: string | null;
}

/**
 * Error loop result
 */
export interface ErrorLoopResult {
  /** Whether the command eventually succeeded */
  succeeded: boolean;
  /** Number of attempts made */
  attempts: number;
  /** All error explanations */
  explanations: ErrorExplanation[];
  /** Final block */
  block: CommandBlock | null;
}

/**
 * Agent Error Loop
 * 
 * Manages the self-healing process for failed commands.
 * 
 * Usage:
 * ```typescript
 * const loop = new ErrorLoop({ maxRetries: 2, autoRetry: true });
 * 
 * loop.onAnalysis((exp) => console.log('Analysis:', exp.analysis));
 * loop.onRecovered((orig, fixed) => console.log('Recovered!'));
 * 
 * const result = await loop.execute('npm install', { cwd: '/project' });
 * console.log('Success:', result.succeeded);
 * ```
 */
export class ErrorLoop {
  private config: ErrorLoopConfig;
  private blockManager: BlockManager;
  private pty: PtyTerminal | null = null;
  private state: ErrorLoopState | null = null;

  constructor(config: Partial<ErrorLoopConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_LOOP_CONFIG, ...config };
    this.blockManager = getBlockManager();
  }

  /**
   * Execute a command with error recovery
   */
  async execute(
    command: string,
    options: {
      cwd?: string;
      env?: Record<string, string>;
      shell?: string;
    } = {}
  ): Promise<ErrorLoopResult> {
    const aiConfig = getAiConfig();
    
    // Initialize state
    this.state = {
      attempt: 0,
      originalCommand: command,
      currentCommand: command,
      explanations: [],
      succeeded: false,
      blockId: null,
    };

    // Create block for tracking
    const block = this.blockManager.createBlock(command, options.cwd || process.cwd());
    this.state.blockId = block.id;

    // Main error loop
    while (this.state.attempt <= this.config.maxRetries) {
      // Execute the current command
      const exitCode = await this.executeCommand(
        this.state.currentCommand,
        block,
        options
      );

      if (exitCode === 0) {
        // Command succeeded
        this.state.succeeded = true;
        this.blockManager.completeBlock(block.id, exitCode);
        
        if (this.state.attempt > 0 && this.state.currentCommand !== this.state.originalCommand) {
          this.config.onRecovered?.(this.state.originalCommand, this.state.currentCommand);
        }
        
        break;
      }

      // Command failed - analyze the error
      this.blockManager.completeBlock(block.id, exitCode);
      
      const errorContext: ErrorContext = {
        command: this.state.currentCommand,
        errorOutput: block.stderr + block.stdout,
        exitCode,
        workingDirectory: options.cwd,
      };

      // Get AI explanation
      let explanation: ErrorExplanation;
      
      if (aiConfig) {
        // Determine provider based on base URL
        const provider = aiConfig.baseUrl.includes("anthropic") ? "anthropic" : "openai";
        
        const llmConfig: LLMConfig = {
          provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          baseURL: aiConfig.baseUrl,
        };
        
        explanation = await explainError(llmConfig, errorContext);
      } else {
        // Fallback - no AI available
        explanation = {
          analysis: "AI not available",
          likelyCause: "Unknown error - no AI configuration",
          suggestedFix: "Manually check the error output",
          commands: [],
          risk: "medium",
          confidence: 0,
        };
      }

      this.state.explanations.push(explanation);
      this.config.onAnalysis?.(explanation);

      // Check if we should retry
      if (this.state.attempt < this.config.maxRetries && explanation.commands.length > 0) {
        // Try the first suggested fix
        const fixCommand = explanation.commands[0];
        this.state.attempt++;
        this.state.currentCommand = fixCommand;
        
        this.config.onRetry?.(this.state.attempt, fixCommand);

        // Create new block for retry
        const retryBlock = this.blockManager.createBlock(fixCommand, options.cwd || process.cwd());
        this.state.blockId = retryBlock.id;

        // Auto-retry if enabled
        if (this.config.autoRetry) {
          continue;
        } else {
          // Return with failure but analysis available
          break;
        }
      } else {
        // No more retries or no fixes available
        break;
      }
    }

    if (!this.state.succeeded && this.state.attempt >= this.config.maxRetries) {
      this.config.onExhausted?.(this.state.originalCommand, this.state.explanations);
    }

    return {
      succeeded: this.state.succeeded,
      attempts: this.state.attempt + 1,
      explanations: this.state.explanations,
      block: this.blockManager.getBlock(block.id) || null,
    };
  }

  /**
   * Execute a single command via PTY
   */
  private async executeCommand(
    command: string,
    block: CommandBlock,
    options: {
      cwd?: string;
      env?: Record<string, string>;
      shell?: string;
    }
  ): Promise<number> {
    return new Promise((resolve) => {
      this.pty = new PtyTerminal({
        cwd: options.cwd,
        env: options.env,
        shell: options.shell,
      });

      // Handle data output
      this.pty.onData((data: string) => {
        // Determine if stdout or stderr based on escape sequences
        // For simplicity, we'll treat all as stdout unless it looks like error
        const isStderr = data.toLowerCase().includes("error") || 
                         data.toLowerCase().includes("failed") ||
                         data.toLowerCase().includes("permission denied");
        
        if (isStderr) {
          this.blockManager.appendStderr(block.id, data);
        } else {
          this.blockManager.appendStdout(block.id, data);
        }
      });

      // Handle exit
      this.pty.onExit((exit: PtyExit) => {
        resolve(exit.exitCode);
      });

      // Spawn and execute
      this.pty.spawn()
        .then(() => {
          // Write command with newline to execute
          this.pty?.write(`${command}\n`);
        })
        .catch((error) => {
          console.error("[ErrorLoop] Failed to spawn PTY:", error);
          resolve(-1);
        });
    });
  }

  /**
   * Set configuration dynamically
   */
  setConfig(config: Partial<ErrorLoopConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current state
   */
  getState(): ErrorLoopState | null {
    return this.state;
  }

  /**
   * Cancel the current error loop
   */
  cancel(): void {
    if (this.pty?.isRunning) {
      this.pty.kill();
    }
    if (this.state?.blockId) {
      this.blockManager.cancelBlock(this.state.blockId);
    }
  }

  /**
   * Stream AI analysis (for real-time feedback)
   */
  async streamAnalysis(
    command: string,
    errorOutput: string,
    context: {
      cwd?: string;
      recentCommands?: string[];
    } = {}
  ): Promise<void> {
    const aiConfig = getAiConfig();
    if (!aiConfig) {
      return;
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are a debugging assistant. Analyze the command error and provide a fix.

Respond with ONLY valid JSON:
{
  "analysis": "What happened",
  "likeleyCause": "Root cause of the error", 
  "suggestedFix": "How to fix it",
  "commands": ["command1"],
  "risk": "low|medium|high",
  "confidence": 0.0-1.0
}`
      },
      {
        role: "user" as const,
        content: `Command: ${command}
Error output: ${errorOutput}
${context.cwd ? `Working directory: ${context.cwd}` : ""}
${context.recentCommands?.length ? `Recent commands: ${context.recentCommands.join(", ")}` : ""}`
      }
    ];

    // Stream chunks to console or callback
    await streamChat(aiConfig, messages, (chunk: StreamChunk) => {
      process.stdout.write(chunk.delta);
    });
  }
}

/**
 * Execute a command with automatic error recovery
 * 
 * Convenience function for simple use cases.
 * 
 * Usage:
 * ```typescript
 * const result = await executeWithRecovery('npm install', { 
 *   cwd: '/project',
 *   maxRetries: 2 
 * });
 * 
 * if (result.succeeded) {
 *   console.log('Command succeeded after', result.attempts, 'attempts');
 * } else {
 *   console.log('Analysis:', result.explanations[0]?.analysis);
 * }
 * ```
 */
export async function executeWithRecovery(
  command: string,
  options: {
    cwd?: string;
    env?: Record<string, string>;
    shell?: string;
    maxRetries?: number;
    autoRetry?: boolean;
  } = {}
): Promise<ErrorLoopResult> {
  const loop = new ErrorLoop({
    maxRetries: options.maxRetries ?? 2,
    autoRetry: options.autoRetry ?? false,
  });

  return loop.execute(command, {
    cwd: options.cwd,
    env: options.env,
    shell: options.shell,
  });
}

/**
 * Quick error analysis without execution
 */
export async function analyzeError(
  command: string,
  errorOutput: string,
  options: {
    cwd?: string;
    recentCommands?: string[];
  } = {}
): Promise<ErrorExplanation | null> {
  const aiConfig = getAiConfig();
  if (!aiConfig) {
    return null;
  }

  const context: ErrorContext = {
    command,
    errorOutput,
    workingDirectory: options.cwd,
    recentCommands: options.recentCommands,
  };

  // Determine provider based on base URL
  const provider = aiConfig.baseUrl.includes("anthropic") ? "anthropic" : "openai";
  
  const llmConfig: LLMConfig = {
    provider,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    baseURL: aiConfig.baseUrl,
  };

  return explainError(llmConfig, context);
}
