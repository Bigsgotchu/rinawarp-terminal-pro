export type ProjectFixIssueKind =
  | 'missing-dependency'
  | 'port-conflict'
  | 'build-config'

export type ProjectFixIssue = {
  kind: ProjectFixIssueKind
  summary: string
  evidence: string
  proposedFixes: string[]
  verificationCommand?: string
}

export type ProjectFixStep = {
  id: string
  command: string
  risk: 'inspect' | 'safe-write' | 'high-impact'
  description?: string
}

export type ProjectFixPlan = {
  issues: ProjectFixIssue[]
  steps: ProjectFixStep[]
  verificationSteps: ProjectFixStep[]
  reasoning: string
}

export type VerificationResult = {
  status: 'pending' | 'passed' | 'failed'
  message: string
  checks: string[]
}

export type FixProjectResult = {
  success: boolean
  plan: ProjectFixPlan
  executableSteps: ProjectFixStep[]
  verification: VerificationResult
  explanation: string
  haltReason?: string
}

export type AgentPlanLike = {
  id?: string
  reasoning?: string
  steps?: Array<{
    stepId?: string
    id?: string
    description?: string
    risk?: string
    input?: {
      command?: string
      cwd?: string
      timeoutMs?: number
    }
  }>
}

type AgentPlanFn = (args: {
  intentText: string
  projectRoot: string
}) => Promise<unknown>

type PolicyGateFn = (step: ProjectFixStep) => {
  ok: boolean
  requiresConfirmation?: boolean
  message?: string
}

export function createFixProjectFlow(deps: FixProjectFlowDeps) {
  return async function fixProject(projectRoot: string): Promise<FixProjectResult> {
    const rawPlan = (await deps.agentPlan({
      intentText:
        'Figure out what is broken in this workspace and fix the safest parts first. Include verification steps.',
      projectRoot,
    })) as AgentPlanLike

    const plan = normalizePlan(rawPlan)
    const gatedSteps = gatePlanSteps(plan, deps.evaluatePolicy)

    if (!gatedSteps.ok) {
      return failResult(plan, gatedSteps.reason)
    }

    return {
      success: gatedSteps.steps.length > 0,
      plan,
      executableSteps: gatedSteps.steps,
      verification: buildPendingVerification(plan),
      explanation: buildPlanExplanation(plan, gatedSteps.steps),
    }
  }
}

function normalizePlan(raw: AgentPlanLike): ProjectFixPlan {
  const steps = normalizeSteps(raw?.steps)
  const verificationSteps = extractVerificationSteps(steps)

  return {
    issues: inferIssues(steps, String(raw?.reasoning || '')),
    steps,
    verificationSteps,
    reasoning: String(raw?.reasoning || '').trim(),
  }
}

function normalizeSteps(rawSteps: AgentPlanLike['steps']): ProjectFixStep[] {
  if (!Array.isArray(rawSteps)) return []

  const steps: ProjectFixStep[] = []

  for (const [index, step] of rawSteps.entries()) {
    const command = String(step?.input?.command || '').trim()
    if (!command) continue

    steps.push({
      id: String(step?.stepId || step?.id || `step_${index + 1}`),
      command,
      risk: normalizeRisk(step?.risk),
      description: String(step?.description || '').trim() || undefined,
    })
  }

  return steps
}

function normalizeRisk(risk: unknown): ProjectFixStep['risk'] {
  if (risk === 'high-impact') return 'high-impact'
  if (risk === 'inspect' || risk === 'read') return 'inspect'
  return 'safe-write'
}

function extractVerificationSteps(steps: ProjectFixStep[]): ProjectFixStep[] {
  return steps.filter((step) => {
    const text = `${step.description || ''} ${step.command}`.toLowerCase()
    return /\b(verify|verification|smoke|health check|confirm|re-run|rerun)\b/.test(text)
  })
}

