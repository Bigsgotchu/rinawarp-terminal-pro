import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  continueRinaAgentAfterFilePatchApproval,
  runRinaAgent,
} = await import("../dist-electron/main/rina-agent.js");
const { ExecutionSandbox } = await import("@rinawarp/rina-runtime/execution/sandbox");
const { planRinaTask } = await import("../dist-electron/rina-agent/agentPlanner.js");
const { routeRinaTask } = await import("../dist-electron/rina-agent/taskRouter.js");

async function withTempRepo(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rina-safe-patch-"));
  const usageFile = path.join(dir, ".usage.json");
  const previousUsageFile = process.env.RINAWARP_USAGE_FILE;
  process.env.RINAWARP_USAGE_FILE = usageFile;
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "safe-patch-demo", scripts: { build: "tsc -p tsconfig.json" } }, null, 2),
    );
    fs.writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "ESNext" } }, null, 2),
    );
    return await fn(dir);
  } finally {
    if (previousUsageFile == null) delete process.env.RINAWARP_USAGE_FILE;
    else process.env.RINAWARP_USAGE_FILE = previousUsageFile;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function listFilesRecursive(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursive(target) : [target];
  });
}

function buildRequest(dir) {
  return {
    sessionId: "safe-patch-test",
    userMessage: "Fix the TypeScript error in this repo.",
    cwd: dir,
    recentTranscript: [],
    recentCommands: [],
    limits: {
      maxAgentSteps: 9,
      maxToolCalls: 40,
      maxPatchBytes: 40_000,
      maxCommandMs: 5_000,
    },
  };
}

let transactionSequence = 0;

async function applyApprovedPatch(request, payload, deps = {}) {
  transactionSequence += 1;
  return continueRinaAgentAfterFilePatchApproval(request, payload, {
    ...deps,
    cwd: request.cwd,
    executionSandbox: new ExecutionSandbox(request.cwd),
    transactionId: `test-transaction-${transactionSequence}`,
  });
}

test("TypeScript build fix proposes a diff without mutating files", async () => {
  await withTempRepo(async (dir) => {
    const before = fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8");
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        throw new Error("tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.");
      }
      return "(no output)";
    };

    const result = await runRinaAgent(buildRequest(dir), { cwd: dir, execText });
    const payload = result.pendingApproval?.payload;

    assert.equal(result.pendingApproval?.kind, "file_patch");
    assert.equal(payload.path, "tsconfig.json");
    assert.equal(payload.riskLabel, "safe-write");
    assert.equal(payload.verificationCommand, "npm run build");
    assert.deepEqual(payload.filesTouched, ["tsconfig.json"]);
    assert.match(payload.unifiedDiff, /\+    "moduleResolution": "NodeNext"/);
    assert.match(payload.rollbackNotes, /backup/i);
    assert.match(payload.failureExplanation.plainEnglish, /TypeScript found a problem in tsconfig\.json/i);
    assert.match(payload.approvalBoundaryMessage, /No files have been modified yet/i);
    assert.deepEqual(payload.reviewActions, ["Approve Patch", "Deny", "View Full Diff"]);
    assert.match(payload.minimalPatchPolicy, /Smallest practical edit/i);
    assert.equal(fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8"), before);
  });
});

test("approved TypeScript patch applies, backs up, and reruns verification", async () => {
  await withTempRepo(async (dir) => {
    let buildRuns = 0;
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        buildRuns += 1;
        if (buildRuns === 1) {
          throw new Error("tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.");
        }
        return "Build passed";
      }
      return "(no output)";
    };

    const request = buildRequest(dir);
    const proposal = await runRinaAgent(request, { cwd: dir, execText });
    const payload = proposal.pendingApproval?.payload;
    assert.equal(proposal.pendingApproval?.kind, "file_patch");

    const result = await applyApprovedPatch(request, payload, { execText });
    const patched = fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8");
    const backupDir = path.join(dir, ".rinawarp", "patch-backups");

    assert.match(patched, /"moduleResolution": "NodeNext"/);
    assert.ok(fs.existsSync(backupDir));
    assert.ok(listFilesRecursive(backupDir).some((file) => file.includes("tsconfig.json")));
    assert.match(result.explanation, /verification passed/i);
    assert.equal(result.risk, "low");
  });
});

test("approved patch stops if the file changed after diff generation", async () => {
  await withTempRepo(async (dir) => {
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        throw new Error("tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.");
      }
      return "(no output)";
    };

    const request = buildRequest(dir);
    const proposal = await runRinaAgent(request, { cwd: dir, execText });
    const payload = proposal.pendingApproval?.payload;
    fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { module: "CommonJS" } }, null, 2));

    const result = await applyApprovedPatch(request, payload, { execText });

    assert.match(result.explanation, /changed after the diff was generated/i);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8"), /moduleResolution/);
  });
});

test("destructive patch paths are rejected before mutation", async () => {
  await withTempRepo(async (dir) => {
    const target = path.join(dir, "tsconfig.json");
    const before = fs.readFileSync(target, "utf8");
    const payload = {
      path: "../outside.ts",
      summary: "Attempt path traversal",
      currentContent: before,
      newContent: `${before}\n`,
      rerunCommand: "npm run build",
    };

    const result = await applyApprovedPatch(buildRequest(dir), payload);

    assert.match(result.explanation, /workspace-relative path without traversal/i);
    assert.equal(fs.readFileSync(target, "utf8"), before);
  });
});

