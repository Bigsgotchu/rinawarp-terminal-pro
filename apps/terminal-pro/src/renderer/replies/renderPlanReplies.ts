import type { CapabilityPackModel, MessageBlock, ReplyAction, WorkbenchState } from '../workbench/store.js'
import { bubbleBlock, copyBlock, replyCardBlock, replyListBlock } from './renderFragments.js'
import {
  buildCapabilityDecisionModel,
  buildCapabilityRunActions,
  buildPlanCapabilityCardModel,
} from './capabilityReplyModel.js'

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

type BuildExecutionPlanOptions = {
  introText?: string
  reviewOnly?: boolean
  planActionPrompt?: string
  workspaceRoot?: string
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
  options?: BuildExecutionPlanOptions
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
      badge: options?.reviewOnly ? 'Review only' : undefined,
      bodyBlocks: [replyListBlock(stepItems, 'No plan steps returned.')],
      actions:
        options?.reviewOnly && steps.length > 0 && options.workspaceRoot
          ? [
              {
                label: 'Run plan',
                executePlan: encodeExecutionPlan(steps),
                executePlanPrompt: options.planActionPrompt || prompt,
                executePlanWorkspaceRoot: options.workspaceRoot,
              },
              { label: 'Open Code', tab: 'code' },
            ]
          : undefined,
    }),
  ]
  const capabilityCard = buildPlanCapabilityCard(requirements)
  if (capabilityCard) blocks.push(capabilityCard)
  return blocks
}

function encodeExecutionPlan(steps: FixPlanStep[]): string {
  return JSON.stringify(
    steps.map((step, index) => ({
      stepId: step.stepId || `step_${index + 1}`,
      tool: step.tool || 'terminal',
      input: {
        command: String(step.input?.command || ''),
        cwd: step.input?.cwd,
        timeoutMs: step.input?.timeoutMs,
      },
      risk: step.risk,
      risk_level: step.risk_level,
      requires_confirmation: step.requires_confirmation,
    }))
  )
}

export function resolvePromptCapability(state: WorkbenchState, prompt: string): CapabilityDecision | null {
  const match = matchPromptCapability(prompt)
  if (!match) return null
  const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
  if (!pack) return null
  const isFreeTier = state.license.tier === 'free' || state.license.tier === 'starter'
  if (isFreeTier && pack.tier !== 'starter') {
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
  const model = buildCapabilityDecisionModel(decision)
  return [
    bubbleBlock(model.introText),
    replyCardBlock({
      kind: 'capability',
      label: model.label,
      badge: model.badge,
      className: model.className,
      bodyBlocks: [...model.bodyLines.map((line) => copyBlock(line)), copyBlock(`${decision.state === 'ready' ? 'Proof contract' : 'Expected proof'}: ${model.proofLine}`, 'muted')],
      actions: model.actions,
    }),
  ]
}

export function resolvePlanCapabilityRequirements(state: WorkbenchState, steps: FixPlanStep[]): PlanCapabilityRequirement[] {
  const requirements = new Map<string, PlanCapabilityRequirement>()
  const isFreeTier = state.license.tier === 'free' || state.license.tier === 'starter'
  for (const step of steps) {
    const match = matchPlanStepCapability(step)
    if (!match) continue
    const pack = state.capabilities.packs.find((entry) => entry.key === match.key)
    if (!pack) continue
    const nextState: PlanCapabilityRequirement['state'] =
      isFreeTier && pack.tier !== 'starter'
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
  if (/\bvercel\b/.test(normalized)) {
    return { key: 'deploy:vercel', reason: 'Vercel deploy capability' }
  }
  if (/\bnetlify\b/.test(normalized)) {
    return { key: 'deploy:netlify', reason: 'Netlify deploy capability' }
  }
  if (/\b(docker|container|compose)\b/.test(normalized)) {
    return { key: 'deploy:docker', reason: 'Docker deploy capability' }
  }
  if (/\b(vps|ssh deploy|server deploy|virtual private server)\b/.test(normalized)) {
    return { key: 'deploy:vps', reason: 'VPS deploy capability' }
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
  if (/\bvercel\b/.test(combined)) {
    return { key: 'deploy:vercel', reason: 'Vercel deploy capability' }
  }
  if (/\bnetlify\b/.test(combined)) {
    return { key: 'deploy:netlify', reason: 'Netlify deploy capability' }
  }
  if (/\b(docker|compose)\b/.test(combined)) {
    return { key: 'deploy:docker', reason: 'Docker deploy capability' }
  }
  if (/\b(ssh|scp|rsync|pm2|systemctl|vps)\b/.test(combined)) {
    return { key: 'deploy:vps', reason: 'VPS deploy capability' }
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
  const model = buildPlanCapabilityCardModel(requirements)
  if (!model) return null
  return replyCardBlock({
    kind: 'capability',
    label: 'Capabilities',
    badge: model.badge,
    className: model.className,
    bodyBlocks: [replyListBlock(model.items)],
    actions: model.actions,
  })
}
