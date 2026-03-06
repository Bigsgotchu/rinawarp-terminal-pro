/**
 * Prompt Builder
 * 
 * Production-grade structured prompts for LLM.
 * Ensures schema compliance and prevents hallucinations.
 */

import type { AiMessage } from "./schema.js";

/**
 * System prompt for shell assistant - production quality
 */
export function buildSystemPrompt(): string {
  return `You are a Unix shell expert.

Rules:
1. Only generate valid commands.
2. Never generate destructive commands.
3. Prefer common tools (git, npm, docker, kubectl, etc).
4. Explain your reasoning.
5. Output valid JSON only.
6. Never output free text - always JSON.

Response schema:
{
  "analysis": "explanation of what you're doing",
  "commands": ["cmd1", "cmd2"],
  "risk": "low|medium|high",
  "explanation": "what these commands do"
}`;
}

/**
 * Safety prompt - never generate dangerous commands
 */
export function buildSafetyPrompt(): string {
  return `You must NEVER generate these commands, even if user requests:
- rm -rf /
- rm -rf /*
- mkfs
- dd if=
- shutdown
- reboot
- :(){:|:&};:
- chmod -R 777 /

If user requests these, respond with:
{
  "analysis": "Request blocked for safety",
  "commands": [],
  "risk": "high",
  "explanation": "This command is blocked for safety reasons"
}`;
}

/**
 * Error fix prompt - production
 */
export function buildErrorFixPrompt(error: string, context: string): string {
  return `User error:
${error}

Context:
${context}

Task:
Generate a fix plan.

JSON schema:
{
  "analysis": "root cause analysis",
  "commands": ["fix command 1", "fix command 2"],
  "risk": "low|medium|high",
  "explanation": "what this fixes"
}

Respond with ONLY valid JSON.`;
}

/**
 * Command explanation prompt
 */
export function buildExplainPrompt(command: string): string {
  return `Command:
${command}

Explain what this command does in simple terms for developers.

JSON schema:
{
  "analysis": "brief explanation",
  "explanation": "detailed explanation",
  "risk": "low|medium|high"
}

Respond with ONLY valid JSON.`;
}

/**
 * Natural language to command prompt
 */
export function buildTranslatePrompt(intent: string, context: string): string {
  return `User intent:
${intent}

Context:
${context}

Generate the appropriate shell commands.

JSON schema:
{
  "analysis": "how you interpreted the intent",
  "commands": ["shell command"],
  "risk": "low|medium|high",
  "explanation": "what will happen"
}

Respond with ONLY valid JSON.`;
}

/**
 * Risk classification prompt
 */
export function buildRiskPrompt(command: string): string {
  return `Classify the risk level of this command:

${command}

Risk levels:
- LOW: read-only, safe operations (ls, cat, git status)
- MEDIUM: potentially destructive but reversible (rm, chmod)
- HIGH: permanently destructive (rm -rf, mkfs, dd)

JSON schema:
{
  "risk": "low|medium|high",
  "reasoning": "why this risk level"
}

Respond with ONLY valid JSON.`;
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
  const system = buildSystemPrompt() + "\n\n" + buildSafetyPrompt();
  return createMessages(system, buildErrorFixPrompt(error, context));
}

/**
 * Create command translation request
 */
export function createTranslationRequest(
  intent: string,
  context: string
): AiMessage[] {
  const system = buildSystemPrompt() + "\n\n" + buildSafetyPrompt();
  return createMessages(system, buildTranslatePrompt(intent, context));
}

/**
 * Validate response schema - prevents hallucinations
 */
export function validateSchema(response: Record<string, unknown>): boolean {
  const risk = response.risk as string | undefined;
  const valid = 
    typeof response.analysis === "string" &&
    Array.isArray(response.commands) &&
    risk !== undefined &&
    ["low", "medium", "high"].includes(risk) &&
    typeof response.explanation === "string";
  
  return valid;
}
