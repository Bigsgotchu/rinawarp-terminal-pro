import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withApp } from "./_app";

const SELECTORS = {
  terminalInput: '[data-testid="terminal-input"]',
  terminalRoot: '[data-testid="terminal-root"]',
  activityStream: '[data-testid="activity-stream-panel"]',
  firstRunCard: '[data-testid="first-run-card"]',
  firstRunExample: '[data-testid="first-run-example"]',
  inlineRinaResult: '[data-testid="inline-rina-result"]',
  explicitChoice: '[data-testid="input-route-choice"]',
  approveButton: '[data-testid="approve-inline-command"]',
  explainFailureButton: '[data-testid="explain-failure"]',
  suggestFixButton: '[data-testid="suggest-fix"]',
  askRinaButton: '[data-testid="ask-rina-selection"]',
  settingsButton: '[data-testid="tab-settings"]',
  diagnosticsNav: '[data-testid="settings-diagnostics"]',
  diagnosticsOutput: '[data-testid="inline-runs-output"]',
  terminalDrawer: "#terminalDrawer",
};

test.describe("RinaWarp Terminal Pro acceptance gate", () => {
  test("mocked OpenAI inline Rina result renders and approves end-to-end", async () => {
    const mockedInlineResult = JSON.stringify({
      explanation: "Check git status first before making changes.",
      command: "git status --short --branch",
      risk: "low",
    });

    await withApp(
      async ({ page }) => {
        await focusTerminalComposer(page);

        await sendInput(page, "/rina git status");

        const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
        await expect(inlineResult).toBeVisible({ timeout: 8_000 });
        await expect(inlineResult).toContainText("Check git status first before making changes.");
        await expect(inlineResult).toContainText("git status --short --branch");
        await expect(inlineResult).toContainText("Risk: low");

        const beforeApprove = await terminalText(page);
        await page.locator(SELECTORS.approveButton).last().click();
        await waitForTerminalToChange(page, beforeApprove, 10_000);

        await expect(page.locator(SELECTORS.activityStream)).toContainText(/Approving suggested command|Suggested command approved/i);
        await expect(page.locator(SELECTORS.activityStream)).toContainText(/On branch|fatal: not a git repository|working tree|## /i);
      },
      {
        RINAWARP_INLINE_RINA_TEST_JSON: mockedInlineResult,
      },
    );
  });

  test("missing OPENAI_API_KEY shows a clear inline configuration message", async () => {
    await withApp(
      async ({ page }) => {
        await focusTerminalComposer(page);

        await sendInput(page, "/rina git status");

        const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
        await expect(inlineResult).toBeVisible({ timeout: 8_000 });
        await expect(inlineResult).toContainText("Rina is not configured yet.");
        await expect(inlineResult).toContainText("Set OPENAI_API_KEY");
        await expect(inlineResult).toContainText("Risk: low");
        await expect(inlineResult).toContainText("No command proposed");
        await expect(page.locator(SELECTORS.approveButton)).toHaveCount(0);
      },
      {
        OPENAI_API_KEY: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
    );
  });

  test("greeting routes directly to Rina without the chooser", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "hi rina");

      await expectNoVisible(page, SELECTORS.explicitChoice, 1200);
      await expectNoVisible(page, SELECTORS.approveButton, 1200);
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/I('|’)m here|Tell me what you want to do|inspect this repo/i, {
        timeout: 8_000,
      });
    });
  });

  test("fix this repo shows agent activity in the inline result", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "/rina fix this repo");

      const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
      await expect(inlineResult).toBeVisible({ timeout: 8_000 });
      await expect(inlineResult).toContainText(/Using listFiles|Using readFile|Using getGitStatus|Using runCommand/i);
      await expect(inlineResult).toContainText(/I inspected the repo|checking the repo structure|Approval needed/i);
    });
  });

  test("free limit reached shows upgrade message and does not start tool execution", async () => {
    const usageDir = fs.mkdtempSync(path.join(os.tmpdir(), "rina-e2e-usage-"));
    const usageFile = path.join(usageDir, "rina-usage.json");
    fs.writeFileSync(usageFile, JSON.stringify({
      dayKey: new Date().toISOString().slice(0, 10),
      monthKey: new Date().toISOString().slice(0, 7),
      agentRunsToday: 10,
      agentRunsThisMonth: 10,
      toolCallsToday: 0,
      patchBytesToday: 0,
    }, null, 2));

    try {
      await withApp(async ({ page }) => {
        await focusTerminalComposer(page);
        await sendInput(page, "/rina fix this repo");

        const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
        await expect(inlineResult).toBeVisible({ timeout: 8_000 });
        await expect(inlineResult).toContainText(/used today's 10 free agent runs/i);
        await expect(inlineResult).toContainText("Upgrade");
        await expect(inlineResult).not.toContainText(/Using listFiles|Using readFile|Using getGitStatus|Using runCommand/i);
      }, {
        RINAWARP_USAGE_FILE: usageFile,
      });
    } finally {
      fs.rmSync(usageDir, { recursive: true, force: true });
    }
  });

  test("malformed model output falls back safely to explanation-only", async () => {
    await withApp(
      async ({ page }) => {
        await focusTerminalComposer(page);

        await sendInput(page, "/rina git status");

        const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
        await expect(inlineResult).toBeVisible({ timeout: 8_000 });
        await expect(inlineResult).toContainText("Rina could not generate a reliable inline result.");
        await expect(inlineResult).toContainText("Model returned invalid JSON.");
        await expect(inlineResult).toContainText("Risk: low");
        await expect(inlineResult).toContainText("No command proposed");
        await expect(page.locator(SELECTORS.approveButton)).toHaveCount(0);
      },
      {
        OPENAI_API_KEY: "test-key",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
        RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "not valid json",
        RINAWARP_INLINE_RINA_TEST_ERROR: "",
      },
    );
  });

  test("model exception returns a safe explanation-only result", async () => {
    await withApp(
      async ({ page }) => {
        await focusTerminalComposer(page);

        await sendInput(page, "/rina git status");

        const inlineResult = page.locator(SELECTORS.inlineRinaResult).last();
        await expect(inlineResult).toBeVisible({ timeout: 8_000 });
        await expect(inlineResult).toContainText("Rina could not generate a reliable inline result.");
        await expect(inlineResult).toContainText("Synthetic model failure");
        await expect(inlineResult).toContainText("Risk: low");
        await expect(inlineResult).toContainText("No command proposed");
        await expect(page.locator(SELECTORS.approveButton)).toHaveCount(0);
      },
      {
        OPENAI_API_KEY: "test-key",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
        RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        RINAWARP_INLINE_RINA_TEST_ERROR: "Synthetic model failure",
      },
    );
  });

  test("workspace presents one terminal-native Rina surface", async () => {
    await withApp(async ({ page }) => {
      await expect(page.locator(".topbar .app-title")).toBeVisible();
      await expect(page.locator(".topbar .app-title")).toHaveText("Rina — AI Terminal Assistant");
      await expect(page.locator(".app-subtitle")).toHaveText("Tell Rina what’s broken. She’ll inspect, explain, ask permission, and use the terminal safely.");
      await expect(page.getByTestId("nav-sessions")).toBeVisible();
      await expect(page.getByTestId("nav-diagnostics")).toBeVisible();
      await expect(page.locator("#modeAgent")).toHaveCount(0);
      await expect(page.locator("#modeCode")).toHaveCount(0);
      await expect(page.locator("#modeTerminal")).toHaveCount(0);
      await expect(page.locator("#wsPath")).toBeVisible();
      await expect(page.locator(SELECTORS.activityStream)).toBeVisible();
      await expect(page.locator(SELECTORS.terminalDrawer)).not.toHaveAttribute("open", "");
      await expect(page.locator(SELECTORS.terminalInput)).toHaveAttribute("placeholder", /Ask Rina to fix something/i);
      await expect(page.locator(SELECTORS.terminalInput)).toBeVisible();
      await expect(page.locator(SELECTORS.firstRunCard)).toBeVisible();
      await expect(page.locator(SELECTORS.firstRunCard)).toContainText("Talk to Rina");
      await expect(page.locator(SELECTORS.firstRunCard)).toContainText("Rina will inspect safely");
      await expect(page.locator(".terminal-pane-label")).toHaveText("Rina’s Terminal");
      await expect(page.locator(".terminal-pane-helper")).toHaveText("Commands Rina runs appear here for transparency.");
      await expect(page.locator(SELECTORS.firstRunExample)).toHaveText([
        "Why is my disk full?",
        "What is using port 3000?",
        "My build is failing",
      ]);
    });
  });

  test("fresh launch terminal-native Rina flow", async () => {
    const mockedInlineResult = JSON.stringify({
      explanation: "Check git status first before making changes.",
      command: "git status --short --branch",
      risk: "low",
    });

    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "pwd");
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Running in terminal\.\.\.|Running in terminal\./, {
        timeout: 8_000,
      });
      await expectTerminalContains(page, /(?:^|\s)(?:\/|[A-Z]:\\)[^\s]*/i, "pwd should print the current directory");
      await expect(page.locator(SELECTORS.activityStream)).toContainText("Terminal", {
        timeout: 8_000,
      });
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/(?:^|\s)(?:\/|[A-Z]:\\)[^\s]*/i, {
        timeout: 8_000,
      });

      await sendInput(page, "git status");
      await expectNoVisible(page, SELECTORS.inlineRinaResult, 800);
      await expectNoVisible(page, SELECTORS.explicitChoice, 800);
      await expectTerminalContains(
        page,
        /(On branch|fatal: not a git repository|nothing to commit|Changes not staged|working tree|modified:|Untracked files)/i,
        "git status should run directly in the PTY",
      );

      await sendInput(page, "why did this fail?");
      await expectVisible(page, SELECTORS.inlineRinaResult, 8_000);
      await expect(page.locator(SELECTORS.inlineRinaResult).last()).toContainText(/Risk:|No command proposed|Ready to run/i);

      await sendInput(page, "build app");
      await expectVisible(page, SELECTORS.explicitChoice, 5_000);
      await expectNoTerminalEchoAfter(page, "build app", 1);

      await sendInput(page, "/rina git status");
      await expectVisible(page, SELECTORS.approveButton, 8_000);
      await expect(page.locator(SELECTORS.activityStream)).toContainText("git status");
      const beforeApprove = await terminalText(page);
      await page.locator(SELECTORS.approveButton).last().click();
      await waitForTerminalToChange(page, beforeApprove, 10_000);
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Approving suggested command|Suggested command approved/i);
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Running in terminal|Completed successfully/i);
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/On branch|fatal: not a git repository|nothing to commit|working tree/i);
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Completed successfully|Command finished with errors|That command failed/i);

      await sendInput(page, "pwd");
      await expectTerminalContains(page, /(?:^|\s)(?:\/|[A-Z]:\\)[^\s]*/i, "pwd after approve should confirm same PTY remains usable");

      await sendInput(page, "ls /definitely-not-a-real-path");
      await expectTerminalContains(
        page,
        /(No such file or directory|cannot access|The system cannot find the path specified)/i,
        "failing ls command should surface in terminal output",
      );

      const failureAction = await firstVisible(page, [SELECTORS.explainFailureButton, SELECTORS.suggestFixButton], 8_000);
      const inlineCountBeforeFailureHelp = await page.locator(SELECTORS.inlineRinaResult).count();
      await failureAction.click();
      await expect
        .poll(async () => page.locator(SELECTORS.inlineRinaResult).count(), {
          timeout: 8_000,
          message: "failure affordance should create an inline Rina result",
        })
        .toBeGreaterThan(inlineCountBeforeFailureHelp);

      await maybeExerciseSelectionAskRina(page);

      await openDiagnostics(page);
      await expect(page.locator(SELECTORS.diagnosticsOutput)).toHaveValue(/"trigger_type"|"source_text"|why did this fail|git status/i, {
        timeout: 8_000,
      });
    }, {
      RINAWARP_INLINE_RINA_TEST_JSON: mockedInlineResult,
    });
  });

  test("fast trust-but-verify routing sequence", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "pwd");
      await expectTerminalContains(page, /(?:^|\s)(?:\/|[A-Z]:\\)[^\s]*/i, "pwd should execute");

      await sendInput(page, "git status");
      await expectTerminalContains(
        page,
        /(On branch|fatal: not a git repository|nothing to commit|Changes not staged|working tree|modified:|Untracked files)/i,
        "git status should execute in terminal",
      );

      await sendInput(page, "why did this fail?");
      await expectVisible(page, SELECTORS.inlineRinaResult, 8_000);

      await sendInput(page, "build app");
      await expectVisible(page, SELECTORS.explicitChoice, 5_000);

      await sendInput(page, "ls /definitely-not-a-real-path");
      await expectTerminalContains(
        page,
        /(No such file or directory|cannot access|The system cannot find the path specified)/i,
        "failing command should surface in terminal",
      );

      await firstVisible(page, [SELECTORS.explainFailureButton, SELECTORS.suggestFixButton], 8_000);
    });
  });

  test("blocked composer send renders visible failure state", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "rm -rf /tmp/rina_e2e_policy_block_probe");

      await expect(page.locator(".markdown").filter({ hasText: "Command was not sent." }).last()).toBeVisible({
        timeout: 8_000,
      });
      await expect(page.locator(".markdown").filter({ hasText: /Destructive remove|Policy|requires/i }).last()).toBeVisible({
        timeout: 8_000,
      });
      await expectTerminalContains(page, /\[policy\] blocked interactive command:/i, "blocked command should be visible in PTY transcript");
    });
  });

  test("rapid Enter only submits one terminal command", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);
      const input = page.locator(SELECTORS.terminalInput);
      await input.fill("pwd");
      await Promise.all([
        input.press("Enter"),
        input.press("Enter"),
        input.press("Enter"),
      ]);

      await expectTerminalContains(page, /(?:^|\s)(?:\/|[A-Z]:\\)[^\s]*/i, "pwd should execute once");
      await expectUserBlockCount(page, "pwd", 1);
      await expect(page.locator(SELECTORS.activityStream).getByText(/Running in terminal\.\.\.|Running in terminal\./)).toHaveCount(1);
    });
  });

  test("natural language and terminal output appear in one unified stream", async () => {
    await withApp(async ({ page }) => {
      await sendInput(page, "pwd");

      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Running in terminal|Completed successfully|Terminal/i);
      await expect(page.locator(SELECTORS.activityStream)).toContainText("Terminal");

      await sendInput(page, "why did this fail?");

      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Thinking|Inline terminal guidance|Rina interpreted/i);
    });
  });

  test("terminal execution is narrated while the drawer stays secondary", async () => {
    await withApp(async ({ page }) => {
      await expect(page.locator(SELECTORS.activityStream)).toBeVisible();
      await expect(page.locator(SELECTORS.terminalDrawer)).not.toHaveAttribute("open", "");

      await sendInput(page, "pwd");

      await expect(page.locator(SELECTORS.activityStream)).toContainText("Rina");
      await expect(page.locator(SELECTORS.activityStream)).toContainText(/Running in terminal\.\.\.|Running in terminal\./);
      await expect(page.locator(SELECTORS.activityStream)).toContainText("Terminal");
    });
  });

  test("settings views keep consistent empty-state voice and list layout", async () => {
    await withApp(async ({ page }) => {
      await openSidebarSettings(page, "runs");
      await expect(page.locator("#settingsRunsPanel")).toContainText("No runs yet");
      await expect(page.locator("#settingsRunsPanel")).toContainText("Switch to Agent mode to start your first run.");
      await expect(page.locator("#settingsRunsPanel .list-row")).toHaveCount(2);

      await openSidebarSettings(page, "workflows");
      await expect(page.locator("#savedWorkflowList")).toContainText("No saved workflows yet");
      await expect(page.locator("#savedWorkflowList")).toContainText("Save a plan block to reuse it here.");
      await expect(page.locator("#sharedObjectList")).toContainText("No shared objects yet");
      await expect(page.locator("#sharedObjectList")).toContainText("Save a prompt or snippet to reuse it across runs.");
      await expect(page.locator("#savedWorkflowList .list-row")).toHaveCount(1);
      await expect(page.locator("#sharedObjectList .list-row")).toHaveCount(1);
      await expect(page.locator("#workflowMonitorSummary")).toBeVisible();
    });
  });

  test("cd preserves same PTY session continuity", async () => {
    await withApp(async ({ page }) => {
      await focusTerminalComposer(page);

      await sendInput(page, "pwd");
      const root = await page.locator("#projectRoot").inputValue();
      expect(root).toBeTruthy();
      const expectedParent = path.dirname(root.replace(/\\/g, "/"));

      await sendInput(page, "cd ..");
      await sendInput(page, "pwd");

      await expectTerminalContains(
        page,
        new RegExp(escapeRegExp(expectedParent), "i"),
        "pwd after cd should confirm the same PTY session changed directories",
      );
      await expectNoVisible(page, SELECTORS.explicitChoice, 800);
      await expectNoVisible(page, SELECTORS.inlineRinaResult, 800);
    });
  });
});