function inferIssues(steps: ProjectFixStep[], reasoning: string): ProjectFixIssue[] {
  const issues: ProjectFixIssue[] = []
  const seen = new Set<ProjectFixIssueKind>()

  for (const step of steps) {
    const text = `${step.description || ''} ${step.command}`.toLowerCase()

    if (!seen.has('missing-dependency') && /\b(npm (install|ci)|pnpm install|yarn install|add dependency)\b/.test(text)) {
      issues.push({
        kind: 'missing-dependency',
        summary: 'Dependencies appear to be missing or incomplete.',
        evidence: step.description || step.command,
        proposedFixes: [step.command],
        verificationCommand: 'npm run build',
      })
      seen.add('missing-dependency')
      continue
    }

    if (
      !seen.has('port-conflict') &&
      /\b(lsof|kill\b|fuser\b|port\b|eaddrinuse|address already in use)\b/.test(text)
    ) {
      issues.push({
        kind: 'port-conflict',
        summary: 'A local port conflict is likely blocking startup.',
        evidence: step.description || step.command,
        proposedFixes: [step.command],
      })
      seen.add('port-conflict')
      continue
    }

    if (
      !seen.has('build-config') &&
      /\b(tsconfig|vite|webpack|next|build|compile|config)\b/.test(text)
    ) {
      issues.push({
        kind: 'build-config',
        summary: 'A build or config issue is likely preventing the workspace from running cleanly.',
        evidence: step.description || step.command,
        proposedFixes: [step.command],
        verificationCommand: 'npm run build',
      })
      seen.add('build-config')
    }
  }

  if (issues.length === 0 && reasoning.trim()) {
    issues.push({
      kind: 'build-config',
      summary: 'The workspace needs repair, but the issue was not classified precisely.',
      evidence: reasoning.trim(),
      proposedFixes: steps.slice(0, 3).map((step) => step.command),
      verificationCommand: 'npm run build',
    })
  }

  return issues
}

function gatePlanSteps(
  plan: ProjectFixPlan,
  evaluatePolicy: PolicyGateFn
): { ok: true; steps: ProjectFixStep[] } | { ok: false; reason: string } {
  const executableSteps: ProjectFixStep[] = []

  for (const step of plan.steps) {
    const gate = evaluatePolicy(step)

    if (!gate.ok) {
      if (step.risk === 'high-impact' || gate.requiresConfirmation) {
        return { ok: false, reason: gate.message || `Blocked step: ${step.command}` }
      }
      continue
    }

    executableSteps.push(step)
  }

  if (executableSteps.length === 0) {
    return { ok: false, reason: 'No safe executable steps were available for this repair.' }
  }

  return { ok: true, steps: executableSteps }
}

function buildPendingVerification(plan: ProjectFixPlan): VerificationResult {
  const checks = dedupeCommands([
    ...plan.issues
      .map((issue) => issue.verificationCommand)
      .filter((command): command is string => Boolean(command && command.trim())),
    ...plan.verificationSteps.map((step) => step.command),
  ])

  return {
    status: 'pending',
    message:
      checks.length > 0
        ? 'Verification is included in the execution plan and will complete in the same streamed run.'
        : 'Verification will fall back to the safest detected build check during execution review.',
    checks,
  }
}

function buildPlanExplanation(plan: ProjectFixPlan, executableSteps: ProjectFixStep[]): string {
  const issueLines = plan.issues.length
    ? plan.issues.map((issue) => `- ${issue.summary}`).join('\n')
    : '- No explicit issues were classified.'

  const stepLines = executableSteps.length
    ? executableSteps.map((step) => `- ${step.command}`).join('\n')
    : '- No safe steps are ready to run.'

  return [
    'I found the following issues:',
    issueLines,
    '',
    'I am ready to run these repair steps:',
    stepLines,
    '',
    'Verification will run through the same proof-backed execution flow.',
  ].join('\n')
}

function failResult(plan: ProjectFixPlan, reason: string): FixProjectResult {
  return {
    success: false,
    plan,
    executableSteps: [],
    verification: {
      status: 'failed',
      message: reason,
      checks: [],
    },
    explanation: `Fix halted: ${reason}`,
    haltReason: reason,
  }
}

function dedupeCommands(commands: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []

  for (const command of commands) {
    const normalized = command.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    output.push(normalized)
  }

  return output
}
import type { FixProjectFlowDeps } from '../startup/runtimeTypes.js'
