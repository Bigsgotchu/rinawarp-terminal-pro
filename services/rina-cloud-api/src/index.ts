import http from "node:http";
import fs from "node:fs";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createOpenAiProvider } from "./openaiProvider.js";
import type { ModelProvider, ProviderRequest, ProviderResponse } from "./modelProvider.js";

export const MAX_REQUEST_BYTES = 64 * 1024;
export const SERVICE_VERSION = "1.4.3-beta";
const DAILY_USAGE_LIMIT = 100;
const DEFAULT_UPGRADE_URL = "https://www.rinawarptech.com/pricing";
const DEFAULT_BILLING_PORTAL_URL = "https://www.rinawarptech.com/account";
const DEFAULT_CHECKOUT_SUCCESS_URL = "https://www.rinawarptech.com/success?session_id={CHECKOUT_SESSION_ID}";
const DEFAULT_CHECKOUT_CANCEL_URL = "https://www.rinawarptech.com/pricing";
const DEFAULT_PORTAL_RETURN_URL = "https://www.rinawarptech.com/account";
const STRIPE_API_VERSION = "2026-02-25.clover";
const REQUIRED_PRODUCTION_ENV = [
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO",
  "RINA_AUTH_SECRET",
  "RINA_CLOUD_PUBLIC_BASE_URL",
  "RINA_ALLOWED_ORIGINS",
] as const;

type SubscriptionStatus = "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "none";
type CloudPlan = "free" | "pro" | "team";

export type RinaCloudAccount = {
  userId: string;
  email?: string;
  plan: CloudPlan;
  subscriptionStatus: SubscriptionStatus;
  dailyLimit?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionCurrentPeriodEnd?: number;
};

