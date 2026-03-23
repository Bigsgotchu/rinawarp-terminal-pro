import { DeploymentCapability, DeploymentContext, DeploymentPlan, DeploymentReceipt, DeploymentTarget, DeploymentTargetType } from './types'

/**
 * Base class for all deployment capabilities
 * Provides common functionality for deployment operations
 */
export abstract class BaseDeploymentCapability implements DeploymentCapability {
  abstract id: string
  abstract name: string
  abstract description: string
  abstract targetType: DeploymentTargetType
  abstract permissions: string[]
  abstract commands: any[]

  /**
   * Create a deployment plan for the given target and context
   */
  abstract createPlan(context: DeploymentContext): Promise<DeploymentPlan>

  /**
   * Execute the deployment plan
   */
  abstract execute(plan: DeploymentPlan): Promise<DeploymentReceipt>

  /**
   * Verify deployment health and functionality
   */
  abstract verify(receipt: DeploymentReceipt): Promise<DeploymentReceipt>

  /**
   * Rollback deployment to previous version
   */
  abstract rollback(receipt: DeploymentReceipt): Promise<DeploymentReceipt>

  /**
   * Get deployment target configuration
   */
  abstract getTargetConfig(target: DeploymentTarget): any

  /**
   * Validate deployment target configuration
   */
  abstract validateTarget(target: DeploymentTarget): Promise<boolean>

  /**
   * Common deployment logging
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}] [${this.name}] ${message}`)
  }

  /**
   * Common error handling
   */
  protected async handleDeploymentError(error: Error, step?: string): Promise<DeploymentReceipt> {
    this.log(`Deployment failed: ${error.message}`, 'error')
    
    return {
      id: `error-${Date.now()}`,
      targetId: '',
      targetName: this.name,
      version: '',
      deployedAt: new Date().toISOString(),
      status: 'failed',
      durationMs: 0,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        step
      }]
    }
  }

  /**
   * Common health check implementation
   */
  protected async performHealthCheck(url: string, timeout: number = 30000): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        timeout 
      })
      return response.ok
    } catch (error) {
      this.log(`Health check failed for ${url}: ${error}`, 'warn')
      return false
    }
  }

  /**
   * Common smoke test implementation
   */
  protected async performSmokeTests(tests: any[], timeout: number = 60000): Promise<any[]> {
    const results: any[] = []
    
    for (const test of tests) {
      try {
        const response = await fetch(test.url, { timeout })
        const passed = response.status === test.expectedStatus
        
        results.push({
          ...test,
          passed,
          statusCode: response.status,
          error: passed ? undefined : `Expected ${test.expectedStatus}, got ${response.status}`
        })
      } catch (error) {
        results.push({
          ...test,
          passed: false,
          error: error.message
        })
      }
    }
    
    return results
  }
}