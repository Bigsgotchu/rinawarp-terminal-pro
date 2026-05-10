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

export type RinaCloudConfig = {
  apiBase: string;
  authToken: string | null;
};

export type RinaCloudClientLike = {
  chat(request: RinaCloudChatRequest): Promise<RinaCloudChatResponse>;
};

export function getRinaCloudConfig(env: NodeJS.ProcessEnv = process.env): RinaCloudConfig {
  return {
    apiBase: String(env.RINA_CLOUD_API_BASE || "").trim().replace(/\/+$/g, ""),
    authToken: String(env.RINA_AUTH_TOKEN || "").trim() || null,
  };
}

export class RinaCloudClient implements RinaCloudClientLike {
  readonly apiBase: string;
  readonly authToken: string | null;

  constructor(config: RinaCloudConfig = getRinaCloudConfig()) {
    this.apiBase = config.apiBase;
    this.authToken = config.authToken;
  }

  async chat(request: RinaCloudChatRequest): Promise<RinaCloudChatResponse> {
    if (!this.apiBase) {
      throw new Error("RINA_CLOUD_API_BASE is not configured.");
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-rina-client": "terminal-pro",
    };
    if (this.authToken) headers.authorization = `Bearer ${this.authToken}`;

    const response = await fetch(`${this.apiBase}/v1/agent/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Rina Cloud returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
    }

    const payload = await response.json() as RinaCloudChatResponse;
    if (!payload || typeof payload.reply !== "string" || !Array.isArray(payload.suggestedActions)) {
      throw new Error("Rina Cloud returned an invalid agent response.");
    }
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
