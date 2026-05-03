import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getRinaUsageStatus,
  recordAgentRunStarted,
} from "./rina-usage-meter.js";

function makeUsageFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rina-usage-meter-"));
  return path.join(dir, "rina-usage.json");
}

async function withUsageFile<T>(fn: (usageFile: string) => Promise<T>): Promise<T> {
  const usageFile = makeUsageFile();
  const previous = process.env.RINAWARP_USAGE_FILE;
  process.env.RINAWARP_USAGE_FILE = usageFile;
  try {
    return await fn(usageFile);
  } finally {
    if (previous == null) delete process.env.RINAWARP_USAGE_FILE;
    else process.env.RINAWARP_USAGE_FILE = previous;
    fs.rmSync(path.dirname(usageFile), { recursive: true, force: true });
  }
}

test("free allows 10 runs per day and blocks the 11th", async () => {
  await withUsageFile(async () => {
    for (let index = 0; index < 10; index += 1) {
      const result = await recordAgentRunStarted("free");
      assert.equal(result.ok, true);
    }
    const blocked = await recordAgentRunStarted("free");
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason, /10 free agent runs/i);
  });
});

test("pro allows monthly count", async () => {
  await withUsageFile(async () => {
    const result = await recordAgentRunStarted("pro_monthly");
    assert.equal(result.ok, true);
    const status = await getRinaUsageStatus("pro_monthly");
    assert.equal(status.remainingAgentRunsThisMonth, 299);
  });
});

test("month reset works", async () => {
  await withUsageFile(async (usageFile) => {
    fs.mkdirSync(path.dirname(usageFile), { recursive: true });
    fs.writeFileSync(usageFile, JSON.stringify({
      dayKey: new Date().toISOString().slice(0, 10),
      monthKey: "1999-01",
      agentRunsToday: 4,
      agentRunsThisMonth: 300,
      toolCallsToday: 1,
      patchBytesToday: 2,
    }, null, 2));
    const status = await getRinaUsageStatus("pro_monthly");
    assert.equal(status.usage.agentRunsThisMonth, 0);
    assert.equal(status.remainingAgentRunsThisMonth, 300);
  });
});

test("day reset works", async () => {
  await withUsageFile(async (usageFile) => {
    fs.mkdirSync(path.dirname(usageFile), { recursive: true });
    fs.writeFileSync(usageFile, JSON.stringify({
      dayKey: "1999-01-01",
      monthKey: new Date().toISOString().slice(0, 7),
      agentRunsToday: 10,
      agentRunsThisMonth: 20,
      toolCallsToday: 7,
      patchBytesToday: 300,
    }, null, 2));
    const status = await getRinaUsageStatus("free");
    assert.equal(status.usage.agentRunsToday, 0);
    assert.equal(status.remainingAgentRunsToday, 10);
    assert.equal(status.usage.agentRunsThisMonth, 20);
  });
});
