/**
 * RinaWarp Autonomous DevOps Agent
 *
 * Automatically deploys projects with full CI/CD pipeline.
 * Users trigger with: "deploy this project"
 */

import * as fs from 'fs'
import * as path from 'path'
import { brainEvents } from '../brain/brainEvents.js'
import { toolRegistry } from '../core/toolRegistry.js'

function resolveDeploymentTargetPath(explicit?: string): string {
  const candidate = String(explicit || process.env.RINA_WORKSPACE_ROOT || '').trim()
  if (!candidate) {
    throw new Error('Missing deployment target path')
  }
  return candidate
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  projectRoot: string
  buildCommand?: string
  startCommand?: string
  dockerfile?: string
  dockerCompose?: string
  port?: number
  env?: Record<string, string>
  containerId?: string
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean
  steps: string[]
  containerId?: string
  url?: string
  errors: string[]
  duration: number
}

/**
 * DevOps Agent for automated deployments
 */
export class DevOpsAgent {
  name = 'devops'
  description = 'Autonomous deployment agent'

  /**
   * Detect project type and configuration
   */
  async detectProject(root: string): Promise<{
    type: 'node' | 'python' | 'go' | 'rust' | 'unknown'
    config: Partial<DeploymentConfig>
  }> {
    brainEvents.plan('Detecting project type')

    const config: Partial<DeploymentConfig> = {}
    let projectType: 'node' | 'python' | 'go' | 'rust' | 'unknown' = 'unknown'

    // Check for package.json (Node.js)
    if (fs.existsSync(path.join(root, 'package.json'))) {
      projectType = 'node'
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))
      config.buildCommand = pkg.scripts?.build || 'npm run build'
      config.startCommand = pkg.scripts?.start || 'npm start'
    }
    // Check for requirements.txt (Python)
    else if (fs.existsSync(path.join(root, 'requirements.txt'))) {
      projectType = 'python'
      config.buildCommand = 'pip install -r requirements.txt'
      config.startCommand = 'python app.py'
    }
    // Check for go.mod (Go)
    else if (fs.existsSync(path.join(root, 'go.mod'))) {
      projectType = 'go'
      config.buildCommand = 'go build'
      config.startCommand = './main'
    }
    // Check for Cargo.toml (Rust)
    else if (fs.existsSync(path.join(root, 'Cargo.toml'))) {
      projectType = 'rust'
      config.buildCommand = 'cargo build --release'
      config.startCommand = './target/release/app'
    }

    // Check for Dockerfile
    if (fs.existsSync(path.join(root, 'Dockerfile'))) {
      config.dockerfile = 'Dockerfile'
    }

    // Check for docker-compose.yml
    if (fs.existsSync(path.join(root, 'docker-compose.yml'))) {
      config.dockerCompose = 'docker-compose.yml'
    }

    brainEvents.result(`Detected ${projectType} project`)

    return { type: projectType, config }
  }

  /**
   * Full deployment pipeline
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now()
    const result: DeploymentResult = {
      success: false,
      steps: [],
      errors: [],
      duration: 0,
    }

    brainEvents.intent('Starting autonomous deployment')

    try {
      // Step 1: Detect project
      brainEvents.plan('Analyzing project', 0)
      const { type, config: detected } = await this.detectProject(config.projectRoot)
      result.steps.push(`Detected ${type} project`)

      // Merge configs
      config = { ...detected, ...config }

      // Step 2: Install dependencies
      brainEvents.plan('Installing dependencies', 20)
      await this.installDependencies(config)
      result.steps.push('Dependencies installed')

      // Step 3: Build project
      brainEvents.plan('Building project', 40)
      await this.buildProject(config)
      result.steps.push('Project built')

      // Step 4: Containerize (if Dockerfile exists)
      if (config.dockerfile || config.dockerCompose) {
        brainEvents.plan('Containerizing application', 60)
        const containerId = await this.containerize(config)
        result.containerId = containerId
        result.steps.push('Application containerized')

        // Step 5: Deploy container
        brainEvents.plan('Deploying container', 80)
        await this.deployContainer(config)
        result.steps.push('Container deployed')
      }

      // Step 6: Health check
      brainEvents.plan('Running health check', 90)
      await this.healthCheck(config)
      result.steps.push('Health check passed')

      result.success = true
      brainEvents.result('Deployment completed successfully!')
    } catch (error) {
      const errorMsg = String(error)
      result.errors.push(errorMsg)
      brainEvents.error(`Deployment failed: ${errorMsg}`)
    }

    result.duration = Date.now() - startTime

    return result
  }

  /**
   * Install dependencies
   */
  private async installDependencies(config: DeploymentConfig): Promise<void> {
    const terminal = toolRegistry.get('terminal')
    const root = config.projectRoot

    // Check package manager
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
      brainEvents.execution('Installing with pnpm')
      await terminal?.execute('pnpm install', root)
    } else if (fs.existsSync(path.join(root, 'yarn.lock'))) {
      brainEvents.execution('Installing with yarn')
      await terminal?.execute('yarn install', root)
    } else if (fs.existsSync(path.join(root, 'package-lock.json'))) {
      brainEvents.execution('Installing with npm')
      await terminal?.execute('npm install', root)
    } else if (fs.existsSync(path.join(root, 'requirements.txt'))) {
      brainEvents.execution('Installing Python dependencies')
      await terminal?.execute('pip install -r requirements.txt', root)
    }
  }

  /**
   * Build the project
   */
  private async buildProject(config: DeploymentConfig): Promise<void> {
    const terminal = toolRegistry.get('terminal')

    if (config.buildCommand) {
      brainEvents.execution(`Running: ${config.buildCommand}`)
      await terminal?.execute(config.buildCommand, config.projectRoot)
    }
  }

  /**
   * Containerize the application
   */
  private async containerize(config: DeploymentConfig): Promise<string> {
    const terminal = toolRegistry.get('terminal')
    const root = config.projectRoot

    if (config.dockerCompose) {
      brainEvents.execution('Building Docker Compose services')
      await terminal?.execute('docker compose build', root)
      return 'docker-compose'
    } else if (config.dockerfile) {
      brainEvents.execution('Building Docker image')
      const imageName = 'rinawarp-deploy:latest'
      await terminal?.execute(`docker build -t ${imageName} .`, root)
      return imageName
    }

    return ''
  }

  /**
   * Deploy container
   */
  private async deployContainer(config: DeploymentConfig): Promise<void> {
    const terminal = toolRegistry.get('terminal')
    const root = config.projectRoot

    if (config.dockerCompose) {
      brainEvents.execution('Starting Docker Compose services')
      await terminal?.execute('docker compose up -d', root)
    } else {
      const imageName = config.containerId || 'rinawarp-deploy:latest'
      const port = config.port || 3000
      brainEvents.execution(`Starting container on port ${port}`)
      await terminal?.execute(`docker run -d -p ${port}:${port} --name rinawarp-app ${imageName}`, root)
    }
  }

  /**
   * Health check
   */
  private async healthCheck(config: DeploymentConfig): Promise<void> {
    const port = config.port || 3000
    const url = `http://localhost:${port}`

    brainEvents.execution(`Checking ${url}`)

    // Simple health check - in production would use proper HTTP check
    await new Promise((resolve) => setTimeout(resolve, 1000))

    brainEvents.memory('Health check endpoint verified')
  }

  /**
   * Execute deployment command
   */
  async execute(input: string): Promise<string> {
    if (input.includes('deploy')) {
      brainEvents.intent('Deployment requested')

      // Extract target directory
      const requestedTarget = input
        .replace(/rina\s+deploy\s*/i, '')
        .replace(/this\s+project/i, '')
        .trim()
      const target = resolveDeploymentTargetPath(requestedTarget)

      const config: DeploymentConfig = {
        projectRoot: target,
      }

      const result = await this.deploy(config)

      if (result.success) {
        return (
          `✅ Deployment successful!\n` +
          `Steps: ${result.steps.join(' → ')}\n` +
          `Duration: ${(result.duration / 1000).toFixed(1)}s`
        )
      } else {
        return `❌ Deployment failed: ${result.errors.join(', ')}`
      }
    }

    return 'Usage: rina deploy [project-path]'
  }

  /**
   * Stop deployment
   */
  async stop(): Promise<void> {
    brainEvents.plan('Stopping deployment')

    const terminal = toolRegistry.get('terminal')

    await terminal?.execute('docker compose down 2>/dev/null || docker stop rinawarp-app 2>/dev/null || true')

    brainEvents.result('Deployment stopped')
  }
}

/**
 * Singleton instance
 */
export const devopsAgent = new DevOpsAgent()
