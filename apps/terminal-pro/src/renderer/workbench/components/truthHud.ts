import { el } from '../dom.js'
import { getTruthHudState } from '../renderers/selectors.js'
import type { WorkbenchState } from '../types.js'

export function renderTruthHud(state: WorkbenchState): HTMLElement {
  const truth = getTruthHudState(state)
  const workspaceLabel = truth.workspaceRoot === '__none__' ? 'No workspace' : truth.workspaceRoot

  const hud = el('div', {
    class: 'rw-truth-hud',
    role: 'status',
    'aria-label': 'Execution truth',
    dataset: { testid: 'truth-hud' },
  })

  const primary = el('div', { class: 'rw-truth-group' })
  primary.appendChild(el('span', { class: 'rw-truth-group-label' }, 'Truth'))
  primary.appendChild(
    el(
      'div',
      { class: 'rw-truth-chip rw-truth-chip-workspace' },
      el('span', undefined, 'Workspace'),
      el('code', { title: workspaceLabel }, workspaceLabel),
    ),
  )
  primary.appendChild(
    el('div', { class: 'rw-truth-chip' }, el('span', undefined, 'Mode'), el('code', undefined, truth.mode)),
  )
  primary.appendChild(
    el(
      'div',
      { class: 'rw-truth-chip' },
      el('span', undefined, 'Runtime'),
      el('code', undefined, state.runtime.ipcCanonicalReady ? 'connected' : 'pending'),
    ),
  )
  primary.appendChild(
    el(
      'div',
      { class: 'rw-truth-chip' },
      el('span', undefined, 'Last run'),
      el('code', undefined, truth.lastRunStatus ? `${truth.lastRunStatus}${truth.lastExitCode != null ? ` · ${truth.lastExitCode}` : ''}` : 'none'),
    ),
  )
  primary.appendChild(
    el('div', { class: 'rw-truth-chip' }, el('span', undefined, 'Path'), el('code', undefined, 'canonical')),
  )

  const dev = el('div', { class: 'rw-truth-group rw-truth-group-dev' })
  dev.appendChild(el('span', { class: 'rw-truth-group-label' }, 'Dev'))
  dev.appendChild(
    el('div', { class: 'rw-truth-chip rw-truth-chip-dev' }, el('span', undefined, 'IPC'), el('code', undefined, truth.ipcState)),
  )
  dev.appendChild(
    el(
      'div',
      { class: 'rw-truth-chip rw-truth-chip-dev' },
      el('span', undefined, 'Renderer'),
      el('code', undefined, truth.rendererState),
    ),
  )

  hud.appendChild(primary)
  hud.appendChild(dev)
  return hud
}
