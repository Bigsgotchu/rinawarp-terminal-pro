import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chooseInlineRinaRoute, runInlineRina } from "./inline-rina.js";
import { RinaCloudError } from "./rina-cloud-client.js";
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
      RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "{\"explanation\":\"Check the port owner first.\",\"command\":\"lsof -i :3000\",\"risk\":\"low\"}",
      RINAWARP_INLINE_RINA_TEST_JSON: "",
      RINAWARP_INLINE_RINA_TEST_ERROR: "",
    },
    () =>
      runInlineRina({
        request: {
          prompt: "explain this odd shell output",
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
  assert.equal(result.usage?.model, "env-mock");
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

test("first-run inspect prompts stay useful without cloud configuration", async () => {
  await withEnv(
    {
      RINA_CLOUD_API_BASE: "",
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

test("project overview question inspects package metadata and shallow files", async () => {
  await withTempRepo(
    "rina-project-overview-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "demo-app",
        description: "A demo app for testing project understanding.",
        scripts: {
          dev: "vite --host 0.0.0.0",
          build: "vite build",
          test: "vitest run",
        },
        dependencies: { vite: "^5.0.0" },
        devDependencies: { vitest: "^1.0.0", typescript: "^5.0.0" },
      }, null, 2));
      fs.writeFileSync(path.join(dir, "README.md"), "# Demo App\n\nThis app shows project-aware Rina answers.");
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "What does this project do?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /demo-app/);
      assert.match(result.explanation, /demo app for testing project understanding/i);
      assert.match(result.explanation, /Scripts include/);
      assert.equal(result.command, null);
      assert.equal(result.risk, "low");
    },
  );
});

test("run-app project question proposes the package run command with approval", async () => {
  await withTempRepo(
    "rina-project-run-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "runner",
        scripts: {
          dev: "vite",
          build: "vite build",
        },
      }, null, 2));
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "How do I run this app?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /dev/);
      assert.equal(result.command, "pnpm dev");
      assert.equal(result.risk, "medium");
      assert.equal(result.confirmation, true);
    },
  );
});

test("main-packages project question answers from dependency metadata", async () => {
  await withTempRepo(
    "rina-project-packages-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "package-demo",
        dependencies: {
          react: "^18.0.0",
          vite: "^5.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
          vitest: "^1.0.0",
        },
      }, null, 2));
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "What are the main packages?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /react/);
      assert.match(result.explanation, /typescript/);
      assert.equal(result.command, null);
      assert.equal(result.confirmation, false);
    },
  );
});

test("architecture project question summarizes top-level project structure", async () => {
  await withTempRepo(
    "rina-project-architecture-",
    (dir) => {
      fs.mkdirSync(path.join(dir, "src", "renderer"), { recursive: true });
      fs.mkdirSync(path.join(dir, "services", "api"), { recursive: true });
      fs.writeFileSync(path.join(dir, "src", "renderer", "Shell.tsx"), "export function Shell() { return null }\n");
      fs.writeFileSync(path.join(dir, "services", "api", "index.ts"), "export {}\n");
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "architecture-demo",
        scripts: { build: "tsc -b" },
        dependencies: { react: "^18.0.0" },
        devDependencies: { typescript: "^5.0.0" },
      }, null, 2));
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "Explain the architecture.",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /architecture-demo/);
      assert.match(result.explanation, /src\//);
      assert.match(result.explanation, /services\//);
      assert.equal(result.command, null);
      assert.equal(result.risk, "low");
    },
  );
});

test("build-script project question answers from package.json without running anything", async () => {
  await withTempRepo(
    "rina-project-build-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "builder",
        scripts: {
          build: "tsc -b",
        },
      }, null, 2));
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "Where is the build script?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /package\.json/);
      assert.match(result.explanation, /tsc -b/);
      assert.equal(result.command, null);
      assert.equal(result.confirmation, false);
    },
  );
});

test("project run question inspects package scripts instead of prior run metadata", async () => {
  await withTempRepo(
    "rina-project-understand-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }, null, 2));
      fs.mkdirSync(path.join(dir, "src"));
      fs.writeFileSync(path.join(dir, "src", "index.ts"), "export const answer = 42\n");
      fs.writeFileSync(path.join(dir, "test.js"), "console.log('tests passed')\n");
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "rina-test-project",
        scripts: {
          build: "tsc",
          test: "node test.js",
        },
      }, null, 2));
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "What is this project and how do I run it?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /package\.json/);
      assert.match(result.explanation, /npm run build/);
      assert.match(result.explanation, /npm run test/);
      assert.doesNotMatch(result.explanation, /Last run ID|Proof reference/i);
      assert.equal(result.command, null);
      assert.equal(result.confirmation, false);
    },
  );
});

