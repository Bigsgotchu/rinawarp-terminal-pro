/**
 * Rina OS Control Layer - System Tool
 * 
 * System operations like mode switching, status, etc.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from "./registry.js";
import type { RinaTask } from "../brain.js";
import { rinaBrain } from "../brain.js";

export const systemTool: RinaTool = {
  name: "system",
  description: "System operations like mode switching and status",

  canHandle(task: RinaTask): boolean {
    return task.tool === "system";
  },

  execute(task: RinaTask, _context: ToolContext): Promise<ToolResult> {
    const action = task.input.action as string || task.input.mode as string;

    if (action === "set-mode" || task.input.mode) {
      const newMode = (task.input.mode || task.input.newMode) as "explain" | "assist" | "auto";
      
      if (!newMode || !["explain", "assist", "auto"].includes(newMode)) {
        return Promise.resolve({
          ok: false,
          error: "Invalid mode. Must be: explain, assist, or auto"
        });
      }

      rinaBrain.setMode(newMode);
      
      return Promise.resolve({
        ok: true,
        output: {
          action: "mode-changed",
          previousMode: rinaBrain.getMode(),
          newMode
        }
      });
    }

    if (action === "status") {
      return Promise.resolve({
        ok: true,
        output: {
          mode: rinaBrain.getMode(),
          system: "Rina OS Control Layer",
          version: "1.0.0"
        }
      });
    }

    return Promise.resolve({
      ok: false,
      error: `Unknown system action: ${action}`
    });
  }
};