async function focusTerminalComposer(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.terminalInput)).toBeVisible({ timeout: 15_000 });
  await page.locator(SELECTORS.terminalInput).click();
}

async function sendInput(page: Page, text: string): Promise<void> {
  const input = page.locator(SELECTORS.terminalInput);
  await input.click();
  await input.fill(text);
  await input.press("Enter");
}

async function terminalText(page: Page): Promise<string> {
  const transcript = await page.evaluate(() => String((window as any).__ptyTranscript || "")).catch(() => "");
  if (transcript?.trim()) return transcript;
  const xtermBuffer = await page
    .evaluate(() => {
      const term = (window as any).__term;
      const buffer = term?.buffer?.active;
      if (!buffer) return "";
      const lines: string[] = [];
      for (let i = 0; i < buffer.length; i += 1) {
        lines.push(buffer.getLine(i)?.translateToString(true) || "");
      }
      return lines.join("\n");
    })
    .catch(() => "");
  if (xtermBuffer?.trim()) return xtermBuffer;
  const text = await page.locator(SELECTORS.terminalRoot).textContent().catch(() => "");
  if (text?.trim()) return text;
  return (await page.locator("body").textContent().catch(() => "")) || "";
}

async function expectTerminalContains(page: Page, pattern: RegExp, message: string): Promise<void> {
  await expect
    .poll(async () => pattern.test(await terminalText(page)), { timeout: 12_000, message })
    .toBeTruthy();
}

