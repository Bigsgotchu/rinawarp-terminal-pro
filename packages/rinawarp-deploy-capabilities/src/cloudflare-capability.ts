import { BaseDeploymentCapability } from './base-deployment-capability'
import { 
  DeploymentContext, 
  DeploymentPlan, 
  DeploymentReceipt, 
  DeploymentStep, 
  DeploymentTarget, 
  CloudflareConfig,
  DeploymentLog,
  HealthCheckResult,
  SmokeTestResult,
  RollbackInfo
} from './types'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class CloudflareCapability extends BaseDeploymentCapability {
  id = 'cloudflare-deploy'
  name = 'Cloudflare Deploy'
  description = 'Deploy to Cloudflare Workers, Pages, and related services'
  targetType = 'cloudflare' as const
  permissions = ['filesystem:read', 'filesystem:write', 'network:outbound', 'cli:execute']
  commands = [
    {
      name: 'deploy',
      description: 'Deploy to Cloudflare',
      steps: []
    }
  ]

  async createPlan(context: DeploymentContext): Promise<DeploymentPlan> {
    const config = this.getTargetConfig(context.target) as CloudflareConfig
    const steps: DeploymentStep[] = []
    
    // Check for wrangler
    steps.push({
      id: 'check-wrangler',
      name: 'Check Wrangler Installation',
      description: 'Verify wrangler CLI is installed',
      command: 'wrangler --version',
      timeout: 10000
    })

    // Build project if needed
    if (this.hasBuildScript(context.workspacePath)) {
      steps.push({
        id: 'build-project',
        name: 'Build Project',
        description: 'Build the project for production',
        command: 'npm run build',
        timeout: 300000 // 5 minutes
      })
    }

    // Deploy to Cloudflare Workers
    if (this.hasWorkerConfig(context.workspacePath)) {
      steps.push({
        id: 'deploy-worker',
        name: 'Deploy Worker',
        description: 'Deploy Cloudflare Worker',
        command: `wrangler deploy --env ${context.target.config.environment || 'production'}`,
        timeout: 120000 // 2 minutes
      })
    }

    // Deploy to Cloudflare Pages
    if (this.hasPagesConfig(context.workspacePath)) {
      steps.push({
        id: 'deploy-pages',
        name: 'Deploy Pages',
        description: 'Deploy Cloudflare Pages',
        command: `wrangler pages deploy --project-name=${config.projectName || 'rinawarp-site'}`,
        timeout: 300000 // 5 minutes
      })
    }

    // Verify deployment
    steps.push({
      id: 'verify-deployment',
      name: 'Verify Deployment',
      description: 'Verify the deployment was successful',
      command: 'verify',
      timeout: 60000,
      verification: {
        type: 'health-check',
        config: {
          url: this.getDeploymentUrl(context.target),
          expectedStatus: 200,
          timeout: 30000,
          retries: 3
        }
      }
    })

    return {
      target: context.target,
      steps,
      estimatedDuration: 600000 // 10 minutes
    }
  }

  async execute(plan: DeploymentPlan): Promise<DeploymentReceipt> {
    const startTime = Date.now()
    const logs: DeploymentLog[] = []
    let status: 'success' | 'failed' = 'success'
    let targetUrl: string | undefined
    let buildId: string | undefined
    let rollbackInfo: RollbackInfo | undefined

    try {
      for (const step of plan.steps) {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Starting step: ${step.name}`,
          step: step.id
        })

        const stepStart = Date.now()
        let stepResult: string

        if (step.command === 'verify') {
          // Skip verification step in execution, it's handled separately
          stepResult = 'Verification step skipped during execution'
        } else {
          try {
            const { stdout, stderr } = await execAsync(step.command, {
              timeout: step.timeout || 60000,
              cwd: plan.target.config.cloudflare?.projectName ? process.cwd() : undefined
            })
            
            stepResult = stdout || stderr || 'Step completed'
            
            // Extract deployment URL and build ID from output
            if (step.id === 'deploy-worker' || step.id === 'deploy-pages') {
              const urlMatch = stepResult.match(/https?:\/\/[^\s]+/)
              if (urlMatch) {
                targetUrl = urlMatch[0]
              }
              
              const buildIdMatch = stepResult.match(/build\s+([a-f0-9]+)/i)
              if (buildIdMatch) {
                buildId = buildIdMatch[1]
              }
            }
          } catch (error: any) {
            status = 'failed'
            logs.push({
              timestamp: new Date().toISOString(),
              level: 'error',
              message: `Step failed: ${error.message}`,
              step: step.id
            })
            break
          }
        }

        const stepDuration = Date.now() - stepStart
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Step completed in ${stepDuration}ms: ${stepResult}`,
          step: step.id
        })
      }

      // Set rollback information
      if (targetUrl) {
        rollbackInfo = {
          canRollback: true,
          rollbackCommand: `wrangler rollback --url=${targetUrl}`,
          rollbackUrl: targetUrl
        }
      }

    } catch (error: any) {
      status = 'failed'
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Deployment failed: ${error.message}`
      })
    }

    const durationMs = Date.now() - startTime

    return {
      id: `cloudflare-${Date.now()}`,
      targetId: plan.target.id,
      targetName: plan.target.name,
      targetUrl,
      version: 'latest',
      buildId,
      deployedAt: new Date().toISOString(),
      status,
      durationMs,
      rollbackInfo,
      logs
    }
  }

  async verify(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    if (receipt.status !== 'success' || !receipt.targetUrl) {
      return receipt
    }

    const healthCheck: HealthCheckResult = {
      passed: false,
      url: receipt.targetUrl,
      statusCode: 0,
      responseTimeMs: 0
    }

    const smokeTests: SmokeTestResult = {
      passed: false,
      tests: [],
      durationMs: 0
    }

    try {
      const startTime = Date.now()
      
      // Perform health check
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch(receipt.targetUrl, { 
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      healthCheck.passed = response.ok
      healthCheck.statusCode = response.status
      healthCheck.responseTimeMs = Date.now() - startTime

      // Perform smoke tests
      const smokeTestStartTime = Date.now()
      const smokeTestResults = await this.performSmokeTests([
        {
          name: 'Homepage accessibility',
          url: receipt.targetUrl,
          expectedStatus: 200
        },
        {
          name: 'API endpoint',
          url: `${receipt.targetUrl}/api/health`,
          expectedStatus: 200
        }
      ], 60000)

      smokeTests.tests = smokeTestResults
      smokeTests.passed = smokeTestResults.every(test => test.passed)
      smokeTests.durationMs = Date.now() - smokeTestStartTime

      // Update receipt with verification results
      return {
        ...receipt,
        verification: {
          healthCheck,
          smokeTest: smokeTests
        }
      }

    } catch (error) {
      return {
        ...receipt,
        verification: {
          healthCheck,
          smokeTest: smokeTests
        }
      }
    }
  }

  async rollback(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    if (!receipt.rollbackInfo?.canRollback || !receipt.rollbackInfo.rollbackCommand) {
      throw new Error('Rollback not available for this deployment')
    }

    try {
      const { stdout, stderr } = await execAsync(receipt.rollbackInfo.rollbackCommand, {
        timeout: 120000
      })

      return {
        ...receipt,
        id: `rollback-${Date.now()}`,
        status: 'success',
        deployedAt: new Date().toISOString(),
        logs: [
          ...receipt.logs,
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Rollback completed: ${stdout || stderr}`
          }
        ]
      }
    } catch (error: any) {
      return {
        ...receipt,
        status: 'failed',
        logs: [
          ...receipt.logs,
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Rollback failed: ${error.message}`
          }
        ]
      }
    }
  }

  getTargetConfig(target: DeploymentTarget): CloudflareConfig {
    return target.config.cloudflare as CloudflareConfig
  }

  async validateTarget(target: DeploymentTarget): Promise<boolean> {
    const config = this.getTargetConfig(target)
    
    if (!config.accountId || !config.apiToken) {
      throw new Error('Cloudflare accountId and apiToken are required')
    }

    try {
      // Test API connection
      const { stdout } = await execAsync(`wrangler whoami`, {
        timeout: 30000
      })
      
      return stdout.includes('You are logged in')
    } catch (error) {
      return false
    }
  }

  private hasBuildScript(workspacePath: string): boolean {
    // Check for build script in package.json
    try {
      const fs = require('fs')
      const packageJson = JSON.parse(fs.readFileSync(`${workspacePath}/package.json`, 'utf8'))
      return !!(packageJson.scripts && packageJson.scripts.build)
    } catch {
      return false
    }
  }

  private hasWorkerConfig(workspacePath: string): boolean {
    return require('fs').existsSync(`${workspacePath}/wrangler.toml`) ||
           require('fs').existsSync(`${workspacePath}/wrangler.js`) ||
           require('fs').existsSync(`${workspacePath}/wrangler.json`)
  }

  private hasPagesConfig(workspacePath: string): boolean {
    return require('fs').existsSync(`${workspacePath}/.github/workflows/pages.yml`) ||
           require('fs').existsSync(`${workspacePath}/.gitlab-ci.yml`) ||
           require('fs').existsSync(`${workspacePath}/netlify.toml`)
  }

  private getDeploymentUrl(target: DeploymentTarget): string {
    const config = this.getTargetConfig(target)
    if (config.projectName) {
      return `https://${config.projectName}.pages.dev`
    }
    return 'https://example.cloudflare.com'
  }
}