/**
 * RinaWarp Repair Planner
 *
 * Analyzes project errors and builds automated repair plans.
 * Core component of the "Autonomous Dev Fix" viral feature.
 */

export { analyzeErrors, buildRepairPlan, scanProjectContext } from './repair-plan-runtime.js'
export { executeRepairPlan, executeRepairStep, formatRepairPlan } from './repair-execution.js'
export interface ProjectContext {
  root: string
  type: 'node' | 'python' | 'rust' | 'go' | 'docker' | 'unknown'
  hasPackageJson: boolean
  hasDockerfile: boolean
  hasGitRepo: boolean
  hasNodeModules: boolean
  buildCommand?: string
  testCommand?: string
  startCommand?: string
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'unknown'
  typescript: boolean
  framework?: string
}

export interface RepairStep {
  id: string
  command: string
  description: string
  risk: 'safe' | 'medium' | 'high'
  category: 'install' | 'build' | 'config' | 'clean' | 'docker' | 'git'
  estimatedTime?: string
}

export interface RepairPlan {
  goal: string
  steps: RepairStep[]
  context: ProjectContext
  detectedErrors: string[]
  autoExecutable: boolean
}

export interface ErrorDetection {
  errors: string[]
  suggestions: string[]
  severity: 'low' | 'medium' | 'high'
}
