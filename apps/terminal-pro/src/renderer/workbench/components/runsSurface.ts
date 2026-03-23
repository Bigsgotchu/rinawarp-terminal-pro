import { el, mount } from '../dom.js'
import type { RunsDeploymentModel, RunsRunModel, RunsSummaryModel, RunsToolbarModel } from '../view-models/runsPanelModel.js'
import type { RunArtifactSummary } from '../store.js'
import { renderProofEmptyState, renderProofHero, renderProofKeyValueGrid, renderProofSection } from './proofSurface.js'

function actionButton(action: { label: string; className?: string; disabled?: boolean; dataset: Record<string, string | undefined> }): HTMLElement {
  return el('button', { class: action.className || 'rw-link-btn', disabled: action.disabled, dataset: action.dataset }, action.label)
}

export function renderRunsEmptyState(title: string, copy: string, extra?: HTMLElement): HTMLElement {
  const empty = renderProofEmptyState(title, copy, extra)
  empty.classList.add('rw-proof-empty-state')
  return empty
}

export function renderRunsToolbar(model: RunsToolbarModel): HTMLElement {
  return el(
    'div',
    { class: 'rw-runs-toolbar rw-runs-toolbar' },
    el('button', { class: 'rw-link-btn', dataset: { toggleRunsScope: '' } }, model.scopeLabel),
    el('button', { class: 'rw-link-btn', dataset: { toggleRunsVisibility: '' } }, model.visibilityLabel)
  )
}

export function renderRunsSummary(stateLabel: string, model: RunsSummaryModel): HTMLElement {
  const summary = el(
    'div',
    { class: 'rw-runs-summary rw-runs-summary' },
    renderRunsToolbar(model.toolbar)
  )
  summary.appendChild(el('div', { class: 'rw-runs-summary-copy' }, `Showing ${model.visibleCount} run${model.visibleCount === 1 ? '' : 's'} for ${stateLabel}.`))
  if (model.hiddenWorkspaceCount) summary.appendChild(el('div', { class: 'rw-runs-summary-copy' }, `Hidden ${model.hiddenWorkspaceCount} run${model.hiddenWorkspaceCount === 1 ? '' : 's'} from other workspaces.`))
  if (model.hiddenNoiseCount) summary.appendChild(el('div', { class: 'rw-runs-summary-copy' }, `Hidden ${model.hiddenNoiseCount} session activity item${model.hiddenNoiseCount === 1 ? '' : 's'} with 0 commands.`))
  if (model.hiddenOverflowCount) summary.appendChild(el('div', { class: 'rw-runs-summary-copy' }, `Hidden ${model.hiddenOverflowCount} older run${model.hiddenOverflowCount === 1 ? '' : 's'} from the current view.`))
  return summary
}

export function renderDeploymentSummary(model: RunsDeploymentModel): HTMLElement | null {
  if (!model) return null
  return el(
    'section',
    { class: 'rw-runs-summary rw-runs-summary' },
    renderProofHero({
      kicker: 'Canonical deploy state',
      title: 'Deploy proof',
      copy: model.summary,
    }),
    el('div', { class: 'rw-run-section-body rw-run-section-grid' }, ...model.rows.map((row) => el('div', undefined, el('span', { class: 'rw-run-command-label' }, row.label), el('code', undefined, row.value)))),
    el('div', { class: 'rw-run-actions' }, ...model.actions.map((action) => el('button', { class: 'rw-link-btn rw-run-action', dataset: action.dataset }, action.label)))
  )
}

function renderArtifactSummary(summary: RunArtifactSummary | null): HTMLElement {
  if (!summary) {
    return el('div', { class: 'rw-run-section-placeholder' }, 'No artifact summary loaded yet. Use the Artifacts action to inspect stored receipt data.')
  }
  const metric = (label: string, value: string) => el('div', undefined, el('span', { class: 'rw-run-command-label' }, label), el('code', undefined, value))
  return el(
    'div',
    { class: 'rw-run-section-grid' },
    metric('Stdout chunks', String(summary.stdoutChunks)),
    metric('Stderr chunks', String(summary.stderrChunks)),
    metric('Meta chunks', String(summary.metaChunks)),
    summary.changedFiles.length ? el('div', { class: 'rw-run-command-label' }, 'Changed files') : null,
    summary.changedFiles.length ? el('pre', { class: 'rw-run-output-tail' }, summary.changedFiles.join('\n')) : null,
    summary.diffHints.length ? el('div', { class: 'rw-run-command-label' }, 'Diff hints') : null,
    summary.diffHints.length ? el('pre', { class: 'rw-run-output-tail' }, summary.diffHints.join('\n')) : null,
    summary.stdoutPreview ? el('div', { class: 'rw-run-command-label' }, 'Stdout preview') : null,
    summary.stdoutPreview ? el('pre', { class: 'rw-run-output-tail' }, summary.stdoutPreview) : null,
    summary.stderrPreview ? el('div', { class: 'rw-run-command-label' }, 'Stderr preview') : null,
    summary.stderrPreview ? el('pre', { class: 'rw-run-output-tail' }, summary.stderrPreview) : null,
    summary.metaPreview ? el('div', { class: 'rw-run-command-label' }, 'Meta preview') : null,
    summary.metaPreview ? el('pre', { class: 'rw-run-output-tail' }, summary.metaPreview) : null
  )
}

