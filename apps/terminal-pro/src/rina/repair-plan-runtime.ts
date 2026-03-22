import * as fs from 'fs'
import * as path from 'path'
import { execCommand } from './execution/legacyShell.js'
import type { ErrorDetection, ProjectContext, RepairPlan, RepairStep } from './repair-planner.js'

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

  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    context.hasPackageJson = true
    context.type = 'node'

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        context.packageManager = 'pnpm'
      } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
        context.packageManager = 'yarn'
      } else {
        context.packageManager = 'npm'
      }

      context.typescript = fs.existsSync(path.join(projectRoot, 'tsconfig.json'))
      context.buildCommand = packageJson.scripts?.build
      context.testCommand = packageJson.scripts?.test
      context.startCommand = packageJson.scripts?.start || packageJson.scripts?.dev

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

  const pyprojectPath = path.join(projectRoot, 'pyproject.toml')
  const requirementsPath = path.join(projectRoot, 'requirements.txt')
  if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) context.type = 'python'
  if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) context.type = 'rust'
  if (fs.existsSync(path.join(projectRoot, 'go.mod'))) context.type = 'go'

  context.hasDockerfile = fs.existsSync(path.join(projectRoot, 'Dockerfile'))
  if (
    fs.existsSync(path.join(projectRoot, 'docker-compose.yml')) ||
    fs.existsSync(path.join(projectRoot, 'docker-compose.yaml'))
  ) {
    context.type = 'docker'
  }

  try {
    await execCommand('git rev-parse --git-dir', { cwd: projectRoot, timeout: 5000 })
    context.hasGitRepo = true
  } catch {
    context.hasGitRepo = false
  }

  context.hasNodeModules = fs.existsSync(path.join(projectRoot, 'node_modules'))
  return context
}

function parseTypeScriptErrors(output: string): string[] {
  const errors: string[] = []
  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('error TS') || line.includes(': error TS')) {
      errors.push(line.trim())
    }
  }
  return errors
}

export async function analyzeErrors(projectRoot: string): Promise<ErrorDetection> {
  const errors: string[] = []
  const suggestions: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'

  try {
    const packageJsonPath = path.join(projectRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const buildCmd = packageJson.scripts?.build || packageJson.scripts?.build
      if (buildCmd && fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
        try {
          const tscOutput = await execCommand('npx tsc --noEmit 2>&1', {
            cwd: projectRoot,
            timeout: 60000,
          })
          if (tscOutput.stdout || tscOutput.stderr) {
            const output = tscOutput.stdout + tscOutput.stderr
            errors.push(...parseTypeScriptErrors(output))
            severity = 'high'
          }
        } catch (e: any) {
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
  } catch (e) {
    console.warn('[RepairPlanner] Error analyzing build:', e)
  }

  const nodeModulesPath = path.join(projectRoot, 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    errors.push('node_modules not found - dependencies not installed')
    suggestions.push('Run: npm install')
    severity = severity === 'low' ? 'medium' : severity
  }

  const hasLockFile =
    fs.existsSync(path.join(projectRoot, 'package-lock.json')) ||
    fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml')) ||
    fs.existsSync(path.join(projectRoot, 'yarn.lock'))

  if (!hasLockFile && fs.existsSync(path.join(projectRoot, 'package.json'))) {
    suggestions.push('No lock file found - consider running npm install to generate one')
  }

  return { errors, suggestions, severity }
}

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

export async function buildRepairPlan(projectRoot: string): Promise<RepairPlan> {
  const context = await scanProjectContext(projectRoot)
  const errorAnalysis = await analyzeErrors(projectRoot)

  const steps: RepairStep[] = []
  const detectedErrors: string[] = [...errorAnalysis.errors]

  if (!context.hasNodeModules || errorAnalysis.errors.some((e) => e.includes('Cannot find module'))) {
    steps.push({
      id: 'install-deps',
      command: getInstallCommand(context),
      description: 'Install dependencies',
      risk: 'safe',
      category: 'install',
      estimatedTime: '30s - 5min',
    })
  }

  if (context.typescript && errorAnalysis.errors.some((e) => e.includes('TS'))) {
    const missingTypes = errorAnalysis.errors
      .filter((e) => e.includes("Cannot find module") || e.includes("Could not find a declaration"))
      .map((e) => {
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

    steps.push({
      id: 'tsc-build',
      command: 'npx tsc --build',
      description: 'Rebuild TypeScript project',
      risk: 'safe',
      category: 'build',
      estimatedTime: '30s',
    })
  }

  if (context.buildCommand) {
    steps.push({
      id: 'build-project',
      command:
        context.packageManager === 'npm'
          ? 'npm run build'
          : context.packageManager === 'pnpm'
            ? 'pnpm run build'
            : context.packageManager === 'yarn'
              ? 'yarn build'
              : 'npm run build',
      description: `Build project (${context.buildCommand})`,
      risk: 'safe',
      category: 'build',
      estimatedTime: '1-5min',
    })
  }

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

  if (context.hasGitRepo) {
    try {
      const gitStatus = await execCommand('git status --porcelain', { cwd: projectRoot, timeout: 5000 })
      if (gitStatus.stdout.trim()) {
        errorAnalysis.suggestions.push('You have uncommitted changes - consider committing or stashing before rebuild')
      }
    } catch {
      // ignore
    }
  }

  const autoExecutable = steps.length > 0 && steps.every((s) => s.risk !== 'high')

  return {
    goal: detectedErrors.length > 0 ? `Fix ${detectedErrors.length} detected error(s)` : 'Optimize project setup',
    steps,
    context,
    detectedErrors,
    autoExecutable,
  }
}
