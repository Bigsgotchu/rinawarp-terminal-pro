/**
 * Prompt Builder
 * 
 * Structured prompts for LLM - follows Rust architecture.
 */

import type { AiMessage } from "./schema.js";

/**
 * System prompt for shell assistant
 */
export function buildSystemPrompt(): string {
  return `You are a Unix shell expert.

Rules:
1. Only generate valid commands.
2. Never generate destructive commands unless explicitly requested.
3. Prefer common tools (git, npm, docker, kubectl, etc).
4. Explain your reasoning.
5. Output valid JSON only.

Response schema:
{
  "analysis": "explanation",
  "commands": ["cmd1", "cmd2"],
  "risk": "low|medium|high",
  "explanation": "what these do"
}`;
}

/**
 * Error fix prompt
 */
export function buildErrorFixPrompt(error: string, context: string): string {
  return `Error:
${error}

Context:
${context}

Generate a fix plan.

JSON:
{
  "analysis": "...",
  "commands": ["..."],
  "risk": "low|medium|high",
  "explanation": "..."
}`;
}

/**
 * Command explanation prompt
 */
export function buildExplainPrompt(command: string): string {
  return `Command:
${command}

Explain what this does.

JSON:
{
  "analysis": "brief",
  "explanation": "detailed for developers",
  "risk": "low|medium|high"
}`;
}

/**
 * Natural language to command prompt
 */
export function buildTranslatePrompt(intent: string, context: string): string {
  return `Intent:
${intent}

Context:
${context}

Generate shell commands.

JSON:
{
  "analysis": "...",
  "commands": ["..."],
  "risk": "low|medium|high",
  "explanation": "..."
}`;
}

/**
 * Risk classification prompt
 */
export function buildRiskPrompt(command: string): string {
  return `Classify risk:

${command}

JSON:
{
  "risk": "low|medium|high",
  "reasoning": "..."
}`;
}

/**
 * Create chat messages
 */
export function createMessages(
  systemPrompt: string,
  userContent: string
): AiMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

/**
 * Create error explanation request
 */
export function createErrorExplanationRequest(
  error: string,
  context: string
): AiMessage[] {
  return createMessages(
    buildSystemPrompt(),
    buildErrorFixPrompt(error, context)
  );
}

/**
 * Create command translation request
 */
export function createTranslationRequest(
  intent: string,
  context: string
): AiMessage[] {
  return createMessages(
    buildSystemPrompt(),
    buildTranslatePrompt(intent, context)
  );
}
