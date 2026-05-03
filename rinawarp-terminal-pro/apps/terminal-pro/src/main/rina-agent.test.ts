import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { continueRinaAgentAfterCommandApproval, runRinaAgent } from "./rina-agent.js";
import { executeTool } from "./rina-tools.js";

function makeTempRepo(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function withTempRepo<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = makeTempRepo(prefix);
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function withEnv<T>(patch: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key]);
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("deterministic fix-this-repo loop emits tool activity, requests patch approval, and supports rerun after approval", async () => {
  await withTempRepo("rina-agent-loop-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "demo",
          scripts: {
            build: "tsc -p tsconfig.json",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "src", "problem.ts"), "export const value = missingFn();\n", "utf8");

    const commands: string[] = [];
    const result = await withEnv(
      {
        OPENAI_API_KEY: "test-key",
        RINAWARP_OPENAI_MODEL: "gpt-4.1-mini",
      },
      () =>
        runRinaAgent(
          {
            sessionId: "test-session",
            userMessage: "fix this repo",
            cwd: dir,
            recentTranscript: [],
            recentCommands: [],
            lastError: "ReferenceError: missingFn is not defined",
          },
          {
            cwd: dir,
            execText: async (command) => {
              commands.push(command);
              if (command === "git status --short --branch") return "## main";
              if (command.startsWith("rg -n")) return `${path.join(dir, "src", "problem.ts")}:1:export const value = missingFn();`;
              if (command === "pnpm run build") {
                const current = await fsp.readFile(path.join(dir, "src", "problem.ts"), "utf8");
                return current.includes("missingFn")
                  ? "src/problem.ts:1: error TS2304: Cannot find name 'missingFn'."
                  : "Build succeeded";
              }
              throw new Error(`Unexpected command: ${command}`);
            },
            proposePatchForFailure: async () => ({
              path: "src/problem.ts",
              newContent: "export const value = 1;\n",
              summary: "Replace the unresolved symbol with a safe literal so the build can pass.",
              rerunCommand: "pnpm run build",
            }),
          },
        ),
    );

    assert.equal(result.risk, "medium");
    assert.equal(result.pendingApproval?.kind, "file_patch");
    assert.match(result.explanation, /replace the unresolved symbol/i);

    const toolStarted = result.events.filter((event) => event.type === "tool_started");
    assert.equal(toolStarted.length, 5);
    assert.ok(toolStarted.some((event) => event.tool === "listFiles"));
    assert.ok(toolStarted.some((event) => event.tool === "readFile"));
    assert.ok(toolStarted.some((event) => event.tool === "getGitStatus"));
    assert.ok(toolStarted.some((event) => event.tool === "runCommand"));
    assert.ok(toolStarted.some((event) => event.tool === "searchInFiles"));
    assert.ok(result.events.some((event) => event.type === "approval_requested"));

    assert.deepEqual(commands, [
      "git status --short --branch",
      "pnpm run build",
      `rg -n --hidden --glob '!**/node_modules/**' --glob '!**/.git/**' --glob '!**/dist/**' --glob '!**/dist-electron/**' "missingFn" "${dir}"`,
    ]);

    const approvalPayload = result.pendingApproval?.payload as
      | { path: string; newContent: string; rerunCommand?: string }
      | undefined;
    assert.ok(approvalPayload);
    assert.equal(approvalPayload?.path, "src/problem.ts");
    assert.equal(approvalPayload?.rerunCommand, "pnpm run build");

    const patchResult = await executeTool(
      {
        tool: "applyPatch",
        path: approvalPayload.path,
        newContent: approvalPayload.newContent,
      },
      { cwd: dir },
    );
    assert.equal(patchResult.ok, true);
    assert.equal(await fsp.readFile(path.join(dir, "src", "problem.ts"), "utf8"), "export const value = 1;\n");

    const rerunResult = await executeTool(
      {
        tool: "runCommand",
        command: approvalPayload.rerunCommand || "pnpm run build",
      },
      {
        cwd: dir,
        execText: async (command) => {
          assert.equal(command, "pnpm run build");
          return "Build succeeded";
        },
      },
    );
    assert.equal(rerunResult.ok, true);
    assert.deepEqual(rerunResult.output, {
      command: "pnpm run build",
      cwd: dir,
      output: "Build succeeded",
    });
  });
});

