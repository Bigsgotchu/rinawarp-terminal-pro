import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import type { ExecutionSandbox } from "@rinawarp/rina-runtime/execution/sandbox";
import { resolveSharedWorkspaceCwd } from "./runtime/runtimeAccess.js";

export type RinaToolCall =
  | { tool: "listFiles"; path: string }
  | { tool: "readFile"; path: string }
  | { tool: "searchInFiles"; query: string; path?: string }
  | { tool: "getGitStatus"; cwd?: string }
  | { tool: "runCommand"; command: string; cwd?: string }
  | { tool: "applyPatch"; path: string; newContent: string };

export type RinaToolResult =
  | { ok: true; tool: RinaToolCall["tool"]; output: unknown }
  | { ok: false; tool: RinaToolCall["tool"]; error: string };

export type RinaToolDeps = {
  cwd?: string;
  maxFileBytes?: number;
  timeoutMs?: number;
  execText?: (command: string, cwd?: string, timeoutMs?: number) => Promise<string>;
  executionSandbox?: Pick<ExecutionSandbox, "readFile" | "writeFile">;
};

const DEFAULT_MAX_FILE_BYTES = 128 * 1024;

function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function isTypescriptDiagnosticCommand(command: string): boolean {
  return /(?:^|[\\/])tsc(?:\s|$)/i.test(String(command || "").trim());
}

async function execWithPtyCapture(command: string, cwd?: string): Promise<string> {
  const wrapped = `script -q -e -c ${shellQuote(command)} /dev/null`;
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", wrapped] : ["-lc", wrapped];
  return await new Promise<string>((resolve, reject) => {
    execFile(
      shell,
      args,
      {
        cwd,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        env: process.env,
      },
      (error, stdout, stderr) => {
        const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
        if (!error) {
          resolve(output || "(no output)");
          return;
        }
        reject(new Error(output || (error instanceof Error ? error.message : "Command failed")));
      },
    );
  });
}

function defaultCwd(deps?: RinaToolDeps): string {
  return resolveSharedWorkspaceCwd(deps?.cwd);
}

async function defaultExecText(command: string, cwd?: string, timeoutMs?: number): Promise<string> {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  return await new Promise<string>((resolve, reject) => {
    execFile(
      shell,
      args,
      {
        cwd,
        maxBuffer: 2 * 1024 * 1024,
        timeout: timeoutMs,
        windowsHide: true,
        env: process.env,
      },
      (error, stdout, stderr) => {
        const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
        if (!error) {
          resolve(output || "(no output)");
          return;
        }
        if (!output && isTypescriptDiagnosticCommand(command)) {
          execWithPtyCapture(command, cwd).then(resolve).catch((ptyError) => {
            reject(new Error(ptyError instanceof Error ? ptyError.message : "Command failed"));
          });
          return;
        }
        reject(new Error(output || (error instanceof Error ? error.message : "Command failed")));
      },
    );
  });
}

function resolveWithinCwd(targetPath: string, deps?: RinaToolDeps): string {
  const root = defaultCwd(deps);
  const resolved = path.resolve(root, targetPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path is outside the current workspace");
  }
  return resolved;
}

