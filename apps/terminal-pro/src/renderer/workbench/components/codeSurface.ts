import { el, mount } from '../dom.js'
import type { buildCodePanelViewModel } from '../view-models/codePanelModel.js'

export function mountCodePanelSurface(root: HTMLElement, model: ReturnType<typeof buildCodePanelViewModel>): void {
  if (model.isEmpty) {
    mount(root, el('div', { class: 'rw-empty-state rw-workbench-panel-empty' }, el('div', { class: 'rw-empty-title' }, 'No workspace files loaded'), el('div', { class: 'rw-empty-copy' }, 'Open a workspace and RinaWarp will show the files it is using for context.')))
    return
  }
  mount(root, el('div', { class: 'rw-workbench-panel-surface rw-workbench-panel-surface-code rw-workbench-panel-surface', dataset: { workbenchPanelType: 'code' } }, ...model.files.map((file) => el('div', { class: 'code-file rw-workbench-panel-card' }, file))))
}
