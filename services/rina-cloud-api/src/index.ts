import http from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { createOpenAiProvider } from "./openaiProvider.js";
import type { ModelProvider, ProviderRequest, ProviderResponse } from "./modelProvider.js";

export const MAX_REQUEST_BYTES = 64 * 1024;
const DAILY_USAGE_LIMIT = 100;
const DEFAULT_UPGRADE_URL = "https://www.rinawarptech.com/pricing";
const DEFAULT_BILLING_PORTAL_URL = "https://www.rinawarptech.com/account";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "unpaid" | "none";
type CloudPlan = "free" | "pro" | "team";

export type RinaCloudAccount = {
  userId: string;
  email?: string;
  plan: CloudPlan;
  subscriptionStatus: SubscriptionStatus;
  dailyLimit?: number;
  stripeCustomerId?: string;
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
};

const usageByUser = new Map<string, UsageRecord>();

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

function bearerTokenFromRequest(request: http.IncomingMessage): string {
  const auth = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return auth;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
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
    const subscriptionStatus = statusRaw === "trialing" || statusRaw === "past_due" || statusRaw === "unpaid" || statusRaw === "none"
      ? statusRaw
      : "active";
    const dailyLimit = Number(dailyLimitRaw || 0) || undefined;
    const email = String(emailRaw || "").trim() || undefined;
    records.set(token, { userId, plan, subscriptionStatus, dailyLimit, email });
  }
  return records;
}

async function authenticateToken(token: string, authenticate?: ApiOptions["authenticate"]): Promise<RinaCloudAccount | null> {
  if (!token) return null;
  if (authenticate) return await authenticate(token);
  return envTokenAccounts().get(token) || null;
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
  return {
    account: {
      userId: account.userId,
      email: account.email,
      plan: account.plan,
      subscriptionStatus: account.subscriptionStatus,
      stripeCustomerId: account.stripeCustomerId,
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
      checkoutUrl: options.checkoutUrl || process.env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
      portalUrl: options.billingPortalUrl || process.env.RINA_STRIPE_PORTAL_URL || DEFAULT_BILLING_PORTAL_URL,
      upgradeUrl: options.checkoutUrl || process.env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
      stripePriceId: options.stripePriceId || process.env.STRIPE_RINA_PRO_PRICE_ID || null,
      placeholder: true,
    },
  };
}

function authErrorPayload(options: ApiOptions) {
  return {
    error: "auth_required",
    message: "Sign in to Rina Cloud to use cloud-backed chat.",
    upgradeUrl: options.checkoutUrl || process.env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
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

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("invalid json");
    error.name = "InvalidJson";
    throw error;
  }
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

export function createRinaCloudApiServer(options: ApiOptions = {}): http.Server {
  const provider = options.provider || createOpenAiProvider();
  const maxBytes = options.maxRequestBytes || MAX_REQUEST_BYTES;
  const dailyLimit = options.dailyUsageLimit || DAILY_USAGE_LIMIT;
  const logger = options.logger || console;

  return http.createServer(async (request, response) => {
    const requestId = randomUUID();
    const url = new URL(request.url || "/", "http://localhost");
    const token = bearerTokenFromRequest(request);
    const account = await authenticateToken(token, options.authenticate);
    const userId = account?.userId || "unauthenticated";

    logger.log(JSON.stringify({
      requestId,
      route: url.pathname,
      method: request.method,
      userId,
    }));

    if (request.method === "GET" && url.pathname === "/v1/health") {
      jsonResponse(response, 200, { ok: true, service: "rina-cloud-api", version: "1.4.1-beta" });
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
        upgradeUrl: options.checkoutUrl || process.env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
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
        upgradeUrl: options.checkoutUrl || process.env.RINA_STRIPE_CHECKOUT_URL || DEFAULT_UPGRADE_URL,
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
        requestId,
        route: url.pathname,
        error: error instanceof Error ? error.message : "unknown",
      }));
      jsonResponse(response, 500, { error: "provider_error" });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 8787);
  createRinaCloudApiServer().listen(port, () => {
    console.log(JSON.stringify({ service: "rina-cloud-api", port }));
  });
}
