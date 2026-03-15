/**
 * Rina OS Control Layer - Filesystem Tool
 * 
 * Safe filesystem operations with safety guardrails.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from "./registry.js";
import type { RinaTask } from "../brain.js";

export const filesystemTool: RinaTool = {
  name: "filesystem",
  description: "Browse and manage filesystem",

  canHandle(task: RinaTask): boolean {
    return task.tool === "filesystem";
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const action = input.action as string;
    
    const allowedActions = ["browse", "read", "list", "info"];
    if (action && !allowedActions.includes(action)) {
      return { valid: false, error: `Action must be one of: ${allowedActions.join(", ")}` };
    }

    return { valid: true };
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const action = task.input.action as string || "browse";
    const mode = task.input.mode as string || context.mode;

    // In explain/assist modes, show what would happen
    if (mode === "explain") {
      return {
        ok: true,
        output: {
          action: "would-browse",
          mode,
          explanation: `In explain mode, I would browse the filesystem at: ${context.workspaceRoot || "current directory"}`
        }
      };
    }

    if (mode === "assist") {
      return {
        ok: true,
        output: {
          requestedAction: action,
          mode,
          message: `Ready to ${action} filesystem`
        },
        requiresConfirmation: true
      };
    }

    // Auto mode - use existing code API
    try {
      // @ts-ignore - window.rina is injected by preload
      const projectRoot = context.workspaceRoot;
      
      if (!projectRoot) {
        return {
          ok: false,
          error: "No workspace selected"
        };
      }

      // Use existing code API
      // @ts-ignore
      const result = await window.rina?.codeListFiles?.({
        projectRoot,
        limit: 100
      });

      return {
        ok: !!result?.ok,
        output: result || { files: [] }
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
};
