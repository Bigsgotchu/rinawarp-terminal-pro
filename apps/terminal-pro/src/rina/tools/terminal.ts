/**
 * Rina OS Control Layer - Terminal Tool
 * 
 * Safe terminal command execution with safety guardrails.
 * Integrates with the existing PTY system.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from "./registry";
import type { RinaTask } from "../brain";

export const terminalTool: RinaTool = {
  name: "terminal",
  description: "Execute terminal commands safely",

  canHandle(task: RinaTask): boolean {
    return task.tool === "terminal" && !!task.input.command;
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command;
    
    if (!command || typeof command !== "string") {
      return { valid: false, error: "Command is required" };
    }

    if (command.length > 10000) {
      return { valid: false, error: "Command too long (max 10000 chars)" };
    }

    return { valid: true };
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const command = task.input.command as string;
    const mode = task.input.mode as string || context.mode;

    // Safety is handled by the registry, but we double-check here
    if (mode === "explain") {
      return {
        ok: true,
        output: {
          action: "would-execute",
          command,
          mode,
          explanation: `In ${mode} mode, this command would be executed: ${command}`
        }
      };
    }

    if (mode === "assist") {
      return {
        ok: true,
        output: {
          action: "pending-confirmation",
          command,
          mode,
          message: `Ready to execute: ${command}`
        },
        requiresConfirmation: true
      };
    }

    // Auto mode - execute through IPC to main process
    // Note: This integrates with the existing PTY system
    try {
      // @ts-ignore - window.rina is injected by the preload script
      const result = await window.rina?.ptyWrite?.(`${command}\n`);
      
      return {
        ok: true,
        output: {
          action: "executed",
          command,
          result
        }
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
};
