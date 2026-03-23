/**
 * Deployment Capability Types for RinaWarp
 */

export interface DeploymentTarget {
  id: string
  name: string
  type: DeploymentTargetType
  config: DeploymentConfig
  createdAt: string
  updatedAt: string
}

export type DeploymentTargetType = 
  | 'cloudflare'
  | 'vercel' 
  | 'netlify'
  | 'docker'
  | 'ssh'
  | 'vps'

export interface DeploymentConfig {
  // Common fields
  environment?: string
  region?: string
  
  // Platform-specific configs
  cloudflare?: CloudflareConfig
  vercel?: VercelConfig
  netlify?: NetlifyConfig
  docker?: DockerConfig
  ssh?: SSHConfig
}

export interface CloudflareConfig {
  accountId: string
  apiToken: string
  zoneId?: string
  projectName?: string
}

export interface VercelConfig {
  token: string
  projectId?: string
  teamId?: string
  orgId?: string
}

export interface NetlifyConfig {
  token: string
  siteId?: string
  teamId?: string
}

export interface DockerConfig {
  registryUrl: string
  username: string
  password: string
  imageName: string
  tag?: string
}

export interface SSHConfig {
  host: string
  port: number
  username: string
  privateKey?: string
  password?: string
  deployPath: string
}

export interface DeploymentReceipt {
  id: string
  targetId: string
  targetName: string
  targetUrl?: string
  version: string
  buildId?: string
  artifactPath?: string
  deployedAt: string
  status: 'success' | 'failed' | 'cancelled'
  durationMs: number
  rollbackInfo?: RollbackInfo
  verification?: DeploymentVerification
  logs: DeploymentLog[]
}

export interface RollbackInfo {
  canRollback: boolean
  previousVersion?: string
  rollbackCommand?: string
  rollbackUrl?: string
}

export interface DeploymentVerification {
  healthCheck?: HealthCheckResult
  smokeTest?: SmokeTestResult
  browserTest?: BrowserTestResult
}

export interface HealthCheckResult {
  passed: boolean
  url: string
  statusCode: number
  responseTimeMs: number
  responseBody?: string
}

export interface SmokeTestResult {
  passed: boolean
  tests: SmokeTest[]
  durationMs: number
}

export interface SmokeTest {
  name: string
  url: string
  expectedStatus: number
  expectedContent?: string
  passed: boolean
  error?: string
}

export interface BrowserTestResult {
  passed: boolean
  screenshots?: string[]
  errors?: string[]
  durationMs: number
}

export interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  step?: string
}

export interface DeploymentPlan {
  target: DeploymentTarget
  steps: DeploymentStep[]
  estimatedDuration?: number
  rollbackSteps?: DeploymentStep[]
}

export interface DeploymentStep {
  id: string
  name: string
  description: string
  command: string
  args?: Record<string, unknown>
  timeout?: number
  retryCount?: number
  requiresApproval?: boolean
  verification?: StepVerification
}

export interface StepVerification {
  type: 'health-check' | 'smoke-test' | 'browser-test'
  config: HealthCheckConfig | SmokeTestConfig | BrowserTestConfig
}

export interface HealthCheckConfig {
  url: string
  expectedStatus: number
  timeout: number
  retries: number
}

export interface SmokeTestConfig {
  tests: Omit<SmokeTest, 'passed' | 'error'>[]
  timeout: number
}

export interface BrowserTestConfig {
  url: string
  selectors: string[]
  timeout: number
}

export interface DeploymentCapability {
  id: string
  name: string
  description: string
  targetType: DeploymentTargetType
  permissions: string[]
  commands: DeploymentCommand[]
}

export interface DeploymentCommand {
  name: string
  description: string
  steps: DeploymentStep[]
  requiresApproval?: boolean
}

export interface DeploymentContext {
  workspacePath: string
  target: DeploymentTarget
  version: string
  buildArtifacts?: string[]
  environment: Record<string, string>
  dryRun?: boolean
}