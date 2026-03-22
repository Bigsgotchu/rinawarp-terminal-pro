/**
 * Rina OS Control Layer - Task Planner
 *
 * Plans complex goals into executable steps.
 * This is a rule-based planner that can be replaced by cloud AI later.
 *
 * Additive architecture - does not modify existing core functionality.
 */

/**
 * A single step in a plan
 */
export type RinaPlanStep = {
  id: string
  tool: string
  input: Record<string, unknown>
  description: string
  dependsOn?: string[]
}

/**
 * A complete plan with goal and steps
 */
export type RinaPlan = {
  goal: string
  steps: RinaPlanStep[]
  metadata?: {
    createdAt: number
    estimatedSteps?: number
  }
}

/**
 * Task Planner - Creates plans from goals
 */
export class TaskPlanner {
  /**
   * Create a plan for a given goal
   */
  async createPlan(goal: string): Promise<RinaPlan> {
    const lower = goal.toLowerCase().trim()

    // React project creation
    if (lower.includes('react') && (lower.includes('create') || lower.includes('new') || lower.includes('build'))) {
      return this.createReactProjectPlan(goal)
    }

    // Node.js project
    if ((lower.includes('node') || lower.includes('npm')) && (lower.includes('init') || lower.includes('create'))) {
      return this.createNodeProjectPlan(goal)
    }

    // Python project
    if (lower.includes('python') && (lower.includes('create') || lower.includes('new') || lower.includes('venv'))) {
      return this.createPythonProjectPlan(goal)
    }

    // Git repository
    if (lower.includes('git') && lower.includes('init')) {
      return this.createGitRepoPlan(goal)
    }

    // Docker container
    if (lower.includes('docker') && (lower.includes('run') || lower.includes('start'))) {
      return this.createDockerContainerPlan(goal)
    }

    // Generic multi-step commands
    if (lower.includes(' && ') || lower.includes('; ')) {
      return this.createChainPlan(goal)
    }

    // Default: single step
    return this.createDefaultPlan(goal)
  }

  private createReactProjectPlan(goal: string): RinaPlan {
    const projectName = this.extractProjectName(goal, 'react-app')

    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 4 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: `Create project directory: ${projectName}`,
          input: { command: `mkdir -p ${projectName}` },
        },
        {
          id: '2',
          tool: 'terminal',
          description: 'Initialize Vite React project',
          input: { command: `cd ${projectName} && npm create vite@latest . -- --template react` },
        },
        {
          id: '3',
          tool: 'terminal',
          description: 'Install dependencies',
          input: { command: `cd ${projectName} && npm install` },
        },
        {
          id: '4',
          tool: 'terminal',
          description: 'Start development server',
          input: { command: `cd ${projectName} && npm run dev`, background: true },
        },
      ],
    }
  }

  private createNodeProjectPlan(goal: string): RinaPlan {
    const projectName = this.extractProjectName(goal, 'my-node-app')

    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 3 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: `Create project directory: ${projectName}`,
          input: { command: `mkdir -p ${projectName}` },
        },
        {
          id: '2',
          tool: 'terminal',
          description: 'Initialize Node.js project',
          input: { command: `cd ${projectName} && npm init -y` },
        },
        {
          id: '3',
          tool: 'terminal',
          description: 'Install dependencies',
          input: { command: `cd ${projectName} && npm install` },
        },
      ],
    }
  }

  private createPythonProjectPlan(goal: string): RinaPlan {
    const projectName = this.extractProjectName(goal, 'python-project')

    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 4 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: `Create project directory: ${projectName}`,
          input: { command: `mkdir -p ${projectName}` },
        },
        {
          id: '2',
          tool: 'terminal',
          description: 'Create virtual environment',
          input: { command: `cd ${projectName} && python3 -m venv venv` },
        },
        {
          id: '3',
          tool: 'terminal',
          description: 'Activate virtual environment',
          input: { command: `source ${projectName}/venv/bin/activate` },
        },
        {
          id: '4',
          tool: 'terminal',
          description: 'Create requirements.txt',
          input: { command: `touch ${projectName}/requirements.txt` },
        },
      ],
    }
  }

  private createGitRepoPlan(goal: string): RinaPlan {
    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 2 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: 'Initialize git repository',
          input: { command: 'git init' },
        },
        {
          id: '2',
          tool: 'terminal',
          description: 'Create initial commit',
          input: { command: "git add . && git commit -m 'Initial commit'" },
        },
      ],
    }
  }

  private createDockerContainerPlan(goal: string): RinaPlan {
    const imageName = this.extractDockerImage(goal)

    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 2 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: `Pull Docker image: ${imageName}`,
          input: { command: `docker pull ${imageName}` },
        },
        {
          id: '2',
          tool: 'terminal',
          description: `Run container from ${imageName}`,
          input: { command: `docker run -it ${imageName}`, background: true },
        },
      ],
    }
  }

  private createChainPlan(goal: string): RinaPlan {
    // Split by && or ;
    const commands = goal.split(/\s*(?:&&|;)\s*/)

    const steps: RinaPlanStep[] = commands.map((cmd, index) => ({
      id: String(index + 1),
      tool: 'terminal',
      description: `Execute: ${cmd.trim()}`,
      input: { command: cmd.trim() },
    }))

    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: steps.length },
      steps,
    }
  }

  private createDefaultPlan(goal: string): RinaPlan {
    return {
      goal,
      metadata: { createdAt: Date.now(), estimatedSteps: 1 },
      steps: [
        {
          id: '1',
          tool: 'terminal',
          description: `Execute: ${goal}`,
          input: { command: goal },
        },
      ],
    }
  }

  private extractProjectName(goal: string, fallback: string): string {
    // Try to extract project name from the goal
    const match = goal.match(/(?:called|named|project\s+(?:named|called)?|app\s+(?:named|called)?)\s+(\w+)/i)
    return match ? match[1] : fallback
  }

  private extractDockerImage(goal: string): string {
    // Try to extract image name
    const match = goal.match(/(?:image|container)\s+(?:from\s+)?(\w+(?:\/\w+)?(?::\w+)?)/i)
    return match ? match[1] : 'nginx'
  }
}

// Singleton instance
export const taskPlanner = new TaskPlanner()
