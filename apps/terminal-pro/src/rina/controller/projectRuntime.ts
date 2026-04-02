import fs from 'node:fs'
import path from 'node:path'
import type { AgentPlan } from '../types.js'
import { readSharedWorkspaceTextFile } from '../../main/runtime/runtimeAccess.js'

type ProjectMemoryLike = {
  loadProject: (root: string) => {
    name?: string
    type?: string
    buildCommand?: string
    testCommand?: string
    startCommand?: string
    customCommands?: Record<string, string>
  } | null
  recentProjects: (limit: number) => unknown[]
}

type CommandMemoryLike = {
  getStats: () => {
    totalCommands: number
    totalRuns: number
  }
  topCommands: (limit: number) => unknown[]
}

async function readWorkspaceTextFile(workspaceRoot: string, relativePath: string): Promise<string | null> {
  return readSharedWorkspaceTextFile(workspaceRoot, relativePath)
}

export function getPlansForWorkspace(workspaceRoot: string, projectMemory: ProjectMemoryLike): AgentPlan[] {
  const project = projectMemory.loadProject(workspaceRoot)
  const plans: AgentPlan[] = []

  if (project) {
    if (project.buildCommand) {
      plans.push({
        id: 'build',
        description: `Build project (${project.buildCommand})`,
        steps: ['install-deps', 'compile', 'bundle'],
      })
    }
    if (project.testCommand) {
      plans.push({
        id: 'test',
        description: `Run tests (${project.testCommand})`,
        steps: ['setup', 'run-tests', 'report'],
      })
    }
    if (project.startCommand) {
      plans.push({
        id: 'dev',
        description: `Start dev server (${project.startCommand})`,
        steps: ['install', 'compile', 'start'],
      })
    }
  }

  plans.push({ id: 'deploy', description: 'Deploy application', steps: ['build', 'test', 'push', 'release'] })
  plans.push({ id: 'analyze', description: 'Analyze code quality', steps: ['lint', 'typecheck', 'test-cov'] })

  return plans
}

export async function getProjectCommand(args: {
  workspaceRoot: string
  intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze'
  projectMemory: ProjectMemoryLike
}): Promise<string> {
  const project = args.workspaceRoot ? args.projectMemory.loadProject(args.workspaceRoot) : null
  const custom = project?.customCommands || {}
  const packageScripts = await readPackageScripts(args.workspaceRoot)

  if (args.intent === 'build') {
    return project?.buildCommand || custom.build || packageScripts.build || 'npm run build'
  }

  if (args.intent === 'test') {
    return project?.testCommand || custom.test || packageScripts.test || 'npm test'
  }

  if (args.intent === 'lint') {
    return custom.lint || packageScripts.lint || 'npm run lint'
  }

  if (args.intent === 'deploy') {
    return custom.deploy || packageScripts.deploy || 'npm run deploy'
  }

  return custom.analyze || custom.lint || packageScripts.lint || 'npm run lint'
}

export async function readPackageScripts(workspaceRoot: string): Promise<Record<string, string>> {
  if (!workspaceRoot) return {}

  try {
    const packageJsonText = await readWorkspaceTextFile(workspaceRoot, 'package.json')
    if (!packageJsonText) return {}
    const parsed = JSON.parse(packageJsonText) as { scripts?: Record<string, string> }
    return parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {}
  } catch {
    return {}
  }
}

export function parseIntent(message: string): string {
  const lower = message.toLowerCase().trim()

  if (lower.match(/^rina\s*fix\s+(run|execute)/)) return 'fix-run'
  if (lower.match(/^rina\s*fix\s+step\s+\d+/)) return 'fix-step'
  if (lower.includes('what can you do') || lower.includes('what do you do') || lower.includes('help me')) return 'help'
  if (lower.includes("what's wrong") || lower.includes('what is wrong') || lower.includes('what failed') || lower.includes('why did this fail')) return 'analyze'
  if (lower.includes('fix')) return 'fix'
  if (lower.includes('explain')) return 'explain'
  if (lower.includes('build')) return 'build'
  if (lower.includes('test')) return 'test'
  if (lower.includes('deploy')) return 'deploy'
  if (lower.includes('analyze')) return 'analyze'
  if (lower.includes('lint')) return 'lint'
  if (lower.includes('status')) return 'status'
  if (lower.includes('help')) return 'help'

  return 'execute'
}

export function buildDeviceId(): string {
  const os = require('os')
  const crypto = require('crypto')
  const hostname = os.hostname()
  const username = os.userInfo().username
  return crypto.createHash('sha256').update(`${hostname}-${username}`).digest('hex').substring(0, 16)
}

export function buildStats(args: {
  workspaceRoot: string
  isRunning: boolean
  projectMemory: ProjectMemoryLike
  commandMemory: CommandMemoryLike
}) {
  const cmdStats = args.commandMemory.getStats()
  const recentProjects = args.projectMemory.recentProjects(5)

  return {
    memory: {
      session: cmdStats.totalCommands,
      longterm: recentProjects.length,
    },
    commands: {
      executed: cmdStats.totalRuns,
      learned: cmdStats.totalCommands,
    },
    agents: {
      running: args.isRunning,
      completed: 0,
    },
    conversation: {
      entries: cmdStats.totalRuns,
    },
    longterm: {
      sessions: recentProjects.length,
    },
    project: {
      current: args.workspaceRoot,
      type: args.projectMemory.loadProject(args.workspaceRoot)?.type || 'unknown',
    },
  }
}

export function buildContext(workspaceRoot: string, mode: 'auto' | 'assist' | 'explain', projectMemory: ProjectMemoryLike): string {
  const project = projectMemory.loadProject(workspaceRoot)
  return JSON.stringify({
    workspace: workspaceRoot,
    project: project?.name,
    type: project?.type,
    mode,
  })
}
