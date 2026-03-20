import type { AgentPackage } from '../agent-manager.js'
import type { CapabilityPack } from './types.js'

export type CapabilityPlanStep = {
  stepId?: string
  tool?: string
  input?: {
    command?: string
    cwd?: string
    timeoutMs?: number
  }
  risk?: 'inspect' | 'safe-write' | 'high-impact'
  risk_level?: 'low' | 'medium' | 'high'
  requires_confirmation?: boolean
}

export type CapabilityExecutionPlan = {
  packKey: string
  actionId: string
  prompt: string
  reasoning: string
  steps: CapabilityPlanStep[]
}

function inferPlanRisk(step: Partial<CapabilityPlanStep>): CapabilityPlanStep['risk'] {
  if (step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact') return 'high-impact'
  if (step.risk_level === 'medium' || step.risk === 'safe-write') return 'safe-write'
  return 'inspect'
}

function inferRiskLevel(risk: CapabilityPlanStep['risk']): CapabilityPlanStep['risk_level'] {
  if (risk === 'high-impact') return 'high'
  if (risk === 'safe-write') return 'medium'
  return 'low'
}

function normalizePlanStep(step: CapabilityPlanStep): CapabilityPlanStep {
  const risk = inferPlanRisk(step)
  return {
    ...step,
    risk,
    risk_level: inferRiskLevel(risk),
    requires_confirmation: risk === 'high-impact',
  }
}

function normalizePlanSteps(steps: CapabilityPlanStep[]): CapabilityPlanStep[] {
  return steps.map((step) => normalizePlanStep(step))
}

function buildSystemDoctorPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  if (actionId !== 'inspect') return null
  return {
    packKey: 'system:doctor',
    actionId,
    prompt: 'Run System Doctor diagnostics safely.',
    reasoning: 'I’m using System Doctor through the trusted runner to inspect the current system and workspace state.',
    steps: normalizePlanSteps([
      { stepId: 'uptime', tool: 'terminal.write', input: { command: 'uptime', cwd: workspaceRoot }, risk: 'inspect' },
      { stepId: 'memory', tool: 'terminal.write', input: { command: 'free -h', cwd: workspaceRoot }, risk: 'inspect' },
      { stepId: 'disk', tool: 'terminal.write', input: { command: 'df -h', cwd: workspaceRoot }, risk: 'inspect' },
      {
        stepId: 'top_cpu',
        tool: 'terminal.write',
        input: {
          command:
            'ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -10 || ps aux 2>/dev/null | sort -nrk3 | head -10 || ps aux | head -10',
          cwd: workspaceRoot,
        },
        risk: 'inspect',
      },
    ]),
  }
}

function buildCloudflarePlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  if (actionId === 'plan') {
    return {
      packKey: 'deploy:cloudflare',
      actionId,
      prompt: 'Run Cloudflare deploy preflight safely.',
      reasoning: 'I’m checking Cloudflare auth, workspace state, and build readiness before any deploy action.',
      steps: normalizePlanSteps([
        { stepId: 'wrangler_auth', tool: 'terminal.write', input: { command: 'wrangler whoami', cwd: workspaceRoot }, risk: 'inspect' },
        { stepId: 'git_status', tool: 'terminal.write', input: { command: 'git status --short', cwd: workspaceRoot }, risk: 'inspect' },
        { stepId: 'workspace', tool: 'terminal.write', input: { command: 'pwd', cwd: workspaceRoot }, risk: 'inspect' },
      ]),
    }
  }

  if (actionId === 'deploy') {
    return {
      packKey: 'deploy:cloudflare',
      actionId,
      prompt: 'Deploy to Cloudflare through the trusted runner.',
      reasoning: 'I’m using the Cloudflare deploy capability so the build and deploy steps stay receipts-backed.',
      steps: normalizePlanSteps([
        { stepId: 'wrangler_auth', tool: 'terminal.write', input: { command: 'wrangler whoami', cwd: workspaceRoot }, risk: 'inspect' },
        { stepId: 'git_status', tool: 'terminal.write', input: { command: 'git status --short', cwd: workspaceRoot }, risk: 'inspect' },
        { stepId: 'build', tool: 'terminal.write', input: { command: 'npm run build', cwd: workspaceRoot }, risk: 'safe-write' },
        {
          stepId: 'deploy',
          tool: 'terminal.write',
          input: { command: 'wrangler deploy', cwd: workspaceRoot },
          risk: 'high-impact',
          requires_confirmation: true,
        },
      ]),
    }
  }

  return null
}

function buildAndroidPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  if (actionId !== 'inspect') return null
  return {
    packKey: 'device:android:scan',
    actionId,
    prompt: 'Run Android device scan safely.',
    reasoning: 'I’m using the Android capability to collect ADB-backed device proof through the trusted runner.',
    steps: normalizePlanSteps([
      { stepId: 'adb_devices', tool: 'terminal.write', input: { command: 'adb devices', cwd: workspaceRoot }, risk: 'inspect' },
      {
        stepId: 'adb_model',
        tool: 'terminal.write',
        input: { command: 'adb shell getprop ro.product.model', cwd: workspaceRoot },
        risk: 'inspect',
      },
    ]),
  }
}

function buildIosPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  if (actionId !== 'inspect') return null
  return {
    packKey: 'device:ios:scan',
    actionId,
    prompt: 'Run iOS device scan safely.',
    reasoning: 'I’m using the iOS capability to collect Apple-compatible device proof through the trusted runner.',
    steps: normalizePlanSteps([
      { stepId: 'simctl_devices', tool: 'terminal.write', input: { command: 'xcrun simctl list devices', cwd: workspaceRoot }, risk: 'inspect' },
    ]),
  }
}

function defaultActionId(pack: CapabilityPack): string {
  return pack.actions[0]?.id || 'inspect'
}

export function buildCapabilityExecutionPlan(
  pack: CapabilityPack,
  workspaceRoot: string,
  requestedActionId?: string
): CapabilityExecutionPlan | null {
  const actionId = requestedActionId || defaultActionId(pack)
  if (pack.key === 'system:doctor') return buildSystemDoctorPlan(workspaceRoot, actionId)
  if (pack.key === 'deploy:cloudflare') return buildCloudflarePlan(workspaceRoot, actionId)
  if (pack.key === 'device:android:scan') return buildAndroidPlan(workspaceRoot, actionId)
  if (pack.key === 'device:ios:scan') return buildIosPlan(workspaceRoot, actionId)
  return null
}

function inferMarketplaceRisk(commandText: string): CapabilityPlanStep['risk'] {
  if (/\b(deploy|publish|push|destroy|delete|remove|prune|reset)\b/i.test(commandText)) return 'high-impact'
  if (/\b(build|install|write|fix|repair|update)\b/i.test(commandText)) return 'safe-write'
  return 'inspect'
}

export function buildMarketplaceCapabilityExecutionPlan(
  pack: CapabilityPack,
  agent: AgentPackage,
  workspaceRoot: string,
  requestedActionId?: string
): CapabilityExecutionPlan | null {
  const command = agent.commands.find((entry) => entry.name === (requestedActionId || pack.actions[0]?.id)) || agent.commands[0]
  if (!command) return null
  return {
    packKey: pack.key,
    actionId: command.name,
    prompt: `Run ${pack.title} through the trusted runner.`,
    reasoning: `I’m using the ${pack.title} capability through the trusted runner so the steps stay receipts-backed.`,
    steps: normalizePlanSteps(
      command.steps.map((step, index) => ({
        stepId: `${command.name}:${index + 1}`,
        tool: 'terminal.write',
        input: { command: step, cwd: workspaceRoot },
        risk: inferMarketplaceRisk(step),
      }))
    ),
  }
}
