import type { InlineRinaResult } from "./inline-rina.js";

export type RinaCloudPackageManager = "npm" | "pnpm" | "yarn" | "unknown";

export type RinaCloudChatRequest = {
  message: string;
  workspace: {
    name: string;
    packageManager: RinaCloudPackageManager;
    files: Array<{ path: string; summary?: string }>;
    packageJson?: object;
  };
  client: {
    appVersion: string;
    platform: string;
  };
};

export type RinaCloudSuggestedAction = {
  label: string;
  command: string;
  risk: "read" | "safe-write" | "destructive";
  expectedEffect: string;
  rollbackAwareness: string;
  verificationHint: string;
};

export type RinaCloudChatResponse = {
  reply: string;
  suggestedActions: RinaCloudSuggestedAction[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type RinaCloudAccountUsageResponse = {
  account: {
    userId: string;
    email?: string;
    plan: "free" | "pro" | "team";
    subscriptionStatus: "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "none";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionCurrentPeriodEnd?: number;
  };
  usage: {
    day: string;
    requests: number;
    limit: number;
    remaining: number;
    inputTokens: number;
    outputTokens: number;
  };
  billing: {
    checkoutUrl: string;
    portalUrl: string;
    upgradeUrl: string;
    stripePriceId?: string | null;
    placeholder: boolean;
  };
};

export type RinaCloudConfig = {
  apiBase: string;
  authToken: string | null;
};

export type RinaCloudBillingSessionResponse = {
  ok: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
  message?: string;
};

export type RinaCloudClientLike = {
  chat(request: RinaCloudChatRequest): Promise<RinaCloudChatResponse>;
  usage?(): Promise<RinaCloudAccountUsageResponse>;
  createCheckoutSession?(args?: { email?: string }): Promise<RinaCloudBillingSessionResponse>;
  createPortalSession?(): Promise<RinaCloudBillingSessionResponse>;
};

export function getRinaCloudConfig(env: NodeJS.ProcessEnv = process.env): RinaCloudConfig {
  return {
    apiBase: String(env.RINA_CLOUD_API_BASE || "").trim().replace(/\/+$/g, ""),
    authToken: String(env.RINA_AUTH_TOKEN || "").trim() || null,
  };
}

export class RinaCloudError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messageForUser: string;
  readonly upgradeUrl: string | null;
  readonly body: unknown;

  constructor(args: { status: number; code?: string; message?: string; upgradeUrl?: string | null; body?: unknown }) {
    super(args.message || `Rina Cloud returned ${args.status}`);
    this.name = "RinaCloudError";
    this.status = args.status;
    this.code = args.code || "cloud_error";
    this.messageForUser = args.message || this.message;
    this.upgradeUrl = args.upgradeUrl || null;
    this.body = args.body;
  }
}

export class RinaCloudClient implements RinaCloudClientLike {
  readonly apiBase: string;
  readonly authToken: string | null;

  constructor(config: RinaCloudConfig = getRinaCloudConfig()) {
    this.apiBase = config.apiBase;
    this.authToken = config.authToken;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-rina-client": "terminal-pro",
    };
    if (this.authToken) headers.authorization = `Bearer ${this.authToken}`;
    return headers;
  }

  private async parseOrThrow(response: Response): Promise<unknown> {
    const text = await response.text().catch(() => "");
    let payload: any = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 180) };
      }
    }
    if (!response.ok) {
      throw new RinaCloudError({
        status: response.status,
        code: typeof payload?.error === "string" ? payload.error : "cloud_error",
        message: typeof payload?.message === "string" ? payload.message : `Rina Cloud returned ${response.status}`,
        upgradeUrl: typeof payload?.upgradeUrl === "string" ? payload.upgradeUrl : null,
        body: payload,
      });
    }
    return payload;
  }

  async chat(request: RinaCloudChatRequest): Promise<RinaCloudChatResponse> {
    if (!this.apiBase) {
      throw new Error("RINA_CLOUD_API_BASE is not configured.");
    }

    const response = await fetch(`${this.apiBase}/v1/agent/chat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(request),
    });

    const payload = await this.parseOrThrow(response) as RinaCloudChatResponse;
    if (!payload || typeof payload.reply !== "string" || !Array.isArray(payload.suggestedActions)) {
      throw new Error("Rina Cloud returned an invalid agent response.");
    }
    return payload;
  }

  async usage(): Promise<RinaCloudAccountUsageResponse> {
    if (!this.apiBase) {
      throw new Error("RINA_CLOUD_API_BASE is not configured.");
    }
    const response = await fetch(`${this.apiBase}/v1/account/usage`, {
      method: "GET",
      headers: this.headers(),
    });
    const payload = await this.parseOrThrow(response) as RinaCloudAccountUsageResponse;
    if (!payload?.account || !payload?.usage || !payload?.billing) {
      throw new Error("Rina Cloud returned an invalid account response.");
    }
    return payload;
  }

  async createCheckoutSession(args: { email?: string } = {}): Promise<RinaCloudBillingSessionResponse> {
    if (!this.apiBase) {
      throw new Error("RINA_CLOUD_API_BASE is not configured.");
    }
    const response = await fetch(`${this.apiBase}/v1/billing/checkout`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ email: args.email || "" }),
    });
    const payload = await this.parseOrThrow(response) as RinaCloudBillingSessionResponse;
    if (!payload?.url) throw new Error("Rina Cloud did not return a checkout URL.");
    return payload;
  }

  async createPortalSession(): Promise<RinaCloudBillingSessionResponse> {
    if (!this.apiBase) {
      throw new Error("RINA_CLOUD_API_BASE is not configured.");
    }
    const response = await fetch(`${this.apiBase}/v1/billing/portal`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    const payload = await this.parseOrThrow(response) as RinaCloudBillingSessionResponse;
    if (!payload?.url) throw new Error("Rina Cloud did not return a billing portal URL.");
    return payload;
  }
}

export function cloudRiskToInlineRisk(risk: RinaCloudSuggestedAction["risk"] | undefined): InlineRinaResult["risk"] {
  if (risk === "destructive") return "high";
  if (risk === "safe-write") return "medium";
  return "low";
}

export function cloudResponseToInlineResult(response: RinaCloudChatResponse): InlineRinaResult {
  const action = response.suggestedActions.find((item) => String(item.command || "").trim());
  const command = action?.command?.trim() || null;
  const details = action
    ? [
      response.reply.trim(),
      "",
      `Suggested action: ${action.label}`,
      `Expected effect: ${action.expectedEffect}`,
      `Rollback awareness: ${action.rollbackAwareness}`,
      `Verification: ${action.verificationHint}`,
    ].join("\n")
    : response.reply.trim();

  return {
    explanation: details,
    command,
    risk: cloudRiskToInlineRisk(action?.risk),
    confirmation: !!command,
    confirmationMessage: command
      ? "Rina Cloud suggested this action. Rina will classify it locally and ask before anything runs."
      : undefined,
    pendingApproval: command
      ? {
        kind: "command",
        payload: {
          source: "rina-cloud",
          label: action?.label || "Run suggested command",
          command,
          cloudRisk: action?.risk || "read",
          expectedEffect: action?.expectedEffect || "",
          rollbackAwareness: action?.rollbackAwareness || "",
          verificationHint: action?.verificationHint || "",
        },
      }
      : undefined,
    usage: {
      model: "rina-cloud",
      promptTokens: response.usage?.inputTokens ?? null,
      responseTokens: response.usage?.outputTokens ?? null,
      totalTokens:
        typeof response.usage?.inputTokens === "number" && typeof response.usage?.outputTokens === "number"
          ? response.usage.inputTokens + response.usage.outputTokens
          : null,
    },
  };
}
