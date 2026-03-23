import { DeploymentContext, DeploymentPlan, DeploymentReceipt, DeploymentTarget, DeploymentTargetType } from './types'
import { CloudflareCapability } from './cloudflare-capability'
import { VercelNetlifyCapability } from './vercel-netlify-capability'
import { DockerVpsCapability } from './docker-vps-capability'
import { BaseDeploymentCapability } from './base-deployment-capability'

/**
 * Deployment Manager
 * Orchestrates deployment capabilities and manages deployment lifecycle
 */
export class DeploymentManager {
  private capabilities: Map<DeploymentTargetType, BaseDeploymentCapability> = new Map()

  constructor() {
    this.initializeCapabilities()
  }

  private initializeCapabilities(): void {
    // Initialize Cloudflare capability
    const cloudflareCapability = new CloudflareCapability()
    this.capabilities.set('cloudflare', cloudflareCapability)

    // Initialize Vercel/Netlify capability
    const vercelNetlifyCapability = new VercelNetlifyCapability()
    this.capabilities.set('vercel', vercelNetlifyCapability)
    this.capabilities.set('netlify', vercelNetlifyCapability)

    // Initialize Docker/VPS capability
    const dockerVpsCapability = new DockerVpsCapability()
    this.capabilities.set('docker', dockerVpsCapability)
    this.capabilities.set('ssh', dockerVpsCapability)
    this.capabilities.set('vps', dockerVpsCapability)
  }

  /**
   * Get a deployment capability by target type
   */
  getCapability(targetType: DeploymentTargetType): BaseDeploymentCapability | undefined {
    return this.capabilities.get(targetType)
  }

  /**
   * Get all registered capabilities
   */
  getCapabilities(): BaseDeploymentCapability[] {
    return Array.from(this.capabilities.values())
  }

  /**
   * Get available target types
   */
  getAvailableTargets(): DeploymentTargetType[] {
    return Array.from(this.capabilities.keys())
  }

  /**
   * Validate deployment target configuration
   */
  async validateTarget(target: DeploymentTarget): Promise<boolean> {
    const capability = this.getCapability(target.type)
    if (!capability) {
      throw new Error(`No capability found for target type: ${target.type}`)
    }

    return await capability.validateTarget(target)
  }

  /**
   * Create deployment plan for a target
   */
  async createPlan(context: DeploymentContext): Promise<DeploymentPlan> {
    const capability = this.getCapability(context.target.type)
    if (!capability) {
      throw new Error(`No capability found for target type: ${context.target.type}`)
    }

    return await capability.createPlan(context)
  }

  /**
   * Execute deployment plan
   */
  async executePlan(plan: DeploymentPlan): Promise<DeploymentReceipt> {
    const capability = this.getCapability(plan.target.type)
    if (!capability) {
      throw new Error(`No capability found for target type: ${plan.target.type}`)
    }

    return await capability.execute(plan)
  }

  /**
   * Verify deployment
   */
  async verifyDeployment(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    const capability = this.getCapability(receipt.targetName as DeploymentTargetType)
    if (!capability) {
      throw new Error(`No capability found for target type: ${receipt.targetName}`)
    }

    return await capability.verify(receipt)
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    const capability = this.getCapability(receipt.targetName as DeploymentTargetType)
    if (!capability) {
      throw new Error(`No capability found for target type: ${receipt.targetName}`)
    }

    return await capability.rollback(receipt)
  }

  /**
   * Execute full deployment lifecycle
   */
  async deploy(context: DeploymentContext): Promise<DeploymentReceipt> {
    try {
      // Validate target
      const isValid = await this.validateTarget(context.target)
      if (!isValid) {
        throw new Error('Target validation failed')
      }

      // Create plan
      const plan = await this.createPlan(context)

      // Execute plan
      const receipt = await this.executePlan(plan)

      // Verify deployment
      const verifiedReceipt = await this.verifyDeployment(receipt)

      return verifiedReceipt
    } catch (error) {
      // Create error receipt
      return {
        id: `error-${Date.now()}`,
        targetId: context.target.id,
        targetName: context.target.name,
        version: context.version,
        deployedAt: new Date().toISOString(),
        status: 'failed',
        durationMs: 0,
        logs: [{
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`
        }]
      }
    }
  }

  /**
   * Create deployment plan
   */
  async createDeploymentPlan(
    workspacePath: string,
    target: DeploymentTarget,
    version: string
  ): Promise<DeploymentPlan> {
    const context: DeploymentContext = {
      workspacePath,
      target,
      version,
      environment: {},
      dryRun: false
    }

    return await this.createPlan(context)
  }

  /**
   * Execute deployment with retry logic
   */
  async deployWithRetry(context: DeploymentContext, maxRetries: number = 3): Promise<DeploymentReceipt> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const receipt = await this.deploy(context)
        
        if (receipt.status === 'success') {
          return receipt
        }

        lastError = new Error(`Deployment failed with status: ${receipt.status}`)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Return error receipt if all retries failed
    return {
      id: `error-${Date.now()}`,
      targetId: context.target.id,
      targetName: context.target.name,
      version: context.version,
      deployedAt: new Date().toISOString(),
      status: 'failed',
      durationMs: 0,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Deployment failed after ${maxRetries} attempts: ${lastError?.message}`
      }]
    }
  }

  /**
   * Get deployment history for a target
   */
  async getDeploymentHistory(targetId: string): Promise<DeploymentReceipt[]> {
    // This would typically query a database or storage system
    // For now, return empty array
    return []
  }

  /**
   * List recent deployments
   */
  async listRecentDeployments(limit: number = 10): Promise<DeploymentReceipt[]> {
    // This would typically query a database or storage system
    // For now, return empty array
    return []
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(targetId?: string): Promise<{
    total: number
    successful: number
    failed: number
    averageDuration: number
  }> {
    // This would typically query a database or storage system
    // For now, return default stats
    return {
      total: 0,
      successful: 0,
      failed: 0,
      averageDuration: 0
    }
  }
}

/**
 * Deployment Service
 * High-level service for managing deployments
 */
export class DeploymentService {
  private manager: DeploymentManager

  constructor() {
    this.manager = new DeploymentManager()
  }

  /**
   * Deploy application to target
   */
  async deployToTarget(
    workspacePath: string,
    target: DeploymentTarget,
    version: string,
    environment: Record<string, string> = {},
    dryRun: boolean = false
  ): Promise<DeploymentReceipt> {
    const context: DeploymentContext = {
      workspacePath,
      target,
      version,
      environment,
      dryRun
    }

    if (dryRun) {
      // Create dry run plan without executing
      const plan = await this.manager.createPlan(context)
      return {
        id: `dry-run-${Date.now()}`,
        targetId: target.id,
        targetName: target.name,
        version,
        deployedAt: new Date().toISOString(),
        status: 'success',
        durationMs: 0,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Dry run completed successfully',
            step: 'dry-run'
          },
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Plan would execute ${plan.steps.length} steps`,
            step: 'dry-run'
          }
        ]
      }
    }

    return await this.manager.deployWithRetry(context)
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    return await this.manager.rollbackDeployment(receipt)
  }

  /**
   * Verify deployment
   */
  async verifyDeployment(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    return await this.manager.verifyDeployment(receipt)
  }

  /**
   * Get available deployment targets
   */
  getAvailableTargets(): DeploymentTargetType[] {
    return this.manager.getAvailableTargets()
  }

  /**
   * Validate deployment target
   */
  async validateTarget(target: DeploymentTarget): Promise<boolean> {
    return await this.manager.validateTarget(target)
  }
}