/**
 * RinaWarp Context Engine
 *
 * Provides comprehensive project awareness for the AI.
 * Scans workspace, git, dependencies to build context.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execCommandSync } from '../execution/legacyShell.js'

export interface ProjectContext {
  root: string
  files: string[]
  git: GitContext | null
  package: PackageJson | null
  structure: ProjectStructure
  errors: string[]
  timestamp: number
}

export interface GitContext {
  status: string
  branch: string
  hasChanges: boolean
  lastCommit?: string
}

export interface PackageJson {
  name: string
  version: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export interface ProjectStructure {
  hasSrc: boolean
  hasTests: boolean
  hasConfig: boolean
  hasDocker: boolean
  hasDatabase: boolean
  languages: string[]
  framework?: string
}

/**
 * Context Engine - builds project awareness
 */
export class ContextEngine {
  private root: string
  private cache: ProjectContext | null = null
  private cacheTime = 0
  private cacheTTL = 5000 // 5 seconds

  constructor(root: string) {
    this.root = root
  }

  /**
   * Get project files
   */
  getProjectFiles(): string[] {
    try {
      const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache']
      const files: string[] = []

      const walk = (dir: string, depth = 0) => {
        if (depth > 3) return // Limit depth

        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.') || ignoreDirs.includes(entry.name)) {
            continue
          }

          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            files.push(`${entry.name}/`)
            walk(fullPath, depth + 1)
          } else {
            files.push(entry.name)
          }
        }
      }

      walk(this.root)
      return files
    } catch {
      return []
    }
  }

  /**
   * Get git status
   */
  getGitStatus(): GitContext | null {
    try {
      const status = execCommandSync('git status --porcelain', { cwd: this.root }).trimEnd()
      const branch = execCommandSync('git branch --show-current', { cwd: this.root }).trim()
      const lastCommit = execCommandSync('git log -1 --oneline', { cwd: this.root }).trim()

      return {
        status: status || 'clean',
        branch,
        hasChanges: !!status.trim(),
        lastCommit,
      }
    } catch {
      return null
    }
  }

  /**
   * Get package.json
   */
  getPackageJson(): PackageJson | null {
    try {
      const file = path.join(this.root, 'package.json')
      if (!fs.existsSync(file)) return null

      const content = fs.readFileSync(file, 'utf-8')
      const pkg = JSON.parse(content)

      return {
        name: pkg.name || 'unknown',
        version: pkg.version || '0.0.0',
        scripts: pkg.scripts || {},
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      }
    } catch {
      return null
    }
  }

  /**
   * Analyze project structure
   */
  getProjectStructure(): ProjectStructure {
    const structure: ProjectStructure = {
      hasSrc: false,
      hasTests: false,
      hasConfig: false,
      hasDocker: false,
      hasDatabase: false,
      languages: [],
    }

    try {
      const entries = fs.readdirSync(this.root)

      // Check directories
      structure.hasSrc = entries.includes('src')
      structure.hasTests = entries.includes('tests') || entries.includes('test') || entries.includes('__tests__')
      structure.hasDocker = entries.includes('Dockerfile') || entries.includes('docker-compose.yml')

      // Check config files
      structure.hasConfig = entries.some(
        (e) =>
          e.endsWith('config.js') ||
          e.endsWith('config.ts') ||
          e === 'tsconfig.json' ||
          e === 'next.config.js' ||
          e === 'vite.config.js'
      )

      // Check database
      structure.hasDatabase = entries.some(
        (e) => e.includes('prisma') || e.includes('database') || e.endsWith('.db') || e.endsWith('.sqlite')
      )

      // Detect languages/frameworks
      if (entries.includes('package.json')) structure.languages.push('JavaScript/TypeScript')
      if (entries.includes('requirements.txt')) structure.languages.push('Python')
      if (entries.includes('go.mod')) structure.languages.push('Go')
      if (entries.includes('Cargo.toml')) structure.languages.push('Rust')
      if (entries.includes('pom.xml') || entries.includes('build.gradle')) structure.languages.push('Java')

      // Detect framework
      const pkg = this.getPackageJson()
      if (pkg) {
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps.next) structure.framework = 'Next.js'
        else if (deps.react) structure.framework = 'React'
        else if (deps.vue) structure.framework = 'Vue'
        else if (deps.express) structure.framework = 'Express'
        else if (deps.fastify) structure.framework = 'Fastify'
        else if (deps.flask) structure.framework = 'Flask'
        else if (deps.django) structure.framework = 'Django'
      }
    } catch {
      // Ignore errors
    }

    return structure
  }

  /**
   * Build full project context
   */
  buildContext(): ProjectContext {
    // Check cache
    const now = Date.now()
    if (this.cache && now - this.cacheTime < this.cacheTTL) {
      return this.cache
    }

    const context: ProjectContext = {
      root: this.root,
      files: this.getProjectFiles(),
      git: this.getGitStatus(),
      package: this.getPackageJson(),
      structure: this.getProjectStructure(),
      errors: [],
      timestamp: now,
    }

    this.cache = context
    this.cacheTime = now

    return context
  }

  /**
   * Get context as AI prompt
   */
  buildPrompt(input: string): string {
    const ctx = this.buildContext()

    let prompt = `User request: ${input}\n\n`

    prompt += `Project: ${ctx.package?.name || 'Unknown'}\n`
    prompt += `Framework: ${ctx.structure.framework || 'None detected'}\n`
    prompt += `Languages: ${ctx.structure.languages.join(', ') || 'Unknown'}\n\n`

    prompt += `Project Structure:\n`
    prompt += ctx.files
      .slice(0, 20)
      .map((f) => `  ${f}`)
      .join('\n')
    if (ctx.files.length > 20) {
      prompt += `\n  ... and ${ctx.files.length - 20} more files`
    }
    prompt += '\n\n'

    if (ctx.git) {
      prompt += `Git Status:\n`
      prompt += `  Branch: ${ctx.git.branch}\n`
      prompt += `  Changes: ${ctx.git.hasChanges ? 'Yes' : 'No'}\n`
      prompt += `  Last: ${ctx.git.lastCommit || 'N/A'}\n\n`
    }

    if (ctx.package) {
      prompt += `Dependencies (${Object.keys(ctx.package.dependencies || {}).length}):\n`
      const deps = Object.keys(ctx.package.dependencies || {}).slice(0, 10)
      prompt += deps.map((d) => `  - ${d}`).join('\n')
      if (Object.keys(ctx.package.dependencies || {}).length > 10) {
        prompt += `\n  ... and more`
      }
    }

    return prompt
  }

  /**
   * Set workspace root
   */
  setRoot(root: string): void {
    this.root = root
    this.invalidate()
  }

  /**
   * Invalidate cache
   */
  invalidate(): void {
    this.cache = null
    this.cacheTime = 0
  }
}
