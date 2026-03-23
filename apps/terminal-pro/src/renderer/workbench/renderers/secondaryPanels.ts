import type { WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'
import { formatAnalyticsDate } from './format.js'
import { getTruthHudState, getWorkspaceContextState } from './selectors.js'

export type StatusBarModel = {
  modeText: string
  workspaceText: string
  workspaceTitle: string
  workspacePickerText: string
  workspacePickerTitle: string
  workspacePickerWeak: boolean
  activityText: string
  summaryText: string
}

function humanizeRunStatus(status: string | null): string {
  if (!status) return 'Unverified'
  return status
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getStatusBarModel(state: WorkbenchState): StatusBarModel {
  const hudState = getTruthHudState(state)
  const workspaceState = getWorkspaceContextState(state)
  const mode = hudState.mode || 'assist'
  const lastRunStatus = humanizeRunStatus(hudState.lastRunStatus)
  const recoveryText = hudState.recoveryReadyCount > 0 ? `${hudState.recoveryReadyCount} items restored` : 'No recovery'
  const workspacePickerText =
    workspaceState.status === 'missing'
      ? 'Choose workspace'
      : workspaceState.status === 'weak'
        ? `Workspace may be wrong: ${workspaceState.displayValue}`
        : `Workspace: ${workspaceState.displayValue}`

  let summaryText: string
  if (workspaceState.status !== 'project') summaryText = 'Choose a project folder to give Rina stronger context'
  else if (state.ui.statusSummaryText && state.ui.statusSummaryText.trim() && state.ui.statusSummaryText.trim().toLowerCase() !== 'ready') {
    summaryText = state.ui.statusSummaryText
  }
  else if (state.thinking.active && state.thinking.message) summaryText = state.thinking.message
  else summaryText = 'Rina is ready to work in this project.'

  return {
    modeText: `Mode: ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`,
    workspaceText: `Workspace: ${workspaceState.displayValue}`,
    workspaceTitle: workspaceState.title,
    workspacePickerText,
    workspacePickerTitle: workspaceState.title,
    workspacePickerWeak: workspaceState.status !== 'project',
    activityText: `Last run: ${lastRunStatus} • Recovery: ${recoveryText}`,
    summaryText,
  }
}

function buildEmptyState(title: string, copy: string): HTMLElement {
  return el(
    'div',
    { class: 'rw-empty-state' },
    el('div', { class: 'rw-empty-title' }, title),
    el('div', { class: 'rw-empty-copy' }, copy)
  )
}

export function renderMarketplace(state: WorkbenchState): void {
  const root = document.getElementById('marketplace-output')
  if (!root) return

  if (state.marketplace.loading && state.marketplace.agents.length === 0) {
    mount(root, buildEmptyState('Loading marketplace', 'Fetching available agents and lock states…'))
    return
  }

  if (state.marketplace.error) {
    mount(root, buildEmptyState('Marketplace unavailable', state.marketplace.error))
    return
  }

  if (state.marketplace.agents.length === 0) {
    mount(root, buildEmptyState('No agents published yet', 'Publish or sync marketplace agents to see them here.'))
    return
  }

  const isStarter = state.license.tier === 'starter'
  const agents = state.marketplace.agents
  const capabilityMap = new Map(state.capabilities.packs.map((pack) => [pack.key, pack]))
  const installedCount = agents.filter((agent) => state.marketplace.installed.includes(agent.name)).length
  const lockedCount = agents.filter((agent) => Number(agent.price || 0) > 0 && isStarter && !state.marketplace.installed.includes(agent.name)).length
  const availableCount = agents.length - installedCount - lockedCount
  const summary = el(
    'section',
    { class: 'rw-market-summary' },
    el(
      'div',
      { class: 'rw-market-summary-copy' },
      el('div', { class: 'rw-market-summary-title' }, 'Capability packs extend what Rina can do in the thread.'),
      el(
        'div',
        { class: 'rw-market-summary-text' },
        'Install or unlock a pack here, then come back to Agent to run it through the trusted path with proof attached.'
      )
    ),
    el(
      'div',
      { class: 'rw-market-summary-stats' },
      el('span', { class: 'rw-market-summary-pill' }, `Ready ${installedCount}`),
      el('span', { class: 'rw-market-summary-pill' }, `Available ${availableCount}`),
      el('span', { class: 'rw-market-summary-pill' }, `Locked ${lockedCount}`)
    )
  )

  const list = el('section', { class: 'rw-market-list' })
  for (const agent of agents) {
    const capabilityPack = capabilityMap.get(agent.name)
    const premium = Number(agent.price || 0) > 0
    const installed = state.marketplace.installed.includes(agent.name)
    const locked = premium && isStarter && !installed
    const badge = installed ? 'Ready in thread' : locked ? 'Upgrade required' : premium ? 'Paid pack' : 'Installable now'
    const actionLabel = installed ? 'Installed' : locked ? 'Upgrade to Pro' : 'Install'
    const commandCount = Array.isArray(agent.commands) ? agent.commands.length : 0
    const statusLabel = installed ? 'Ready' : locked ? 'Locked' : 'Available'
    const proofLabel = installed ? 'Proof ready in thread' : locked ? 'Unlock to run with proof' : 'Install to run with proof'
    const permissionLabel = capabilityPack?.permissions?.length ? capabilityPack.permissions.join(', ') : 'read-only'
    const proofKinds = capabilityPack?.actions?.[0]?.proof?.join(', ') || 'run, receipt, log'
    const categoryLabel = capabilityPack?.category || (premium ? 'marketplace' : 'workspace')
    const installCopy = installed
      ? 'Installed locally and ready to route back through the Agent thread.'
      : locked
        ? 'This pack is real, but the trusted run path stays locked until Pro is active.'
        : 'Install it here, then run it from Agent with the same proof rules as everything else.'

    list.appendChild(
      el(
        'article',
        { class: 'rw-market-card', dataset: { agentName: agent.name } },
        el(
          'div',
          { class: 'rw-market-head' },
          el(
            'div',
            { class: 'rw-market-head-copy' },
            el('div', { class: 'rw-market-title' }, agent.name),
            el('div', { class: 'rw-market-subtitle' }, `by ${agent.author || 'unknown'} · v${agent.version || '1.0.0'}`)
          ),
          el('div', { class: `rw-market-badge ${installed ? 'ready' : locked ? 'locked' : premium ? 'premium' : 'free'}` }, badge)
        ),
        el('div', { class: 'rw-market-copy' }, agent.description || 'No description provided.'),
        el('div', { class: 'rw-market-copy' }, installCopy),
        el(
          'div',
          { class: 'rw-market-meta' },
          el('span', undefined, statusLabel),
          el('span', undefined, `Category ${categoryLabel}`),
          el('span', undefined, `${commandCount} workflow${commandCount === 1 ? '' : 's'}`),
          el('span', undefined, proofLabel),
          el('span', undefined, `Proof ${proofKinds}`),
          el('span', undefined, `Permissions ${permissionLabel}`),
          el('span', undefined, `${String(agent.downloads || 0)} downloads`)
        ),
        el(
          'div',
          { class: 'rw-market-actions' },
          el(
            'button',
            { class: `fix-btn ${locked ? '' : 'primary'}`.trim(), dataset: { marketInstall: agent.name }, disabled: installed },
            actionLabel
          )
        )
      )
    )
  }

  mount(root, el('div', undefined, summary, list))
}

export function renderCode(state: WorkbenchState): void {
  const root = document.getElementById('workspace-files')
  if (!root) return
  if (state.code.files.length === 0) {
    mount(root, buildEmptyState('No workspace files loaded', 'Open a workspace and RinaWarp will show the files it is using for context.'))
    return
  }
  const list = el('div')
  for (const file of state.code.files) {
    list.appendChild(el('div', { class: 'code-file' }, file))
  }
  mount(root, list)
}

export function renderDiagnostics(state: WorkbenchState): void {
  const root = document.getElementById('diagnostics-output')
  if (!root) return
  const row = (label: string, value: string) =>
    el(
      'div',
      { class: 'stat-item' },
      el('span', { class: 'stat-label' }, `${label}:`),
      el('span', { class: 'stat-value' }, value)
    )

  const shell = el(
    'div',
    undefined,
    row('Mode', state.diagnostics.mode || 'unknown'),
    row('Tools', String(state.diagnostics.toolsCount)),
    row('Agent Running', state.diagnostics.agentRunning ? 'Yes' : 'No'),
    row('Conversations', String(state.diagnostics.conversationCount)),
    row('Learned Commands', String(state.diagnostics.learnedCommandsCount)),
    el('div', { class: 'rw-diagnostics-divider' }, 'Trust signals (current workspace)'),
    row('Starter intents', String(state.analytics.starterIntentCount)),
    row('Inspector opens', String(state.analytics.inspectorOpenCount)),
    row('Output expands', String(state.analytics.runOutputExpandCount)),
    row('Proof-backed runs', String(state.analytics.proofBackedRunCount)),
    row('Last starter', state.analytics.lastStarterIntent || 'none'),
    row('First starter at', formatAnalyticsDate(state.analytics.firstStarterIntentAt)),
    row('Last inspector', state.analytics.lastInspector || 'none'),
    row('First proof at', formatAnalyticsDate(state.analytics.firstProofBackedRunAt)),
    el('div', { class: 'rw-diagnostics-divider' }, 'Deploy state'),
    row('Deploy target', state.deployment.target || 'none'),
    row('Detected target', state.deployment.detectedTarget || 'none'),
    row('Detected signals', state.deployment.detectedSignals.join(', ') || 'none'),
    row('Recommended pack', state.deployment.recommendedPackKey || 'none'),
    row('Target identity', state.deployment.targetIdentity || 'none'),
    row('Identity source', state.deployment.targetIdentitySource),
    row('Deploy status', state.deployment.status),
    row('Verification', state.deployment.verification),
    row('Rollback', state.deployment.rollback),
    row('Deploy source', state.deployment.source),
    row('Latest deploy run', state.deployment.latestRunId || 'none'),
    row('Latest receipt', state.deployment.latestReceiptId || 'none'),
    row('Target URL', state.deployment.targetUrl || 'none'),
    row('Artifact', state.deployment.artifact || 'none'),
    row('Build ID', state.deployment.buildId || 'none'),
    row('Verification evidence', state.deployment.verificationEvidence.join(', ') || 'none'),
    row('Rollback evidence', state.deployment.rollbackEvidence.join(', ') || 'none'),
    el(
      'div',
      { class: 'rw-inline-actions' },
      el('button', { class: 'rw-inline-action', dataset: { copyTrustSnapshot: '' } }, 'Copy workspace trust snapshot')
    )
  )
  mount(root, shell)
}

export function renderBrain(state: WorkbenchState): void {
  const statsRoot = document.getElementById('brain-stats')
  const vizRoot = document.getElementById('brain-visualization')
  if (statsRoot) {
    const stats = state.brain.stats
    const statsShell = el('div')
    if (stats) {
      for (const [valueClass, value, label] of [
        ['text-teal', String(stats.total), 'Total'],
        ['text-hot-pink', String(stats.intent), 'Intent'],
        ['text-coral', String(stats.planning), 'Planning'],
        ['text-babyblue', String(stats.tool), 'Tools'],
        ['text-purple', String(stats.memory), 'Memory'],
        ['text-green', String(stats.result), 'Results'],
      ] as const) {
        statsShell.appendChild(
          el(
            'div',
            { class: 'brain-stat' },
            el('div', { class: `brain-stat-value ${valueClass}` }, value),
            el('div', { class: 'brain-stat-label' }, label)
          )
        )
      }
    }
    mount(statsRoot, statsShell)
  }
  if (vizRoot) {
    const vizShell = el('div')
    for (const event of state.brain.events) {
      const step = el(
        'div',
        { class: 'brain-step' },
        el('div', { class: 'brain-label' }, event.type.toUpperCase()),
        el('div', { class: 'brain-text' }, event.message)
      )
      if (event.progress !== undefined) {
        step.appendChild(
          el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill' }, ''))
        )
        const fill = step.querySelector<HTMLElement>('.progress-fill')
        if (fill) fill.style.width = `${event.progress}%`
      }
      vizShell.appendChild(
        el(
          'div',
          { class: 'brain-flow-wrapper' },
          el(
            'div',
            { class: 'brain-flow' },
            el('div', { class: `brain-icon ${event.type}` }, '•'),
            step
          )
        )
      )
    }
    mount(vizRoot, vizShell)
  }
}

export function renderStatus(state: WorkbenchState): void {
  const model = getStatusBarModel(state)
  const autonomyChip = document.getElementById('autonomy-status')
  if (autonomyChip) autonomyChip.textContent = `Autonomy: ${state.runtime.autonomyEnabled ? state.runtime.autonomyLevel.toUpperCase() : 'OFF'}`

  const modeBar = document.getElementById('mode-status-bar')
  if (modeBar) modeBar.textContent = model.modeText

  const autonomyDot = document.getElementById('autonomy-dot')
  if (autonomyDot) autonomyDot.classList.toggle('disconnected', !state.runtime.autonomyEnabled)

  const modeRight = document.getElementById('status-right')
  if (modeRight) modeRight.textContent = `Mode: ${state.runtime.mode || 'explain'}`

  const workspace = document.getElementById('workspace-status')
  if (workspace) {
    workspace.textContent = model.workspaceText
    workspace.setAttribute('title', model.workspaceTitle)
  }

  const workspacePicker = document.getElementById('workspace-picker')
  if (workspacePicker) {
    workspacePicker.textContent = model.workspacePickerText
    workspacePicker.setAttribute('title', model.workspacePickerTitle)
    workspacePicker.classList.toggle('is-weak', model.workspacePickerWeak)
  }

  const activityStatus = document.getElementById('activity-status')
  if (activityStatus) activityStatus.textContent = model.activityText

  const summary = document.getElementById('status-summary')
  if (summary) summary.textContent = model.summaryText
}