test("missing file referenced by a package script becomes a deterministic placeholder patch", async () => {
  await withTempRepo("rina-agent-missing-file-", async (dir) => {
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "presentation-demo",
          scripts: {
            test: "node test-presentation.js",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "missing-file",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm test") {
            throw new Error(`Error: Cannot find module '${path.join(dir, "test-presentation.js")}'`);
          }
          if (command.startsWith("rg -n")) return "package.json:4:test-presentation.js";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "test-presentation.js");
    assert.match(payload?.newContent || "", /Placeholder generated by Rina/);
    assert.equal(payload?.rerunCommand, "npm test");
  });
});

test("rimraf command-not-found becomes a deterministic package script repair", async () => {
  await withTempRepo("rina-agent-rimraf-", async (dir) => {
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "extension-demo",
          scripts: {
            clean: "rimraf out dist *.vsix",
            build: "npm run clean && npm run compile",
            compile: "webpack --mode production",
          },
          devDependencies: {
            rimraf: "^5.0.10",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "rimraf-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("Command failed: /bin/bash -lc npm run build");
          if (command === "npm run clean") throw new Error("sh: 1: rimraf: not found");
          if (command.startsWith("rg -n")) return "package.json:4:rimraf out dist *.vsix";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "package.json");
    assert.match(payload?.newContent || "", /node -e/);
    assert.equal(payload?.rerunCommand, "npm run build");
  });
});

