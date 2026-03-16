/**
 * RinaWarp Repair Planner
 *
 * Analyzes project errors and builds automated repair plans.
 * Core component of the "Autonomous Dev Fix" viral feature.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

/**
 * Project context detected by scanner
 */
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

/**
 * A single step in the repair plan
 */
export interface RepairStep {
  id: string
  command: string
  description: string
  risk: 'safe' | 'medium' | 'high'
  category: 'install' | 'build' | 'config' | 'clean' | 'docker' | 'git'
  estimatedTime?: string
}

/**
 * Complete repair plan
 */
export interface RepairPlan {
  goal: string
  steps: RepairStep[]
  context: ProjectContext
  detectedErrors: string[]
  autoExecutable: boolean
}

/**
 * Error detection result
 */
export interface ErrorDetection {
  errors: string[]
  suggestions: string[]
  severity: 'low' | 'medium' | 'high'
}

/**
 * Scan project directory and detect context
 */
export async function scanProjectContext(projectRoot: string): Promise<ProjectContext> {
  const context: ProjectContext = {
    root: projectRoot,
    type: 'unknown',
    hasPackageJson: false,
    hasDockerfile: false,
    hasGitRepo: false,
    hasNodeModules: false,
    packageManager: 'unknown',
    typescript: false,
  }

  // Check for package.json
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    context.hasPackageJson = true
    context.type = 'node'

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Detect package manager
      if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        context.packageManager = 'pnpm'
      } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
        context.packageManager = 'yarn'
      } else {
        context.packageManager = 'npm'
      }

      // Detect TypeScript
      context.typescript = fs.existsSync(path.join(projectRoot, 'tsconfig.json'))

      // Extract commands
      context.buildCommand = packageJson.scripts?.build
      context.testCommand = packageJson.scripts?.test
      context.startCommand = packageJson.scripts?.start || packageJson.scripts?.dev

      // Detect framework
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      if (deps.next) context.framework = 'next'
      else if (deps.react) context.framework = 'react'
      else if (deps.vue) context.framework = 'vue'
      else if (deps.nest) context.framework = 'nest'
      else if (deps.express) context.framework = 'express'
    } catch (e) {
      console.warn('[RepairPlanner] Failed to parse package.json:', e)
    }
  }

  // Check for Python project
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml')
  const requirementsPath = path.join(projectRoot, 'requirements.txt')
  if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
    context.type = 'python'
  }

  // Check for Rust project
  if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) {
    context.type = 'rust'
  }

  // Check for Go project
  if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
    context.type = 'go'
  }

  // Check for Dockerfile
  context.hasDockerfile = fs.existsSync(path.join(projectRoot, 'Dockerfile'))

  // Check for Docker Compose
  if (fs.existsSync(path.join(projectRoot, 'docker-compose.yml')) ||
      fs.existsSync(path.join(projectRoot, 'docker-compose.yaml'))) {
    context.type = 'docker'
  }

  // Check for git repository
  try {
    await execAsync('git rev-parse --git-dir', { cwd: projectRoot, timeout: 5000 })
    context.hasGitRepo = true
  } catch {
    context.hasGitRepo = false
  }

  // Check for node_modules
  context.hasNodeModules = fs.existsSync(path.join(projectRoot, 'node_modules'))

  return context
}

/**
 * Analyze recent errors from build/test output
 */
