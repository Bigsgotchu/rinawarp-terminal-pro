/**
 * AI Shell Autocomplete
 *
 * Problem #7: Shell Autocomplete Powered by AI
 * Better than normal autocomplete - context-aware.
 *
 * User types "git re" → suggestions: git reset, git revert, git rebase
 */

import { generateFixPlan } from './llm.js'
import type { LLMConfig } from './llm.js'

export interface AutocompleteSuggestion {
  command: string
  description: string
  score: number
}

export interface AutocompleteContext {
  currentInput: string
  cursorPosition: number
  workingDirectory: string
  gitBranch?: string
  recentCommands?: string[]
  availableCommands?: string[]
}

/**
 * Get AI-powered autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  config: LLMConfig,
  context: AutocompleteContext,
  limit: number = 5
): Promise<AutocompleteSuggestion[]> {
  const prompt = `You are a shell autocomplete assistant.

Current input: "${context.currentInput}"
Working directory: ${context.workingDirectory}
${context.gitBranch ? `Git branch: ${context.gitBranch}` : ''}
${context.recentCommands?.length ? `Recent commands: ${context.recentCommands.join(', ')}` : ''}

Generate ${limit} possible completions for this command prefix.

Respond with ONLY valid JSON array:
[
  {"command": "git reset", "description": "Reset current HEAD", "score": 0.9},
  {"command": "git revert", "description": "Revert commits", "score": 0.7},
  {"command": "git rebase", "description": "Rebase onto another branch", "score": 0.6}
]`

  try {
    const result = await generateFixPlan(
      config,
      {
        userPrompt: `Autocomplete: ${context.currentInput}`,
        systemContext: {
          os: 'linux',
          kernel: '',
          hostname: '',
          uptime: '',
          cpu: '',
          memory: '',
          disk: '',
          processes: '',
          services: '',
          git: context.gitBranch
            ? {
                branch: context.gitBranch,
                status: '',
              }
            : undefined,
        },
      },
      {
        systemPrompt: prompt,
        maxRetries: 1,
      }
    )

    // Parse commands from result
    const suggestions: AutocompleteSuggestion[] = result.commands.slice(0, limit).map((cmd, idx) => ({
      command: cmd,
      description: result.reasoning || 'AI suggested',
      score: result.confidence * (1 - idx * 0.1), // Decrease score for each subsequent
    }))

    return suggestions
  } catch (error) {
    // Fall back to basic completions
    return getBasicCompletions(context.currentInput, limit)
  }
}

/**
 * Basic completions when AI fails
 */
function getBasicCompletions(input: string, limit: number): AutocompleteSuggestion[] {
  const baseCommands: Record<string, AutocompleteSuggestion[]> = {
    git: [
      { command: 'git status', description: 'Show working tree status', score: 0.9 },
      { command: 'git add', description: 'Add file contents to index', score: 0.8 },
      { command: 'git commit', description: 'Record changes to repository', score: 0.8 },
      { command: 'git push', description: 'Update remote refs', score: 0.7 },
      { command: 'git pull', description: 'Fetch and integrate', score: 0.7 },
      { command: 'git log', description: 'Show commit logs', score: 0.6 },
      { command: 'git diff', description: 'Show changes', score: 0.6 },
    ],
    npm: [
      { command: 'npm install', description: 'Install dependencies', score: 0.9 },
      { command: 'npm run', description: 'Run package script', score: 0.8 },
      { command: 'npm test', description: 'Run tests', score: 0.7 },
      { command: 'npm start', description: 'Start the application', score: 0.7 },
      { command: 'npm build', description: 'Build the application', score: 0.6 },
    ],
    docker: [
      { command: 'docker ps', description: 'List containers', score: 0.9 },
      { command: 'docker images', description: 'List images', score: 0.8 },
      { command: 'docker run', description: 'Run a container', score: 0.8 },
      { command: 'docker build', description: 'Build image', score: 0.7 },
      { command: 'docker exec', description: 'Execute command in container', score: 0.6 },
    ],
    kubectl: [
      { command: 'kubectl get pods', description: 'List pods', score: 0.9 },
      { command: 'kubectl describe', description: 'Describe resource', score: 0.8 },
      { command: 'kubectl apply', description: 'Apply configuration', score: 0.8 },
      { command: 'kubectl logs', description: 'Print logs', score: 0.7 },
    ],
  }

  const inputLower = input.toLowerCase().trim()

  for (const [prefix, completions] of Object.entries(baseCommands)) {
    if (inputLower.startsWith(prefix)) {
      return completions.slice(0, limit)
    }
  }

  // Default common commands
  const defaultCommands: AutocompleteSuggestion[] = [
    { command: 'ls -la', description: 'List files detailed', score: 0.9 },
    { command: 'cd ', description: 'Change directory', score: 0.8 },
    { command: 'cat ', description: 'Print file content', score: 0.7 },
    { command: 'grep ', description: 'Search pattern', score: 0.7 },
    { command: 'find . -name ', description: 'Find files by name', score: 0.6 },
  ]

  return defaultCommands.slice(0, limit)
}

/**
 * Format suggestions for shell completion
 */
export function formatZshCompletions(suggestions: AutocompleteSuggestion[]): string {
  return suggestions.map((s) => `${s.command}:${s.description}`).join('\n')
}

export function formatFishCompletions(suggestions: AutocompleteSuggestion[]): string {
  return suggestions.map((s) => `${s.command}\t${s.description}`).join('\n')
}