test("missing node type definitions without a declared package propose adding @types/node", async () => {
  await withTempRepo("rina-agent-node-types-", async (dir) => {
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "node-types-demo",
          scripts: {
            build: "tsc -p ./",
          },
          devDependencies: {
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            types: ["node"],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "node-types-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("error TS2688: Cannot find type definition file for 'node'.");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.command, "npm install -D @types/node");
  });
});

test("webpack not found with declared dependencies and no node_modules proposes an install command", async () => {
  await withTempRepo("rina-agent-webpack-install-", async (dir) => {
    await fsp.writeFile(path.join(dir, "package-lock.json"), "{\n  \"name\": \"demo\"\n}\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "webpack-demo",
          scripts: {
            build: "webpack --mode production",
          },
          devDependencies: {
            webpack: "^5.0.0",
            "webpack-cli": "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "webpack-install",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("sh: 1: webpack: not found");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "npm install");
    assert.match(result.explanation, /webpack/i);
    assert.match(result.explanation, /node_modules/i);
  });
});

test("next not found with declared dependencies and no node_modules proposes the package-manager install command", async () => {
  await withTempRepo("rina-agent-next-install-", async (dir) => {
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "next-demo",
          scripts: {
            build: "next build",
          },
          dependencies: {
            next: "^15.0.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "next-install",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "pnpm run build") throw new Error("sh: 1: next: not found");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "pnpm install");
    assert.match(result.explanation, /next/i);
    assert.match(result.explanation, /restore the repo's install state/i);
  });
});

test("next not found with node_modules present and next missing from package.json proposes adding a devDependency", async () => {
  await withTempRepo("rina-agent-next-add-", async (dir) => {
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "next-missing-dep-demo",
          scripts: {
            build: "next build",
          },
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "next-add-dep",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("sh: 1: next: not found");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "npm install -D next");
    assert.match(result.explanation, /does not declare/i);
  });
});

test("next not found with node_modules present and next declared proposes reinstalling to repair install state", async () => {
  await withTempRepo("rina-agent-next-reinstall-", async (dir) => {
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
    await fsp.writeFile(path.join(dir, "package-lock.json"), "{\n  \"name\": \"demo\"\n}\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "next-reinstall-demo",
          scripts: {
            build: "next build",
          },
          dependencies: {
            next: "^15.0.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "next-reinstall",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("sh: 1: next: not found");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "npm install");
    assert.match(result.explanation, /install state/i);
    assert.match(result.explanation, /declares `next`/i);
  });
});

test("declared node type package with no node_modules proposes install for TS2688", async () => {
  await withTempRepo("rina-agent-ts2688-install-", async (dir) => {
    await fsp.writeFile(path.join(dir, "package-lock.json"), "{\n  \"name\": \"demo\"\n}\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "types-install-demo",
          scripts: {
            build: "tsc",
          },
          devDependencies: {
            "@types/node": "^22.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "ts2688-install",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error([
            "error TS2688: Cannot find type definition file for 'node'.",
            "  The file is in the program because:",
            "    Entry point of type library 'node' specified in compilerOptions",
          ].join("\n"));
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "npm install");
    assert.match(result.explanation, /cannot resolve the declared `node` type library/i);
  });
});

test("approved install command continues the repo loop and surfaces the next patchable failure", async () => {
  await withTempRepo("rina-agent-install-continue-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(path.join(dir, "package-lock.json"), "{\n  \"name\": \"demo\"\n}\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "install-continue-demo",
          scripts: {
            build: "tsc -p tsconfig.json",
          },
          devDependencies: {
            "@types/node": "^22.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "src", "problem.ts"), "export const value = missingFn();\n", "utf8");

    let installComplete = false;
    const execText = async (command: string) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "npm install") {
        installComplete = true;
        await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
        return "installed";
      }
      if (command === "npm run build") {
        if (!installComplete) {
          throw new Error([
            "error TS2688: Cannot find type definition file for 'node'.",
            "  The file is in the program because:",
            "    Entry point of type library 'node' specified in compilerOptions",
          ].join("\n"));
        }
        throw new Error("src/problem.ts:1: error TS2304: Cannot find name 'missingFn'.");
      }
      if (command.startsWith("rg -n")) return `src/problem.ts:1:export const value = missingFn();`;
      throw new Error(`Unexpected command: ${command}`);
    };

    const initial = await runRinaAgent(
      {
        sessionId: "install-continue-initial",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      { cwd: dir, execText },
    );

    assert.equal(initial.pendingApproval?.kind, "command");
    const initialPayload = initial.pendingApproval?.payload as { command?: string; rerunCommand?: string } | undefined;
    assert.equal(initialPayload?.command, "npm install");
    assert.equal(initialPayload?.rerunCommand, "npm run build");

    const continued = await continueRinaAgentAfterCommandApproval(
      {
        sessionId: "install-continue-followup",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      initialPayload as { tool: "runCommand"; command: string; cwd?: string; rerunCommand?: string },
      {
        cwd: dir,
        execText,
        proposePatchForFailure: async () => ({
          path: "src/problem.ts",
          newContent: "export const value = 1;\n",
          summary: "Replace the unresolved symbol with a safe literal after the install state is repaired.",
          rerunCommand: "npm run build",
        }),
      },
    );

    assert.equal(continued.pendingApproval?.kind, "file_patch");
    assert.match(continued.explanation, /after the install state is repaired/i);
    assert.ok(continued.events.some((event) => event.type === "tool_started" && event.tool === "runCommand"));
    assert.ok(installComplete);
  });
});

test("approved install command continues the repo loop and can finish green", async () => {
  await withTempRepo("rina-agent-install-green-", async (dir) => {
    await fsp.writeFile(path.join(dir, "package-lock.json"), "{\n  \"name\": \"demo\"\n}\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "install-green-demo",
          scripts: {
            build: "tsc",
          },
          devDependencies: {
            "@types/node": "^22.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    let installComplete = false;
    const execText = async (command: string) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "npm install") {
        installComplete = true;
        await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
        return "installed";
      }
      if (command === "npm run build" || command === "tsc") {
        if (!installComplete) {
          throw new Error([
            "error TS2688: Cannot find type definition file for 'node'.",
            "  The file is in the program because:",
            "    Entry point of type library 'node' specified in compilerOptions",
          ].join("\n"));
        }
        return "(no output)";
      }
      throw new Error(`Unexpected command: ${command}`);
    };

    const initial = await runRinaAgent(
      {
        sessionId: "install-green-initial",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      { cwd: dir, execText },
    );

    assert.equal(initial.pendingApproval?.kind, "command");
    const initialPayload = initial.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(initialPayload?.command, "npm install");

    const continued = await continueRinaAgentAfterCommandApproval(
      {
        sessionId: "install-green-followup",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      initialPayload as { tool: "runCommand"; command: string; cwd?: string; rerunCommand?: string },
      {
        cwd: dir,
        execText,
      },
    );

    assert.equal(continued.pendingApproval, undefined);
    assert.equal(continued.risk, "low");
    assert.match(continued.explanation, /completed without a clear failure/i);
    assert.ok(installComplete);
  });
});

test("approved install command can pivot to a workspace-to-file dependency patch when standalone install fails", async () => {
  await withTempRepo("rina-agent-install-workspace-", async (rootDir) => {
    const toolsDir = path.join(rootDir, "rinawarp-tools");
    const coreDir = path.join(rootDir, "rinawarp-core");
    await fsp.mkdir(toolsDir, { recursive: true });
    await fsp.mkdir(coreDir, { recursive: true });

    await fsp.writeFile(
      path.join(toolsDir, "package.json"),
      JSON.stringify(
        {
          name: "@rinawarp/tools",
          version: "1.0.0",
        },
        null,
        2,
      ),
      "utf8",
    );

    await fsp.writeFile(
      path.join(coreDir, "package.json"),
      JSON.stringify(
        {
          name: "@rinawarp/core",
          scripts: {
            build: "tsc",
          },
          dependencies: {
            "@rinawarp/tools": "workspace:*",
          },
          devDependencies: {
            "@types/node": "^22.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const continued = await continueRinaAgentAfterCommandApproval(
      {
        sessionId: "install-workspace-followup",
        userMessage: "fix this repo",
        cwd: coreDir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        tool: "runCommand",
        command: "npm install",
        cwd: coreDir,
        rerunCommand: "npm run build",
      },
      {
        cwd: coreDir,
        execText: async (command) => {
          if (command === "npm install") {
            throw new Error('npm error code EUNSUPPORTEDPROTOCOL\nnpm error Unsupported URL Type "workspace:": workspace:*');
          }
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(continued.pendingApproval?.kind, "file_patch");
    const payload = continued.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "package.json");
    assert.match(payload?.newContent || "", /"@rinawarp\/tools": "file:\.\.\/rinawarp-tools"/);
    assert.equal(payload?.rerunCommand, "npm install");
    assert.match(continued.explanation, /workspace:\*/i);
  });
});

test("missing node type package proposes adding @types/node for TS2688", async () => {
  await withTempRepo("rina-agent-ts2688-add-", async (dir) => {
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "types-add-demo",
          scripts: {
            build: "tsc",
          },
          devDependencies: {
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "ts2688-add",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error([
            "error TS2688: Cannot find type definition file for 'node'.",
            "  The file is in the program because:",
            "    Entry point of type library 'node' specified in compilerOptions",
          ].join("\n"));
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { command?: string } | undefined;
    assert.equal(payload?.command, "npm install -D @types/node");
    assert.match(result.explanation, /@types\/node/i);
  });
});

test("weak TypeScript build output becomes a deterministic tsconfig repair", async () => {
  await withTempRepo("rina-agent-tsconfig-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "extension-demo",
          engines: {
            vscode: "^1.90.0",
          },
          scripts: {
            compile: "tsc -p ./",
            build: "npm run compile && npm run package",
            package: "vsce package",
          },
          dependencies: {
            "node-fetch": "^3.3.2",
          },
          devDependencies: {
            "@types/node": "^18.0.0",
            "@types/vscode": "^1.90.0",
            typescript: "^5.0.4",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: "commonjs",
            target: "ES2020",
            lib: ["ES2020"],
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "src", "extension.ts"), "import * as vscode from \"vscode\";\nconsole.log(vscode);\n", "utf8");

    const result = await runRinaAgent(
      {
        sessionId: "tsconfig-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error("Command failed: /bin/bash -lc npm run build");
          if (command === "npm run compile") throw new Error("Command failed: /bin/bash -lc npm run compile");
          if (command === "tsc -p ./") {
            throw new Error([
              "src/extension.ts(1,25): error TS2307: Cannot find module 'vscode' or its corresponding type declarations.",
              "src/extension.ts(2,1): error TS2584: Cannot find name 'console'. Do you need to change the 'lib' compiler option to include 'dom'?",
              "src/extension.ts(3,1): error TS2304: Cannot find name 'fetch'.",
            ].join("\n"));
          }
          if (command.startsWith("rg -n")) return "src/extension.ts:1:import * as vscode from \"vscode\";";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "tsconfig.json");
    assert.match(payload?.newContent || "", /"DOM"/);
    assert.match(payload?.newContent || "", /"vscode"/);
    assert.match(payload?.newContent || "", /"node"/);
    assert.equal(payload?.rerunCommand, "npm run build");
  });
});

test("weak tsc -b project reference build patches the most relevant referenced tsconfig", async () => {
  await withTempRepo("rina-agent-tsbuild-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "project-refs-demo",
          scripts: {
            build: "tsc -b && vite build",
          },
          devDependencies: {
            "@types/node": "^24.0.0",
            vite: "^7.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          files: [],
          references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.app.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
          },
          include: ["src"],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.node.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2023",
            module: "ESNext",
          },
          include: ["vite.config.ts"],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "vite.config.ts"), "export default {};\n", "utf8");

    const result = await runRinaAgent(
      {
        sessionId: "tsbuild-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "pnpm run build") throw new Error("Command failed: /bin/bash -lc pnpm run build");
          if (command === "tsc -b") throw new Error("Command failed: /bin/bash -lc tsc -b");
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "tsconfig.node.json");
    assert.match(payload?.newContent || "", /"types": \[\s*"node"\s*\]/);
    assert.equal(payload?.rerunCommand, "pnpm run build");
  });
});

test("moduleResolution diagnostics become a deterministic tsconfig module repair", async () => {
  await withTempRepo("rina-agent-module-resolution-", async (dir) => {
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "module-resolution-demo",
          scripts: {
            build: "tsc -p ./",
          },
          devDependencies: {
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: "ESNext",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "module-resolution-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") {
            throw new Error("error TS5070: Option 'moduleResolution' must be set to 'NodeNext' when option 'module' is set to 'NodeNext'.");
          }
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "tsconfig.json");
    assert.match(payload?.newContent || "", /"moduleResolution": "NodeNext"/i);
    assert.match(payload?.newContent || "", /"module": "NodeNext"/);
  });
});

test("declared dependencies with missing install state propose an install command instead of a tsconfig patch", async () => {
  await withTempRepo("rina-agent-install-state-", async (dir) => {
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "install-state-demo",
          scripts: {
            build: "tsc -b && vite build",
          },
          dependencies: {
            react: "^19.0.0",
            "lucide-react": "^0.1.0",
          },
          devDependencies: {
            "@types/node": "^24.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "install-state-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "pnpm run build") {
            throw new Error([
              "src/App.tsx(1,26): error TS2307: Cannot find module 'react' or its corresponding type declarations.",
              "src/App.tsx(2,24): error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.",
              "src/App.tsx(3,1): error TS2875: This JSX tag requires the module path 'react/jsx-runtime' to exist, but none could be found.",
              "error TS2688: Cannot find type definition file for 'node'.",
            ].join("\n"));
          }
          if (command.startsWith("rg -n")) return "src/App.tsx:1:import React from \"react\";";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { tool: string; command: string; cwd?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.tool, "runCommand");
    assert.equal(payload?.command, "pnpm install");
    assert.match(result.explanation, /cannot resolve the declared `node` type library/i);
  });
});

test("undeclared dependency failures propose a dependency install command", async () => {
  await withTempRepo("rina-agent-undeclared-dep-", async (dir) => {
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "undeclared-dep-demo",
          scripts: {
            build: "npm run compile",
            compile: "tsc -p ./",
          },
          dependencies: {
            react: "^19.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });

    const result = await runRinaAgent(
      {
        sessionId: "undeclared-dep-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") {
            throw new Error("src/App.tsx(2,24): error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.");
          }
          if (command.startsWith("rg -n")) return "src/App.tsx:2:import { Bell } from \"lucide-react\";";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "command");
    const payload = result.pendingApproval?.payload as { tool: string; command: string; cwd?: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.command, "npm install lucide-react");
    assert.match(result.explanation, /undeclared dependency/i);
  });
});

test("node-only symbol errors patch the relevant tsconfig when node types are already declared", async () => {
  await withTempRepo("rina-agent-node-only-types-", async (dir) => {
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "node-types-config-demo",
          scripts: {
            build: "tsc -b",
          },
          devDependencies: {
            "@types/node": "^24.0.0",
            typescript: "^5.0.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          files: [],
          references: [{ path: "./tsconfig.node.json" }],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.node.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2023",
          },
          include: ["vite.config.ts"],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "vite.config.ts"), "console.log(process.version)\n", "utf8");

    const result = await runRinaAgent(
      {
        sessionId: "node-only-types-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "pnpm run build") throw new Error("Command failed: /bin/bash -lc pnpm run build");
          if (command === "tsc -b") throw new Error("vite.config.ts(1,13): error TS2591: Cannot find name 'process'.");
          if (command.startsWith("rg -n")) return "vite.config.ts:1:console.log(process.version)";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "tsconfig.node.json");
    assert.match(payload?.newContent || "", /"types": \[\s*"node"\s*\]/);
  });
});

test("path alias failures inspect config and patch tsconfig alias mapping", async () => {
  await withTempRepo("rina-agent-path-alias-", async (dir) => {
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "path-alias-demo",
          scripts: {
            build: "npm run compile",
            compile: "tsc -p ./",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(path.join(dir, "vite.config.ts"), "export default {};\n", "utf8");
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });

    const result = await runRinaAgent(
      {
        sessionId: "path-alias-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") {
            throw new Error("src/App.tsx(1,24): error TS2307: Cannot find module '@/components/ui/button' or its corresponding type declarations.");
          }
          if (command.startsWith("rg -n")) return "src/App.tsx:1:import { Button } from \"@/components/ui/button\";";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "tsconfig.json");
    assert.match(payload?.newContent || "", /"baseUrl": "\."/,);
    assert.match(payload?.newContent || "", /"@\/\*"/);
  });
});

test("VS Code inline completion API drift proposes replacing Position with a zero-width Range", async () => {
  await withTempRepo("rina-agent-vscode-inline-range-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.mkdir(path.join(dir, "node_modules"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "vscode-inline-range-demo",
          engines: {
            vscode: "^1.90.0",
          },
          scripts: {
            build: "npm run compile",
            compile: "tsc -p ./",
          },
          devDependencies: {
            "@types/node": "^18.0.0",
            "@types/vscode": "^1.90.0",
            typescript: "^5.0.4",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "src", "inlineCompletionProvider.ts"),
      [
        "import * as vscode from \"vscode\";",
        "",
        "export class Provider implements vscode.InlineCompletionItemProvider {",
        "  async provideInlineCompletionItems(_document: vscode.TextDocument, position: vscode.Position): Promise<vscode.InlineCompletionItem[]> {",
        "    const item = new vscode.InlineCompletionItem(\"demo\", position);",
        "    return [item];",
        "  }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "vscode-inline-range",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") throw new Error(
            "src/inlineCompletionProvider.ts(5,58): error TS2345: Argument of type 'Position' is not assignable to parameter of type 'Range'.",
          );
          if (command === "npm run compile") throw new Error(
            "src/inlineCompletionProvider.ts(5,58): error TS2345: Argument of type 'Position' is not assignable to parameter of type 'Range'.",
          );
          if (command === "tsc -p ./") throw new Error(
            "src/inlineCompletionProvider.ts(5,58): error TS2345: Argument of type 'Position' is not assignable to parameter of type 'Range'.",
          );
          if (command.startsWith("rg -n")) return "src/inlineCompletionProvider.ts:5:    const item = new vscode.InlineCompletionItem(\"demo\", position);";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "src/inlineCompletionProvider.ts");
    assert.match(payload?.newContent || "", /new vscode\.Range\(position, position\)/);
    assert.match(result.explanation, /zero-width `Range`/i);
  });
});

test("react-resizable-panels API drift proposes a source-level patch based on installed types", async () => {
  await withTempRepo("rina-agent-api-drift-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src", "components", "ui"), { recursive: true });
    await fsp.mkdir(path.join(dir, "node_modules", "react-resizable-panels", "dist"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "api-drift-demo",
          scripts: {
            build: "pnpm run compile",
            compile: "tsc -p ./",
          },
          dependencies: {
            "react-resizable-panels": "^4.6.5",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "node_modules", "react-resizable-panels", "package.json"),
      JSON.stringify(
        {
          name: "react-resizable-panels",
          types: "dist/react-resizable-panels.d.ts",
        },
        null,
        2,
      ),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "node_modules", "react-resizable-panels", "dist", "react-resizable-panels.d.ts"),
      [
        "export declare function Group(props: unknown): unknown;",
        "export declare function Panel(props: unknown): unknown;",
        "export declare function Separator(props: unknown): unknown;",
        "",
      ].join("\n"),
      "utf8",
    );
    await fsp.writeFile(
      path.join(dir, "src", "components", "ui", "resizable.tsx"),
      [
        "import * as ResizablePrimitive from \"react-resizable-panels\"",
        "",
        "const ResizablePanelGroup = (props: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (",
        "  <ResizablePrimitive.PanelGroup {...props} />",
        ")",
        "",
        "const ResizableHandle = (props: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>) => (",
        "  <ResizablePrimitive.PanelResizeHandle {...props} />",
        ")",
        "",
        "export { ResizablePanelGroup, ResizableHandle }",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runRinaAgent(
      {
        sessionId: "api-drift-fix",
        userMessage: "fix this repo",
        cwd: dir,
        recentTranscript: [],
        recentCommands: [],
        lastError: null,
      },
      {
        cwd: dir,
        execText: async (command) => {
          if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
          if (command === "npm run build") {
            throw new Error([
              `src/components/ui/resizable.tsx(3,77): error TS2339: Property 'PanelGroup' does not exist on type 'typeof import(\"${path.join(dir, "node_modules", "react-resizable-panels", "dist", "react-resizable-panels")}\")'.`,
              `src/components/ui/resizable.tsx(7,74): error TS2339: Property 'PanelResizeHandle' does not exist on type 'typeof import(\"${path.join(dir, "node_modules", "react-resizable-panels", "dist", "react-resizable-panels")}\")'.`,
            ].join("\n"));
          }
          if (command.startsWith("rg -n")) return "src/components/ui/resizable.tsx:3:ResizablePrimitive.PanelGroup";
          throw new Error(`Unexpected command: ${command}`);
        },
      },
    );

    assert.equal(result.pendingApproval?.kind, "file_patch");
    const payload = result.pendingApproval?.payload as { path: string; newContent: string } | undefined;
    assert.ok(payload);
    assert.equal(payload?.path, "src/components/ui/resizable.tsx");
    assert.doesNotMatch(payload?.newContent || "", /ResizablePrimitive\.PanelGroup|ResizablePrimitive\.PanelResizeHandle/);
    assert.match(payload?.newContent || "", /ResizablePrimitive\.Group/);
    assert.match(payload?.newContent || "", /ResizablePrimitive\.Separator/);
    assert.match(result.explanation, /installed `react-resizable-panels` API names/i);
  });
});
