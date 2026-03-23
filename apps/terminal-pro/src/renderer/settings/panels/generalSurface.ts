import { buildGeneralPanelModel } from './generalModel.js'

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function renderGeneralPanel(workspaceLabel: string): string {
  const model = buildGeneralPanelModel(workspaceLabel)
  return `
    <div class="rw-panel-head">
      <h2>General</h2>
      <p class="rw-sub">App behavior and defaults.</p>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-settings-density">
        <div class="rw-settings-density-copy">
          <div class="rw-label">Density</div>
          <div class="rw-muted">Choose whether the app feels tighter or more relaxed.</div>
        </div>
        <div class="rw-settings-density-actions" role="group" aria-label="Density">
          ${model.densityOptions
            .map(
              (option) =>
                `<button type="button" class="rw-btn rw-btn-ghost" data-density-option="${esc(option.value)}">${esc(option.label)}</button>`
            )
            .join('')}
        </div>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Keyboard shortcuts</div>
          <div class="rw-muted">${esc(model.shortcutLabel)}</div>
        </div>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Safety mode</div>
          <div class="rw-muted">${esc(model.safetyLabel)}</div>
        </div>
      </div>
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Workspace</div>
          <div class="rw-muted" id="rw-general-workspace-path">${esc(model.workspaceLabel)}</div>
          <div class="rw-muted">Pick the folder Rina should use as the current workspace for runs, receipts, and code context.</div>
        </div>
        <button type="button" class="rw-btn rw-btn-primary" id="rw-general-pick-workspace">Choose workspace</button>
      </div>
      <div id="rw-general-workspace-status" class="rw-muted" aria-live="polite"></div>
    </div>
  `
}
