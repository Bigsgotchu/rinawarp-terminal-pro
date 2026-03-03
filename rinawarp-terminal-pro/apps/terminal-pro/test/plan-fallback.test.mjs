import test from "node:test";
import assert from "node:assert/strict";

const { haltReasonFromFallbackStep } = await import("../dist-electron/plan-fallback.js");

test("does not halt on successful fallback step", () => {
  const halt = haltReasonFromFallbackStep({ ok: true, cancelled: false });
  assert.equal(halt, null);
});

test("halts with stop_requested on cancelled fallback step", () => {
  const halt = haltReasonFromFallbackStep({ ok: false, cancelled: true, error: "Cancelled by user." });
  assert.equal(halt, "stop_requested");
});

test("halts with step error message on failed fallback step", () => {
  const halt = haltReasonFromFallbackStep({ ok: false, cancelled: false, error: "Execution failed" });
  assert.equal(halt, "Execution failed");
});