test("tests-failing project question asks to run the existing test script first", async () => {
  await withTempRepo(
    "rina-project-tests-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "package-lock.json"), "{}");
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "tester",
        scripts: {
          test: "node --test test/*.mjs",
        },
      }, null, 2));
    },
    async (dir) => {
      const result = await withEnv(
        {
          RINAWARP_INLINE_RINA_TEST_JSON: "",
          RINAWARP_INLINE_RINA_TEST_ERROR: "",
          RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
        },
        () =>
          runInlineRina({
            request: {
              prompt: "Why are tests failing?",
              projectRoot: dir,
              action: "suggestNextCommand",
            },
            session: {
              cwd: dir,
              transcriptBuffer: "$ pwd\n",
            },
          }),
      );

      assert.match(result.explanation, /don't have a failing test log yet/i);
      assert.equal(result.command, "npm run test");
      assert.equal(result.risk, "medium");
      assert.equal(result.confirmation, true);
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

test("general prompt calls Rina Cloud client", async () => {
  let calls = 0;
  const result = await withTempRepo(
    "rina-cloud-general-",
    (dir) => {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "cloud-demo" }, null, 2));
    },
    (dir) =>
      runInlineRina({
        request: {
          prompt: "What does this project do?",
          projectRoot: dir,
          action: "suggestNextCommand",
        },
        session: {
          cwd: dir,
          transcriptBuffer: "$ pwd\n",
        },
      }, {
        cloudClient: {
          async chat(request) {
            calls += 1;
            assert.equal(request.message, "What does this project do?");
            assert.equal(request.workspace.name, "cloud-demo");
            assert.ok(request.workspace.tree?.includes("package.json"));
            assert.equal(request.workspace.scripts?.build, undefined);
            assert.deepEqual(request.workspace.dependencies, []);
            return {
              reply: "This is a cloud-backed project answer.",
              suggestedActions: [],
              usage: { inputTokens: 12, outputTokens: 8 },
            };
          },
        },
      }),
  );

  assert.equal(calls, 1);
  assert.equal(result.explanation, "This is a cloud-backed project answer.");
  assert.equal(result.command, null);
  assert.equal(result.usage?.model, "rina-cloud");
});

test("known local workflows do not call Rina Cloud", async () => {
  let calls = 0;
  const result = await runInlineRina({
    request: {
      prompt: "Why is my disk full?",
      action: "suggestNextCommand",
    },
    session: {
      cwd: process.cwd(),
      transcriptBuffer: "$ pwd\n",
    },
  }, {
    cloudClient: {
      async chat() {
        calls += 1;
        throw new Error("cloud should not be called for disk inspection");
      },
    },
  });

  assert.equal(calls, 0);
  assert.match(String(result.command), /df -h/);
  assert.equal(result.risk, "low");
});

test("cloud suggested destructive command is never auto-executed", async () => {
  const result = await runInlineRina({
    request: {
      prompt: "clean this project",
      projectRoot: process.cwd(),
      action: "suggestNextCommand",
    },
    session: {
      cwd: process.cwd(),
      transcriptBuffer: "$ pwd\n",
    },
  }, {
    cloudClient: {
      async chat() {
        return {
          reply: "I can suggest a cleanup, but local approval is required.",
          suggestedActions: [{
            label: "Remove build artifacts",
            command: "rm -rf dist",
            risk: "destructive",
            expectedEffect: "Deletes generated build output.",
            rollbackAwareness: "Regenerate with the build script.",
            verificationHint: "List the directory after approval.",
          }],
          usage: { inputTokens: 20, outputTokens: 15 },
        };
      },
    },
  });

  assert.equal(result.command, "rm -rf dist");
  assert.equal(result.risk, "high");
  assert.equal(result.confirmation, true);
  assert.equal(result.pendingApproval?.kind, "command");
  assert.match(String(result.confirmationMessage), /classify it locally/i);
});

test("cloud auth and billing errors render clear account messages", async () => {
  const cases = [
    { status: 401, code: "auth_required", match: /Sign in to Rina Cloud/i },
    { status: 402, code: "subscription_required", match: /subscription is not active|Upgrade to Rina Pro/i },
    { status: 429, code: "daily_usage_limit_reached", match: /usage limit/i },
  ];

  for (const item of cases) {
    const result = await runInlineRina({
      request: {
        prompt: "What does this project do?",
        projectRoot: process.cwd(),
        action: "suggestNextCommand",
      },
      session: {
        cwd: process.cwd(),
        transcriptBuffer: "$ pwd\n",
      },
    }, {
      cloudClient: {
        async chat() {
          throw new RinaCloudError({
            status: item.status,
            code: item.code,
            message: item.code,
            upgradeUrl: "https://www.rinawarptech.com/pricing",
          });
        },
      },
    });

    assert.equal(result.command, null);
    assert.equal(result.confirmation, false);
    assert.match(result.explanation, item.match);
    assert.match(result.explanation, /rinawarptech\.com\/pricing/);
  }
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

test("missing cloud configuration still allows the inspection agent slice", async () => {
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

test("cloud failure falls back safely", async () => {
  const result = await withEnv(
    {
      RINA_CLOUD_API_BASE: "https://rina-cloud.invalid",
      RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT: "",
      RINAWARP_INLINE_RINA_TEST_JSON: "",
      RINAWARP_INLINE_RINA_TEST_ERROR: "",
    },
    () =>
      runInlineRina({
        request: {
          prompt: "explain this odd shell output",
          action: "suggestNextCommand",
        },
        session: {
          cwd: process.cwd(),
          transcriptBuffer: "$ pwd\n",
        },
      }, {
        cloudClient: {
          async chat() {
            throw new Error("invalid cloud response");
          },
        },
      }),
  );

  assert.equal(result.command, null);
  assert.equal(result.risk, "low");
  assert.equal(result.confirmation, false);
  assert.match(result.explanation, /Rina Cloud is unavailable\. Local recovery workflows still work\./);
  assert.match(result.explanation, /invalid cloud response/i);
});
