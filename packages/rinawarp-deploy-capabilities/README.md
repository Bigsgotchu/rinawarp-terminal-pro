# RinaWarp Deployment Capabilities

Comprehensive deployment capability packs for RinaWarp Terminal Pro, providing first-class deployment tools for multiple platforms with full verification, rollback, and receipt tracking.

## Overview

RinaWarp now includes complete deployment capability packs that address all the gaps identified in the original assessment:

✅ **Complete deployment platform coverage**  
✅ **Explicit first-class deploy packs for each platform**  
✅ **Stronger deploy receipts with deployed URL, artifact path, version/build ID**  
✅ **Better rollback/retry flows**  
✅ **Environment/secret validation before deploy**  
✅ **Post-deploy verification with health checks and smoke tests**  
✅ **Deployment target management in the UI**

## Supported Platforms

### Cloudflare
- **Workers**: Deploy serverless functions with full verification
- **Pages**: Deploy static sites and JAMstack applications
- **DNS/Routes**: Automated DNS and routing management
- **Features**: Build verification, health checks, smoke tests, rollback support

### Vercel
- **Projects**: Deploy to Vercel projects with team/org support
- **Environment**: Production and preview environment deployment
- **Features**: Automatic project detection, health checks, rollback

### Netlify
- **Sites**: Deploy to Netlify sites with team support
- **Builds**: Full build pipeline integration
- **Features**: Site verification, health checks, rollback support

### Docker
- **Containers**: Build and deploy Docker containers
- **Registries**: Push to private and public container registries
- **Orchestration**: Docker Compose and Kubernetes support
- **Features**: Image validation, registry authentication, rollback

### SSH/VPS
- **Servers**: Deploy to SSH/VPS servers with full automation
- **Processes**: PM2, systemd, and custom process management
- **Features**: SSH key authentication, deployment scripts, rollback

## Key Features

### 🎯 Structured Deployment Receipts
Every deployment generates a comprehensive receipt with:
- **Deployed URL**: Direct link to the deployed application
- **Artifact Path**: Location of build artifacts and deployment files
- **Version/Build ID**: Unique identifier for the deployment
- **Duration**: Time taken for the complete deployment
- **Rollback Info**: Commands and URLs for easy rollback
- **Verification Results**: Health check and smoke test results
- **Complete Logs**: Step-by-step execution logs

### 🔄 Rollback and Retry Flows
- **Automatic Rollback**: One-command rollback to previous versions
- **Retry Logic**: Exponential backoff retry for failed deployments
- **Rollback Verification**: Automatic verification after rollback
- **History Tracking**: Complete deployment history with rollback points

### 🔒 Environment and Secret Validation
- **Pre-deployment Validation**: Validate all required secrets and environment variables
- **Configuration Validation**: Platform-specific configuration validation
- **Access Verification**: Verify API access and permissions before deployment
- **Security Checks**: Validate secret formats and access levels

### ✅ Post-Deploy Verification
- **Health Checks**: HTTP health checks with configurable timeouts and retries
- **Smoke Tests**: Custom smoke tests for critical functionality
- **Browser Tests**: Automated browser-based verification (future)
- **Performance Monitoring**: Response time and availability tracking

### 🎨 Deployment Target Management
- **Target Configuration**: UI for managing deployment targets
- **Platform Selection**: Easy selection of deployment platforms
- **Environment Management**: Separate configurations for dev/staging/production
- **Target Validation**: Real-time validation of target configurations

## Quick Start

### Installation

```bash
# Install the deployment capabilities package
pnpm add @rinawarp/deploy-capabilities
```

### Basic Usage

```typescript
import { DeploymentService } from '@rinawarp/deploy-capabilities'

const service = new DeploymentService()

// Define deployment target
const target = {
  id: 'my-vercel-site',
  name: 'My Vercel Site',
  type: 'vercel' as const,
  config: {
    vercel: {
      token: process.env.VERCEL_TOKEN!,
      projectId: 'my-project-id'
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// Deploy with full verification
const receipt = await service.deployToTarget(
  '/path/to/workspace',
  target,
  'v1.0.0'
)

console.log('Deployment successful:', receipt.targetUrl)
console.log('Build ID:', receipt.buildId)
console.log('Duration:', receipt.durationMs)
```

### Using with RinaWarp Agents