async function expectNoTerminalEchoAfter(page: Page, input: string, maxMatches: number): Promise<void> {
  const escaped = escapeRegExp(input);
  await expect
    .poll(async () => {
      const matches = (await terminalText(page)).match(new RegExp(escaped, "g")) || [];
      return matches.length;
    }, { timeout: 1_500 })
    .toBeLessThanOrEqual(maxMatches);
}

async function expectUserBlockCount(page: Page, text: string, expected: number): Promise<void> {
  await expect
    .poll(async () => page.locator(".stream-item--user .markdown").filter({ hasText: text }).count(), { timeout: 3_000 })
    .toBe(expected);
}

async function expectVisible(page: Page, selector: string, timeout: number): Promise<void> {
  await expect(page.locator(selector).last()).toBeVisible({ timeout });
}

async function expectNoVisible(page: Page, selector: string, timeout: number): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(0, { timeout });
}

async function firstVisible(page: Page, selectors: string[], timeout: number): Promise<Locator> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).last();
      if (await locator.isVisible().catch(() => false)) return locator;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`No visible element matched: ${selectors.join(", ")}`);
}

async function waitForTerminalToChange(page: Page, previous: string, timeout: number): Promise<void> {
  await expect
    .poll(async () => normalizeTerminalText(await terminalText(page)) !== normalizeTerminalText(previous), {
      timeout,
      message: "terminal output did not change",
    })
    .toBeTruthy();
}

