/**
 * AI Client
 * 
 * LLM integration - follows Rust architecture.
 */

import type { 
  AiModel, 
  AiRequest, 
  AiResponse, 
  AiMessage,
  CommandPlan,
  ErrorExplanation 
} from "./schema.js";
import { DEFAULT_MODELS } from "./schema.js";

export interface AiConfig {
  apiKey: string;
  model: AiModel;
  baseUrl: string;
}

/**
 * Get AI config from environment
 */
export function getAiConfig(): AiConfig | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const modelStr = process.env.AI_MODEL || "gpt-4o";
  const isAnthropic = !!process.env.ANTHROPIC_API_KEY;

  return {
    apiKey,
    model: parseModelType(modelStr),
    baseUrl: isAnthropic 
      ? "https://api.anthropic.com/v1" 
      : "https://api.openai.com/v1",
  };
}

function parseModelType(s: string): AiModel {
  const lower = s.toLowerCase();
  if (lower.includes("mini")) return "gpt-4o-mini";
  if (lower.includes("opus")) return "claude-3-opus";
  if (lower.includes("sonnet")) return "claude-3-5-sonnet";
  return "gpt-4o";
}

/**
 * Send request to LLM
 */
export async function chat(
  config: AiConfig,
  messages: AiMessage[]
): Promise<AiResponse> {
  const url = `${config.baseUrl}/chat/completions`;
  
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  const content = JSON.parse(data.choices[0].message.content);

  return {
    content: content as Record<string, unknown>,
    model: config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Parse command plan from response
 */
export function parseCommandPlan(response: AiResponse): CommandPlan {
  const content = response.content as Record<string, unknown>;
  return {
    analysis: String(content.analysis || ""),
    commands: (content.commands as string[]) || [],
    risk: (content.risk as "low" | "medium" | "high") || "low",
    explanation: String(content.explanation || ""),
  };
}

/**
 * Parse error explanation from response
 */
export function parseErrorExplanation(response: AiResponse): ErrorExplanation {
  const content = response.content as Record<string, unknown>;
  return {
    analysis: String(content.analysis || ""),
    likelyCause: String(content.likelyCause || content.suggestedFix || ""),
    suggestedFix: String(content.suggestedFix || ""),
    commands: (content.commands as string[]) || [],
  };
}

/**
 * Quick command generation
 */
export async function generateCommand(
  config: AiConfig,
  intent: string,
  context: string
): Promise<CommandPlan> {
  const systemPrompt = `You are a Unix shell expert. Output JSON only.`;
  const userPrompt = `Generate commands for: ${intent}\nContext: ${context}`;

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await chat(config, messages);
  return parseCommandPlan(response);
}

/**
 * Quick error explanation
 */
export async function explainError(
  config: AiConfig,
  error: string,
  context: string
): Promise<ErrorExplanation> {
  const systemPrompt = `You are a Unix expert. Output JSON only.`;
  const userPrompt = `Explain this error:\n${error}\nContext: ${context}`;

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await chat(config, messages);
  return parseErrorExplanation(response);
}
