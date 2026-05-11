import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHmac } from "node:crypto";
import { createRinaCloudApiServer, validateProductionConfig } from "../dist/index.js";
import { buildAgentPrompt } from "../dist/modelProvider.js";
import { resolveOpenAiApiKey } from "../dist/openaiProvider.js";

async function withServer(provider, fn, options = {}) {
  const server = createRinaCloudApiServer({
    provider,
    authenticate: options.authenticate === undefined ? ((token) => token ? {
      userId: token,
      plan: "pro",
      subscriptionStatus: "active",
    } : null) : (options.authenticate || undefined),
    dailyUsageLimit: options.dailyUsageLimit,
    stripeSecretKey: options.stripeSecretKey,
    stripeWebhookSecret: options.stripeWebhookSecret,
    stripePriceId: options.stripePriceId,
    stripeRequest: options.stripeRequest,
    env: options.env,
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

test("production config validation rejects missing required env vars", () => {
  const result = validateProductionConfig({ NODE_ENV: "production" });
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("OPENAI_API_KEY"));
  assert.ok(result.missing.includes("STRIPE_WEBHOOK_SECRET"));
  assert.throws(() => createRinaCloudApiServer({ env: { NODE_ENV: "production" } }), /Missing production Rina Cloud env vars/);
});

test("GET /v1/health returns service status", async () => {
  await withServer({ async complete() { throw new Error("unused"); } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "rina-cloud-api");
    assert.equal(body.version, "1.5.0-beta");
  });
});

test("GET /v1/health/deep hides secrets", async () => {
  await withServer({ async complete() { throw new Error("unused"); } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/health/deep`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes("sk-secret-test"), false);
    const body = JSON.parse(text);
    assert.equal(body.checks.provider.configured, true);
    assert.equal(body.checks.stripe.secretKeyConfigured, true);
    assert.equal(body.checks.stripe.webhookSecretConfigured, true);
    assert.equal(body.checks.stripe.priceIdConfigured, true);
  }, {
    env: {
      OPENAI_API_KEY: "sk-secret-test",
      STRIPE_SECRET_KEY: "sk_stripe",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      STRIPE_PRICE_ID_PRO: "price_pro",
      RINA_AUTH_SECRET: "auth-secret",
      RINA_ALLOWED_ORIGINS: "https://www.rinawarptech.com",
    },
  });
});

function stripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { body, header: `t=${timestamp},v1=${signature}` };
}

function chatPayload() {
  return {
    message: "What does this project do?",
    workspace: {
      name: "demo",
      packageManager: "pnpm",
      files: [{ path: "package.json", summary: "scripts=build, test" }],
      tree: ["package.json", "README.md", "src/main.ts", "src/ui/App.tsx"],
      readme: { path: "README.md", summary: "Demo app README summary." },
      docs: [{ path: "docs/architecture.md", summary: "Renderer talks to main through safe IPC." }],
      scripts: { dev: "vite", build: "vite build", test: "vitest run" },
      dependencies: ["react", "vite"],
      devDependencies: ["typescript", "vitest"],
      packageJson: { name: "demo" },
    },
    client: {
      appVersion: "1.4.0-beta",
      platform: "linux",
    },
  };
}

test("cloud prompt includes repo tree, scripts, docs, and dependency context", () => {
  const prompt = buildAgentPrompt(chatPayload());
  assert.match(prompt, /Scripts:\n- dev: vite/);
  assert.match(prompt, /Dependencies:\nreact, vite, typescript \(dev\), vitest \(dev\)/);
  assert.match(prompt, /Docs:\n- README\.md: Demo app README summary/);
  assert.match(prompt, /File tree:\n- package\.json\n- README\.md\n- src\/main\.ts/);
  assert.match(prompt, /prefer explanation-only responses with no command/i);
});

test("POST /v1/agent/chat does not require a user OpenAI key", async () => {
  await withServer({
    async complete(request) {
      assert.equal(request.message, "What does this project do?");
      assert.deepEqual(request.workspace.tree?.slice(0, 2), ["package.json", "README.md"]);
      assert.equal(request.workspace.scripts?.build, "vite build");
      assert.equal(request.workspace.readme?.path, "README.md");
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
      headers: { "content-type": "application/json", authorization: "Bearer test-user-token" },
      body: JSON.stringify({ ...chatPayload(), message: "x".repeat(80_000) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "request_too_large" });
  });
});

test("GET /v1/account/usage returns account usage and billing surface", async () => {
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
    assert.equal(body.account.userId, "usage-token");
    assert.equal(body.account.plan, "pro");
    assert.equal(body.usage.requests, 1);
    assert.equal(body.usage.limit, 100);
    assert.equal(body.usage.inputTokens, 3);
    assert.equal(body.usage.outputTokens, 4);
    assert.equal(body.billing.placeholder, false);
  });
});

test("POST /v1/billing/checkout creates a Stripe Checkout Session", async () => {
  const calls = [];
  await withServer({
    async complete() {
      throw new Error("provider should not be called");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/billing/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer checkout-token" },
      body: JSON.stringify({ email: "pay@example.com" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.url, "https://checkout.stripe.test/session");
    assert.equal(calls[0].endpoint, "checkout/sessions");
    assert.equal(calls[0].params.get("mode"), "subscription");
    assert.equal(calls[0].params.get("line_items[0][price]"), "price_rina_pro");
    assert.equal(calls[0].params.get("metadata[userId]"), "checkout-token");
    assert.equal(calls[0].params.get("customer_email"), "pay@example.com");
  }, {
    stripeSecretKey: "sk_test_123",
    stripePriceId: "price_rina_pro",
    stripeRequest: async (endpoint, params) => {
      calls.push({ endpoint, params });
      return { id: "cs_test_123", url: "https://checkout.stripe.test/session" };
    },
  });
});

test("POST /v1/billing/portal creates a Stripe Customer Portal Session", async () => {
  const calls = [];
  await withServer({
    async complete() {
      throw new Error("provider should not be called");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/billing/portal`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer portal-token" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.url, "https://billing.stripe.test/session");
    assert.equal(calls[0].endpoint, "billing_portal/sessions");
    assert.equal(calls[0].params.get("customer"), "cus_123");
  }, {
    authenticate: () => ({
      userId: "portal-user",
      plan: "pro",
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
    }),
    stripeSecretKey: "sk_test_123",
    stripeRequest: async (endpoint, params) => {
      calls.push({ endpoint, params });
      return { id: "bps_test_123", url: "https://billing.stripe.test/session" };
    },
  });
});

test("Stripe webhook updates subscription state and unlocks cloud AI", async () => {
  const webhookSecret = "whsec_test";
  await withServer({
    async complete() {
      return {
        reply: "unlocked",
        suggestedActions: [],
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    },
  }, async (baseUrl) => {
    const before = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer paid-token" },
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(before.status, 402);

    const event = {
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_paid",
          subscription: "sub_paid",
          customer_details: { email: "paid@example.com" },
          metadata: { userId: "paid-user" },
        },
      },
    };
    const signed = stripeSignature(event, webhookSecret);
    const webhook = await fetch(`${baseUrl}/v1/billing/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signed.header },
      body: signed.body,
    });
    assert.equal(webhook.status, 200);
    assert.equal((await webhook.json()).updated, true);

    const after = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer paid-token" },
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(after.status, 200);
    assert.equal((await after.json()).reply, "unlocked");
  }, {
    authenticate: () => ({
      userId: "paid-user",
      plan: "pro",
      subscriptionStatus: "none",
    }),
    stripeWebhookSecret: webhookSecret,
  });
});

test("POST /v1/agent/chat rejects missing auth token", async () => {
  await withServer({
    async complete() {
      throw new Error("provider should not be called");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "auth_required");
  });
});

test("POST /v1/agent/chat blocks unpaid accounts before provider", async () => {
  await withServer({
    async complete() {
      throw new Error("provider should not be called");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer unpaid-token" },
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(response.status, 402);
    const body = await response.json();
    assert.equal(body.error, "subscription_required");
  }, {
    authenticate: () => ({
      userId: "unpaid-user",
      plan: "pro",
      subscriptionStatus: "unpaid",
    }),
  });
});

test("POST /v1/agent/chat blocks over daily usage limit", async () => {
  await withServer({
    async complete() {
      return {
        reply: "ok",
        suggestedActions: [],
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    },
  }, async (baseUrl) => {
    const headers = { "content-type": "application/json", authorization: "Bearer limited-token" };
    const first = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(chatPayload()),
    });
    assert.equal(second.status, 429);
    const body = await second.json();
    assert.equal(body.error, "daily_usage_limit_reached");
  }, { dailyUsageLimit: 1 });
});

test("provider key is resolved only from backend environment", () => {
  assert.equal(resolveOpenAiApiKey({ OPENAI_API_KEY: "server-key" }), "server-key");
  assert.equal(resolveOpenAiApiKey({ RINA_AUTH_TOKEN: "desktop-token" }), null);
});
