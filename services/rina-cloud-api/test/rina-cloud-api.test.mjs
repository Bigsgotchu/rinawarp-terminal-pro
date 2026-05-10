import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createRinaCloudApiServer } from "../dist/index.js";
import { resolveOpenAiApiKey } from "../dist/openaiProvider.js";

async function withServer(provider, fn) {
  const server = createRinaCloudApiServer({
    provider,
    logger: {
      log() {},
      warn() {},
      error() {},
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function chatPayload() {
  return {
    message: "What does this project do?",
    workspace: {
      name: "demo",
      packageManager: "pnpm",
      files: [{ path: "package.json", summary: "scripts=build, test" }],
      packageJson: { name: "demo" },
    },
    client: {
      appVersion: "1.4.0-beta",
      platform: "linux",
    },
  };
}

test("POST /v1/agent/chat does not require a user OpenAI key", async () => {
  await withServer({
    async complete(request) {
      assert.equal(request.message, "What does this project do?");
      return {
        reply: "This project is a demo.",
        suggestedActions: [],
        usage: { inputTokens: 10, outputTokens: 6 },
      };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer test-user-token" },
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reply, "This project is a demo.");
  });
});

test("POST /v1/agent/chat rejects oversized requests", async () => {
  await withServer({
    async complete() {
      throw new Error("provider should not be called");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...chatPayload(), message: "x".repeat(80_000) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "request_too_large" });
  });
});

test("GET /v1/account/usage returns metering placeholder", async () => {
  await withServer({
    async complete() {
      return {
        reply: "ok",
        suggestedActions: [],
        usage: { inputTokens: 3, outputTokens: 4 },
      };
    },
  }, async (baseUrl) => {
    await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer usage-token" },
      body: JSON.stringify(chatPayload()),
    });
    const response = await fetch(`${baseUrl}/v1/account/usage`, {
      headers: { authorization: "Bearer usage-token" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requests, 1);
    assert.equal(body.limit, 100);
    assert.equal(body.inputTokens, 3);
    assert.equal(body.outputTokens, 4);
  });
});

test("provider key is resolved only from backend environment", () => {
  assert.equal(resolveOpenAiApiKey({ OPENAI_API_KEY: "server-key" }), "server-key");
  assert.equal(resolveOpenAiApiKey({ RINA_AUTH_TOKEN: "desktop-token" }), null);
});
