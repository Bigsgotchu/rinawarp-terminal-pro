/**
 * Rina OS Control Layer - Brain
 * 
 * Intent interpretation layer that maps user messages to tasks.
 * This is a local interpreter that can be replaced by cloud AI later.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

export type RinaTask = {
  intent: string;
  tool: string;
  input: Record<string, unknown>;
};

export type ExecutionMode = "explain" | "assist" | "auto";

export class RinaBrain {
  private mode: ExecutionMode = "assist";

  setMode(mode: ExecutionMode): void {
    this.mode = mode;
  }

  getMode(): ExecutionMode {
    return this.mode;
  }

  /**
   * Interprets user message and returns a task.
   * In "auto" mode, attempts to execute commands.
   * In "assist" mode, explains what would happen.
   * In "explain" mode, provides educational responses.
   */
  async interpret(userMessage: string): Promise<RinaTask> {
    const lower = userMessage.toLowerCase().trim();

    // Terminal command patterns
    if (lower.includes("run ") || lower.startsWith("run ") || lower.includes("execute ")) {
      const command = userMessage
        .replace(/^run\s+/i, "")
        .replace(/^execute\s+/i, "")
        .trim();
      
      return {
        intent: "terminal-command",
        tool: "terminal",
        input: { command, mode: this.mode }
      };
    }

    // Open folder pattern
    if (lower.includes("open folder") || lower.includes("open directory") || lower.includes("browse")) {
      return {
        intent: "open-folder",
        tool: "filesystem",
        input: { action: "browse" }
      };
    }

    // File operations
    if (lower.includes("create file") || lower.includes("make file")) {
      return {
        intent: "create-file",
        tool: "filesystem",
        input: { action: "create" }
      };
    }

    // Search patterns
    if (lower.includes("search") || lower.includes("find ") || lower.includes("grep")) {
      return {
        intent: "search",
        tool: "search",
        input: { query: userMessage }
      };
    }

    // Git operations
    if (lower.startsWith("git ")) {
      return {
        intent: "git-operation",
        tool: "git",
        input: { command: userMessage }
      };
    }

    // Mode switching
    if (lower.includes("mode:") || lower.includes("set mode")) {
      if (lower.includes("auto")) {
        this.mode = "auto";
        return { intent: "set-mode", tool: "system", input: { mode: "auto" } };
      }
      if (lower.includes("assist")) {
        this.mode = "assist";
        return { intent: "set-mode", tool: "system", input: { mode: "assist" } };
      }
      if (lower.includes("explain")) {
        this.mode = "explain";
        return { intent: "set-mode", tool: "system", input: { mode: "explain" } };
      }
    }

    // Default: chat mode (no tool execution)
    return {
      intent: "chat",
      tool: "none",
      input: { message: userMessage }
    };
  }
}

// Singleton instance
export const rinaBrain = new RinaBrain();
