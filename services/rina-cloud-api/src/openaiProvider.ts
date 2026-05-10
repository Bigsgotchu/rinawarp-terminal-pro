import { buildAgentPrompt, type ModelProvider, type ProviderRequest, type ProviderResponse } from "./modelProvider.js";

export function resolveOpenAiApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return String(env.OPENAI_API_KEY || "").trim() || null;
}

function parseProviderJson(raw: string): ProviderResponse | null {
  try {
    const parsed = JSON.parse(raw) as ProviderResponse;
    if (typeof parsed.reply === "string" && Array.isArray(parsed.suggestedActions)) return parsed;
  } catch {
    // Try extracting a JSON object from provider text below.
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as ProviderResponse;
    if (typeof parsed.reply === "string" && Array.isArray(parsed.suggestedActions)) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function createOpenAiProvider(args: {
  env?: NodeJS.ProcessEnv;
  model?: string;
  fetchImpl?: typeof fetch;
} = {}): ModelProvider {
  const env = args.env || process.env;
  const apiKey = resolveOpenAiApiKey(env);
  const model = String(args.model || env.RINA_OPENAI_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
  const fetchImpl = args.fetchImpl || fetch;

  return {
    async complete(request: ProviderRequest): Promise<ProviderResponse> {
      if (!apiKey) {
        return {
          reply: "Rina Cloud is reachable, but the model provider is not configured for this environment yet.",
          suggestedActions: [],
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      }

      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          input: [{
            role: "user",
            content: [{
              type: "input_text",
              text: buildAgentPrompt(request),
            }],
          }],
          text: {
            format: {
              type: "json_schema",
              name: "rina_cloud_agent_response",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reply: { type: "string" },
                  suggestedActions: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        label: { type: "string" },
                        command: { type: "string" },
                        risk: { type: "string", enum: ["read", "safe-write", "destructive"] },
                        expectedEffect: { type: "string" },
                        rollbackAwareness: { type: "string" },
                        verificationHint: { type: "string" },
                      },
                      required: ["label", "command", "risk", "expectedEffect", "rollbackAwareness", "verificationHint"],
                    },
                  },
                  usage: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      inputTokens: { type: "number" },
                      outputTokens: { type: "number" },
                    },
                    required: ["inputTokens", "outputTokens"],
                  },
                },
                required: ["reply", "suggestedActions", "usage"],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI provider returned ${response.status}`);
      }

      const json = await response.json() as {
        output_text?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const parsed = parseProviderJson(json.output_text || "");
      if (!parsed) throw new Error("OpenAI provider returned invalid JSON.");
      return {
        ...parsed,
        usage: {
          inputTokens: json.usage?.input_tokens ?? parsed.usage?.inputTokens ?? 0,
          outputTokens: json.usage?.output_tokens ?? parsed.usage?.outputTokens ?? 0,
        },
      };
    },
  };
}
