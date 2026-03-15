/**
 * Rina OS Control Layer - Git Tool
 * 
 * Safe Git operations for repository management.
 * Fully integrated with safety layer and task queue.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from "./registry.js";
import type { RinaTask } from "../brain.js";
import { safetyCheck } from "../safety.js";

/**
 * Terminal command runner (imported from terminal tool)
 */
async function runCommand(command: string, cwd?: string): Promise<{
  stdout: string;
  stderr: string;
  success: boolean;
}> {
  // Use dynamic import to avoid circular dependencies
  const { terminalTool } = await import("./terminal.js");
  const task: RinaTask = {
    intent: "run-command",
    tool: "terminal",
    input: { command }
  };
  const result = await terminalTool.execute(task, { mode: "auto", workspaceRoot: cwd });
  
  return {
    stdout: result.output as string || "",
    stderr: result.error || "",
    success: result.ok
  };
}

/**
 * Git operations tool
 */
export const gitTool: RinaTool = {
  name: "git",
  description: "Execute Git operations (init, clone, add, commit, push, pull, status)",

  canHandle(task: RinaTask): boolean {
    return task.tool === "git" && !!task.input.command;
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command;
    if (!command || typeof command !== "string") {
      return { valid: false, error: "Git command is required" };
    }
    return { valid: true };
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const input = task.input as {
      command?: string;
      repo?: string;
      path?: string;
      message?: string;
      remote?: string;
      branch?: string;
    };

    const path = input.path || context.workspaceRoot;
    const command = input.command;

    // Safety check the path and command
    if (path && safetyCheck(path, context.mode).blocked) {
      return { ok: false, error: "Path blocked by safety rules", blocked: true };
    }

    try {
      let result: { stdout: string; stderr: string; success: boolean };

      switch (command) {
        case "init":
          result = await runCommand("git init", path);
          break;

        case "clone":
          if (!input.repo || !input.path) {
            return { ok: false, error: "Clone requires repo and path" };
          }
          result = await runCommand(`git clone ${input.repo} ${input.path}`, path);
          break;

        case "add":
          result = await runCommand("git add .", path);
          break;

        case "commit":
          if (!input.message) {
            return { ok: false, error: "Commit requires a message" };
          }
          // Sanitize message to prevent injection
          const safeMessage = input.message.replace(/"/g, '\\"');
          result = await runCommand(`git commit -m "${safeMessage}"`, path);
          break;

        case "push":
          const remote = input.remote || "origin";
          const branch = input.branch || "main";
          result = await runCommand(`git push ${remote} ${branch}`, path);
          break;

        case "pull":
          const pullRemote = input.remote || "origin";
          const pullBranch = input.branch || "main";
          result = await runCommand(`git pull ${pullRemote} ${pullBranch}`, path);
          break;

        case "status":
          result = await runCommand("git status", path);
          break;

        case "log":
          result = await runCommand("git log --oneline -10", path);
          break;

        case "diff":
          result = await runCommand("git diff", path);
          break;

        case "branch":
          result = await runCommand("git branch -a", path);
          break;

        case "checkout":
          if (!input.branch) {
            return { ok: false, error: "Checkout requires branch name" };
          }
          result = await runCommand(`git checkout ${input.branch}`, path);
          break;

        case "fetch":
          result = await runCommand("git fetch --all", path);
          break;

        default:
          return { ok: false, error: `Unknown git command: ${command}` };
      }

      return {
        ok: result.success,
        output: {
          command,
          stdout: result.stdout,
          stderr: result.stderr
        },
        error: result.success ? undefined : result.stderr
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
};

/**
 * Git tool singleton for direct usage
 */
export const gitTools = {
  async initRepo(path: string) {
    const task: RinaTask = {
      intent: "git-init",
      tool: "git",
      input: { command: "init", path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async cloneRepo(repoUrl: string, targetPath: string) {
    const task: RinaTask = {
      intent: "git-clone",
      tool: "git",
      input: { command: "clone", repo: repoUrl, path: targetPath }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: targetPath });
  },

  async addAll(path: string) {
    const task: RinaTask = {
      intent: "git-add",
      tool: "git",
      input: { command: "add", path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async commit(path: string, message: string) {
    const task: RinaTask = {
      intent: "git-commit",
      tool: "git",
      input: { command: "commit", message, path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async push(path: string, remote = "origin", branch = "main") {
    const task: RinaTask = {
      intent: "git-push",
      tool: "git",
      input: { command: "push", remote, branch, path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async status(path: string) {
    const task: RinaTask = {
      intent: "git-status",
      tool: "git",
      input: { command: "status", path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async log(path: string) {
    const task: RinaTask = {
      intent: "git-log",
      tool: "git",
      input: { command: "log", path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async branch(path: string) {
    const task: RinaTask = {
      intent: "git-branch",
      tool: "git",
      input: { command: "branch", path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  },

  async checkout(path: string, branch: string) {
    const task: RinaTask = {
      intent: "git-checkout",
      tool: "git",
      input: { command: "checkout", branch, path }
    };
    return gitTool.execute(task, { mode: "auto", workspaceRoot: path });
  }
};