async function maybeExerciseSelectionAskRina(page: Page): Promise<void> {
  const terminal = page.locator(SELECTORS.terminalRoot);
  const box = await terminal.boundingBox();
  if (!box) return;

  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(Math.min(box.x + box.width - 20, box.x + 260), box.y + 30, { steps: 8 });
  await page.mouse.up();

  const ask = page.locator(SELECTORS.askRinaButton);
  if (!(await ask.isVisible().catch(() => false))) return;

  const before = await page.locator(SELECTORS.inlineRinaResult).count();
  await ask.click();
  await expect
    .poll(async () => page.locator(SELECTORS.inlineRinaResult).count(), {
      timeout: 8_000,
      message: "selection Ask Rina should create an inline result",
    })
    .toBeGreaterThan(before);
}

async function openDiagnostics(page: Page): Promise<void> {
  await page.getByTestId("nav-diagnostics").click();
  await page.locator(SELECTORS.diagnosticsNav).click();
  await expect(page.locator(SELECTORS.diagnosticsOutput)).toBeVisible({ timeout: 8_000 });
}

async function openSidebarSettings(page: Page, tab: string): Promise<void> {
  await page.evaluate((nextTab) => {
    (window as any).openSidebarPanel?.("settings");
    (window as any).setSettingsTab?.(nextTab);
  }, tab);
  await expect(page.locator(".app")).toHaveClass(/sidebar-open/, { timeout: 5_000 });
  await expect(page.locator(`.sttab[data-st="${tab}"]`)).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
}

function normalizeTerminalText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
