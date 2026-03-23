import { BaseDeploymentCapability } from './base-deployment-capability'
import { 
  DeploymentContext, 
  DeploymentPlan, 
  DeploymentReceipt, 
  DeploymentStep, 
  DeploymentTarget, 
  VercelConfig,
  NetlifyConfig,
  DeploymentLog,
  HealthCheckResult,
  SmokeTestResult,
  RollbackInfo
} from './types'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class VercelNetlifyCapability extends BaseDeploymentCapability {
  id = 'vercel-netlify-deploy'
  name = 'Vercel/Netlify Deploy'
  description = 'Deploy to Vercel or Netlify platforms'
  targetType = 'vercel' as const // Will handle both vercel and netlify
  permissions = ['filesystem:read', 'filesystem:write', 'network:outbound', 'cli:execute']
  commands = [
    {
      name: 'deploy',
      description: 'Deploy to Vercel or Netlify',
      steps: []
    }
  ]

  async createPlan(context: DeploymentContext): Promise<DeploymentPlan> {
    const steps: DeploymentStep[] = []
    
    // Check platform type
    const isVercel = context.target.type === 'vercel'
    const platformName = isVercel ? 'Vercel' : 'Netlify'
    
    // Check for CLI
    steps.push({
      id: 'check-cli',
      name: `Check ${platformName} CLI`,
      description: `Verify ${platformName} CLI is installed`,
      command: isVercel ? 'vercel --version' : 'netlify --version',
      timeout: 10000
    })

    // Login if needed
    steps.push({
      id: 'login',
      name: `Login to ${platformName}`,
      description: `Authenticate with ${platformName}`,
      command: isVercel ? 'vercel login' : 'netlify login',
      timeout: 60000,
      requiresApproval: true
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

    // Deploy
    if (isVercel) {
      steps.push({
        id: 'deploy-vercel',
        name: 'Deploy to Vercel',
        description: 'Deploy project to Vercel',
        command: this.createVercelDeployCommand(context),
        timeout: 300000 // 5 minutes
      })
    } else {
      steps.push({
        id: 'deploy-netlify',
        name: 'Deploy to Netlify',
        description: 'Deploy project to Netlify',
        command: this.createNetlifyDeployCommand(context),
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
              timeout: step.timeout || 60000
            })
            
            stepResult = stdout || stderr || 'Step completed'
            
            // Extract deployment URL and build ID from output
            if (step.id === 'deploy-vercel' || step.id === 'deploy-netlify') {
              const urlMatch = stepResult.match(/https?:\/\/[^\s]+\.vercel\.app|https?:\/\/[^\s]+\.netlify\.app|https?:\/\/[^\s]+\.netlify\.com/)
              if (urlMatch) {
                targetUrl = urlMatch[0]
              }
              
              const buildIdMatch = stepResult.match(/deployment\s+([a-f0-9]+)/i)
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
          rollbackCommand: `Rollback to previous deployment on ${plan.target.type}`,
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
      id: `${plan.target.type}-${Date.now()}`,
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
    if (!receipt.rollbackInfo?.canRollback) {
      throw new Error('Rollback not available for this deployment')
    }

    try {
      const isVercel = receipt.targetName.toLowerCase().includes('vercel')
      let rollbackCommand = ''
      
      if (isVercel) {
        // For Vercel, we need to get the previous deployment and promote it
        rollbackCommand = `vercel rollback ${receipt.targetUrl}`
      } else {
        // For Netlify, we need to restore a previous deploy
        rollbackCommand = `netlify deploy:restore --site ${this.extractSiteId(receipt.targetUrl)}`
      }

      const { stdout, stderr } = await execAsync(rollbackCommand || '', {
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

  getTargetConfig(target: DeploymentTarget): VercelConfig | NetlifyConfig {
    if (target.type === 'vercel') {
      return target.config.vercel as VercelConfig
    } else {
      return target.config.netlify as NetlifyConfig
    }
  }

  async validateTarget(target: DeploymentTarget): Promise<boolean> {
    const config = this.getTargetConfig(target)
    
    if (target.type === 'vercel') {
      const vercelConfig = config as VercelConfig
      if (!vercelConfig.token) {
        throw new Error('Vercel token is required')
      }

      try {
        const { stdout } = await execAsync(`vercel who`, {
          timeout: 30000
        })
        return stdout.includes('You are logged in')
      } catch (error) {
        return false
      }
    } else {
      const netlifyConfig = config as NetlifyConfig
      if (!netlifyConfig.token) {
        throw new Error('Netlify token is required')
      }

      try {
        const { stdout } = await execAsync(`netlify status`, {
          timeout: 30000
        })
        return stdout.includes('You are currently logged into')
      } catch (error) {
        return false
      }
    }
  }

  private hasBuildScript(workspacePath: string): boolean {
    try {
      const fs = require('fs')
      const packageJson = JSON.parse(fs.readFileSync(`${workspacePath}/package.json`, 'utf8'))
      return !!(packageJson.scripts && packageJson.scripts.build)
    } catch {
      return false
    }
  }

  private createVercelDeployCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as VercelConfig
    let command = 'vercel --prod'
    
    if (config.projectId) {
      command += ` --project-id ${config.projectId}`
    }
    
    if (config.teamId) {
      command += ` --team-id ${config.teamId}`
    }
    
    return command
  }

  private createNetlifyDeployCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as NetlifyConfig
    let command = 'netlify deploy --prod'
    
    if (config.siteId) {
      command += ` --site ${config.siteId}`
    }
    
    return command
  }

  private getDeploymentUrl(target: DeploymentTarget): string {
    if (target.type === 'vercel') {
      const config = target.config.vercel as VercelConfig
      if (config.projectId) {
        return `https://${config.projectId}.vercel.app`
      }
      return 'https://example.vercel.app'
    } else {
      const config = target.config.netlify as NetlifyConfig
      if (config.siteId) {
        return `https://${config.siteId}.netlify.app`
      }
      return 'https://example.netlify.app'
    }
  }

  private extractSiteId(url: string): string {
    // Extract site ID from Netlify URL
    const match = url.match(/https?:\/\/([^.]+)\.netlify\.(app|com)/)
    return match ? match[1] : ''
  }
}