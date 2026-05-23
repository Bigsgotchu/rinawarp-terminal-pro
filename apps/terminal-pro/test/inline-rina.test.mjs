import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { runInlineRina, detectTerminalFailure } = await import("../dist-electron/main/inline-rina.js");

function withTempRepo(setup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rina-inline-rina-"));
  try {
    setup(dir);
    return dir;
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

async function withEnv(patch, fn) {
  const previous = new Map();
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

function mockFetchJson(payload) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  return () => {
    globalThis.fetch = previousFetch;
  };
}

function mockFetchError(message) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error(message);
  };
  return () => {
    globalThis.fetch = previousFetch;
  };
}

function mockFetchJsonWithRequest(assertRequest, payload) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assertRequest(JSON.parse(String(init?.body || "{}")));
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return () => {
    globalThis.fetch = previousFetch;
  };
}

test("test override path returns the mocked inline result", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        RINAWARP_INLINE_RINA_TEST_JSON: JSON.stringify({
          explanation: "Use git status first.",
          command: "git status --short --branch",
          risk: "low",
        }),
      },
      () =>
        runInlineRina({
          request: {
            prompt: "git status",
            projectRoot: repo,
            action: "generateCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.equal(result.explanation, "Use git status first.");
    assert.equal(result.command, "git status --short --branch");
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, true);
    assert.equal(result.usage?.model, "env-mock");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("cloud response is normalized into an inline result", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: "demo",
          scripts: {
            build: "tsc -p tsconfig.json",
          },
        },
        null,
        2,
      ),
    );
  });

  const restoreFetch = mockFetchJson({
    reply: "Inspect git state first.",
    suggestedActions: [{
      label: "Check git state",
      command: "git status --short --branch",
      risk: "read",
      expectedEffect: "Shows current branch and changes.",
      rollbackAwareness: "Read-only command.",
      verificationHint: "Review the status output.",
    }],
    usage: { inputTokens: 10, outputTokens: 5 },
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "https://rina-cloud.test",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "/rina git status",
            projectRoot: repo,
            action: "generateCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ git status\nfatal: not a git repository\n",
          },
        }),
    );

    assert.match(result.explanation, /Inspect git state first/);
    assert.match(result.explanation, /Suggested action: Check git state/);
    assert.equal(result.command, "git status --short --branch");
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, true);
    assert.equal(result.usage?.model, "rina-cloud");
    assert.equal(result.usage?.promptTokens, 10);
    assert.equal(result.usage?.responseTokens, 5);
    assert.equal(result.usage?.totalTokens, 15);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("cloud safe-write action maps to medium risk and approval", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchJson({
    reply: "Run the test script to capture the failure.",
    suggestedActions: [{
      label: "Run tests",
      command: "npm test",
      risk: "safe-write",
      expectedEffect: "Runs the test suite.",
      rollbackAwareness: "No source changes are made.",
      verificationHint: "Inspect failing test output.",
    }],
    usage: { inputTokens: 8, outputTokens: 6 },
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "https://rina-cloud.test",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "run tests",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /Run the test script/i);
    assert.equal(result.command, "npm test");
    assert.equal(result.risk, "medium");
    assert.equal(result.confirmation, true);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("project package question answers locally from dependency metadata", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "package-demo",
      dependencies: { react: "^18.0.0", vite: "^5.0.0" },
      devDependencies: { typescript: "^5.0.0", vitest: "^1.0.0" },
    }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "What are the main packages?",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /react/);
    assert.match(result.explanation, /typescript/);
    assert.equal(result.command, null);
    assert.equal(result.confirmation, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("project architecture question answers locally from file tree", async () => {
  const repo = withTempRepo((dir) => {
    fs.mkdirSync(path.join(dir, "src", "renderer"), { recursive: true });
    fs.mkdirSync(path.join(dir, "services", "api"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "renderer", "App.tsx"), "export function App() { return null }\n");
    fs.writeFileSync(path.join(dir, "services", "api", "index.ts"), "export {}\n");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "architecture-demo",
      scripts: { build: "tsc -b" },
      dependencies: { react: "^18.0.0" },
      devDependencies: { typescript: "^5.0.0" },
    }, null, 2));
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "Explain the architecture.",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /architecture-demo/);
    assert.match(result.explanation, /src\//);
    assert.match(result.explanation, /services\//);
    assert.equal(result.command, null);
    assert.equal(result.risk, "low");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("dangerous destructive prompt is explicitly blocked", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "danger-demo" }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "Delete my entire home directory",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /can't help delete your home directory/i);
    assert.match(result.explanation, /destructive and unsafe/i);
    assert.equal(result.command, null);
    assert.equal(result.confirmation, false);
    assert.equal(result.risk, "high");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("unsupported request returns conversational fallback", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "fallback-demo" }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "Deploy this to production",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /don't yet support full deployment recovery/i);
    assert.match(result.explanation, /inspect deploy scripts/i);
    assert.equal(result.command, null);
    assert.equal(result.confirmation, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("repo auth question answers from visible metadata", async () => {
  const repo = withTempRepo((dir) => {
    fs.mkdirSync(path.join(dir, "src", "auth"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "auth", "session.ts"), "export {}\n");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "auth-demo",
      dependencies: { "@auth/core": "^0.30.0" },
    }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "Where is authentication handled?",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /auth-related files/i);
    assert.match(result.explanation, /src\/auth\/session\.ts/);
    assert.match(result.explanation, /@auth\/core/);
    assert.equal(result.command, null);
    assert.equal(result.confirmation, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("cloud request includes repo tree, README, scripts, and packages", async () => {
  let calls = 0;
  const repo = withTempRepo((dir) => {
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "main.ts"), "export {}\n");
    fs.writeFileSync(path.join(dir, "docs", "architecture.md"), "# Architecture\n\nRenderer talks to main through safe IPC.");
    fs.writeFileSync(path.join(dir, "README.md"), "# Cloud Demo\n\nThis app is used for repo understanding.");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "cloud-demo",
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { react: "^18.0.0" },
      devDependencies: { typescript: "^5.0.0" },
    }, null, 2));
  });

  const restoreFetch = mockFetchJsonWithRequest((request) => {
    calls += 1;
    assert.equal(request.workspace.name, "cloud-demo");
    assert.ok(request.workspace.tree.includes("src/main.ts"));
    assert.equal(request.workspace.readme.path, "README.md");
    assert.equal(request.workspace.docs[0].path, "docs/architecture.md");
    assert.equal(request.workspace.scripts.build, "vite build");
    assert.deepEqual(request.workspace.dependencies, ["react"]);
    assert.deepEqual(request.workspace.devDependencies, ["typescript"]);
  }, {
    reply: "This is a cloud-backed project answer.",
    suggestedActions: [],
    usage: { inputTokens: 12, outputTokens: 8 },
  });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "https://rina-cloud.test",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "What does this project do?",
            projectRoot: repo,
            action: "suggestNextCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.equal(calls, 1);
    assert.equal(result.explanation, "This is a cloud-backed project answer.");
    assert.equal(result.usage?.model, "rina-cloud");
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("cloud parse error falls back safely to explanation-only", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchJson({ nope: true });

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "https://rina-cloud.test",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "git status",
            projectRoot: repo,
            action: "generateCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /Rina Cloud is unavailable\. Local recovery workflows still work\./i);
    assert.equal(result.command, null);
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, false);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("cloud error path returns a safe explanation-only result", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchError("synthetic network failure");

  try {
    const result = await withEnv(
      {
        RINA_CLOUD_API_BASE: "https://rina-cloud.test",
        RINAWARP_INLINE_RINA_TEST_JSON: "",
      },
      () =>
        runInlineRina({
          request: {
            prompt: "git status",
            projectRoot: repo,
            action: "generateCommand",
          },
          session: {
            cwd: repo,
            transcriptBuffer: "$ pwd\n",
          },
        }),
    );

    assert.match(result.explanation, /Rina Cloud is unavailable\. Local recovery workflows still work\./i);
    assert.equal(result.command, null);
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, false);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("detectTerminalFailure identifies common repo-fix blockers", () => {
  assert.deepEqual(detectTerminalFailure("fatal: not a git repository"), {
    failed: true,
    summary: "Not inside a Git repository",
  });
});
