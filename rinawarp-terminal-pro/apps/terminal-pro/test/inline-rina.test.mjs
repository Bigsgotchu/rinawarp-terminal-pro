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

function responsesApiPayload(outputText, usage = { input_tokens: 10, output_tokens: 5, total_tokens: 15 }) {
  return {
    id: "resp_test_123",
    object: "response",
    created_at: Date.now(),
    status: "completed",
    model: "gpt-4.1-mini",
    output: [
      {
        id: "msg_test_123",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: outputText,
            annotations: [],
          },
        ],
      },
    ],
    usage,
  };
}

test("test override path returns the mocked inline result", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  try {
    const result = await withEnv(
      {
        OPENAI_API_KEY: "",
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

test("valid JSON model output is normalized into an inline result", async () => {
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

  const restoreFetch = mockFetchJson(
    responsesApiPayload('{"explanation":"Inspect git state first.","command":"git status --short --branch","risk":"low"}'),
  );

  try {
    const result = await withEnv(
      {
        OPENAI_API_KEY: "test-key",
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

    assert.equal(result.explanation, "Inspect git state first.");
    assert.equal(result.command, "git status --short --branch");
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, true);
    assert.equal(result.usage?.model, "gpt-4.1-mini");
    assert.equal(result.usage?.promptTokens, 10);
    assert.equal(result.usage?.responseTokens, 5);
    assert.equal(result.usage?.totalTokens, 15);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("missing fields in model output fall back to defaults and inferred risk", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchJson(
    responsesApiPayload('{"command":"npm test"}'),
  );

  try {
    const result = await withEnv(
      {
        OPENAI_API_KEY: "test-key",
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

    assert.match(result.explanation, /most likely next step/i);
    assert.equal(result.command, "npm test");
    assert.equal(result.risk, "medium");
    assert.equal(result.confirmation, true);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("malformed model output falls back safely to explanation-only", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchJson(
    responsesApiPayload("this is not valid json"),
  );

  try {
    const result = await withEnv(
      {
        OPENAI_API_KEY: "test-key",
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

    assert.match(result.explanation, /could not generate a reliable inline result|more specific request/i);
    assert.equal(result.command, null);
    assert.equal(result.risk, "low");
    assert.equal(result.confirmation, false);
  } finally {
    restoreFetch();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("OpenAI error path returns a safe explanation-only result", async () => {
  const repo = withTempRepo((dir) => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo" }, null, 2));
  });

  const restoreFetch = mockFetchError("synthetic network failure");

  try {
    const result = await withEnv(
      {
        OPENAI_API_KEY: "test-key",
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

    assert.match(result.explanation, /could not generate a reliable inline result/i);
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
