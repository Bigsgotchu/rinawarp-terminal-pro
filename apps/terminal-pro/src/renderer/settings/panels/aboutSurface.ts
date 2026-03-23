import { buildAboutPanelModel, type AboutUpdateState } from './aboutModel.js'

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function renderAboutPanel(version: string, updateState: AboutUpdateState | null): string {
  const model = buildAboutPanelModel(version, updateState)
  return `
    <div class="rw-panel-head">
      <h2>About</h2>
      <p class="rw-sub">${esc(model.productName)}</p>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div class="rw-label">Version</div>
        <div class="rw-pill">${esc(model.version)}</div>
      </div>
      <div class="rw-row">
        <div class="rw-muted">
          ${esc(model.productTagline)}
        </div>
      </div>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-space">
        <div class="rw-label">Updates</div>
        <div id="rw-update-status" class="rw-muted">${esc(model.updateStatusLabel)}</div>
      </div>
      <div class="rw-row rw-gap">
        <button id="rw-update-check" class="rw-btn">Check Now</button>
        <button id="rw-update-download" class="rw-btn rw-btn-ghost" ${model.canOpenDownload ? '' : 'disabled'}>Open Download</button>
        <button id="rw-update-install" class="rw-btn rw-btn-primary" ${model.canInstall ? '' : 'disabled'}>Install & Restart</button>
      </div>
      <div class="rw-row">
        <div id="rw-update-meta" class="rw-muted">Last checked: ${esc(model.lastCheckedLabel)}</div>
      </div>
    </div>
  `
}