test("symlink patch paths cannot escape the workspace", async () => {
  await withTempRepo(async (dir) => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rina-outside-"));
    try {
      fs.writeFileSync(path.join(outside, "escaped.ts"), "export const value = 1;\n");
      fs.symlinkSync(outside, path.join(dir, "linked-outside"));
      const payload = {
        path: "linked-outside/escaped.ts",
        summary: "Attempt symlink escape",
        currentContent: "export const value = 1;\n",
        newContent: "export const value = 2;\n",
        rerunCommand: "npm run build",
      };

      const result = await applyApprovedPatch(buildRequest(dir), payload);

      assert.match(result.explanation, /escapes the current workspace through a symlink/i);
      assert.equal(fs.readFileSync(path.join(outside, "escaped.ts"), "utf8"), "export const value = 1;\n");
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

test("deny causes zero mutation because apply continuation is not invoked", async () => {
  await withTempRepo(async (dir) => {
    const before = fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8");
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        throw new Error("tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.");
      }
      return "(no output)";
    };

    const result = await runRinaAgent(buildRequest(dir), { cwd: dir, execText });

    assert.equal(result.pendingApproval?.kind, "file_patch");
    assert.equal(fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8"), before);
  });
});

test("verification failure rolls back to the backup content", async () => {
  await withTempRepo(async (dir) => {
    let buildRuns = 0;
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        buildRuns += 1;
        throw new Error(buildRuns === 1
          ? "tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'."
          : "src/index.ts(18,7): error TS2322: Type 'number' is not assignable to type 'string'.");
      }
      return "(no output)";
    };
    const before = fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8");
    const request = buildRequest(dir);
    const proposal = await runRinaAgent(request, { cwd: dir, execText });

    const result = await applyApprovedPatch(request, proposal.pendingApproval.payload, { execText });

    assert.match(result.explanation, /Verification failed/i);
    assert.match(result.explanation, /restored `tsconfig\.json` from backup/i);
    assert.equal(fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8"), before);
    assert.ok(fs.existsSync(path.join(dir, ".rinawarp", "patch-backups")));
  });
});

test("approved mutation is rejected without a runtime execution sandbox", async () => {
  await withTempRepo(async (dir) => {
    const before = fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8");
    const payload = {
      path: "tsconfig.json",
      summary: "Attempt mutation without boundary",
      currentContent: before,
      newContent: `${before}\n`,
      rerunCommand: "npm run build",
    };

    const result = await continueRinaAgentAfterFilePatchApproval(buildRequest(dir), payload, { cwd: dir });

    assert.match(result.explanation, /requires an active runtime transaction sandbox/i);
    assert.equal(fs.readFileSync(path.join(dir, "tsconfig.json"), "utf8"), before);
  });
});

test("execution sandbox blocks a symlink escape directly", async () => {
  await withTempRepo(async (dir) => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rina-sandbox-outside-"));
    try {
      fs.writeFileSync(path.join(outside, "escaped.ts"), "export const value = 1;\n");
      fs.symlinkSync(outside, path.join(dir, "outside-link"));
      const sandbox = new ExecutionSandbox(dir);
      sandbox.beginTransaction("sandbox-symlink-test");

      await assert.rejects(
        sandbox.writeFile("outside-link/escaped.ts", "export const value = 2;\n"),
        /escape.*symlink/i,
      );
      assert.equal(fs.readFileSync(path.join(outside, "escaped.ts"), "utf8"), "export const value = 1;\n");
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

test("minimal patch generation stays scoped to one file and a small diff", async () => {
  await withTempRepo(async (dir) => {
    const execText = async (command) => {
      if (command === "pwd") return dir;
      if (/npm run build/i.test(command)) {
        throw new Error("tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.");
      }
      return "(no output)";
    };

    const result = await runRinaAgent(buildRequest(dir), { cwd: dir, execText });
    const payload = result.pendingApproval.payload;
    const changedLines = payload.unifiedDiff
      .split(/\r?\n/g)
      .filter((line) => /^[+-]/.test(line) && !/^---|\+\+\+/.test(line));

    assert.deepEqual(payload.filesTouched, ["tsconfig.json"]);
    assert.ok(changedLines.length <= 10, `expected a small one-file patch, saw ${changedLines.length} changed lines`);
    assert.match(payload.diffSummary, /1 file/i);
  });
});

test("existing disk recovery planning still passes", () => {
  const plan = planRinaTask({ id: "disk", message: "Why is my disk full?", cwd: process.cwd() }, "disk_recovery");

  assert.equal(plan.kind, "disk_recovery");
  assert.ok(plan.readOnlyCommands.length > 0);
  assert.ok(plan.proposedActions.some((action) => action.requiresApproval));
});

test("existing port recovery planning still passes", () => {
  const plan = planRinaTask({ id: "port", message: "Port 3000 is busy", cwd: process.cwd() }, "port_conflict", { port: 3000 });

  assert.equal(plan.kind, "port_conflict");
  assert.ok(plan.readOnlyCommands.every((command) => command.risk === "read"));
});

test("existing repo understanding routing still passes", () => {
  const result = routeRinaTask("Understand this repo");

  assert.equal(result, "unknown");
});
