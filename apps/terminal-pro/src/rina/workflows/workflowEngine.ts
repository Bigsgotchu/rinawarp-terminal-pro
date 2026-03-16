/**
 * RinaWarp Workflow Engine
 *
 * Enables saving and running multi-step workflows.
 */

export interface WorkflowStep {
  name: string
  command: string
  timeout?: number
  continueOnError?: boolean
}

export interface Workflow {
  name: string
  description?: string
  steps: WorkflowStep[]
  createdAt?: number
  lastRun?: number
}

/**
 * Workflow Engine - manages automated workflows
 */
class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map()

  constructor() {
    // Add default workflows
    this.addDefaultWorkflows()
  }

  /**
   * Add default workflows
   */
  private addDefaultWorkflows(): void {
    // CI workflow
    this.add({
      name: 'ci',
      description: 'Install, build, and test',
      steps: [
        { name: 'Install', command: 'pnpm install', timeout: 120000 },
        { name: 'Build', command: 'pnpm build', timeout: 120000 },
        { name: 'Test', command: 'pnpm test', timeout: 120000 },
      ],
    })

    // Deploy workflow
    this.add({
      name: 'deploy',
      description: 'Build and deploy',
      steps: [
        { name: 'Build', command: 'pnpm build', timeout: 120000 },
        { name: 'Dockerize', command: 'docker build -t app .', timeout: 180000 },
        { name: 'Deploy', command: 'docker compose up -d', timeout: 60000 },
      ],
    })

    // Quick test workflow
    this.add({
      name: 'test',
      description: 'Run tests only',
      steps: [
        { name: 'Install deps', command: 'pnpm install', timeout: 120000 },
        { name: 'Run tests', command: 'pnpm test', timeout: 120000 },
      ],
    })
  }

  /**
   * Add a workflow
   */
  add(workflow: Workflow): void {
    if (!workflow.createdAt) {
      workflow.createdAt = Date.now()
    }
    this.workflows.set(workflow.name, workflow)
  }

  /**
   * Get a workflow
   */
  get(name: string): Workflow | undefined {
    return this.workflows.get(name)
  }

  /**
   * List all workflows
   */
  list(): Workflow[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Remove a workflow
   */
  remove(name: string): boolean {
    return this.workflows.delete(name)
  }

  /**
   * Run a workflow
   */
  async run(
    name: string,
    onStep?: (step: WorkflowStep, index: number, total: number) => Promise<void>
  ): Promise<{ success: boolean; results: Array<{ step: string; success: boolean; error?: string }> }> {
    const workflow = this.workflows.get(name)

    if (!workflow) {
      return {
        success: false,
        results: [{ step: name, success: false, error: 'Workflow not found' }],
      }
    }

    const results: Array<{ step: string; success: boolean; error?: string }> = []
    let allSuccess = true

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]

      if (onStep) {
        await onStep(step, i, workflow.steps.length)
      }

      try {
        // Execute step (would use terminal tool in production)
        console.log(`[Workflow] Running: ${step.name} - ${step.command}`)

        // Simulate execution
        await new Promise((resolve) => setTimeout(resolve, 500))

        results.push({ step: step.name, success: true })
      } catch (error) {
        results.push({ step: step.name, success: false, error: String(error) })

        if (!step.continueOnError) {
          allSuccess = false
          break
        }
      }
    }

    // Update last run time
    workflow.lastRun = Date.now()

    return { success: allSuccess, results }
  }

  /**
   * Export workflows as JSON
   */
  export(): string {
    return JSON.stringify(this.list(), null, 2)
  }

  /**
   * Import workflows from JSON
   */
  import(json: string): void {
    try {
      const workflows = JSON.parse(json) as Workflow[]
      for (const wf of workflows) {
        this.add(wf)
      }
    } catch {
      console.error('Failed to import workflows')
    }
  }
}

/**
 * Singleton instance
 */
export const workflowEngine = new WorkflowEngine()