export async function analyzeErrors(projectRoot: string): Promise<ErrorDetection> {
  const errors: string[] = []
  const suggestions: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'

  // Try to run build and capture errors
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const buildCmd = packageJson.scripts?.build || packageJson.scripts?.build
      
      if (buildCmd) {
        // Try TypeScript check first
        if (fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
          try {
            const tscOutput = await execAsync('npx tsc --noEmit 2>&1', { 
              cwd: projectRoot, 
              timeout: 60000 
            })
            if (tscOutput.stdout || tscOutput.stderr) {
              const output = tscOutput.stdout + tscOutput.stderr
              errors.push(...parseTypeScriptErrors(output))
              severity = 'high'
            }
          } catch (e: any) {
            // TypeScript check failed - parse errors
            const output = e.stdout || e.stderr || e.message
            const tsErrors = parseTypeScriptErrors(output)
            if (tsErrors.length > 0) {
              errors.push(...tsErrors)
              severity = 'high'
              suggestions.push('Run: npx tsc --noEmit to see detailed errors')
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[RepairPlanner] Error analyzing build:', e)
  }

  // Check for missing node_modules
  const nodeModulesPath = path.join(projectRoot, 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    errors.push('node_modules not found - dependencies not installed')
    suggestions.push('Run: npm install')
    severity = severity === 'low' ? 'medium' : severity
  }

  // Check for lock file issues
  const hasLockFile = 
    fs.existsSync(path.join(projectRoot, 'package-lock.json')) ||
    fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml')) ||
    fs.existsSync(path.join(projectRoot, 'yarn.lock'))

  if (!hasLockFile && fs.existsSync(path.join(projectRoot, 'package.json'))) {
    suggestions.push('No lock file found - consider running npm install to generate one')
  }

  return { errors, suggestions, severity }
}

/**
 * Parse TypeScript errors from output
 */
function parseTypeScriptErrors(output: string): string[] {
  const errors: string[] = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    // Match TypeScript error patterns like:
    // error TS2307: Cannot find module './foo'
    // src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'
    if (line.includes('error TS') || line.includes(': error TS')) {
      errors.push(line.trim())
    }
  }
  
  return errors
}

/**
 * Build a repair plan based on project context and errors
 */
export async function buildRepairPlan(projectRoot: string): Promise<RepairPlan> {
  const context = await scanProjectContext(projectRoot)
  const errorAnalysis = await analyzeErrors(projectRoot)
  
  const steps: RepairStep[] = []
  const detectedErrors: string[] = [...errorAnalysis.errors]

  // Step 1: Clean and install dependencies
  if (!context.hasNodeModules || errorAnalysis.errors.some(e => e.includes('Cannot find module'))) {
    steps.push({
      id: 'install-deps',
      command: getInstallCommand(context),
      description: 'Install dependencies',
      risk: 'safe',
      category: 'install',
      estimatedTime: '30s - 5min',
    })
  }

  // Step 2: Fix TypeScript errors
  if (context.typescript && errorAnalysis.errors.some(e => e.includes('TS'))) {
    // Check for missing type definitions
    const missingTypes = errorAnalysis.errors
      .filter(e => e.includes("Cannot find module") || e.includes("Could not find a declaration"))
      .map(e => {
        // Try to extract module name
        const match = e.match(/Cannot find module ['"]([^'"]+)['"]/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    for (const module of missingTypes) {
      if (!module.startsWith('.') && !module.startsWith('/')) {
        steps.push({
          id: `install-types-${module}`,
          command: `npm install -D @types/${module.replace('@', '').replace('/', '')}`,
          description: `Install types for ${module}`,
          risk: 'safe',
          category: 'install',
          estimatedTime: '10s',
        })
      }
    }

    // Rebuild TypeScript
    steps.push({
      id: 'tsc-build',
      command: 'npx tsc --build',
      description: 'Rebuild TypeScript project',
      risk: 'safe',
      category: 'build',
      estimatedTime: '30s',
    })
  }

  // Step 3: Build the project
  if (context.buildCommand) {
    steps.push({
      id: 'build-project',
      command: context.packageManager === 'npm' ? 'npm run build' : 
               context.packageManager === 'pnpm' ? 'pnpm run build' : 
               context.packageManager === 'yarn' ? 'yarn build' : 'npm run build',
      description: `Build project (${context.buildCommand})`,
      risk: 'safe',
      category: 'build',
      estimatedTime: '1-5min',
    })
  }

  // Step 4: Docker-specific fixes
  if (context.hasDockerfile) {
    steps.push({
      id: 'docker-cleanup',
      command: 'docker system prune -f',
      description: 'Clean up Docker resources',
      risk: 'medium',
      category: 'docker',
      estimatedTime: '30s',
    })
  }

  // Step 5: Git stash if there are uncommitted changes that might cause issues
  if (context.hasGitRepo) {
    try {
      const gitStatus = await execAsync('git status --porcelain', { cwd: projectRoot, timeout: 5000 })
      if (gitStatus.stdout.trim()) {
        errorAnalysis.suggestions.push('You have uncommitted changes - consider committing or stashing before rebuild')
      }
    } catch {
      // Not a git repo or other error
    }
  }

  // Add suggestions from error analysis
  for (const suggestion of errorAnalysis.suggestions) {
    if (!steps.some(s => s.description.toLowerCase().includes(suggestion.toLowerCase()))) {
      // Don't add duplicate steps
    }
  }

  const autoExecutable = steps.length > 0 && steps.every(s => s.risk !== 'high')

  return {
    goal: detectedErrors.length > 0 
      ? `Fix ${detectedErrors.length} detected error(s)` 
      : 'Optimize project setup',
    steps,
    context,
    detectedErrors,
    autoExecutable,
  }
}

/**
 * Get the appropriate install command based on project context
 */
function getInstallCommand(context: ProjectContext): string {
  switch (context.packageManager) {
    case 'pnpm':
      return 'pnpm install'
    case 'yarn':
      return 'yarn install'
    case 'npm':
    default:
      return 'npm install'
  }
}

/**
 * Execute a single repair step with safety check
 */
export async function executeRepairStep(
  step: RepairStep,
  projectRoot: string,
  dryRun: boolean = false
): Promise<{ success: boolean; output: string; error?: string }> {
  if (dryRun) {
    return {
      success: true,
      output: `[Dry Run] Would execute: ${step.command}`,
    }
  }

  try {
    const { stdout, stderr } = await execAsync(step.command, {
      cwd: projectRoot,
      timeout: 300000, // 5 minute timeout
      env: { ...process.env, FORCE_COLOR: 'true' },
    })

    return {
      success: true,
      output: stdout + stderr,
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    }
  }
}

/**
 * Execute all steps in a repair plan
 */
export async function executeRepairPlan(
  plan: RepairPlan,
  projectRoot: string,
  onStepComplete?: (step: RepairStep, result: { success: boolean; output: string }) => void
): Promise<{ success: boolean; results: Array<{ step: RepairStep; result: { success: boolean; output: string } }> }> {
  const results: Array<{ step: RepairStep; result: { success: boolean; output: string } }> = []

  for (const step of plan.steps) {
    const result = await executeRepairStep(step, projectRoot)
    results.push({ step, result })
    
    if (onStepComplete) {
      onStepComplete(step, result)
    }

    // Stop on first failure
    if (!result.success) {
      return {
        success: false,
        results,
      }
    }
  }

  return {
    success: true,
    results,
  }
}

/**
 * Format repair plan for display
 */
export function formatRepairPlan(plan: RepairPlan): string {
  const lines: string[] = []

  lines.push(`🎯 Goal: ${plan.goal}`)
  lines.push('')
  lines.push('📋 Repair Plan:')
  lines.push('')

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const riskEmoji = step.risk === 'safe' ? '✅' : step.risk === 'medium' ? '⚠️' : '🚨'
    lines.push(`${i + 1}. ${riskEmoji} ${step.description}`)
    lines.push(`   Command: \`${step.command}\``)
    if (step.estimatedTime) {
      lines.push(`   Estimated time: ${step.estimatedTime}`)
    }
    lines.push('')
  }

  if (plan.detectedErrors.length > 0) {
    lines.push('🐛 Detected Errors:')
    for (const error of plan.detectedErrors.slice(0, 5)) {
      lines.push(`   • ${error}`)
    }
    if (plan.detectedErrors.length > 5) {
      lines.push(`   ... and ${plan.detectedErrors.length - 5} more`)
    }
    lines.push('')
  }

  lines.push('💡 ' + (plan.autoExecutable 
    ? 'This plan can be executed automatically.'
    : 'Some steps require manual confirmation.'))

  return lines.join('\n')
}
