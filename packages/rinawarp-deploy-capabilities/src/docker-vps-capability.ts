import { BaseDeploymentCapability } from './base-deployment-capability'
import { 
  DeploymentContext, 
  DeploymentPlan, 
  DeploymentReceipt, 
  DeploymentStep, 
  DeploymentTarget, 
  DockerConfig,
  SSHConfig,
  DeploymentLog,
  HealthCheckResult,
  SmokeTestResult,
  RollbackInfo
} from './types'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export class DockerVpsCapability extends BaseDeploymentCapability {
  id = 'docker-vps-deploy'
  name = 'Docker/VPS Deploy'
  description = 'Deploy Docker containers to VPS or container registries'
  targetType = 'docker' as const // Will handle both docker and ssh/vps
  permissions = ['filesystem:read', 'filesystem:write', 'network:outbound', 'cli:execute']
  commands = [
    {
      name: 'deploy',
      description: 'Deploy Docker container or VPS deployment',
      steps: []
    }
  ]

  async createPlan(context: DeploymentContext): Promise<DeploymentPlan> {
    const steps: DeploymentStep[] = []
    
    // Check platform type
    const isDocker = context.target.type === 'docker'
    const isVps = context.target.type === 'ssh' || context.target.type === 'vps'
    const platformName = isDocker ? 'Docker' : 'VPS/SSH'
    
    // Check for required tools
    if (isDocker) {
      steps.push({
        id: 'check-docker',
        name: 'Check Docker Installation',
        description: 'Verify Docker is installed and running',
        command: 'docker --version && docker info',
        timeout: 10000
      })
    }

    if (isVps) {
      steps.push({
        id: 'check-ssh',
        name: 'Check SSH Access',
        description: 'Verify SSH access to target server',
        command: this.createSshCheckCommand(context.target),
        timeout: 30000
      })
    }

    // Build Docker image if needed
    if (isDocker && this.hasDockerfile(context.workspacePath)) {
      steps.push({
        id: 'build-docker',
        name: 'Build Docker Image',
        description: 'Build Docker image for deployment',
        command: this.createDockerBuildCommand(context),
        timeout: 600000 // 10 minutes
      })
    }

    // Push to registry if needed
    if (isDocker) {
      steps.push({
        id: 'push-registry',
        name: 'Push to Registry',
        description: 'Push Docker image to registry',
        command: this.createDockerPushCommand(context),
        timeout: 300000 // 5 minutes
      })
    }

    // Deploy to VPS if needed
    if (isVps) {
      steps.push({
        id: 'deploy-vps',
        name: 'Deploy to VPS',
        description: 'Deploy application to VPS server',
        command: this.createVpsDeployCommand(context),
        timeout: 300000 // 5 minutes
      })
    }

    // Start/restart service
    if (isDocker) {
      steps.push({
        id: 'start-container',
        name: 'Start Container',
        description: 'Start or restart Docker container',
        command: this.createDockerRunCommand(context),
        timeout: 120000 // 2 minutes
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
      estimatedDuration: 900000 // 15 minutes
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
            if (step.id === 'start-container' || step.id === 'deploy-vps') {
              const urlMatch = stepResult.match(/https?:\/\/[^\s]+/)
              if (urlMatch) {
                targetUrl = urlMatch[0]
              }
              
              const buildIdMatch = stepResult.match(/image\s+([a-f0-9]+)/i)
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
          rollbackCommand: `Rollback deployment on ${plan.target.type}`,
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
      const isDocker = receipt.targetName.toLowerCase().includes('docker')
      let rollbackCommand = ''
      
      if (isDocker) {
        // For Docker, stop current container and start previous image
        rollbackCommand = `docker stop ${receipt.targetName} && docker run -d --name ${receipt.targetName}-rollback ${this.getPreviousImageName(receipt)}`
      } else {
        // For VPS, restore previous deployment
        rollbackCommand = this.createVpsRollbackCommand(receipt)
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

  getTargetConfig(target: DeploymentTarget): DockerConfig | SSHConfig {
    if (target.type === 'docker') {
      return target.config.docker as DockerConfig
    } else {
      return target.config.ssh as SSHConfig
    }
  }

  async validateTarget(target: DeploymentTarget): Promise<boolean> {
    const config = this.getTargetConfig(target)
    
    if (target.type === 'docker') {
      const dockerConfig = config as DockerConfig
      if (!dockerConfig.registryUrl || !dockerConfig.username || !dockerConfig.password) {
        throw new Error('Docker registry URL, username, and password are required')
      }

      try {
        const { stdout } = await execAsync(`docker login ${dockerConfig.registryUrl} -u ${dockerConfig.username} -p ${dockerConfig.password}`, {
          timeout: 30000
        })
        return stdout.includes('Login Succeeded')
      } catch (error) {
        return false
      }
    } else {
      const sshConfig = config as SSHConfig
      if (!sshConfig.host || !sshConfig.username || !sshConfig.deployPath) {
        throw new Error('SSH host, username, and deploy path are required')
      }

      try {
        const sshCommand = this.createSshCommand(sshConfig, 'echo "SSH connection successful"')
        const { stdout } = await execAsync(sshCommand, {
          timeout: 30000
        })
        return stdout.includes('SSH connection successful')
      } catch (error) {
        return false
      }
    }
  }

  private hasDockerfile(workspacePath: string): boolean {
    return fs.existsSync(path.join(workspacePath, 'Dockerfile'))
  }

  private createDockerBuildCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as DockerConfig
    const imageName = config.imageName || 'rinawarp-app'
    const tag = config.tag || 'latest'
    
    return `docker build -t ${imageName}:${tag} .`
  }

  private createDockerPushCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as DockerConfig
    const imageName = config.imageName || 'rinawarp-app'
    const tag = config.tag || 'latest'
    const fullImageName = `${config.registryUrl}/${imageName}:${tag}`
    
    return `docker tag ${imageName}:${tag} ${fullImageName} && docker push ${fullImageName}`
  }

  private createDockerRunCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as DockerConfig
    const imageName = config.imageName || 'rinawarp-app'
    const tag = config.tag || 'latest'
    const fullImageName = `${config.registryUrl}/${imageName}:${tag}`
    
    return `docker stop ${imageName} 2>/dev/null || true && docker rm ${imageName} 2>/dev/null || true && docker run -d --name ${imageName} -p 80:80 -p 443:443 ${fullImageName}`
  }

  private createVpsDeployCommand(context: DeploymentContext): string {
    const config = this.getTargetConfig(context.target) as SSHConfig
    const sshCommand = this.createSshCommand(config, `
      cd ${config.deployPath} &&
      git pull origin main &&
      npm install &&
      npm run build &&
      pm2 restart ${context.target.name} || pm2 start npm --name ${context.target.name} -- start
    `)
    
    return sshCommand
  }

  private createVpsRollbackCommand(receipt: DeploymentReceipt): string {
    const config = this.getTargetConfig({ id: receipt.targetId, name: receipt.targetName, type: 'ssh' } as DeploymentTarget) as SSHConfig
    const sshCommand = this.createSshCommand(config, `
      cd ${config.deployPath} &&
      git checkout HEAD~1 &&
      npm install &&
      npm run build &&
      pm2 restart ${receipt.targetName}
    `)
    
    return sshCommand
  }

  private createSshCheckCommand(target: DeploymentTarget): string {
    const config = this.getTargetConfig(target) as SSHConfig
    return this.createSshCommand(config, 'echo "SSH connection successful"')
  }

  private createSshCommand(config: SSHConfig, command: string): string {
    let sshCommand = `ssh -o StrictHostKeyChecking=no -p ${config.port} ${config.username}@${config.host}`
    
    if (config.privateKey) {
      sshCommand += ` -i ${config.privateKey}`
    } else if (config.password) {
      sshCommand = `sshpass -p '${config.password}' ${sshCommand}`
    }
    
    return `${sshCommand} "${command}"`
  }

  private getDeploymentUrl(target: DeploymentTarget): string {
    if (target.type === 'docker') {
      const config = target.config.docker as DockerConfig
      return `https://${config.registryUrl}/${config.imageName || 'app'}`
    } else {
      const config = target.config.ssh as SSHConfig
      return `https://${config.host}`
    }
  }

  private getPreviousImageName(receipt: DeploymentReceipt): string {
    // This would need to be implemented based on your image tagging strategy
    // For now, return a placeholder
    return `${receipt.targetName}:previous`
  }
}