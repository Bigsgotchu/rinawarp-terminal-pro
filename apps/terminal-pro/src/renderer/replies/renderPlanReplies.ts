import type { CapabilityPackModel, MessageBlock, WorkbenchState } from '../workbench/store.js'
import { bubbleBlock, copyBlock, replyCardBlock, replyListBlock } from './renderFragments.js'

export type FixPlanStep = {
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

export type FixPlanResponse = {
  id?: string
  reasoning?: string
  steps?: FixPlanStep[]
}

type CapabilityPromptMatch = {
  key: string
  reason: string
}

export type CapabilityDecision =
  | { state: 'ready'; pack: CapabilityPackModel; reason: string }
  | { state: 'locked'; pack: CapabilityPackModel; reason: string }
  | { state: 'install'; pack: CapabilityPackModel; reason: string }

export type PlanCapabilityRequirement = {
  key: string
  pack: CapabilityPackModel
  state: 'ready' | 'locked' | 'install'
  reasons: string[]
}

export function buildExecutionPlanContent(
  prompt: string,
  plan: FixPlanResponse,
  requirements: PlanCapabilityRequirement[] = [],
  options?: { introText?: string }
): MessageBlock[] {
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  const intro = options?.introText?.trim() || plan.reasoning?.trim() || `I mapped "${prompt}" to a receipts-backed run.`
  const stepItems = steps
    .slice(0, 6)
    .map((step, index) => {
      const title = step.stepId || `Step ${index + 1}`
      const command = String(step.input?.command || '').trim()
      return {
        title,
        code: command || undefined,
        strongTitle: true,
      }
    })

  const blocks: MessageBlock[] = [
    bubbleBlock(intro),
    replyCardBlock({
      kind: 'plan',
      label: 'Plan',
      badge: 'Receipts-backed',
      bodyBlocks: [replyListBlock(stepItems, 'No plan steps returned.')],
    }),
  ]
  const capabilityCard = buildPlanCapabilityCard(requirements)
  if (capabilityCard) blocks.push(capabilityCard)
  return blocks
}

export function resolvePromptCapability(state: WorkbenchState, prompt: string): CapabilityDecision | null {
  const match = matchPromptCapability(prompt)
  if (!match) return null
  const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
  if (!pack) return null
  if (state.license.tier === 'starter' && pack.tier !== 'starter') {
    return { state: 'locked', pack, reason: match.reason }
  }
  if (pack.installState === 'upgrade-required') {
    return { state: 'locked', pack, reason: match.reason }
  }
  if (pack.source === 'marketplace' && pack.installState === 'available') {
    return { state: 'install', pack, reason: match.reason }
  }
  return { state: 'ready', pack, reason: match.reason }
}

export function buildCapabilityDecisionContent(decision: CapabilityDecision): MessageBlock[] {
  const proofLine = decision.pack.actions[0]?.proof.join(', ') || 'run, receipt, log'
  const introText = `${decision.reason} is being routed through ${decision.pack.title}.`
  if (decision.state === 'ready') {
    const runLabel = buildCapabilityRunLabel(decision.pack.key)
    return [
      bubbleBlock(introText),
      replyCardBlock({
        kind: 'capability',
        label: 'Capability ready',
        badge: decision.pack.title,
        bodyBlocks: [copyBlock(`${decision.reason} is available in this workspace.`), copyBlock(`Proof contract: ${proofLine}`, 'muted')],
        actions: [
          { label: runLabel, capabilityRun: decision.pack.key },
          { label: 'Open Plan', agentTopTab: 'plan' },
          { label: 'Inspect capabilities', tab: 'marketplace' },
        ],
      }),
    ]
  }

  if (decision.state === 'install') {
    return [
      bubbleBlock(introText),
      replyCardBlock({
        kind: 'capability',
        label: 'Capability required',
        badge: 'Install needed',
        className: 'rw-command-result halted',
        bodyBlocks: [
          copyBlock(`${decision.reason} needs the ${decision.pack.title} pack before Rina can run it through the trusted path.`),
          copyBlock(`Expected proof: ${proofLine}`, 'muted'),
        ],
        actions: [
          { label: 'Install capability', capabilityInstall: decision.pack.key },
          { label: 'Open Marketplace', tab: 'marketplace' },
        ],
      }),
    ]
  }

  return [
    bubbleBlock(introText),
    replyCardBlock({
      kind: 'capability',
      label: 'Capability locked',
      badge: 'Upgrade required',
      className: 'rw-command-result halted',
      bodyBlocks: [
        copyBlock(`${decision.reason} is available, but this workspace needs ${decision.pack.title} on Pro before Rina can execute it.`),
        copyBlock(`Expected proof: ${proofLine}`, 'muted'),
      ],
      actions: [
        { label: 'Upgrade to Pro', planUpgrade: 'pro' },
        { label: 'Open Plan', agentTopTab: 'plan' },
      ],
    }),
  ]
}

export function resolvePlanCapabilityRequirements(state: WorkbenchState, steps: FixPlanStep[]): PlanCapabilityRequirement[] {
  const requirements = new Map<string, PlanCapabilityRequirement>()
  for (const step of steps) {
    const match = matchPlanStepCapability(step)
    if (!match) continue
    const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
    if (!pack) continue
    const nextState: PlanCapabilityRequirement['state'] =
      state.license.tier === 'starter' && pack.tier !== 'starter'
        ? 'locked'
        : pack.installState === 'upgrade-required'
          ? 'locked'
          : pack.source === 'marketplace' && pack.installState === 'available'
            ? 'install'
            : 'ready'
    const existing = requirements.get(pack.key)
    if (existing) {
      existing.reasons = [...new Set([...existing.reasons, match.reason])]
      if (existing.state === 'ready' && nextState !== 'ready') existing.state = nextState
      continue
    }
    requirements.set(pack.key, {
      key: pack.key,
      pack,
      state: nextState,
      reasons: [match.reason],
    })
  }
  return Array.from(requirements.values())
}

export function matchPromptCapability(prompt: string): { key: string; reason: string } | null {
  const normalized = prompt.toLowerCase()
  if (/\b(system diagnostics|system-diagnostics)\b/.test(normalized)) {
    return { key: 'system-diagnostics', reason: 'System diagnostics capability' }
  }
  if (/\b(cloudflare|workers|pages)\b/.test(normalized)) {
    return { key: 'deploy:cloudflare', reason: 'Cloudflare deploy capability' }
  }
  if (/\b(android|adb)\b/.test(normalized)) {
    return { key: 'device:android:scan', reason: 'Android scan capability' }
  }
  if (/\b(ios|iphone|ipad)\b/.test(normalized)) {
    return { key: 'device:ios:scan', reason: 'iOS scan capability' }
  }
  if (/\b(system doctor|fix my computer|scan my computer|slow laptop|port conflict|disk space|diagnose my computer)\b/.test(normalized)) {
    return { key: 'system:doctor', reason: 'System Doctor capability' }
  }
  if (/\b(repo audit|workspace audit|inspect repo|scan repo|repository audit)\b/.test(normalized)) {
    return { key: 'workspace:repo-audit', reason: 'Workspace Repo Audit capability' }
  }
  if (/\b(security audit|dependency audit|audit dependencies|scan dependencies|secret scan)\b/.test(normalized)) {
    return { key: 'security:dependency-audit', reason: 'Dependency Security Audit capability' }
  }
  return null
}

function matchPlanStepCapability(step: FixPlanStep): CapabilityPromptMatch | null {
  const tool = String(step.tool || '').toLowerCase()
  const command = String(step.input?.command || '').toLowerCase()
  const combined = `${tool} ${command}`
  if (/\b(cloudflare|wrangler|workers|pages)\b/.test(combined)) {
    return { key: 'deploy:cloudflare', reason: 'Cloudflare deploy capability' }
  }
  if (/\b(android|adb)\b/.test(combined)) {
    return { key: 'device:android:scan', reason: 'Android scan capability' }
  }
  if (/\b(ios|xcrun|instruments|simctl|iphone|ipad)\b/.test(combined)) {
    return { key: 'device:ios:scan', reason: 'iOS scan capability' }
  }
  if (/\bdoctor\b/.test(combined) || tool.startsWith('doctor.')) {
    return { key: 'system:doctor', reason: 'System Doctor capability' }
  }
  if (/\bworkspace\.repo\.audit\b/.test(combined) || /\brepo audit\b/.test(combined)) {
    return { key: 'workspace:repo-audit', reason: 'Workspace Repo Audit capability' }
  }
  if (/\bsecurity\.dependency\.audit\b/.test(combined) || /\baudit\b/.test(combined)) {
    return { key: 'security:dependency-audit', reason: 'Dependency Security Audit capability' }
  }
  return null
}

function buildPlanCapabilityCard(requirements: PlanCapabilityRequirement[]): MessageBlock | null {
  if (requirements.length === 0) return null
  const items = requirements
    .map((requirement) => {
      const proofLine = requirement.pack.actions[0]?.proof.join(', ') || 'run, receipt, log'
      const stateLabel =
        requirement.state === 'ready' ? 'Ready' : requirement.state === 'install' ? 'Install needed' : 'Upgrade required'
      return {
        title: requirement.pack.title,
        badge: stateLabel,
        text: requirement.reasons.join(', '),
        code: `Proof: ${proofLine}`,
      }
    })
  const blocked = requirements.find((requirement) => requirement.state !== 'ready')
  const actions = blocked
    ? blocked.state === 'locked'
      ? [
          { label: 'Upgrade to Pro', planUpgrade: 'pro' },
          { label: 'Open Plan', agentTopTab: 'plan' },
        ]
      : [
          { label: 'Install capability', capabilityInstall: blocked.pack.key },
          { label: 'Open Marketplace', tab: 'marketplace' },
        ]
    : undefined
  return replyCardBlock({
    kind: 'capability',
    label: 'Capabilities',
    badge: blocked ? 'Required before run start' : 'Ready',
    className: blocked ? 'rw-command-result halted' : undefined,
    bodyBlocks: [replyListBlock(items)],
    actions,
  })
}

function buildCapabilityRunLabel(packKey: string): string {
  if (packKey === 'system:doctor') return 'Run diagnostics'
  if (packKey === 'deploy:cloudflare') return 'Run deploy preflight'
  if (packKey === 'device:android:scan') return 'Run device scan'
  if (packKey === 'device:ios:scan') return 'Run device scan'
  if (packKey === 'workspace:repo-audit') return 'Inspect repository'
  if (packKey === 'security:dependency-audit') return 'Run security audit'
  if (packKey === 'device:ios:scan') return 'Run device scan'
  if (packKey === 'system-diagnostics') return 'Run diagnostics'
  return 'Run capability check'
}
