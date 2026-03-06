/**
 * LLM Interface Module
 * 
 * Generates structured fix plans from system context using AI.
 * Supports OpenAI and Anthropic providers.
 */

import type { ToolCall, AgentPlan } from "@rinawarp/agent";
import type { RiskLevel } from "@rinawarp/safety";

export type LLMProvider = "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseURL?: string; // For Ollama/self-hosted
}

export interface GeneratePlanInput {
  userPrompt: string;
  systemContext: SystemContext;
  history?: ConversationHistory;
}

export interface SystemContext {
  os: string;
  kernel: string;
  hostname: string;
  uptime: string;
  cpu: string;
  memory: string;
  disk: string;
  processes: string;
  services: string;
  docker?: string;
  git?: {
    branch: string;
    status: string;
  };
}

export interface ConversationHistory {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface FixPlan {
  analysis: string;
  commands: string[];
  risk: RiskLevel;
  confidence: number;
  reasoning?: string;
}

/**
 * Default system prompt for troubleshooting assistant
 */
const SYSTEM_PROMPT = `You are an AI system troubleshooting assistant for RinaWarp.

You help developers diagnose and fix system issues.

Rules:
- Never run destructive commands (rm -rf /, mkfs, dd)
- Always explain your reasoning
- Prefer read-only commands first (cat, ls, ps, systemctl status)
- Output JSON only in your response
- Risk level: low (read-only), medium (write operations), high (destructive)

Your response must be valid JSON with this schema:
{
  "analysis": "What you think is wrong",
  "commands": ["command1", "command2"],
  "risk": "low|medium|high",
  "confidence": 0.0-1.0,
  "reasoning": "Why these commands will help"
}`;

/**
 * Parse LLM response into FixPlan
 */
function parseFixPlan(response: string): FixPlan {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in LLM response");
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    analysis: parsed.analysis || "Unknown issue",
    commands: Array.isArray(parsed.commands) ? parsed.commands : [],
    risk: (parsed.risk === "high" || parsed.risk === "medium" || parsed.risk === "low") 
      ? parsed.risk 
      : "low",
    confidence: typeof parsed.confidence === "number" 
      ? Math.max(0, Math.min(1, parsed.confidence)) 
      : 0.5,
    reasoning: parsed.reasoning,
  };
}

/**
 * Build context string from SystemContext
 */
function buildContextString(ctx: SystemContext): string {
  const lines = [
    "=== SYSTEM CONTEXT ===",
    `OS: ${ctx.os}`,
    `Kernel: ${ctx.kernel}`,
    `Hostname: ${ctx.hostname}`,
    `Uptime: ${ctx.uptime}`,
    `CPU: ${ctx.cpu}`,
    `Memory: ${ctx.memory}`,
    `Disk: ${ctx.disk}`,
    "",
    "=== RUNNING PROCESSES ===",
    ctx.processes.slice(0, 2000),
    "",
    "=== SERVICES ===",
    ctx.services.slice(0, 1000),
  ];
  
  if (ctx.docker) {
    lines.push("", "=== DOCKER ===", ctx.docker.slice(0, 1000));
  }
  
  if (ctx.git) {
    lines.push("", "=== GIT ===", `Branch: ${ctx.git.branch}`, ctx.git.status);
  }
  
  return lines.join("\n");
}

/**
 * Build messages for LLM API
 */
function buildMessages(
  input: GeneratePlanInput,
  systemPrompt: string = SYSTEM_PROMPT
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  
  // Add conversation history
  if (input.history?.messages) {
    for (const msg of input.history.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  
  // Add current context and prompt
  const contextStr = buildContextString(input.systemContext);
  const userContent = `=== USER PROBLEM ===
${input.userPrompt}

${contextStr}

Generate a fix plan in JSON format.`;
  
  messages.push({ role: "user", content: userContent });
  
  return messages;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  config: LLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const model = config.model || "gpt-4o";
  const url = config.baseURL 
    ? `${config.baseURL}/v1/chat/completions`
    : "https://api.openai.com/v1/chat/completions";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  
  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }
  
  return content;
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  config: LLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const model = config.model || "claude-sonnet-4-20250514";
  const url = config.baseURL 
    ? `${config.baseURL}/v1/messages`
    : "https://api.anthropic.com/v1/messages";
  
  // Anthropic uses a different message format
  const systemMessage = messages.find(m => m.role === "system")?.content || "";
  const userMessages = messages.filter(m => m.role !== "system");
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    content?: Array<{ text?: string }>;
    error?: { message?: string };
  };
  
  if (data.error) {
    throw new Error(`Anthropic error: ${data.error.message}`);
  }
  
  const textContent = data.content?.[0]?.text;
  if (!textContent) {
    throw new Error("No content in Anthropic response");
  }
  
  return textContent;
}

/**
 * Generate a fix plan using the configured LLM
 */
export async function generateFixPlan(
  config: LLMConfig,
  input: GeneratePlanInput,
  options?: {
    systemPrompt?: string;
    maxRetries?: number;
  }
): Promise<FixPlan> {
  const maxRetries = options?.maxRetries ?? 2;
  const messages = buildMessages(input, options?.systemPrompt);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let response: string;
      
      if (config.provider === "openai") {
        response = await callOpenAI(config, messages);
      } else if (config.provider === "anthropic") {
        response = await callAnthropic(config, messages);
      } else {
        throw new Error(`Unsupported provider: ${config.provider}`);
      }
      
      return parseFixPlan(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on malformed responses
      if (lastError.message.includes("No valid JSON")) {
        throw lastError;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error("Failed to generate fix plan");
}

/**
 * Convert FixPlan to AgentPlan
 */
export function toAgentPlan(fixPlan: FixPlan, userPrompt: string): AgentPlan {
  const steps: ToolCall[] = fixPlan.commands.map((command, index) => ({
    tool: "terminal" as const,
    command,
    risk: fixPlan.risk,
    description: `Step ${index + 1}: ${fixPlan.reasoning || fixPlan.analysis}`,
  }));
  
  return {
    intent: userPrompt,
    summary: fixPlan.analysis,
    steps,
    metadata: {
      estimatedTimeSeconds: steps.length * 5,
      requiresConfirmation: fixPlan.risk !== "low",
      tags: ["llm-generated", `confidence:${fixPlan.confidence}`],
    },
  };
}

/**
 * Validate LLM configuration
 */
export function validateConfig(config: LLMConfig): string[] {
  const errors: string[] = [];
  
  if (!config.apiKey?.trim()) {
    errors.push("API key is required");
  }
  
  if (config.provider !== "openai" && config.provider !== "anthropic") {
    errors.push("Provider must be 'openai' or 'anthropic'");
  }
  
  return errors;
}

/**
 * Get default config from environment
 */
export function getConfigFromEnv(): LLMConfig | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey,
      model: process.env.OPENAI_MODEL,
      baseURL: process.env.OPENAI_BASE_URL,
    };
  }
  
  return {
    provider: "anthropic",
    apiKey,
    model: process.env.ANTHROPIC_MODEL,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  };
}
