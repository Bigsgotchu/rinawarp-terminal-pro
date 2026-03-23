/**
 * RinaWarp Deployment Capabilities
 * 
 * This package provides deployment capability packs for various platforms:
 * - Cloudflare (Workers, Pages)
 * - Vercel
 * - Netlify
 * - Docker (containers and registries)
 * - VPS/SSH servers
 * 
 * Features:
 * - Structured deployment receipts with proof artifacts
 * - Health checks and smoke tests
 * - Rollback and retry flows
 * - Environment/secret validation
 * - Deployment target management
 */

// Export types
export * from './types'

// Export capabilities
export { CloudflareCapability } from './cloudflare-capability'
export { VercelNetlifyCapability } from './vercel-netlify-capability'
export { DockerVpsCapability } from './docker-vps-capability'

// Export base classes
export { BaseDeploymentCapability } from './base-deployment-capability'

// Export managers and services
export { DeploymentManager, DeploymentService } from './deployment-manager'

// Export utility functions
export { createDeploymentTarget, validateDeploymentConfig } from './utils'

/**
 * Quick start example:
 * 
 * ```typescript
 * import { DeploymentService } from '@rinawarp/deploy-capabilities'
 * 
 * const service = new DeploymentService()
 * 
 * // Define deployment target
 * const target = {
 *   id: 'my-vercel-site',
 *   name: 'My Vercel Site',
 *   type: 'vercel' as const,
 *   config: {
 *     vercel: {
 *       token: process.env.VERCEL_TOKEN!,
 *       projectId: 'my-project-id'
 *     }
 *   },
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * }
 * 
 * // Deploy
 * const receipt = await service.deployToTarget(
 *   '/path/to/workspace',
 *   target,
 *   'v1.0.0'
 * )
 * 
 * console.log('Deployment successful:', receipt.targetUrl)
 * ```
 */

/**
 * Deployment Target Management
 * 
 * This package provides a complete deployment target management system that integrates
 * with RinaWarp's existing agent architecture.
 * 
 * Key features:
 * - Target validation and configuration
 * - Deployment receipts with proof artifacts
 * - Health checks and smoke tests
 * - Rollback and retry flows
 * - Environment/secret validation
 * - Platform-specific optimizations
 */

/**
 * Integration with RinaWarp Agent System
 * 
 * To integrate with the existing agent system, create agent definitions like:
 * 
 * ```json
 * {
 *   "name": "deploy-to-vercel",
 *   "description": "Deploy to Vercel with full verification",
 *   "author": "RinaWarp",
 *   "version": "1.0.0",
 *   "price": 10,
 *   "permissions": ["filesystem:read", "filesystem:write", "network:outbound", "cli:execute"],
 *   "commands": [
 *     {
 *       "name": "deploy",
 *       "description": "Deploy application to Vercel",
 *       "steps": [
 *         {
 *           "id": "validate",
 *           "name": "Validate Target",
 *           "description": "Validate Vercel configuration",
 *           "command": "validate-vercel-target",
 *           "timeout": 30000
 *         },
 *         {
 *           "id": "build",
 *           "name": "Build Project",
 *           "description": "Build the project for production",
 *           "command": "npm run build",
 *           "timeout": 300000
 *         },
 *         {
 *           "id": "deploy",
 *           "name": "Deploy to Vercel",
 *           "description": "Deploy to Vercel platform",
 *           "command": "vercel --prod",
 *           "timeout": 300000
 *         },
 *         {
 *           "id": "verify",
 *           "name": "Verify Deployment",
 *           "description": "Verify deployment success",
 *           "command": "verify-vercel-deployment",
 *           "timeout": 60000,
 *           "verification": {
 *             "type": "health-check",
 *             "config": {
 *               "url": "${DEPLOYMENT_URL}",
 *               "expectedStatus": 200,
 *               "timeout": 30000,
 *               "retries": 3
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */