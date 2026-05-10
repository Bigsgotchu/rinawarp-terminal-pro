import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chooseInlineRinaRoute, runInlineRina } from "./inline-rina.js";
import { getRinaUsageStatus } from "./rina-usage-meter.js";

function makeTempRepo(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function withTempRepo<T>(prefix: string, setup: (dir: string) => void, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = makeTempRepo(prefix);
  try {
    setup(dir);
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

async function withUsageFileEnv<T>(fn: () => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rina-inline-usage-"));
  const usageFile = path.join(dir, "rina-usage.json");
  return await withEnv({ RINAWARP_USAGE_FILE: usageFile }, async () => {
    try {
      return await fn();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("greeting like hi rina routes to direct chat response", () => {
  assert.equal(chooseInlineRinaRoute("hi rina"), "direct_chat");
});

test("simple one-shot request stays on inline help path", async () => {
  assert.equal(chooseInlineRinaRoute("what is using port 3000"), "inline_help");

  const result = await withEnv(
    {
      OPENAI_API_KEY: "test-key",
      RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "{\"explanation\":\"Check the port owner first.\",\"command\":\"lsof -i :3000\",\"risk\":\"low\"}",
      RINAWARP_INLINE_RINA_TEST_JSON: "",
      RINAWARP_INLINE_RINA_TEST_ERROR: "",
    },
    () =>
      runInlineRina({
        request: {
          prompt: "what is using port 3000",
          action: "suggestNextCommand",
        },
        session: {
          cwd: process.cwd(),
          transcriptBuffer: "$ pwd\n",
        },
      }),
  );

  assert.equal(result.explanation, "Check the port owner first.");
  assert.equal(result.command, "lsof -i :3000");
  assert.equal(result.usage?.model, "gpt-4.1-mini");
  assert.equal(result.agentEvents, undefined);
});

test("fix this repo routes to agent path", async () => {
  await withTempRepo(
    "rina-inline-agent-",
    (dir) => {
      execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
    },
    async (dir) => {
      assert.equal(chooseInlineRinaRoute("fix this repo"), "agent");

      const result = await withUsageFileEnv(() =>
        withEnv(
          {
            OPENAI_API_KEY: "",
            RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
            RINAWARP_INLINE_RINA_TEST_JSON: "",
            RINAWARP_INLINE_RINA_TEST_ERROR: "",
          },
          () =>
            runInlineRina({
              request: {
                prompt: "fix this repo",
                projectRoot: dir,
                action: "generateCommand",
              },
              session: {
                cwd: dir,
                transcriptBuffer: "$ git status --short --branch\n",
              },
            }),
        )
      );

      assert.equal(result.usage?.model, "rina-agent");
      assert.ok(Array.isArray(result.agentEvents));
      assert.ok(result.agentEvents.some((event) => event.type === "tool_started"));
    },
  );
});

test("failed build prompt routes to agent path", () => {
  assert.equal(chooseInlineRinaRoute("My build is failing"), "agent");
});

test("first-run inspect prompts stay useful without OPENAI_API_KEY", async () => {
  await withEnv(
    {
      OPENAI_API_KEY: "",
      RINAWARP_INLINE_RINA_TEST_JSON: "",
      RINAWARP_INLINE_RINA_TEST_ERROR: "",
      RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
    },
    async () => {
      const disk = await runInlineRina({
        request: {
          prompt: "Why is my disk full?",
          action: "suggestNextCommand",
        },
        session: {
          cwd: process.cwd(),
          transcriptBuffer: "$ pwd\n",
        },
      });

      assert.match(disk.explanation, /read-only disk evidence/i);
      assert.match(String(disk.command), /df -h/);
      assert.equal(disk.risk, "low");
      assert.equal(disk.confirmation, true);

      const port = await runInlineRina({
        request: {
          prompt: "What is using port 3000?",
          action: "suggestNextCommand",
        },
        session: {
          cwd: process.cwd(),
          transcriptBuffer: "$ pwd\n",
        },
      });

      assert.match(port.explanation, /port 3000/i);
      assert.match(String(port.command), /3000/);
      assert.equal(port.risk, "low");
      assert.equal(port.confirmation, true);
    },
  );
});

test("fix this repo consumes one agent run", async () => {
  await withTempRepo(
    "rina-inline-usage-consume-",
    (dir) => {
      execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
    },
    async (dir) => {
      await withUsageFileEnv(async () => {
        await runInlineRina({
          request: {
            prompt: "fix this repo",
            projectRoot: dir,
            action: "generateCommand",
          },
          session: {
            cwd: dir,
            transcriptBuffer: "$ pwd\n",
          },
        });
        const usage = await getRinaUsageStatus("free");
        assert.equal(usage.remainingAgentRunsToday, 9);
      });
    },
  );
});

test("normal chat does not consume an agent run", async () => {
  await withUsageFileEnv(async () => {
    await withEnv(
      {
        OPENAI_API_KEY: "test-key",
        RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "{\"explanation\":\"Hello.\",\"command\":null,\"risk\":\"low\"}",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
        RINAWARP_INLINE_RINA_TEST_ERROR: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "what can you do",
            action: "suggestNextCommand",
          },
          session: {
            cwd: process.cwd(),
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );
    const usage = await getRinaUsageStatus("free");
    assert.equal(usage.remainingAgentRunsToday, 10);
  });
});

test("limit hit returns upgrade message", async () => {
  await withTempRepo(
    "rina-inline-usage-limit-",
    (dir) => {
      execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
    },
    async (dir) => {
      await withUsageFileEnv(async () => {
        for (let index = 0; index < 10; index += 1) {
          const result = await runInlineRina({
            request: {
              prompt: "fix this repo",
              projectRoot: dir,
              action: "generateCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          });
          assert.equal(result.usage?.model, "rina-agent");
        }
        const blocked = await runInlineRina({
          request: {
            prompt: "fix this repo",
            projectRoot: dir,
            action: "generateCommand",
          },
          session: {
            cwd: dir,
            transcriptBuffer: "$ pwd\n",
          },
        });
        assert.match(blocked.explanation, /used today's 10 free agent runs/i);
        assert.equal(blocked.command, null);
      });
    },
  );
});

test("missing OPENAI_API_KEY still allows the inspection agent slice", async () => {
  await withTempRepo(
    "rina-inline-no-key-",
    (dir) => {
      execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
    },
    async (dir) => {
      const result = await withUsageFileEnv(() =>
        withEnv(
          {
            OPENAI_API_KEY: "",
            RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
            RINAWARP_INLINE_RINA_TEST_JSON: "",
            RINAWARP_INLINE_RINA_TEST_ERROR: "",
          },
          () =>
            runInlineRina({
              request: {
                prompt: "fix this repo",
                projectRoot: dir,
                action: "generateCommand",
              },
              session: {
                cwd: dir,
                transcriptBuffer: "$ pwd\n",
              },
            }),
        )
      );

      assert.equal(result.usage?.model, "rina-agent");
      assert.ok(result.agentEvents?.length);
      assert.match(result.explanation, /inspected the repo|checking the repo structure|ran/i);
    },
  );
});

test("malformed model output falls back safely", async () => {
  const result = await withEnv(
    {
      OPENAI_API_KEY: "test-key",
      RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "not valid json",
      RINAWARP_INLINE_RINA_TEST_JSON: "",
      RINAWARP_INLINE_RINA_TEST_ERROR: "",
    },
    () =>
      runInlineRina({
        request: {
          prompt: "what is using port 3000",
          action: "suggestNextCommand",
        },
        session: {
          cwd: process.cwd(),
          transcriptBuffer: "$ pwd\n",
        },
      }),
  );

  assert.equal(result.command, null);
  assert.equal(result.risk, "low");
  assert.equal(result.confirmation, false);
  assert.match(result.explanation, /could not generate a reliable inline result|invalid json/i);
});