type UsageRecord = {
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

type ApiOptions = {
  provider?: ModelProvider;
  maxRequestBytes?: number;
  dailyUsageLimit?: number;
  logger?: Pick<Console, "log" | "warn" | "error">;
  authenticate?: (token: string) => Promise<RinaCloudAccount | null> | RinaCloudAccount | null;
  checkoutUrl?: string;
  billingPortalUrl?: string;
  stripePriceId?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  checkoutSuccessUrl?: string;
  checkoutCancelUrl?: string;
  billingPortalReturnUrl?: string;
  accountStoreFile?: string;
  stripeRequest?: (endpoint: string, params: URLSearchParams, secretKey: string) => Promise<any>;
  env?: NodeJS.ProcessEnv;
};

const usageByUser = new Map<string, UsageRecord>();

type AccountPatch = Partial<RinaCloudAccount> & { userId: string };

type AccountRecordStore = {
  merge(account: RinaCloudAccount): RinaCloudAccount;
  update(patch: AccountPatch): RinaCloudAccount;
  findByCustomer(customerId?: string | null): RinaCloudAccount | null;
  findBySubscription(subscriptionId?: string | null): RinaCloudAccount | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function jsonResponse(response: http.ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function parseAllowedOrigins(raw: string | undefined): Set<string> {
  return new Set(String(raw || "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

function applyCors(request: http.IncomingMessage, response: http.ServerResponse, allowedOrigins: Set<string>): boolean {
  const origin = String(request.headers.origin || "").trim();
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "origin");
  }
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type,stripe-signature,x-rina-client");
  if (request.method === "OPTIONS") {
    response.statusCode = origin && !allowedOrigins.has(origin) ? 403 : 204;
    response.end();
    return true;
  }
  return false;
}

function bearerTokenFromRequest(request: http.IncomingMessage): string {
  const auth = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return auth;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function accountForAuthSecret(token: string, env: NodeJS.ProcessEnv): RinaCloudAccount | null {
  const secret = String(env.RINA_AUTH_SECRET || "").trim();
  if (!token || !secret) return null;
  const userId = `user_${createHmac("sha256", secret).update(token).digest("hex").slice(0, 24)}`;
  return { userId, plan: "free", subscriptionStatus: "none" };
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const raw = String(value || "").trim();
  if (
    raw === "active" ||
    raw === "trialing" ||
    raw === "past_due" ||
    raw === "unpaid" ||
    raw === "canceled" ||
    raw === "incomplete" ||
    raw === "none"
  ) {
    return raw;
  }
  return "none";
}

function createAccountRecordStore(filePath?: string): AccountRecordStore {
  const byUser = new Map<string, RinaCloudAccount>();
  const customerToUser = new Map<string, string>();
  const subscriptionToUser = new Map<string, string>();

  const index = (account: RinaCloudAccount) => {
    if (account.stripeCustomerId) customerToUser.set(account.stripeCustomerId, account.userId);
    if (account.stripeSubscriptionId) subscriptionToUser.set(account.stripeSubscriptionId, account.userId);
  };

  const persist = () => {
    if (!filePath) return;
    const dir = filePath.split(/[\\/]/).slice(0, -1).join("/") || ".";
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ accounts: Array.from(byUser.values()) }, null, 2), { mode: 0o600 });
  };

  if (filePath && fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      for (const item of Array.isArray(parsed?.accounts) ? parsed.accounts : []) {
        if (!item?.userId) continue;
        const account: RinaCloudAccount = {
          userId: String(item.userId),
          email: item.email ? String(item.email) : undefined,
          plan: item.plan === "team" || item.plan === "pro" ? item.plan : "free",
          subscriptionStatus: normalizeSubscriptionStatus(item.subscriptionStatus),
          dailyLimit: Number(item.dailyLimit || 0) || undefined,
          stripeCustomerId: item.stripeCustomerId ? String(item.stripeCustomerId) : undefined,
          stripeSubscriptionId: item.stripeSubscriptionId ? String(item.stripeSubscriptionId) : undefined,
          subscriptionCurrentPeriodEnd: Number(item.subscriptionCurrentPeriodEnd || 0) || undefined,
        };
        byUser.set(account.userId, account);
        index(account);
      }
    } catch {
      // Ignore malformed local account cache; webhook updates will rebuild it.
    }
  }

  return {
    merge(account) {
      const existing = byUser.get(account.userId);
      const merged = { ...account, ...existing, userId: account.userId };
      byUser.set(merged.userId, merged);
      index(merged);
      return merged;
    },
    update(patch) {
      const existing = byUser.get(patch.userId);
      const merged: RinaCloudAccount = {
        userId: patch.userId,
        plan: patch.plan || existing?.plan || "pro",
        subscriptionStatus: patch.subscriptionStatus || existing?.subscriptionStatus || "none",
        email: patch.email ?? existing?.email,
        dailyLimit: patch.dailyLimit ?? existing?.dailyLimit,
        stripeCustomerId: patch.stripeCustomerId ?? existing?.stripeCustomerId,
        stripeSubscriptionId: patch.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
        subscriptionCurrentPeriodEnd: patch.subscriptionCurrentPeriodEnd ?? existing?.subscriptionCurrentPeriodEnd,
      };
      byUser.set(merged.userId, merged);
      index(merged);
      persist();
      return merged;
    },
    findByCustomer(customerId) {
      if (!customerId) return null;
      const userId = customerToUser.get(customerId);
      return userId ? byUser.get(userId) || null : null;
    },
    findBySubscription(subscriptionId) {
      if (!subscriptionId) return null;
      const userId = subscriptionToUser.get(subscriptionId);
      return userId ? byUser.get(userId) || null : null;
    },
  };
}

function envTokenAccounts(env: NodeJS.ProcessEnv = process.env): Map<string, RinaCloudAccount> {
  const records = new Map<string, RinaCloudAccount>();
  const raw = String(env.RINA_CLOUD_DEV_TOKENS || "").trim();
  if (!raw) return records;
  for (const item of raw.split(",")) {
    const [tokenRaw, userIdRaw, planRaw, statusRaw, dailyLimitRaw, emailRaw] = item.split(":");
    const token = String(tokenRaw || "").trim();
    if (!token) continue;
    const userId = String(userIdRaw || `user_${hashToken(token)}`).trim();
    const plan = planRaw === "team" || planRaw === "free" ? planRaw : "pro";
    const subscriptionStatus = normalizeSubscriptionStatus(statusRaw || "active");
    const dailyLimit = Number(dailyLimitRaw || 0) || undefined;
    const email = String(emailRaw || "").trim() || undefined;
    records.set(token, { userId, plan, subscriptionStatus, dailyLimit, email });
  }
  return records;
}

async function authenticateToken(
  token: string,
  authenticate: ApiOptions["authenticate"] | undefined,
  accountStore: AccountRecordStore,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RinaCloudAccount | null> {
  if (!token) return null;
  const account = authenticate ? await authenticate(token) : envTokenAccounts(env).get(token) || accountForAuthSecret(token, env);
  return account ? accountStore.merge(account) : null;
}

function getUsage(userId: string): UsageRecord {
  const currentDay = today();
  const existing = usageByUser.get(userId);
  if (existing?.day === currentDay) return existing;
  const next = { day: currentDay, requests: 0, inputTokens: 0, outputTokens: 0 };
  usageByUser.set(userId, next);
  return next;
}

function isSubscriptionActive(account: RinaCloudAccount): boolean {
  if (account.plan === "free") return false;
  return account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing";
}

function usagePayload(account: RinaCloudAccount, usage: UsageRecord, limit: number, options: ApiOptions) {
  const env = options.env || process.env;
  const checkoutUrl = options.checkoutUrl || env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL;
  const portalUrl = options.billingPortalUrl || env.RINA_STRIPE_PORTAL_URL || DEFAULT_BILLING_PORTAL_URL;
  return {
    account: {
      userId: account.userId,
      email: account.email,
      plan: account.plan,
      subscriptionStatus: account.subscriptionStatus,
      stripeCustomerId: account.stripeCustomerId,
      stripeSubscriptionId: account.stripeSubscriptionId,
      subscriptionCurrentPeriodEnd: account.subscriptionCurrentPeriodEnd,
    },
    usage: {
      day: usage.day,
      requests: usage.requests,
      limit,
      remaining: Math.max(0, limit - usage.requests),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    },
    billing: {
      checkoutUrl,
      portalUrl,
      upgradeUrl: checkoutUrl,
      stripePriceId: options.stripePriceId || env.STRIPE_PRICE_ID_PRO || env.STRIPE_RINA_PRO_PRICE_ID || null,
      placeholder: false,
    },
  };
}

function authErrorPayload(options: ApiOptions) {
  const env = options.env || process.env;
  return {
    error: "auth_required",
    message: "Sign in to Rina Cloud to use cloud-backed chat.",
    upgradeUrl: options.checkoutUrl || env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
  };
}

function validateChatRequest(value: unknown): ProviderRequest | null {
  if (!value || typeof value !== "object") return null;
  const body = value as ProviderRequest;
  if (typeof body.message !== "string" || !body.message.trim()) return null;
  if (!body.workspace || typeof body.workspace !== "object") return null;
  if (!["npm", "pnpm", "yarn", "unknown"].includes(body.workspace.packageManager)) return null;
  if (!Array.isArray(body.workspace.files)) return null;
  if (!body.client || typeof body.client.appVersion !== "string" || typeof body.client.platform !== "string") return null;
  return {
    message: body.message.slice(0, 8_000),
    workspace: {
      name: String(body.workspace.name || "workspace").slice(0, 200),
      packageManager: body.workspace.packageManager,
      files: body.workspace.files.slice(0, 80).map((file) => ({
        path: String(file.path || "").slice(0, 500),
        summary: typeof file.summary === "string" ? file.summary.slice(0, 1_500) : undefined,
      })),
      packageJson: body.workspace.packageJson && typeof body.workspace.packageJson === "object"
        ? body.workspace.packageJson
        : undefined,
    },
    client: {
      appVersion: body.client.appVersion.slice(0, 80),
      platform: body.client.platform.slice(0, 80),
    },
  };
}

async function readJsonBody(request: http.IncomingMessage, maxBytes: number): Promise<unknown> {
  const raw = await readRawBody(request, maxBytes);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    const error = new Error("invalid json");
    error.name = "InvalidJson";
    throw error;
  }
}

async function readRawBody(request: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > maxBytes) {
    const error = new Error("request too large");
    error.name = "PayloadTooLarge";
    throw error;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      const error = new Error("request too large");
      error.name = "PayloadTooLarge";
      throw error;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function stripeSecretKey(options: ApiOptions): string {
  const env = options.env || process.env;
  return String(options.stripeSecretKey || env.STRIPE_SECRET_KEY || "").trim();
}

function stripePriceId(options: ApiOptions): string {
  const env = options.env || process.env;
  return String(options.stripePriceId || env.STRIPE_PRICE_ID_PRO || env.STRIPE_RINA_PRO_PRICE_ID || "").trim();
}

async function defaultStripeRequest(endpoint: string, params: URLSearchParams, secretKey: string): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": STRIPE_API_VERSION,
    },
    body: params,
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Stripe returned ${response.status}`);
  }
  return payload;
}

async function stripeRequest(options: ApiOptions, endpoint: string, params: URLSearchParams): Promise<any> {
  const secretKey = stripeSecretKey(options);
  if (!secretKey) {
    const error = new Error("STRIPE_SECRET_KEY is not configured.");
    error.name = "StripeNotConfigured";
    throw error;
  }
  return await (options.stripeRequest || defaultStripeRequest)(endpoint, params, secretKey);
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string, webhookSecret: string): boolean {
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [String(key || "").trim(), String(value || "").trim()];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function userIdFromStripeObject(value: any, accountStore: AccountRecordStore): string | null {
  const metadataUserId = String(value?.metadata?.userId || value?.subscription_details?.metadata?.userId || "").trim();
  if (metadataUserId) return metadataUserId;
  const customerAccount = accountStore.findByCustomer(typeof value?.customer === "string" ? value.customer : null);
  if (customerAccount) return customerAccount.userId;
  const subscriptionAccount = accountStore.findBySubscription(typeof value?.subscription === "string" ? value.subscription : typeof value?.id === "string" ? value.id : null);
  return subscriptionAccount?.userId || null;
}

function applyStripeEvent(event: any, accountStore: AccountRecordStore): boolean {
  const object = event?.data?.object || {};
  const type = String(event?.type || "");
  const userId = userIdFromStripeObject(object, accountStore);
  if (!userId) return false;

  if (type === "checkout.session.completed") {
    accountStore.update({
      userId,
      email: object.customer_details?.email || object.customer_email || undefined,
      plan: "pro",
      subscriptionStatus: "active",
      stripeCustomerId: typeof object.customer === "string" ? object.customer : undefined,
      stripeSubscriptionId: typeof object.subscription === "string" ? object.subscription : undefined,
    });
    return true;
  }

  if (type.startsWith("customer.subscription.")) {
    const status = type === "customer.subscription.deleted"
      ? "canceled"
      : normalizeSubscriptionStatus(object.status);
    accountStore.update({
      userId,
      plan: status === "active" || status === "trialing" ? "pro" : undefined,
      subscriptionStatus: status,
      stripeCustomerId: typeof object.customer === "string" ? object.customer : undefined,
      stripeSubscriptionId: typeof object.id === "string" ? object.id : undefined,
      subscriptionCurrentPeriodEnd: Number(object.current_period_end || 0) || undefined,
    });
    return true;
  }

  return false;
}

function cleanProviderResponse(response: ProviderResponse): ProviderResponse {
  return {
    reply: String(response.reply || "").slice(0, 8_000),
    suggestedActions: Array.isArray(response.suggestedActions)
      ? response.suggestedActions.slice(0, 5).map((action) => ({
        label: String(action.label || "").slice(0, 120),
        command: String(action.command || "").slice(0, 1_000),
        risk: action.risk === "destructive" || action.risk === "safe-write" ? action.risk : "read",
        expectedEffect: String(action.expectedEffect || "").slice(0, 500),
        rollbackAwareness: String(action.rollbackAwareness || "").slice(0, 500),
        verificationHint: String(action.verificationHint || "").slice(0, 500),
      }))
      : [],
    usage: {
      inputTokens: Number(response.usage?.inputTokens || 0),
      outputTokens: Number(response.usage?.outputTokens || 0),
    },
  };
}

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): { ok: boolean; missing: string[] } {
  const production = env.NODE_ENV === "production" || env.RINA_CLOUD_ENV === "production";
  if (!production) return { ok: true, missing: [] };
  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !String(env[key] || "").trim());
  return { ok: missing.length === 0, missing };
}

export function createRinaCloudApiServer(options: ApiOptions = {}): http.Server {
  const env = options.env || process.env;
  const productionConfig = validateProductionConfig(env);
  if (!productionConfig.ok) {
    throw new Error(`Missing production Rina Cloud env vars: ${productionConfig.missing.join(", ")}`);
  }
  const provider = options.provider || createOpenAiProvider();
  const maxBytes = options.maxRequestBytes || MAX_REQUEST_BYTES;
  const dailyLimit = options.dailyUsageLimit || DAILY_USAGE_LIMIT;
  const logger = options.logger || console;
  const allowedOrigins = parseAllowedOrigins(env.RINA_ALLOWED_ORIGINS);
  const accountStore = createAccountRecordStore(options.accountStoreFile || env.RINA_CLOUD_ACCOUNT_STORE_FILE);

  return http.createServer(async (request, response) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const url = new URL(request.url || "/", "http://localhost");
    if (applyCors(request, response, allowedOrigins)) return;
    const token = bearerTokenFromRequest(request);
    const account = await authenticateToken(token, options.authenticate, accountStore, env);
    const userId = account?.userId || "unauthenticated";

    logger.log(JSON.stringify({
      level: "info",
      event: "request",
      requestId,
      route: url.pathname,
      method: request.method,
      userId,
    }));

    if (request.method === "GET" && url.pathname === "/v1/health") {
      jsonResponse(response, 200, { ok: true, service: "rina-cloud-api", version: SERVICE_VERSION, env: env.NODE_ENV || "development" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/health/deep") {
      jsonResponse(response, 200, {
        ok: true,
        service: "rina-cloud-api",
        version: SERVICE_VERSION,
        checks: {
          provider: { configured: !!String(env.OPENAI_API_KEY || "").trim() },
          stripe: {
            secretKeyConfigured: !!stripeSecretKey({ ...options, env }),
            webhookSecretConfigured: !!String(options.stripeWebhookSecret || env.STRIPE_WEBHOOK_SECRET || "").trim(),
            priceIdConfigured: !!stripePriceId({ ...options, env }),
          },
          cors: { configuredOrigins: allowedOrigins.size },
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/billing/webhook") {
      const webhookSecret = String(options.stripeWebhookSecret || env.STRIPE_WEBHOOK_SECRET || "").trim();
      if (!webhookSecret) {
        jsonResponse(response, 503, { error: "stripe_webhook_not_configured" });
        return;
      }
      try {
        const raw = await readRawBody(request, maxBytes);
        const signature = String(request.headers["stripe-signature"] || "");
        if (!verifyStripeSignature(raw, signature, webhookSecret)) {
          jsonResponse(response, 400, { error: "invalid_stripe_signature" });
          return;
        }
        const event = JSON.parse(raw.toString("utf8"));
        const updated = applyStripeEvent(event, accountStore);
        jsonResponse(response, 200, { received: true, updated });
      } catch (error) {
        logger.error(JSON.stringify({
          level: "error",
          event: "webhook_error",
          requestId,
          route: url.pathname,
          error: error instanceof Error ? error.message : "unknown",
        }));
        jsonResponse(response, 400, { error: "invalid_webhook" });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/account/usage") {
      if (!account) {
        jsonResponse(response, 401, authErrorPayload(options));
        return;
      }
      const limit = account.dailyLimit || dailyLimit;
      jsonResponse(response, 200, usagePayload(account, getUsage(account.userId), limit, options));
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/billing/checkout") {
      if (!account) {
        jsonResponse(response, 401, authErrorPayload(options));
        return;
      }
      const priceId = stripePriceId(options);
      if (!priceId) {
        jsonResponse(response, 503, { error: "stripe_price_not_configured", message: "STRIPE_RINA_PRO_PRICE_ID is not configured." });
        return;
      }
      try {
        const body = await readJsonBody(request, maxBytes) as { email?: string };
        const email = String(body?.email || account.email || "").trim().toLowerCase();
        const params = new URLSearchParams();
        params.set("mode", "subscription");
        params.set("line_items[0][price]", priceId);
        params.set("line_items[0][quantity]", "1");
        params.set("success_url", options.checkoutSuccessUrl || env.STRIPE_CHECKOUT_SUCCESS_URL || env.RINA_STRIPE_CHECKOUT_SUCCESS_URL || DEFAULT_CHECKOUT_SUCCESS_URL);
        params.set("cancel_url", options.checkoutCancelUrl || env.STRIPE_CHECKOUT_CANCEL_URL || env.RINA_STRIPE_CHECKOUT_CANCEL_URL || DEFAULT_CHECKOUT_CANCEL_URL);
        params.set("client_reference_id", account.userId);
        params.set("metadata[userId]", account.userId);
        params.set("subscription_data[metadata][userId]", account.userId);
        if (account.stripeCustomerId) params.set("customer", account.stripeCustomerId);
        else if (email) params.set("customer_email", email);
        const session = await stripeRequest(options, "checkout/sessions", params);
        jsonResponse(response, 200, { ok: true, url: session.url, sessionId: session.id });
      } catch (error) {
        const status = error instanceof Error && error.name === "StripeNotConfigured" ? 503 : 502;
        jsonResponse(response, status, { error: "checkout_failed", message: error instanceof Error ? error.message : "Checkout failed" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/billing/portal") {
      if (!account) {
        jsonResponse(response, 401, authErrorPayload(options));
        return;
      }
      if (!account.stripeCustomerId) {
        jsonResponse(response, 409, {
          error: "stripe_customer_required",
          message: "Upgrade first so Rina Cloud can create your Stripe customer record.",
          upgradeUrl: options.checkoutUrl || env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
        });
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set("customer", account.stripeCustomerId);
        params.set("return_url", options.billingPortalReturnUrl || env.STRIPE_PORTAL_RETURN_URL || env.RINA_STRIPE_PORTAL_RETURN_URL || DEFAULT_PORTAL_RETURN_URL);
        const session = await stripeRequest(options, "billing_portal/sessions", params);
        jsonResponse(response, 200, { ok: true, url: session.url });
      } catch (error) {
        const status = error instanceof Error && error.name === "StripeNotConfigured" ? 503 : 502;
        jsonResponse(response, status, { error: "portal_failed", message: error instanceof Error ? error.message : "Billing portal failed" });
      }
      return;
    }

    if (request.method !== "POST" || url.pathname !== "/v1/agent/chat") {
      jsonResponse(response, 404, { error: "not_found" });
      return;
    }

    if (!account) {
      jsonResponse(response, 401, authErrorPayload(options));
      return;
    }

    if (!isSubscriptionActive(account)) {
      jsonResponse(response, 402, {
        error: "subscription_required",
        message: "Upgrade to Rina Pro to use cloud-backed chat.",
        usage: usagePayload(account, getUsage(account.userId), account.dailyLimit || dailyLimit, options).usage,
        upgradeUrl: options.checkoutUrl || env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
      });
      return;
    }

    const limit = account.dailyLimit || dailyLimit;
    const usage = getUsage(account.userId);
    if (usage.requests >= limit) {
      jsonResponse(response, 429, {
        error: "daily_usage_limit_reached",
        message: "You've reached today's Rina Cloud usage limit.",
        usage: usagePayload(account, usage, limit, options).usage,
        upgradeUrl: options.checkoutUrl || env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
      });
      return;
    }

    try {
      const body = await readJsonBody(request, maxBytes);
      const chatRequest = validateChatRequest(body);
      if (!chatRequest) {
        jsonResponse(response, 400, { error: "invalid_request" });
        return;
      }

      const providerResponse = cleanProviderResponse(await provider.complete(chatRequest));
      usage.requests += 1;
      usage.inputTokens += providerResponse.usage.inputTokens;
      usage.outputTokens += providerResponse.usage.outputTokens;
      jsonResponse(response, 200, providerResponse);
    } catch (error) {
      if (error instanceof Error && error.name === "PayloadTooLarge") {
        jsonResponse(response, 413, { error: "request_too_large" });
        return;
      }
      if (error instanceof Error && error.name === "InvalidJson") {
        jsonResponse(response, 400, { error: "invalid_json" });
        return;
      }
      logger.error(JSON.stringify({
        level: "error",
        event: "provider_error",
        requestId,
        route: url.pathname,
        error: error instanceof Error ? error.message : "unknown",
      }));
      jsonResponse(response, 500, { error: "provider_error" });
    } finally {
      logger.log(JSON.stringify({
        level: "info",
        event: "request_complete",
        requestId,
        route: url.pathname,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 8787);
  createRinaCloudApiServer().listen(port, () => {
    console.log(JSON.stringify({ service: "rina-cloud-api", port }));
  });
}