function runSection(summary: string, body: HTMLElement, open = false): HTMLElement {
  const details = el('details', { class: 'rw-run-section' })
  if (open) details.open = true
  details.appendChild(el('summary', undefined, summary))
  details.appendChild(body)
  return details
}

export function renderRunBlock(model: RunsRunModel): HTMLElement {
  const article = el('article', {
    class: ['rw-run-block', 'rw-run-block', model.status === 'running' ? 'is-running' : ''].filter(Boolean).join(' '),
    dataset: { sessionId: model.sessionId, runId: model.id },
  })
  article.style.borderRadius = '0'
  article.style.boxShadow = 'none'
  article.appendChild(
    el(
      'div',
      { class: 'rw-run-row' },
      el(
        'div',
        { class: 'rw-run-row-main' },
        el(
          'div',
          { class: 'rw-run-row-top' },
          el('span', { class: `rw-run-status-dot rw-run-status-dot-${model.status}`, ariaLabel: `${model.statusLabel} status` }),
          el('span', { class: `rw-status-pill rw-status-${model.status}` }, model.statusLabel),
          el('div', { class: 'rw-run-title' }, model.title),
          model.restored ? el('span', { class: 'rw-run-note' }, 'RESTORED') : null
        ),
        el('div', { class: 'rw-run-row-command', title: model.commandLabel }, el('code', undefined, model.commandLabel)),
        el(
          'div',
          { class: 'rw-run-meta' },
          el('span', { class: 'rw-run-subtitle' }, model.locationLabel),
          ...model.summaryBits.map((bit) => el('span', undefined, bit)),
          model.originMessageId ? el('button', { class: 'rw-run-origin-link', dataset: { openMessage: model.originMessageId } }, 'From thread') : null
        )
      ),
      el('div', { class: 'rw-run-actions' }, ...model.actions.slice(0, 7).map((action) => actionButton({ ...action, className: 'rw-link-btn rw-run-action' })))
    )
  )
  if (model.alert) article.appendChild(el('div', { class: `rw-run-alert${model.alert.tone === 'subtle' ? ' subtle' : ''}` }, model.alert.text))
  const sections = el('div', { class: 'rw-run-sections' })
  sections.appendChild(runSection('Output', el('div', { class: 'rw-run-section-body' }, model.outputText ? el('pre', { class: 'rw-run-output-tail' }, model.outputText) : el('div', { class: 'rw-run-section-placeholder' }, model.outputPlaceholder)), model.status === 'running'))
  sections.appendChild(
    runSection(
      'Artifacts',
      el(
        'div',
        { class: 'rw-run-section-body rw-run-section-grid' },
        el('div', undefined, el('span', { class: 'rw-run-command-label' }, 'Run'), el('code', undefined, model.id)),
        el('div', undefined, el('span', { class: 'rw-run-command-label' }, 'Session'), el('code', undefined, model.sessionId)),
        el('div', undefined, el('span', { class: 'rw-run-command-label' }, 'Receipt'), el('code', undefined, model.receiptLabel)),
        el('div', undefined, el('span', { class: 'rw-run-command-label' }, 'Workspace'), el('code', undefined, model.locationLabel)),
        ...model.actions.filter((action) => action.dataset.runArtifacts).map(actionButton),
        renderArtifactSummary(model.artifactSummary)
      )
    )
  )
  sections.appendChild(runSection('Timings', el('div', { class: 'rw-run-section-body' }, renderProofKeyValueGrid(model.timings))))
  sections.appendChild(runSection('Actions', el('div', { class: 'rw-run-section-body rw-run-section-actions' }, ...model.actions.map(actionButton))))
  article.appendChild(sections)
  return article
}

export function mountRunsPanel(root: HTMLElement, content: HTMLElement): void {
  mount(root, content)
}
