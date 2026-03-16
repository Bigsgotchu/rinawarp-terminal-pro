/**
 * Neural Planning Engine
 *
 * Uses LLM to generate structured plans from user input.
 * Converts natural language requests into executable tool steps.
 */

import { thinkingStream } from '../thinking/thinkingStream.js'

export type PlanStep = {
  tool: string
  action: string
  description?: string
  timeout?: number
}

export type NeuralPlan = {
  id: string
  input: string
  steps: PlanStep[]
  reasoning?: string
}

// Default available tools for the LLM to use
const AVAILABLE_TOOLS = [
  'terminal', // Execute shell commands
  'filesystem', // Read/write files
  'git', // Git operations
  'docker', // Docker operations
  'system', // System info
]

// Example prompts for the LLM
const SYSTEM_PROMPT = `You are an AI system controlling developer tools.
You must return ONLY valid JSON array.
Each step must have: tool, action (command), description (optional).

Available tools:
- terminal: Execute shell commands (pnpm, npm, git, docker, etc.)
- filesystem: Read/write files
- git: Git operations (commit, push, pull, branch)
- docker: Docker operations (build, run, compose)
- system: Get system information

Example input: "install dependencies and run dev server"
Example output:
[
  {"tool": "terminal", "action": "pnpm install", "description": "Install project dependencies"},
  {"tool": "terminal", "action": "pnpm dev", "description": "Start development server"}
]`

export class NeuralPlanner {
  private apiKey: string | undefined
  private baseURL: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
  }

  /**
   * Check if the neural planner is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Create a plan from user input using LLM
   */
  async createPlan(userInput: string): Promise<NeuralPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

    thinkingStream.emit('thinking', {
      type: 'neural_planner',
      status: 'generating',
      message: 'Generating neural plan...',
    })

    if (!this.isConfigured()) {
      // Return a fallback simple plan
      return this.createFallbackPlan(userInput, planId)
    }

    try {
      const response = await this.callLLM(userInput)
      const steps = this.parseLLMResponse(response)

      thinkingStream.emit('thinking', {
        type: 'neural_planner',
        status: 'success',
        message: `Generated plan with ${steps.length} steps`,
      })

      return {
        id: planId,
        input: userInput,
        steps,
      }
    } catch (error) {
      console.error('[NeuralPlanner] Error:', error)
      thinkingStream.emit('thinking', {
        type: 'neural_planner',
        status: 'error',
        message: `Planning failed: ${error}`,
      })

      // Fallback to simple plan
      return this.createFallbackPlan(userInput, planId)
    }
  }

  /**
   * Call the LLM API
   */
  private async callLLM(userInput: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userInput },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  /**
   * Parse LLM response into plan steps
   */
  private parseLLMResponse(response: string): PlanStep[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const steps = JSON.parse(jsonMatch[0])

      // Validate and normalize steps
      return steps
        .map((step: any, index: number) => ({
          tool: step.tool || 'terminal',
          action: step.action || step.command || '',
          description: step.description || `Step ${index + 1}`,
          timeout: step.timeout || 60000,
        }))
        .filter((step: PlanStep) => step.action)
    } catch (error) {
      console.warn('[NeuralPlanner] Parse error:', error)
      return []
    }
  }

  /**
   * Create a fallback simple plan when LLM is unavailable
   */
  private createFallbackPlan(userInput: string, planId: string): NeuralPlan {
    const input = userInput.toLowerCase()
    const steps: PlanStep[] = []

    // Simple keyword-based fallback
    if (input.includes('install') || input.includes('dependencies') || input.includes('deps')) {
      steps.push({
        tool: 'terminal',
        action: 'pnpm install',
        description: 'Install dependencies',
      })
    }

    if (input.includes('build') || input.includes('compile')) {
      steps.push({
        tool: 'terminal',
        action: 'pnpm build',
        description: 'Build project',
      })
    }

    if (input.includes('dev') || input.includes('start') || input.includes('run')) {
      steps.push({
        tool: 'terminal',
        action: 'pnpm dev',
        description: 'Start development server',
      })
    }

    if (input.includes('test')) {
      steps.push({
        tool: 'terminal',
        action: 'pnpm test',
        description: 'Run tests',
      })
    }

    if (input.includes('docker')) {
      if (input.includes('build')) {
        steps.push({
          tool: 'docker',
          action: 'compose build',
          description: 'Build Docker containers',
        })
      }
      steps.push({
        tool: 'docker',
        action: 'compose up',
        description: 'Start Docker containers',
      })
    }

    // If no steps matched, just echo the input as a terminal command
    if (steps.length === 0) {
      steps.push({
        tool: 'terminal',
        action: userInput,
        description: 'Execute command',
      })
    }

    thinkingStream.emit('thinking', {
      type: 'neural_planner',
      status: 'fallback',
      message: `Created fallback plan with ${steps.length} steps`,
    })

    return {
      id: planId,
      input: userInput,
      steps,
      reasoning: 'Fallback plan (LLM not configured)',
    }
  }

  /**
   * Get available tools info
   */
  getAvailableTools(): string[] {
    return AVAILABLE_TOOLS
  }
}

export const neuralPlanner = new NeuralPlanner()
