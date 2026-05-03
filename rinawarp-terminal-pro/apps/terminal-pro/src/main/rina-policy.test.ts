import test from "node:test";
import assert from "node:assert/strict";
import { evaluateToolCall } from "./rina-policy.js";

test("read-oriented tool calls are allowed", () => {
  assert.deepEqual(evaluateToolCall({ tool: "listFiles", path: "." }), { kind: "allow" });
  assert.deepEqual(evaluateToolCall({ tool: "readFile", path: "package.json" }), { kind: "allow" });
  assert.deepEqual(evaluateToolCall({ tool: "searchInFiles", query: "missingThing", path: "." }), { kind: "allow" });
});

test("safe diagnostic commands are allowed by policy", () => {
  assert.deepEqual(
    evaluateToolCall({ tool: "runCommand", command: "git status --short --branch" }),
    { kind: "allow" },
  );
  assert.deepEqual(
    evaluateToolCall({ tool: "runCommand", command: "pnpm test" }),
    { kind: "allow" },
  );
});

test("applyPatch requires confirmation", () => {
  assert.deepEqual(
    evaluateToolCall({ tool: "applyPatch", path: "src/example.ts", newContent: "export {};\n" }),
    {
      kind: "confirm",
      reason: "Rina wants to modify a file in your workspace.",
      risk: "medium",
    },
  );
});

test("state-changing commands require confirmation", () => {
  assert.deepEqual(
    evaluateToolCall({ tool: "runCommand", command: "git restore src/example.ts" }),
    {
      kind: "confirm",
      reason: "That command changes local project state.",
      risk: "medium",
    },
  );
  assert.deepEqual(
    evaluateToolCall({ tool: "runCommand", command: "pnpm install" }),
    {
      kind: "confirm",
      reason: "That command changes local project state.",
      risk: "medium",
    },
  );
});

test("destructive commands are blocked", () => {
  assert.deepEqual(
    evaluateToolCall({ tool: "runCommand", command: "rm -rf node_modules" }),
    {
      kind: "block",
      reason: "That command is destructive or outside the current product scope.",
    },
  );
});
