/**
 * Rina OS Control Layer - Docker Tool
 * 
 * Safe Docker operations for container management.
 * Fully integrated with safety layer and task queue.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTool, ToolContext, ToolResult } from "./registry.js";
import type { RinaTask } from "../brain.js";
import { safetyCheck } from "../safety.js";

/**
 * Terminal command runner
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
 * Docker operations tool
 */
export const dockerTool: RinaTool = {
  name: "docker",
  description: "Execute Docker operations (build, run, stop, rm, ps, images)",

  canHandle(task: RinaTask): boolean {
    return task.tool === "docker" && !!task.input.command;
  },

  validate(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const command = input.command;
    if (!command || typeof command !== "string") {
      return { valid: false, error: "Docker command is required" };
    }
    return { valid: true };
  },

  async execute(task: RinaTask, context: ToolContext): Promise<ToolResult> {
    const input = task.input as {
      command?: string;
      image?: string;
      container?: string;
      options?: string;
      path?: string;
      tag?: string;
    };

    const command = input.command;

    // Safety check for dangerous operations
    if (["rm", "stop", "kill", "rmi"].includes(command || "") && 
        input.container || input.image) {
      const target = input.container || input.image || "";
      if (safetyCheck(target, context.mode).blocked) {
        return { ok: false, error: "Operation blocked by safety rules", blocked: true };
      }
    }

    try {
      let result: { stdout: string; stderr: string; success: boolean };

      switch (command) {
        case "build":
          if (!input.image || !input.path) {
            return { ok: false, error: "Build requires image name and path" };
          }
          const tag = input.tag ? `-t ${input.tag}` : "";
          result = await runCommand(`docker build ${tag} ${input.path}`);
          break;

        case "run":
          if (!input.image) {
            return { ok: false, error: "Run requires image name" };
          }
          const options = input.options || "";
          result = await runCommand(`docker run ${options} ${input.image}`);
          break;

        case "ps":
          const all = input.options?.includes("-a") ? "-a" : "";
          result = await runCommand(`docker ps ${all}`);
          break;

        case "images":
          result = await runCommand("docker images");
          break;

        case "stop":
          if (!input.container) {
            return { ok: false, error: "Stop requires container name or ID" };
          }
          result = await runCommand(`docker stop ${input.container}`);
          break;

        case "start":
          if (!input.container) {
            return { ok: false, error: "Start requires container name or ID" };
          }
          result = await runCommand(`docker start ${input.container}`);
          break;

        case "restart":
          if (!input.container) {
            return { ok: false, error: "Restart requires container name or ID" };
          }
          result = await runCommand(`docker restart ${input.container}`);
          break;

        case "rm":
          if (!input.container) {
            return { ok: false, error: "Remove requires container name or ID" };
          }
          result = await runCommand(`docker rm ${input.container}`);
          break;

        case "rmi":
          if (!input.image) {
            return { ok: false, error: "Remove image requires image name or ID" };
          }
          result = await runCommand(`docker rmi ${input.image}`);
          break;

        case "logs":
          if (!input.container) {
            return { ok: false, error: "Logs requires container name or ID" };
          }
          result = await runCommand(`docker logs ${input.container}`);
          break;

        case "exec":
          // docker exec <container> <command>
          if (!input.container || !input.options) {
            return { ok: false, error: "Exec requires container and command" };
          }
          result = await runCommand(`docker exec ${input.container} ${input.options}`);
          break;

        case "pull":
          if (!input.image) {
            return { ok: false, error: "Pull requires image name" };
          }
          result = await runCommand(`docker pull ${input.image}`);
          break;

        case "info":
          result = await runCommand("docker info");
          break;

        case "version":
          result = await runCommand("docker version");
          break;

        default:
          return { ok: false, error: `Unknown docker command: ${command}` };
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
 * Docker tool singleton for direct usage
 */
export const dockerTools = {
  async build(imageName: string, dockerfilePath: string, tag?: string) {
    const task: RinaTask = {
      intent: "docker-build",
      tool: "docker",
      input: { command: "build", image: imageName, path: dockerfilePath, tag }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async run(imageName: string, options = "") {
    const task: RinaTask = {
      intent: "docker-run",
      tool: "docker",
      input: { command: "run", image: imageName, options }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async listContainers(all = false) {
    const task: RinaTask = {
      intent: "docker-ps",
      tool: "docker",
      input: { command: "ps", options: all ? "-a" : "" }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async listImages() {
    const task: RinaTask = {
      intent: "docker-images",
      tool: "docker",
      input: { command: "images" }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async stop(containerName: string) {
    const task: RinaTask = {
      intent: "docker-stop",
      tool: "docker",
      input: { command: "stop", container: containerName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async start(containerName: string) {
    const task: RinaTask = {
      intent: "docker-start",
      tool: "docker",
      input: { command: "start", container: containerName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async restart(containerName: string) {
    const task: RinaTask = {
      intent: "docker-restart",
      tool: "docker",
      input: { command: "restart", container: containerName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async remove(containerName: string) {
    const task: RinaTask = {
      intent: "docker-rm",
      tool: "docker",
      input: { command: "rm", container: containerName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async removeImage(imageName: string) {
    const task: RinaTask = {
      intent: "docker-rmi",
      tool: "docker",
      input: { command: "rmi", image: imageName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async logs(containerName: string) {
    const task: RinaTask = {
      intent: "docker-logs",
      tool: "docker",
      input: { command: "logs", container: containerName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  },

  async pull(imageName: string) {
    const task: RinaTask = {
      intent: "docker-pull",
      tool: "docker",
      input: { command: "pull", image: imageName }
    };
    return dockerTool.execute(task, { mode: "auto" });
  }
};
