import type { FixBlockModel, WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'

function renderRiskBadge(step: FixBlockModel['steps'][number]): HTMLElement {
  return el('span', { class: `fix-badge ${step.risk === 'dangerous' ? 'danger' : step.risk === 'moderate' ? 'caution' : 'safe'}` }, step.risk)
}

function labeledCodeRow(label: string, value: string): HTMLElement {
  return el(
    'div',
    undefined,
    el('strong', undefined, `${label}:`),
    ' ',
    el('code', undefined, value)
  )
}

function renderFixStep(step: FixBlockModel['steps'][number], fixId: string, index: number): HTMLElement {
  return el(
    'div',
    { class: 'fix-step' },
    el(
      'div',
      { class: 'fix-step-head' },
      el('div', { class: 'fix-step-title' }, step.title || `Step ${index + 1}`),
      renderRiskBadge(step)
    ),
    el('div', { class: 'fix-step-command' }, el('code', undefined, step.command)),
    el(
      'div',
      { class: 'fix-block-row' },
      el('button', { class: 'fix-btn', dataset: { runStep: String(index), fixId } }, 'Run step')
    )
  )
}

function renderFixBlock(fix: FixBlockModel): HTMLElement {
  const body = el(
    'div',
    { class: 'fix-body' },
    el('div', undefined, el('div', { class: 'fix-label' }, 'What broke'), el('div', { class: 'fix-copy' }, fix.whatBroke)),
    el('div', undefined, el('div', { class: 'fix-label' }, 'Why this is safe'), el('div', { class: 'fix-copy' }, fix.whySafe)),
    el(
      'div',
      { class: 'fix-meta' },
      labeledCodeRow('Command', fix.command),
      labeledCodeRow('cwd', fix.cwd),
      labeledCodeRow('Receipt', fix.runId || fix.streamId),
      ...(fix.applyRunId ? [labeledCodeRow('Apply run', fix.applyRunId)] : [])
    ),
    el('div', undefined, el('div', { class: 'fix-label' }, 'Suggested actions'))
  )

  const actionsContainer = el('div')
  if (fix.steps.length > 0) {
    for (const [index, step] of fix.steps.entries()) {
      actionsContainer.appendChild(renderFixStep(step, fix.id, index))
    }
  } else {
    actionsContainer.appendChild(el('div', { class: 'fix-status-note' }, 'Planning runnable actions…'))
  }
  body.appendChild(actionsContainer)

  body.appendChild(
    el(
      'div',
      { class: 'fix-block-footer' },
      el(
        'button',
        { class: 'fix-btn primary fix-auto-apply', dataset: { fixId: fix.id }, disabled: fix.steps.length === 0 },
        'Auto-apply safe fix (Pro)'
      ),
      el('button', { class: 'fix-btn', dataset: { fixReveal: '', fixId: fix.id } }, 'Reveal receipt'),
      el('button', { class: 'fix-btn', dataset: { fixFolder: '' } }, 'Open runs folder'),
      el('button', { class: 'fix-btn', dataset: { fixProof: '', fixId: fix.id } }, 'Export proof'),
      el('button', { class: 'fix-btn', dataset: { fixReceipt: '', fixId: fix.id } }, 'Copy receipt ID')
    )
  )

  if (fix.status === 'running') {
    body.appendChild(el('div', { class: 'fix-status-note' }, 'Execution started. Wait for the run proof before treating this fix as done.'))
  }
  if (fix.error) {
    body.appendChild(el('div', { class: 'fix-result-note error' }, fix.error))
  }

  return el(
    'section',
    { class: 'fix-block', dataset: { fixId: fix.id } },
    el(
      'div',
      { class: 'fix-block-head' },
      el('div', { class: 'fix-block-title' }, 'Fix Block'),
      el('div', { class: `fix-badge ${fix.status === 'error' ? 'danger' : fix.status === 'planning' ? 'caution' : 'safe'}` }, fix.status.toUpperCase())
    ),
    body
  )
}

export function renderFixBlocks(state: WorkbenchState): void {
  const root = document.getElementById('agent-plan-container')
  if (!root) return
  const shell = el('div')
  for (const fix of state.fixBlocks.slice(0, 10)) {
    shell.appendChild(renderFixBlock(fix))
  }
  mount(root, shell)
}
