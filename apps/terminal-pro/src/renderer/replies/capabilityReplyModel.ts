import type { CapabilityPackModel, ReplyAction, ReplyListItem } from '../workbench/store.js'
import type { CapabilityDecision, PlanCapabilityRequirement } from './renderPlanReplies.js'

export type CapabilityDecisionModel = {
  introText: string
  label: string
  badge: string
  className?: string
  bodyLines: string[]
  proofLine: string
  actions: ReplyAction[]
}

export type PlanCapabilityCardModel = {
  badge: string
  className?: string
  items: ReplyListItem[]
  actions?: ReplyAction[]
}

export function buildCapabilityRunLabel(packKey: string): string {
  if (packKey === 'system:doctor') return 'Run diagnostics'
  if (packKey === 'deploy:cloudflare') return 'Run deploy preflight'
  if (packKey === 'deploy:vercel') return 'Run deploy preflight'
  if (packKey === 'deploy:netlify') return 'Run deploy preflight'
  if (packKey === 'deploy:docker') return 'Run deploy preflight'
  if (packKey === 'deploy:vps') return 'Run deploy preflight'
  if (packKey === 'device:android:scan') return 'Run device scan'
  if (packKey === 'device:ios:scan') return 'Run device scan'
  if (packKey === 'workspace:repo-audit') return 'Inspect repository'
  if (packKey === 'security:dependency-audit') return 'Run security audit'
  if (packKey === 'system-diagnostics') return 'Run diagnostics'
  return 'Run capability check'
}

export function buildCapabilityRunActions(pack: CapabilityPackModel): ReplyAction[] {
  if (pack.category !== 'deploy') {
    return [{ label: buildCapabilityRunLabel(pack.key), capabilityRun: pack.key, capabilityActionId: pack.actions[0]?.id }]
  }

  const preferredOrder = ['plan', 'deploy', 'verify', 'rollback']
  return preferredOrder
    .map((actionId) => pack.actions.find((action) => action.id === actionId))
    .filter(Boolean)
    .map((action) => ({
      label:
        action!.id === 'plan'
          ? 'Plan deploy'
          : action!.id === 'deploy'
            ? 'Deploy'
            : action!.id === 'verify'
              ? 'Verify'
              : 'Check rollback',
      capabilityRun: action!.id === 'plan' ? pack.key : `${pack.key}|${action!.id}`,
      capabilityActionId: action!.id,
      className: action!.id === 'deploy' ? 'is-primary' : action!.id === 'verify' ? 'is-secondary' : 'is-subtle',
    }))
}

export function buildCapabilityDecisionModel(decision: CapabilityDecision): CapabilityDecisionModel {
  const proofLine = decision.pack.actions[0]?.proof.join(', ') || 'run, receipt, log'
  const introText = `${decision.reason} is being routed through ${decision.pack.title}.`

  if (decision.state === 'ready') {
    return {
      introText,
      label: 'Capability ready',
      badge: decision.pack.title,
      bodyLines: [`${decision.reason} is available in this workspace.`],
      proofLine,
      actions: [...buildCapabilityRunActions(decision.pack), { label: 'Open Plan', agentTopTab: 'plan' }, { label: 'Inspect capabilities', tab: 'marketplace' }],
    }
  }

  if (decision.state === 'install') {
    return {
      introText,
      label: 'Capability required',
      badge: 'Install needed',
      className: 'rw-command-result halted',
      bodyLines: [`${decision.reason} needs the ${decision.pack.title} pack before Rina can run it through the trusted path.`],
      proofLine,
      actions: [
        { label: 'Install capability', capabilityInstall: decision.pack.key },
        { label: 'Open Marketplace', tab: 'marketplace' },
      ],
    }
  }

  return {
    introText,
    label: 'Capability locked',
    badge: 'Upgrade required',
    className: 'rw-command-result halted',
    bodyLines: [`${decision.reason} is available, but this workspace needs ${decision.pack.title} on Pro before Rina can execute it.`],
    proofLine,
    actions: [
      { label: 'Upgrade to Pro', planUpgrade: 'pro' },
      { label: 'Open Plan', agentTopTab: 'plan' },
    ],
  }
}

export function buildPlanCapabilityCardModel(requirements: PlanCapabilityRequirement[]): PlanCapabilityCardModel | null {
  if (requirements.length === 0) return null
  const items = requirements.map((requirement) => {
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

  return {
    badge: blocked ? 'Required before run start' : 'Ready',
    className: blocked ? 'rw-command-result halted' : undefined,
    items,
    actions,
  }
}
