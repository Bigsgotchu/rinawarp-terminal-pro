import { DeploymentTarget, DeploymentTargetType, CloudflareConfig, VercelConfig, NetlifyConfig, DockerConfig, SSHConfig } from './types'

/**
 * Utility functions for deployment capabilities
 */

/**
 * Create a deployment target
 */
export function createDeploymentTarget(
  name: string,
  type: DeploymentTargetType,
  config: any,
  id?: string
): DeploymentTarget {
  return {
    id: id || `${type}-${Date.now()}`,
    name,
    type,
    config,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Validate deployment configuration
 */
export function validateDeploymentConfig(
  type: DeploymentTargetType,
  config: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (type) {
    case 'cloudflare':
      const cfConfig = config as CloudflareConfig
      if (!cfConfig.accountId) {
        errors.push('Cloudflare accountId is required')
      }
      if (!cfConfig.apiToken) {
        errors.push('Cloudflare apiToken is required')
      }
      break

    case 'vercel':
      const vercelConfig = config as VercelConfig
      if (!vercelConfig.token) {
        errors.push('Vercel token is required')
      }
      break

    case 'netlify':
      const netlifyConfig = config as NetlifyConfig
      if (!netlifyConfig.token) {
        errors.push('Netlify token is required')
      }
      break

    case 'docker':
      const dockerConfig = config as DockerConfig
      if (!dockerConfig.registryUrl) {
        errors.push('Docker registryUrl is required')
      }
      if (!dockerConfig.username) {
        errors.push('Docker username is required')
      }
      if (!dockerConfig.password) {
        errors.push('Docker password is required')
      }
      if (!dockerConfig.imageName) {
        errors.push('Docker imageName is required')
      }
      break

    case 'ssh':
    case 'vps':
      const sshConfig = config as SSHConfig
      if (!sshConfig.host) {
        errors.push('SSH host is required')
      }
      if (!sshConfig.username) {
        errors.push('SSH username is required')
      }
      if (!sshConfig.deployPath) {
        errors.push('SSH deployPath is required')
      }
      if (!sshConfig.privateKey && !sshConfig.password) {
        errors.push('SSH privateKey or password is required')
      }
      break

    default:
      errors.push(`Unknown deployment target type: ${type}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get deployment URL for a target
 */
export function getDeploymentUrl(target: DeploymentTarget): string {
  switch (target.type) {
    case 'cloudflare':
      const cfConfig = target.config.cloudflare as CloudflareConfig
      if (cfConfig.projectName) {
        return `https://${cfConfig.projectName}.pages.dev`
      }
      return 'https://example.cloudflare.com'

    case 'vercel':
      const vercelConfig = target.config.vercel as VercelConfig
      if (vercelConfig.projectId) {
        return `https://${vercelConfig.projectId}.vercel.app`
      }
      return 'https://example.vercel.app'

    case 'netlify':
      const netlifyConfig = target.config.netlify as NetlifyConfig
      if (netlifyConfig.siteId) {
        return `https://${netlifyConfig.siteId}.netlify.app`
      }
      return 'https://example.netlify.app'

    case 'docker':
      const dockerConfig = target.config.docker as DockerConfig
      return `https://${dockerConfig.registryUrl}/${dockerConfig.imageName || 'app'}`

    case 'ssh':
    case 'vps':
      const sshConfig = target.config.ssh as SSHConfig
      return `https://${sshConfig.host}`

    default:
      return 'https://example.com'
  }
}

/**
 * Format deployment duration in human-readable format
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Check if deployment target supports rollback
 */
export function supportsRollback(target: DeploymentTarget): boolean {
  switch (target.type) {
    case 'cloudflare':
    case 'vercel':
    case 'netlify':
    case 'docker':
    case 'ssh':
    case 'vps':
      return true
    default:
      return false
  }
}

/**
 * Get platform-specific deployment commands
 */
export function getDeploymentCommands(target: DeploymentTarget): string[] {
  switch (target.type) {
    case 'cloudflare':
      return [
        'wrangler --version',
        'wrangler deploy --env production'
      ]
    
    case 'vercel':
      return [
        'vercel --version',
        'vercel --prod'
      ]
    
    case 'netlify':
      return [
        'netlify --version',
        'netlify deploy --prod'
      ]
    
    case 'docker':
      return [
        'docker --version',
        'docker build -t app .',
        'docker push registry.example.com/app:latest'
      ]
    
    case 'ssh':
    case 'vps':
      return [
        'ssh -V',
        'git pull && npm install && npm run build'
      ]
    
    default:
      return []
  }
}

/**
 * Generate deployment receipt summary
 */
export function generateReceiptSummary(receipt: any): string {
  const status = receipt.status === 'success' ? '✅' : '❌'
  const duration = formatDuration(receipt.durationMs)
  const url = receipt.targetUrl ? ` (${receipt.targetUrl})` : ''
  
  return `${status} ${receipt.targetName} deployed ${receipt.status} in ${duration}${url}`
}

/**
 * Check if deployment needs approval
 */
export function requiresApproval(target: DeploymentTarget, context: any): boolean {
  // Production environments typically require approval
  if (context.environment?.NODE_ENV === 'production') {
    return true
  }

  // High-risk deployment targets require approval
  switch (target.type) {
    case 'ssh':
    case 'vps':
      return true
    default:
      return false
  }
}

/**
 * Get deployment step status emoji
 */
export function getStepStatusEmoji(status: 'pending' | 'running' | 'success' | 'failed'): string {
  switch (status) {
    case 'pending':
      return '⏳'
    case 'running':
      return '🔄'
    case 'success':
      return '✅'
    case 'failed':
      return '❌'
    default:
      return '❓'
  }
}