```json
{
  "name": "deploy-to-vercel",
  "description": "Deploy to Vercel with full verification",
  "author": "RinaWarp",
  "version": "1.0.0",
  "price": 15,
  "permissions": ["filesystem:read", "filesystem:write", "network:outbound", "cli:execute"],
  "commands": [
    {
      "name": "deploy",
      "description": "Execute full deployment workflow",
      "steps": [
        {
          "id": "validate-target",
          "name": "Validate Target",
          "description": "Validate Vercel configuration",
          "command": "validate-vercel-target",
          "timeout": 30000
        },
        {
          "id": "build",
          "name": "Build Project",
          "description": "Build the project for production",
          "command": "npm run build",
          "timeout": 300000
        },
        {
          "id": "deploy",
          "name": "Deploy to Vercel",
          "description": "Deploy to Vercel platform",
          "command": "vercel --prod",
          "timeout": 300000,
          "verification": {
            "type": "health-check",
            "config": {
              "url": "${DEPLOYMENT_URL}",
              "expectedStatus": 200,
              "timeout": 30000,
              "retries": 3
            }
          }
        },
        {
          "id": "verify",
          "name": "Verify Deployment",
          "description": "Verify deployment success",
          "command": "verify-vercel-deployment",
          "timeout": 60000
        }
      ]
    }
  ]
}
```

## Platform-Specific Features

### Cloudflare Workers
```typescript
// Deploy to Cloudflare Workers
const cloudflareTarget = {
  id: 'my-worker',
  name: 'My Cloudflare Worker',
  type: 'cloudflare' as const,
  config: {
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
      projectName: 'my-worker-project'
    }
  }
}

const receipt = await service.deployToTarget(workspacePath, cloudflareTarget, 'v1.0.0')
```

### Docker Containers
```typescript
// Deploy Docker container
const dockerTarget = {
  id: 'my-docker-app',
  name: 'My Docker App',
  type: 'docker' as const,
  config: {
    docker: {
      registryUrl: 'registry.example.com',
      username: process.env.DOCKER_USERNAME!,
      password: process.env.DOCKER_PASSWORD!,
      imageName: 'my-app',
      tag: 'latest'
    }
  }
}

const receipt = await service.deployToTarget(workspacePath, dockerTarget, 'v1.0.0')
```

### SSH/VPS Servers
```typescript
// Deploy to VPS server
const vpsTarget = {
  id: 'my-vps',
  name: 'My VPS Server',
  type: 'ssh' as const,
  config: {
    ssh: {
      host: 'server.example.com',
      port: 22,
      username: 'deploy',
      privateKey: '/path/to/private/key',
      deployPath: '/var/www/my-app'
    }
  }
}

const receipt = await service.deployToTarget(workspacePath, vpsTarget, 'v1.0.0')
```

## Deployment Receipts

Every deployment generates a structured receipt:

```typescript
interface DeploymentReceipt {
  id: string                    // Unique receipt ID
  targetId: string             // Target ID
  targetName: string           // Target name
  targetUrl?: string           // Deployed application URL
  version: string              // Deployment version
  buildId?: string             // Build/commit ID
  artifactPath?: string        // Path to build artifacts
  deployedAt: string           // Deployment timestamp
  status: 'success' | 'failed' | 'cancelled'
  durationMs: number           // Total deployment duration
  rollbackInfo?: RollbackInfo  // Rollback information
  verification?: DeploymentVerification  // Verification results
  logs: DeploymentLog[]        // Step-by-step logs
}
```

### Rollback Information
```typescript
interface RollbackInfo {
  canRollback: boolean         // Whether rollback is available
  previousVersion?: string     // Previous version identifier
  rollbackCommand?: string     // Command to execute rollback
  rollbackUrl?: string         // URL after rollback
}
```

### Verification Results
```typescript
interface DeploymentVerification {
  healthCheck?: HealthCheckResult    // HTTP health check results
  smokeTest?: SmokeTestResult        // Smoke test results
  browserTest?: BrowserTestResult    // Browser test results (future)
}
```

## Rollback and Recovery

### Automatic Rollback
```typescript
// Rollback a deployment
const rollbackReceipt = await service.rollbackDeployment(receipt)

console.log('Rollback successful:', rollbackReceipt.status)
console.log('Previous URL:', rollbackReceipt.targetUrl)
```

### Retry Logic
```typescript
// Deploy with retry logic (max 3 attempts)
const receipt = await service.deployToTarget(
  workspacePath,
  target,
  'v1.0.0',
  {},
  false,  // not dry run
  3       // max retries
)
```

## Integration with RinaWarp

### Agent Integration
The deployment capabilities integrate seamlessly with RinaWarp's agent system:

1. **Agent Definitions**: Create agent definitions for each deployment workflow
2. **Permission Management**: Use RinaWarp's permission system for deployment access
3. **UI Integration**: Deploy targets appear in RinaWarp's agent interface
4. **Execution Tracking**: All deployments are tracked in RinaWarp's execution history

### Example Agent Integration
```typescript
// Create deployment agent definition
const agentDefinition = {
  name: 'deploy-workflow',
  description: 'Execute complete deployment workflow',
  commands: [
    {
      name: 'deploy',
      steps: [
        // Deployment steps with verification
      ]
    }
  ]
}

// Register with RinaWarp
await registerAgent(agentDefinition)
```

## Configuration and Environment

### Environment Variables
Each platform requires specific environment variables:

#### Cloudflare
```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

#### Vercel
```bash
VERCEL_TOKEN=your-vercel-token
```

#### Netlify
```bash
NETLIFY_TOKEN=your-netlify-token
```

#### Docker
```bash
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password
```

### Configuration Validation
The system validates all configurations before deployment:

```typescript
// Validate target configuration
const isValid = await service.validateTarget(target)
if (!isValid) {
  throw new Error('Invalid target configuration')
}
```

## Development and Contributing

### Building the Package
```bash
cd packages/rinawarp-deploy-capabilities
pnpm install
pnpm build
```

### Testing
```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run type checking
pnpm typecheck
```

### Adding New Platforms
To add support for a new deployment platform:

1. **Create Capability Class**: Extend `BaseDeploymentCapability`
2. **Implement Required Methods**: `createPlan`, `execute`, `verify`, `rollback`
3. **Add Configuration Types**: Define platform-specific config types
4. **Register Capability**: Add to `DeploymentManager`
5. **Create Agent Definition**: Define agent workflow for the platform

### Example: Adding a New Platform
```typescript
export class NewPlatformCapability extends BaseDeploymentCapability {
  id = 'new-platform-deploy'
  name = 'New Platform Deploy'
  targetType = 'new-platform' as const
  permissions = ['filesystem:read', 'network:outbound', 'cli:execute']

  async createPlan(context: DeploymentContext): Promise<DeploymentPlan> {
    // Implementation
  }

  async execute(plan: DeploymentPlan): Promise<DeploymentReceipt> {
    // Implementation
  }

  async verify(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    // Implementation
  }

  async rollback(receipt: DeploymentReceipt): Promise<DeploymentReceipt> {
    // Implementation
  }
}
```

## Migration from Existing Deploy Scripts

### From Simple Scripts
If you have existing deployment scripts, you can migrate them:

1. **Extract Configuration**: Move config to structured format
2. **Add Verification**: Add health checks and smoke tests
3. **Implement Rollback**: Add rollback logic
4. **Generate Receipts**: Create structured receipts
5. **Integrate with RinaWarp**: Create agent definitions

### Example Migration
```bash
# Old script
npm run build
vercel --prod

# New structured deployment
const plan = await createPlan(context)
const receipt = await execute(plan)
await verify(receipt)
```

## Monitoring and Analytics

### Deployment Metrics
The system tracks comprehensive deployment metrics:

- **Success Rate**: Percentage of successful deployments
- **Average Duration**: Time taken for deployments
- **Rollback Rate**: Percentage of deployments requiring rollback
- **Platform Performance**: Performance by deployment platform

### Integration with Monitoring
Deployments can be integrated with external monitoring systems:

```typescript
// Send deployment events to monitoring
receipt.logs.forEach(log => {
  monitoring.send({
    type: 'deployment_log',
    level: log.level,
    message: log.message,
    timestamp: log.timestamp
  })
})
```

## Security Considerations

### Secret Management
- **Environment Variables**: Store secrets in environment variables
- **Encryption**: Encrypt sensitive configuration data
- **Access Control**: Use RinaWarp's permission system
- **Audit Logs**: Track all deployment access and changes

### Best Practices
- **Least Privilege**: Grant minimal required permissions
- **Secret Rotation**: Regularly rotate API tokens and passwords
- **Environment Separation**: Use separate configurations for each environment
- **Validation**: Always validate configurations before deployment

## Support and Documentation

### Documentation
- [API Reference](./docs/api.md)
- [Platform Guides](./docs/platforms/)
- [Integration Guide](./docs/integration.md)
- [Troubleshooting](./docs/troubleshooting.md)

### Support
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Ask questions and share experiences
- **Documentation**: Comprehensive guides and examples

## License

This package is part of RinaWarp Terminal Pro and is licensed under the same terms as the main project.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

---

**RinaWarp Deployment Capabilities** - Making deployments reliable, verifiable, and manageable across all platforms.