/**
 * Context Collector
 *
 * Problem #3: Repo-Aware Commands
 * Collects environment data to improve AI accuracy.
 *
 * Detects: package.json, Dockerfile, workflows, git status, etc.
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as path from 'node:path'

const execAsync = promisify(exec)

export interface RepoContext {
  isGitRepo: boolean
  gitBranch?: string
  gitStatus?: string
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go'
  projectType?: 'node' | 'rust' | 'python' | 'go' | 'java' | 'unknown'
  hasDockerfile: boolean
  hasDockerCompose: boolean
  hasK8s: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dockerServices?: string[]
  k8sManifests?: string[]
  workflows?: string[]
  recentCommits?: string[]
}

export interface SystemContext {
  os: string
  kernel: string
  hostname: string
  uptime: string
  cpu: string
  memory: string
  disk: string
  processes: string
  services: string
  docker?: string
}

/**
 * Collect repository context
 */
export async function collectRepoContext(cwd: string): Promise<RepoContext> {
  const context: RepoContext = {
    isGitRepo: false,
    hasDockerfile: false,
    hasDockerCompose: false,
    hasK8s: false,
  }

  try {
    // Check if git repo
    const gitResult = await execAsync('git rev-parse --is-inside-work-tree', { cwd })
    context.isGitRepo = gitResult.stdout.trim() === 'true'

    if (context.isGitRepo) {
      // Get branch
      try {
        const branch = await execAsync('git branch --show-current', { cwd })
        context.gitBranch = branch.stdout.trim()
      } catch {
        /* not critical */
      }

      // Get status
      try {
        const status = await execAsync('git status --porcelain', { cwd })
        context.gitStatus = status.stdout.trim().slice(0, 500)
      } catch {
        /* not critical */
      }

      // Get recent commits
      try {
        const log = await execAsync('git log -5 --oneline', { cwd })
        context.recentCommits = log.stdout.trim().split('\n')
      } catch {
        /* not critical */
      }
    }

    // Check for package managers
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))
      context.packageManager = detectPackageManager(cwd)
      context.projectType = 'node'
      context.scripts = pkg.scripts || {}
      context.dependencies = pkg.dependencies || {}
      context.devDependencies = pkg.devDependencies || {}
    } else if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
      context.packageManager = 'cargo'
      context.projectType = 'rust'
    } else if (fs.existsSync(path.join(cwd, 'requirements.txt')) || fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
      context.packageManager = 'pip'
      context.projectType = 'python'
    } else if (fs.existsSync(path.join(cwd, 'go.mod'))) {
      context.packageManager = 'go'
      context.projectType = 'go'
    }

    // Check for Docker
    context.hasDockerfile = fs.existsSync(path.join(cwd, 'Dockerfile'))
    context.hasDockerCompose =
      fs.existsSync(path.join(cwd, 'docker-compose.yml')) || fs.existsSync(path.join(cwd, 'docker-compose.yaml'))

    // Check for Kubernetes
    const k8sDir = path.join(cwd, 'k8s')
    if (fs.existsSync(k8sDir)) {
      context.hasK8s = true
      context.k8sManifests = fs.readdirSync(k8sDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    }

    // Check for GitHub workflows
    const workflowsDir = path.join(cwd, '.github', 'workflows')
    if (fs.existsSync(workflowsDir)) {
      context.workflows = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    }
  } catch (error) {
    console.error('Error collecting repo context:', error)
  }

  return context
}

function detectPackageManager(cwd: string): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun'
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

/**
 * Collect system context
 */
export async function collectSystemContext(): Promise<SystemContext> {
  const ctx: SystemContext = {
    os: '',
    kernel: '',
    hostname: '',
    uptime: '',
    cpu: '',
    memory: '',
    disk: '',
    processes: '',
    services: '',
  }

  const platform = process.platform

  try {
    // OS info
    if (platform === 'linux') {
      ctx.os = await readFile('/etc/os-release').then(
        (f) => f.split('\n')[0]?.split('=')[1]?.replace(/"/g, '') || 'Linux'
      )
      ctx.kernel = await readFile('/proc/version').then((f) => f.slice(0, 50))
      ctx.hostname = require('os').hostname()
      ctx.uptime = String(require('os').uptime())
    } else if (platform === 'darwin') {
      const { stdout } = await execAsync('sw_vers -productVersion')
      ctx.os = `macOS ${stdout.trim()}`
      ctx.kernel = 'Darwin'
      ctx.hostname = require('os').hostname()
    }

    // Memory
    const mem = require('os').totalmem()
    ctx.memory = `${Math.round(mem / 1024 / 1024 / 1024)}GB`

    // Disk
    try {
      const df =
        platform === 'win32'
          ? await execAsync('wmic logicaldisk get size,freespace,caption')
          : await execAsync('df -h /')
      ctx.disk = df.stdout.slice(0, 200)
    } catch {
      /* not critical */
    }

    // Top processes
    try {
      const ps =
        platform === 'win32'
          ? await execAsync('tasklist /FO LIST | findstr /C:node /C:docker')
          : await execAsync('ps aux --sort=-%mem | head -10')
      ctx.processes = ps.stdout.slice(0, 1000)
    } catch {
      /* not critical */
    }

    // Services (if systemd)
    try {
      const svc = await execAsync('systemctl list-units --type=service --state=running | head -20')
      ctx.services = svc.stdout.slice(0, 500)
    } catch {
      /* not critical */
    }
  } catch (error) {
    console.error('Error collecting system context:', error)
  }

  return ctx
}

async function readFile(path: string): Promise<string> {
  try {
    return fs.readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

/**
 * Generate context hints for LLM
 */
export function generateContextHints(repo: RepoContext): string {
  const hints: string[] = []

  if (repo.isGitRepo) {
    hints.push(`Git branch: ${repo.gitBranch || 'unknown'}`)
  }

  if (repo.packageManager) {
    hints.push(`Package manager: ${repo.packageManager}`)

    // Add available scripts
    if (repo.scripts) {
      const scriptNames = Object.keys(repo.scripts).slice(0, 10)
      hints.push(`Available scripts: ${scriptNames.join(', ')}`)
    }
  }

  if (repo.projectType) {
    hints.push(`Project type: ${repo.projectType}`)
  }

  if (repo.hasDockerfile) {
    hints.push('Dockerfile present')
  }

  if (repo.hasDockerCompose) {
    hints.push('Docker Compose available')
  }

  if (repo.hasK8s) {
    hints.push('Kubernetes manifests available')
  }

  if (repo.workflows) {
    hints.push(`CI/CD workflows: ${repo.workflows.length}`)
  }

  return hints.join('\n')
}
