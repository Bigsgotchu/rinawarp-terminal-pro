/**
 * AI Client
 * 
 * LLM integration - follows Rust architecture.
 * Supports both streaming and non-streaming requests.
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

// ===== Streaming Support =====

/**
 * Stream chunk from LLM
 */
export interface StreamChunk {
  /** Content delta */
  delta: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Optional: full content so far (for done chunk) */
  content?: string;
}

/**
 * Streaming chat callback
 */
export type StreamCallback = (chunk: StreamChunk) => void | Promise<void>;

/**
 * Send streaming request to LLM
 * 
 * Usage:
 * ```typescript
 * await streamChat(config, messages, (chunk) => {
 *   process.stdout.write(chunk.delta);
 * });
 * ```
 */
export async function streamChat(
  config: AiConfig,
  messages: AiMessage[],
  onChunk: StreamCallback
): Promise<AiResponse> {
  const url = `${config.baseUrl}/chat/completions`;
  
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
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
    throw new Error(`AI streaming request failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const chunks = parseSSELines(buffer);
          for (const chunk of chunks) {
            if (chunk.delta) {
              fullContent += chunk.delta;
              await onChunk({ delta: chunk.delta, done: false });
            }
          }
        }
        
        // Send final chunk
        await onChunk({ delta: "", done: true, content: fullContent });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const parsed = parseSSELine(line);
        if (parsed) {
          if (parsed.delta) {
            fullContent += parsed.delta;
            await onChunk({ delta: parsed.delta, done: false });
          }
          if (parsed.done) {
            await onChunk({ delta: "", done: true, content: fullContent });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse the final content as JSON
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(fullContent);
  } catch {
    // If not valid JSON, wrap it
    content = { text: fullContent };
  }

  return {
    content,
    model: config.model,
    usage: undefined, // Usage not available in streaming
  };
}

/**
 * Parse a single SSE line
 */
function parseSSELine(line: string): { delta: string; done: boolean } | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  const data = line.slice(6).trim();
  
  if (data === "[DONE]") {
    return { delta: "", done: true };
  }

  try {
    const parsed = JSON.parse(data);
    const delta = parsed.choices?.[0]?.delta?.content || "";
    return { delta, done: false };
  } catch {
    return null;
  }
}

/**
 * Parse multiple SSE lines from a string
 */
function parseSSELines(text: string): Array<{ delta: string; done: boolean }> {
  const lines = text.split("\n").filter(l => l.trim());
  return lines.map(parseSSELine).filter(Boolean) as Array<{ delta: string; done: boolean }>;
}

/**
 * Stream command generation
 * 
 * Usage:
 * ```typescript
 * await streamGenerateCommand(config, intent, context, (chunk) => {
 *   process.stdout.write(chunk.delta);
 * });
 * ```
 */
export async function streamGenerateCommand(
  config: AiConfig,
  intent: string,
  context: string,
  onChunk: StreamCallback
): Promise<CommandPlan> {
  const systemPrompt = `You are a Unix shell expert. Output JSON only.`;
  const userPrompt = `Generate commands for: ${intent}\nContext: ${context}`;

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await streamChat(config, messages, onChunk);
  return parseCommandPlan(response);
}

/**
 * Stream error explanation
 * 
 * Usage:
 * ```typescript
 * await streamExplainError(config, error, context, (chunk) => {
 *   process.stdout.write(chunk.delta);
 * });
 * ```
 */
export async function streamExplainError(
  config: AiConfig,
  error: string,
  context: string,
  onChunk: StreamCallback
): Promise<ErrorExplanation> {
  const systemPrompt = `You are a Unix expert. Output JSON only.`;
  const userPrompt = `Explain this error:\n${error}\nContext: ${context}`;

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await streamChat(config, messages, onChunk);
  return parseErrorExplanation(response);
}

/**
 * Create a readable stream from async iterator
 * Useful for integrating with other streaming systems
 */
export async function* createStreamGenerator(
  config: AiConfig,
  messages: AiMessage[]
): AsyncGenerator<StreamChunk> {
  const url = `${config.baseUrl}/chat/completions`;
  
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
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

  if (!response.ok || !response.body) {
    throw new Error(`AI streaming request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.trim()) {
          const chunks = parseSSELines(buffer);
          for (const chunk of chunks) {
            if (chunk.delta) {
              fullContent += chunk.delta;
              yield { delta: chunk.delta, done: false };
            }
          }
        }
        yield { delta: "", done: true, content: fullContent };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const parsed = parseSSELine(line);
        if (parsed) {
          if (parsed.delta) {
            fullContent += parsed.delta;
            yield { delta: parsed.delta, done: false };
          }
          if (parsed.done) {
            yield { delta: "", done: true, content: fullContent };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
