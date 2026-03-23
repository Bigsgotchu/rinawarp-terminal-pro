import { clear, el, mount } from '../dom.js'
import type {
  AgentEmptyCardViewModel,
  AgentHeroViewModel,
  InlineRunViewModel,
} from '../view-models/agentThreadModel.js'
import type { StarterPromptViewModel } from '../view-models/suggestedActionsViewModel.js'

function renderActionButton(action: { label: string; className: string; dataset: Record<string, string | undefined> }): HTMLElement {
  return el('button', { class: action.className, dataset: action.dataset }, action.label)
}

export function renderStarterPromptChip(model: StarterPromptViewModel): HTMLElement {
  return el(
    'button',
    {
      class: 'rw-prompt-chip',
      ariaLabel: model.label,
      dataset: {
        agentPrompt: model.prompt,
        intentKey: model.intent,
        tierHint: model.hint,
        tierTone: model.tone,
      },
    },
    el('span', { class: 'rw-prompt-chip-label' }, model.label),
    el('span', { class: 'rw-prompt-chip-meta' }, model.hint)
  )
}

export function mountAgentHero(container: HTMLElement, model: AgentHeroViewModel): void {
  mount(
    container,
    el(
      'div',
      { class: 'rw-agent-welcome-card' },
      el('div', { class: 'rw-agent-kicker' }, 'Rina workbench'),
      el('h2', undefined, model.heading),
      el('p', undefined, model.copy),
      el(
        'div',
        { class: 'rw-agent-welcome-meta' },
        el('span', { class: 'rw-agent-welcome-pill' }, `Workspace · ${model.workspaceDisplay}`),
        el('span', { class: 'rw-agent-welcome-pill' }, `Mode · ${model.modeLabel}`),
        el('span', { class: 'rw-agent-welcome-pill' }, model.runLabel),
        model.weakWorkspace
          ? el('span', { class: 'rw-agent-welcome-pill is-warning', title: model.weakWorkspaceReason }, 'Project root not detected')
          : null
      ),
      model.actions.length
        ? el('div', { class: 'rw-inline-actions rw-agent-welcome-actions' }, ...model.actions.map(renderActionButton))
        : null
    )
  )
}

export function renderAgentCard(model: AgentEmptyCardViewModel): HTMLElement {
  return el(
    'section',
    {
      class: ['rw-agent-empty-card', model.className || ''].filter(Boolean).join(' '),
      dataset: model.sectionKey ? { agentSection: model.sectionKey } : undefined,
    },
    el('div', { class: 'rw-agent-empty-label' }, model.label),
    el('h3', { class: 'rw-agent-empty-title' }, model.title),
    el('p', { class: 'rw-agent-empty-copy' }, model.copy),
    model.actions?.length ? el('div', { class: 'rw-inline-actions' }, ...model.actions.map(renderActionButton)) : null,
    model.stats?.length
      ? el(
          'div',
          { class: 'rw-agent-empty-stats' },
          ...model.stats.map((item) =>
            el('div', { class: 'rw-stat-pill' }, el('span', undefined, item.label), el('strong', undefined, item.value))
          )
        )
      : null,
    model.prompts?.length ? el('div', { class: 'rw-agent-empty-prompts' }, ...model.prompts.map((prompt) => renderStarterPromptChip(prompt))) : null,
    model.footerCopy ? el('div', { class: 'rw-agent-empty-copy' }, model.footerCopy) : null
  )
}

export function renderInlineRunBlock(model: InlineRunViewModel): HTMLElement {
  const article = el('article', {
    class: [
      'rw-inline-runblock',
      model.status === 'running'
        ? 'is-running'
        : model.status === 'failed' || model.status === 'interrupted'
          ? 'is-attention'
          : model.banner?.tone === 'verifying'
            ? 'is-verifying'
            : 'is-complete',
    ].join(' '),
    dataset: { runId: model.id },
  })

  const topActions = el(
    'div',
    { class: 'rw-inline-runblock-actions-top' },
    ...model.topActions.map((action) => el('button', { class: action.className, dataset: action.dataset }, action.label)),
    el(
      'details',
      { class: 'rw-inline-runblock-overflow' },
      el('summary', { class: 'rw-link-btn rw-inline-runblock-more', ariaLabel: 'More run actions' }, 'More'),
      el(
        'div',
        { class: 'rw-inline-runblock-overflow-menu' },
        ...model.overflowActions.map((action) =>
          el('button', { class: 'rw-link-btn rw-inline-runblock-overflow-action', dataset: action.dataset }, action.label)
        )
      )
    )
  )

  article.appendChild(
    el(
      'div',
      { class: 'rw-inline-runblock-head' },
      el(
        'div',
        { class: 'rw-inline-runblock-left' },
        el('span', { class: `rw-status-pill rw-status-${model.status}` }, model.status.toUpperCase()),
        model.status === 'running' ? el('span', { class: 'rw-run-live-indicator' }, 'LIVE') : null,
        model.restored ? el('span', { class: 'rw-pill rw-pill-muted' }, 'RESTORED') : null
      ),
      topActions
    )
  )

  if (model.banner) {
    article.appendChild(
      el(
        'div',
        { class: ['rw-inline-runblock-banner', model.banner.tone === 'attention' ? 'is-attention' : model.banner.tone === 'verifying' ? 'is-verifying' : ''].filter(Boolean).join(' ') },
        model.banner.text
      )
    )
  }

  const meta = el('div', { class: 'rw-inline-runblock-meta' })
  meta.appendChild(el('div', { class: 'rw-inline-runblock-title' }, model.title))
  meta.appendChild(
    el(
      'div',
      { class: 'rw-inline-runblock-detail' },
      el('span', { class: 'rw-inline-label' }, 'run'),
      el('code', undefined, model.id),
      el('span', { class: 'rw-proof-pill' }, model.proofBadge),
      el('span', { class: 'rw-inline-exit' }, model.exitSummary)
    )
  )
  meta.appendChild(
    el('div', { class: 'rw-inline-runblock-detail' }, el('span', { class: 'rw-inline-label' }, 'cwd'), el('code', undefined, model.cwd))
  )
  meta.appendChild(
    el(
      'div',
      { class: 'rw-inline-runblock-detail' },
      el('span', { class: 'rw-inline-label' }, 'receipt'),
      el('code', undefined, model.receiptId)
    )
  )
  if (model.nextLabel) {
    meta.appendChild(
      el('div', { class: 'rw-inline-runblock-detail' }, el('span', { class: 'rw-inline-label' }, 'next'), el('code', undefined, model.nextLabel))
    )
  }
  article.appendChild(meta)
  article.appendChild(el('div', { class: 'rw-inline-runblock-command' }, el('code', undefined, model.command)))

  article.appendChild(
    el(
      'div',
      { class: 'rw-inline-runblock-output' },
      model.expanded && model.hasOutput
        ? el('pre', { class: 'rw-inline-runblock-tail' }, model.outputText)
        : el('div', { class: 'rw-inline-runblock-placeholder' }, model.outputPlaceholder)
    )
  )
  article.appendChild(
    el('div', { class: 'rw-inline-runblock-actions-bottom' }, ...model.bottomActions.map(renderActionButton))
  )
  return article
}

export function clearStarterPromptMount(container: HTMLElement | null): void {
  if (!container) return
  clear(container)
}