async function listFiles(call: Extract<RinaToolCall, { tool: "listFiles" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  try {
    const target = resolveWithinCwd(call.path, deps);
    const top = await fsp.readdir(target, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of top.slice(0, 80)) {
      const rel = path.relative(defaultCwd(deps), path.join(target, entry.name)) || entry.name;
      results.push(entry.isDirectory() ? `${rel}/` : rel);
      if (!entry.isDirectory()) continue;

      try {
        const nested = await fsp.readdir(path.join(target, entry.name), { withFileTypes: true });
        for (const child of nested.slice(0, 20)) {
          const childRel = path.relative(defaultCwd(deps), path.join(target, entry.name, child.name));
          results.push(child.isDirectory() ? `${childRel}/` : childRel);
        }
      } catch {
        // Ignore nested read failures.
      }
    }

    return { ok: true, tool: call.tool, output: results.slice(0, 200) };
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Could not list files" };
  }
}

async function readFile(call: Extract<RinaToolCall, { tool: "readFile" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  try {
    const target = resolveWithinCwd(call.path, deps);
    const stat = await fsp.stat(target);
    const maxFileBytes = deps?.maxFileBytes || DEFAULT_MAX_FILE_BYTES;
    if (stat.size > maxFileBytes) {
      return {
        ok: false,
        tool: call.tool,
        error: `File too large to read safely (${stat.size} bytes > ${maxFileBytes} bytes)`,
      };
    }

    const buf = await fsp.readFile(target);
    if (buf.includes(0)) {
      return { ok: false, tool: call.tool, error: "Binary files are not supported by readFile" };
    }

    return {
      ok: true,
      tool: call.tool,
      output: {
        path: path.relative(defaultCwd(deps), target),
        content: buf.toString("utf8"),
      },
    };
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Could not read file" };
  }
}

async function searchInFiles(call: Extract<RinaToolCall, { tool: "searchInFiles" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  const root = resolveWithinCwd(call.path || ".", deps);
  const execText = deps?.execText || defaultExecText;
  try {
    const query = String(call.query || "").trim();
    if (!query) return { ok: true, tool: call.tool, output: [] };
    const escaped = query.replace(/(["\\$`])/g, "\\$1");
    const command = `rg -n --hidden --glob '!**/node_modules/**' --glob '!**/.git/**' --glob '!**/dist/**' --glob '!**/dist-electron/**' "${escaped}" "${root}"`;
    const output = await execText(command, defaultCwd(deps));
    const rootPrefix = `${root}${path.sep}`;
    const lines = output === "(no output)"
      ? []
      : output
        .split(/\r?\n/g)
        .filter(Boolean)
        .map((line) => line.startsWith(rootPrefix) ? line.slice(rootPrefix.length) : line);
    return { ok: true, tool: call.tool, output: lines.slice(0, 60) };
  } catch {
    try {
      const matches: string[] = [];
      const queue = [root];
      while (queue.length && matches.length < 60) {
        const current = queue.shift();
        if (!current) continue;
        const entries = await fsp.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "dist-electron") continue;
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            queue.push(full);
            continue;
          }
          const buf = await fsp.readFile(full);
          if (buf.includes(0)) continue;
          const text = buf.toString("utf8");
          const idx = text.toLowerCase().indexOf(String(call.query || "").toLowerCase());
          if (idx >= 0) {
            const line = text.slice(0, idx).split(/\r?\n/g).length;
            matches.push(`${path.relative(defaultCwd(deps), full)}:${line}`);
          }
          if (matches.length >= 60) break;
        }
      }
      return { ok: true, tool: call.tool, output: matches };
    } catch (error) {
      return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Search failed" };
    }
  }
}

async function getGitStatus(call: Extract<RinaToolCall, { tool: "getGitStatus" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  try {
    const execText = deps?.execText || defaultExecText;
    const output = await execText("git status --short --branch", call.cwd || defaultCwd(deps));
    return { ok: true, tool: call.tool, output };
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "git status failed" };
  }
}

async function runCommand(call: Extract<RinaToolCall, { tool: "runCommand" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  try {
    const execText = deps?.execText || defaultExecText;
    const output = await execText(call.command, call.cwd || defaultCwd(deps), deps?.timeoutMs);
    return {
      ok: true,
      tool: call.tool,
      output: {
        command: call.command,
        cwd: call.cwd || defaultCwd(deps),
        output,
      },
    };
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Command failed" };
  }
}

async function applyPatch(call: Extract<RinaToolCall, { tool: "applyPatch" }>, deps?: RinaToolDeps): Promise<RinaToolResult> {
  try {
    if (!deps?.executionSandbox) {
      throw new Error("File mutation requires the runtime execution sandbox.");
    }
    const previousContent = await deps.executionSandbox.readFile(call.path).catch(() => "");
    await deps.executionSandbox.writeFile(call.path, call.newContent);
    return {
      ok: true,
      tool: call.tool,
      output: {
        path: call.path,
        previousContent,
        newContent: call.newContent,
      },
    };
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Patch failed" };
  }
}

export async function executeTool(call: RinaToolCall, deps?: RinaToolDeps): Promise<RinaToolResult> {
  switch (call.tool) {
    case "listFiles":
      return await listFiles(call, deps);
    case "readFile":
      return await readFile(call, deps);
    case "searchInFiles":
      return await searchInFiles(call, deps);
    case "getGitStatus":
      return await getGitStatus(call, deps);
    case "runCommand":
      return await runCommand(call, deps);
    case "applyPatch":
      return await applyPatch(call, deps);
  }
}
