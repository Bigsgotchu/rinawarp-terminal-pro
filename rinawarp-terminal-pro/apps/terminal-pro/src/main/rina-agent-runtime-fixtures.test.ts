import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runRinaAgent } from "./rina-agent.js";
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

type FixtureFlowResult = {
  patchPath: string | null;
  rerunOutput: string | null;
};

async function runFixtureFlow(
  dir: string,
  execText: (command: string, cwd?: string) => Promise<string>,
): Promise<FixtureFlowResult> {
  const result = await runRinaAgent(
    {
      sessionId: `fixture-${path.basename(dir)}`,
      userMessage: "fix this repo",
      cwd: dir,
      recentTranscript: [],
      recentCommands: [],
      lastError: null,
    },
    {
      cwd: dir,
      execText,
    },
  );

  const payload = result.pendingApproval?.payload as { path: string; newContent: string; rerunCommand?: string } | undefined;
  if (result.pendingApproval?.kind !== "file_patch" || !payload) {
    return { patchPath: null, rerunOutput: null };
  }

  const patchResult = await executeTool(
    {
      tool: "applyPatch",
      path: payload.path,
      newContent: payload.newContent,
    },
    { cwd: dir },
  );
  assert.equal(patchResult.ok, true);

  const rerunResult = await executeTool(
    {
      tool: "runCommand",
      command: payload.rerunCommand || "npm run build",
    },
    {
      cwd: dir,
      execText,
    },
  );
  if (rerunResult.ok) {
    return {
      patchPath: payload.path,
      rerunOutput: null,
    };
  }
  return {
    patchPath: payload.path,
    rerunOutput: String(rerunResult.error || ""),
  };
}

test("fixture flows cover missing file, rimraf cleanup, weak tsc, and tsc -b project reference patterns", async () => {
  await withTempRepo("rina-agent-fixture-missing-", async (dir) => {
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

    const flow = await runFixtureFlow(dir, async (command) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "npm test") {
        if (fs.existsSync(path.join(dir, "test-presentation.js"))) return "(no output)";
        throw new Error(`Error: Cannot find module '${path.join(dir, "test-presentation.js")}'`);
      }
      if (command.startsWith("rg -n")) return "package.json:4:test-presentation.js";
      throw new Error(`Unexpected command: ${command}`);
    });

    assert.equal(flow.patchPath, "test-presentation.js");
    assert.equal(flow.rerunOutput, null);
  });

  await withTempRepo("rina-agent-fixture-rimraf-", async (dir) => {
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

    const flow = await runFixtureFlow(dir, async (command) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "npm run build") {
        const pkg = JSON.parse(await fsp.readFile(path.join(dir, "package.json"), "utf8")) as { scripts?: Record<string, string> };
        if (String(pkg.scripts?.clean || "").includes("node -e")) throw new Error("sh: 1: webpack: not found");
        throw new Error("Command failed: /bin/bash -lc npm run build");
      }
      if (command === "npm run clean") {
        const pkg = JSON.parse(await fsp.readFile(path.join(dir, "package.json"), "utf8")) as { scripts?: Record<string, string> };
        if (String(pkg.scripts?.clean || "").includes("node -e")) return "(no output)";
        throw new Error("sh: 1: rimraf: not found");
      }
      if (command.startsWith("rg -n")) return "package.json:4:rimraf out dist *.vsix";
      throw new Error(`Unexpected command: ${command}`);
    });

    assert.equal(flow.patchPath, "package.json");
    assert.match(flow.rerunOutput || "", /webpack: not found/i);
  });

  await withTempRepo("rina-agent-fixture-tsc-", async (dir) => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true });
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "rinawarp-vscode-demo",
          engines: {
            vscode: "^1.90.0",
          },
          scripts: {
            compile: "tsc -p ./",
            package: "vsce package",
            build: "npm run compile && npm run package",
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
    await fsp.writeFile(path.join(dir, "src", "rinawarpClient.ts"), "import * as vscode from \"vscode\";\nconsole.log(vscode);\nfetch(\"/\");\n", "utf8");

    const flow = await runFixtureFlow(dir, async (command) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "npm run build") {
        const tsconfig = await fsp.readFile(path.join(dir, "tsconfig.json"), "utf8");
        if (tsconfig.includes("\"DOM\"") && tsconfig.includes("\"vscode\"") && tsconfig.includes("\"node\"")) {
          throw new Error("sh: 1: vsce: not found");
        }
        throw new Error("Command failed: /bin/bash -lc npm run build");
      }
      if (command === "npm run compile") throw new Error("Command failed: /bin/bash -lc npm run compile");
      if (command === "tsc -p ./") {
        const tsconfig = await fsp.readFile(path.join(dir, "tsconfig.json"), "utf8");
        if (tsconfig.includes("\"DOM\"") && tsconfig.includes("\"vscode\"") && tsconfig.includes("\"node\"")) return "(no output)";
        throw new Error([
          "src/rinawarpClient.ts(1,25): error TS2307: Cannot find module 'vscode' or its corresponding type declarations.",
          "src/rinawarpClient.ts(2,1): error TS2584: Cannot find name 'console'. Do you need to change the 'lib' compiler option to include 'dom'?",
          "src/rinawarpClient.ts(3,1): error TS2304: Cannot find name 'fetch'.",
        ].join("\n"));
      }
      if (command.startsWith("rg -n")) return "src/rinawarpClient.ts:1:import * as vscode from \"vscode\";";
      throw new Error(`Unexpected command: ${command}`);
    });

    assert.equal(flow.patchPath, "tsconfig.json");
    assert.match(flow.rerunOutput || "", /vsce: not found/i);
  });

  await withTempRepo("rina-agent-fixture-tsbuild-", async (dir) => {
    await fsp.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await fsp.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "belly-dump-demo",
          scripts: {
            build: "tsc -b && vite build",
          },
          devDependencies: {
            "@types/node": "^24.0.0",
            typescript: "^5.0.0",
            vite: "^7.0.0",
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
          references: [
            { path: "./tsconfig.app.json" },
            { path: "./tsconfig.node.json" },
          ],
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
            lib: ["ES2022", "DOM"],
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

    const flow = await runFixtureFlow(dir, async (command) => {
      if (command === "git status --short --branch") throw new Error("fatal: not a git repository");
      if (command === "pnpm run build") {
        const nodeConfig = await fsp.readFile(path.join(dir, "tsconfig.node.json"), "utf8");
        if (nodeConfig.includes("\"node\"")) {
          throw new Error("src/components/ui/resizable.tsx(9,51): error TS2339: Property 'PanelGroup' does not exist on type 'typeof import(\"react-resizable-panels\")'.");
        }
        throw new Error("Command failed: /bin/bash -lc pnpm run build");
      }
      if (command === "tsc -b") {
        const nodeConfig = await fsp.readFile(path.join(dir, "tsconfig.node.json"), "utf8");
        if (nodeConfig.includes("\"node\"")) return "src/components/ui/resizable.tsx(9,51): error TS2339: Property 'PanelGroup' does not exist on type 'typeof import(\"react-resizable-panels\")'.";
        throw new Error("Command failed: /bin/bash -lc tsc -b");
      }
      if (command.startsWith("rg -n")) return "src/components/ui/resizable.tsx:9:PanelGroup";
      throw new Error(`Unexpected command: ${command}`);
    });

    assert.equal(flow.patchPath, "tsconfig.node.json");
    assert.match(flow.rerunOutput || "", /TS2339|react-resizable-panels/i);
  });
});
