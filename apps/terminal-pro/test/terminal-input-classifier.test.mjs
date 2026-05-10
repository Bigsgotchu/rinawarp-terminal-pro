import test from "node:test";
import assert from "node:assert/strict";

const { classifyTerminalInput } = await import("../dist-electron/terminal-input-classifier.js");

const cases = [
  ["git status", "terminal"],
  ["pnpm test", "terminal"],
  ["docker compose up", "terminal"],
  ["cd /tmp", "terminal"],
  ["NODE_ENV=production npm run build", "terminal"],
  ["npm run dev -- --watch", "terminal"],
  ["./scripts/dev.sh", "terminal"],
  ["cat package.json | rg scripts", "terminal"],
  ["hi rina", "rina"],
  ["hello", "rina"],
  ["hey rina", "rina"],
  ["why did this fail", "rina"],
  ["help me run this app", "rina"],
  ["explain this output", "rina"],
  ["fix the build error", "rina"],
  ["My build is failing", "rina"],
  ["what is using port 3000", "rina"],
  ["how do I set up docker for this app?", "rina"],
  ["run tests", "ambiguous"],
  ["build app", "ambiguous"],
  ["start server", "ambiguous"],
  ["fix this", "ambiguous"],
  ["deploy", "ambiguous"],
  ["open package json", "ambiguous"],
  ["kill port 3000", "ambiguous"],
];

for (const [input, expected] of cases) {
  test(`classifies "${input}" as ${expected}`, () => {
    assert.equal(classifyTerminalInput(input).kind, expected);
  });
}

test("returns a reason for diagnostics", () => {
  assert.match(classifyTerminalInput("git status").reason, /shell|command/i);
});
