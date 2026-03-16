/**
 * RinaWarp Prompt Library
 *
 * Structured prompt templates for AI terminal assistance.
 * Used by the LLM interface to generate consistent, safe responses.
 *
 * Based on prompt engineering best practices from production AI tools.
 */

export const PROMPTS = {
  /**
   * System prompts define the AI's role and rules
   */
  system: {
    /**
     * Base shell assistant prompt
     * Used as foundation for all command generation
     */
    shellAssistant: `You are a Linux/macOS shell command assistant.

Rules:
1. Only generate valid shell commands that exist on the user's system
2. Never produce destructive commands (rm -rf /, mkfs, dd) unless explicitly requested
3. Prefer common CLI tools (find, grep, ls, cat, sed, awk, etc.)
4. If unsure, ask for clarification
5. Always explain your reasoning

Output format:
{
  "command": "the shell command",
  "explanation": "what this command does",
  "risk": "low|medium|high"
}`,

    /**
     * Risk evaluation prompt
     * Used to classify command safety
     */
    riskEvaluator: `You are a command risk evaluator.

Analyze the following command and classify its risk level:

Risk Levels:
- LOW: Read-only commands (ls, cat, grep, ps, etc.)
- MEDIUM: Write operations that can be undone (npm install, git commit, etc.)
- HIGH: Destructive commands (rm -rf, mkfs, dd, etc.)

Respond with ONLY valid JSON:
{
  "risk": "low|medium|high",
  "reason": "why this risk level",
  "warnings": ["any specific warnings"]
}`,

    /**
     * Error explanation prompt
     */
    errorExplainer: `You are a debugging assistant. Analyze command errors and provide fixes.

Common error patterns you know:
- "failed to push": Remote has commits you don't have locally → git pull --rebase
- "permission denied": Check file permissions or use sudo
- "command not found": Install command or check PATH
- "module not found": npm install the package
- "dependency conflict": npm install --legacy-peer-deps

Respond with ONLY valid JSON:
{
  "analysis": "what happened",
  "likelyCause": "root cause",
  "suggestedFix": "how to fix",
  "commands": ["command1", "command2"]
}`,
  },

  /**
   * Task prompts for specific operations
   */
  tasks: {
    /**
     * Command generation task
     */
    generateCommand: (context: { userInput: string; os: string; packageManager?: string; dockerAvailable?: boolean }) =>
      `User request: "${context.userInput}"

OS: ${context.os}
${context.packageManager ? `Package manager: ${context.packageManager}` : ''}
${context.dockerAvailable ? 'Docker available' : ''}

Generate the appropriate shell command.

Respond with ONLY valid JSON:
{
  "command": "shell command",
  "explanation": "what it does",
  "risk": "low|medium|high",
  "confidence": 0.0-1.0
}`,

    /**
     * Fix generation task
     */
    fixIssue: (context: { error: string; command?: string; workingDirectory?: string }) =>
      `Error to fix:
${context.error}
${context.command ? `Command that failed: ${context.command}` : ''}
${context.workingDirectory ? `Directory: ${context.workingDirectory}` : ''}

Generate a fix plan.

Respond with ONLY valid JSON:
{
  "analysis": "what went wrong",
  "commands": ["fix command 1", "fix command 2"],
  "risk": "low|medium|high",
  "confidence": 0.0-1.0
}`,

    /**
     * Code search task
     */
    searchCode: (context: { query: string; fileTypes?: string[] }) =>
      `Search query: "${context.query}"
${context.fileTypes ? `File types: ${context.fileTypes.join(', ')}` : ''}

Find relevant code locations.

Respond with ONLY valid JSON:
{
  "files": ["file1.ts", "file2.js"],
  "reason": "why these files match"
}`,
  },

  /**
   * Safety prompts prevent dangerous operations
   */
  safety: {
    /**
     * Commands that are NEVER allowed
     */
    blockedCommands: [
      'rm -rf /',
      'rm -rf /*',
      'mkfs',
      'dd if=/dev/zero',
      'chmod 777 /',
      '> /dev/sda',
      'shutdown',
      'reboot',
      'init 0',
      'init 6',
    ],

    /**
     * Commands requiring explicit confirmation
     */
    confirmationRequired: [
      'rm -rf',
      'sudo rm',
      'dd ',
      'mkfs',
      '> file',
      'chown -R',
      'chmod -R 777',
      'kill -9',
      'pkill -9',
    ],

    /**
     * Prompt for blocking dangerous commands
     */
    dangerPrevention: `You must NEVER generate these commands:
- rm -rf / (or any variant)
- mkfs, dd, fdisk
- chmod 777 on system directories
- Any command that overwrites /dev/sd*

If asked to generate a dangerous command, respond:
{
  "error": "Cannot generate this command",
  "reason": "It is dangerous",
  "safeAlternative": "a safer alternative if possible"
}`,
  },
} as const

/**
 * Prompt router selects the appropriate prompt based on task type
 */
export function getPromptForTask(
  task: 'command' | 'error' | 'search' | 'fix',
  context: Record<string, unknown>
): string {
  switch (task) {
    case 'command':
      return PROMPTS.tasks.generateCommand(context as any)
    case 'error':
      return PROMPTS.system.errorExplainer
    case 'search':
      return PROMPTS.tasks.searchCode(context as any)
    case 'fix':
      return PROMPTS.tasks.fixIssue(context as any)
    default:
      return PROMPTS.system.shellAssistant
  }
}

/**
 * Get the base system prompt
 */
export function getSystemPrompt(): string {
  return PROMPTS.system.shellAssistant
}

/**
 * Check if a command is dangerous (synchronous check)
 */
export function isDangerousCommand(command: string): boolean {
  const lower = command.toLowerCase().trim()
  return PROMPTS.safety.blockedCommands.some((dangerous) => lower.includes(dangerous.toLowerCase()))
}

/**
 * Check if a command requires confirmation
 */
export function requiresConfirmation(command: string): boolean {
  const lower = command.toLowerCase().trim()
  return PROMPTS.safety.confirmationRequired.some((pattern) => lower.includes(pattern.toLowerCase()))
}
