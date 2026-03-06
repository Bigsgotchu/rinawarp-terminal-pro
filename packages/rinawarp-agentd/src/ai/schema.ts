/**
 * AI Schema
 * 
 * Request/Response types for LLM.
 */

export type AiModel = 
  | "gpt-4o" 
  | "gpt-4o-mini" 
  | "gpt-4-turbo"
  | "claude-3-5-sonnet"
  | "claude-3-opus";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiRequest {
  model: AiModel;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}

export interface AiResponse {
  content: Record<string, unknown>;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CommandPlan {
  analysis: string;
  commands: string[];
  risk: "low" | "medium" | "high";
  explanation: string;
}

export interface ErrorExplanation {
  analysis: string;
  likelyCause: string;
  suggestedFix: string;
  commands: string[];
}

/**
 * Default models
 */
export const DEFAULT_MODELS = {
  fast: "gpt-4o-mini" as AiModel,
  balanced: "gpt-4o" as AiModel,
  best: "claude-3-5-sonnet" as AiModel,
};

/**
 * Get model from string
 */
export function parseModel(s: string): AiModel {
  const lower = s.toLowerCase();
  if (lower.includes("mini")) return "gpt-4o-mini";
  if (lower.includes("4o")) return "gpt-4o";
  if (lower.includes("turbo")) return "gpt-4-turbo";
  if (lower.includes("opus")) return "claude-3-opus";
  if (lower.includes("sonnet")) return "claude-3-5-sonnet";
  return "gpt-4o";
}
