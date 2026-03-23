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
  return buildDeployPlan(workspaceRoot, {
    packKey: 'deploy:cloudflare',
    actionId,
    providerLabel: 'Cloudflare',
    authCommand: 'wrangler whoami',
    configCommand: 'test -f wrangler.toml || test -f wrangler.json || test -f website/wrangler.toml',
    buildCommand: 'npm run build',
    deployCommand: 'wrangler deploy',
    verifyCommand: 'npm run smoke:pages',
    rollbackCommand: 'echo "Rollback uses Cloudflare deployment history. Confirm the previous deployment before promoting it."',
  })
}

function buildVercelPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  return buildDeployPlan(workspaceRoot, {
    packKey: 'deploy:vercel',
    actionId,
    providerLabel: 'Vercel',
    authCommand: 'vercel whoami',
    configCommand: 'test -f vercel.json || test -d .vercel',
    buildCommand: 'npm run build',
    deployCommand: 'vercel deploy --prod',
    verifyCommand: 'vercel inspect --wait',
    rollbackCommand: 'echo "Rollback uses Vercel deployment history or promote flow. Treat rollback as provider-backed only after the receipt captures the deployment ID."',
  })
}

function buildNetlifyPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  return buildDeployPlan(workspaceRoot, {
    packKey: 'deploy:netlify',
    actionId,
    providerLabel: 'Netlify',
    authCommand: 'netlify status',
    configCommand: 'test -f netlify.toml || test -d .netlify',
    buildCommand: 'npm run build',
    deployCommand: 'netlify deploy --prod',
    verifyCommand: 'netlify status',
    rollbackCommand: 'echo "Rollback uses Netlify deploy history or manual restore. Treat it as real only if the receipt includes the deploy ID or published URL."',
  })
}

function buildDockerPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  return buildDeployPlan(workspaceRoot, {
    packKey: 'deploy:docker',
    actionId,
    providerLabel: 'Docker',
    authCommand: 'docker info',
    configCommand: 'test -f Dockerfile || test -f docker-compose.yml || test -f compose.yaml',
    buildCommand: 'docker build -t app:trusted-proof .',
    deployCommand: 'docker compose up -d || docker run --detach app:trusted-proof',
    verifyCommand: 'docker ps --format "{{.Image}} {{.Status}}"',
    rollbackCommand: 'echo "Rollback is manual unless the previous image tag is recorded. Confirm the previous image before switching traffic back."',
  })
}

function buildVpsPlan(workspaceRoot: string, actionId: string): CapabilityExecutionPlan | null {
  return buildDeployPlan(workspaceRoot, {
    packKey: 'deploy:vps',
    actionId,
    providerLabel: 'VPS',
    authCommand: 'ssh -V',
    configCommand: 'test -f deploy.sh || test -d deploy || test -f docker-compose.yml || test -f compose.yaml',
    buildCommand: 'npm run build',
    deployCommand: 'echo "Run the project-specific SSH/VPS deploy command here after target confirmation."',
    verifyCommand: 'echo "Run the target health check or smoke script for the deployed host."',
    rollbackCommand: 'echo "Rollback is manual on VPS unless the project stores a previous artifact or release pointer."',
  })
}

function buildDeployPlan(
  workspaceRoot: string,
  options: {
    packKey: CapabilityExecutionPlan['packKey']
    actionId: string
    providerLabel: string
    authCommand: string
    configCommand: string
    buildCommand: string
    deployCommand: string
    verifyCommand: string
    rollbackCommand: string
  }
): CapabilityExecutionPlan | null {
  const commonInspectSteps: CapabilityPlanStep[] = [
    { stepId: 'auth', tool: 'terminal.write', input: { command: options.authCommand, cwd: workspaceRoot }, risk: 'inspect' },
    { stepId: 'target_config', tool: 'terminal.write', input: { command: options.configCommand, cwd: workspaceRoot }, risk: 'inspect' },
    { stepId: 'git_status', tool: 'terminal.write', input: { command: 'git status --short', cwd: workspaceRoot }, risk: 'inspect' },
    { stepId: 'workspace', tool: 'terminal.write', input: { command: 'pwd', cwd: workspaceRoot }, risk: 'inspect' },
  ]

  if (options.actionId === 'plan') {
    return {
      packKey: options.packKey,
      actionId: options.actionId,
      prompt: `Run ${options.providerLabel} deploy preflight safely.`,
      reasoning: `I’m checking ${options.providerLabel} auth, target config, and workspace readiness before any deploy side effects happen.`,
      steps: normalizePlanSteps(commonInspectSteps),
    }
  }

  if (options.actionId === 'verify') {
    return {
      packKey: options.packKey,
      actionId: options.actionId,
      prompt: `Verify the latest ${options.providerLabel} deploy.`,
      reasoning: `I’m treating verification as a hard gate, so this run only inspects the deployed target and its provider state.`,
      steps: normalizePlanSteps([
        ...commonInspectSteps.slice(0, 2),
        { stepId: 'verify_target', tool: 'terminal.write', input: { command: options.verifyCommand, cwd: workspaceRoot }, risk: 'inspect' },
      ]),
    }
  }

  if (options.actionId === 'rollback') {
    return {
      packKey: options.packKey,
      actionId: options.actionId,
      prompt: `Check rollback truth for ${options.providerLabel}.`,
      reasoning: `I’m verifying whether rollback is truly available for this target instead of assuming it exists.`,
      steps: normalizePlanSteps([
        ...commonInspectSteps.slice(0, 2),
        { stepId: 'rollback_truth', tool: 'terminal.write', input: { command: options.rollbackCommand, cwd: workspaceRoot }, risk: 'inspect' },
      ]),
    }
  }

  if (options.actionId === 'deploy') {
    return {
      packKey: options.packKey,
      actionId: options.actionId,
      prompt: `Deploy to ${options.providerLabel} through the trusted runner.`,
      reasoning: `I’m using the ${options.providerLabel} deploy capability so auth, config validation, deploy, verification, and rollback truth stay receipts-backed in one run.`,
      steps: normalizePlanSteps([
        ...commonInspectSteps,
        { stepId: 'build', tool: 'terminal.write', input: { command: options.buildCommand, cwd: workspaceRoot }, risk: 'safe-write' },
        {
          stepId: 'deploy',
          tool: 'terminal.write',
          input: { command: options.deployCommand, cwd: workspaceRoot },
          risk: 'high-impact',
          requires_confirmation: true,
        },
        { stepId: 'verify_target', tool: 'terminal.write', input: { command: options.verifyCommand, cwd: workspaceRoot }, risk: 'inspect' },
        { stepId: 'rollback_truth', tool: 'terminal.write', input: { command: options.rollbackCommand, cwd: workspaceRoot }, risk: 'inspect' },
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
  if (pack.key === 'deploy:vercel') return buildVercelPlan(workspaceRoot, actionId)
  if (pack.key === 'deploy:netlify') return buildNetlifyPlan(workspaceRoot, actionId)
  if (pack.key === 'deploy:docker') return buildDockerPlan(workspaceRoot, actionId)
  if (pack.key === 'deploy:vps') return buildVpsPlan(workspaceRoot, actionId)
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
