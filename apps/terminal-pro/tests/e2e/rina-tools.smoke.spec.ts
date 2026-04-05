/**
 * Rina Tools - Smoke Tests (Dev Mode)
 * 
 * Safe, dev-mode smoke tests that verify terminal, filesystem, 
 * and system modules work correctly.
 * 
 * Run: npx playwright test tests/e2e/rina-tools.smoke.spec.ts
 */

import { test, expect } from "@playwright/test";
import { safeExec } from "../../src/rina/tools/terminal.js";
import { safeRead, safeWrite, safeDelete } from "../../src/rina/tools/filesystem.js";
import { safeShutdown, safeRestart, setMode, getMode } from "../../src/rina/tools/system.js";

test.describe("Rina Tools - Smoke Tests (Dev Mode)", () => {

  test("Terminal: safeExec executes allowed commands", async () => {
    const result = await safeExec("echo RinaTest");
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("RinaTest");
  });

  test("Terminal: blocks unsafe commands", async () => {
    const result = await safeExec("rm -rf /");
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Blocked");
  });

  test("Filesystem: safeWrite and safeRead works", async () => {
    const filePath = "./rina-test.txt";
    const content = "Hello Rina!";
    const writeOk = await safeWrite(filePath, content);
    expect(writeOk).toBe(true);

    const readContent = await safeRead(filePath);
    expect(readContent).toBe(content);

    const deleteOk = await safeDelete(filePath);
    expect(deleteOk).toBe(true);

    const readAfterDelete = await safeRead(filePath);
    expect(readAfterDelete).toBeNull();
  });

  test("System: safeShutdown and safeRestart are dev-safe", async () => {
    const shutdownMsg = safeShutdown();
    expect(shutdownMsg).toContain("Simulated shutdown");

    const restartMsg = safeRestart();
    expect(restartMsg).toContain("Simulated restart");
  });

  test("System: mode switching works", async () => {
    setMode("auto");
    expect(getMode()).toBe("auto");

    setMode("assist");
    expect(getMode()).toBe("assist");

    setMode("explain");
    expect(getMode()).toBe("explain");
  });

});
