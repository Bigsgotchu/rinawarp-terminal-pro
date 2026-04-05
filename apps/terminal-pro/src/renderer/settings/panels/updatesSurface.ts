import {
  buildUpdatesConfigModel,
  buildUpdatesReleaseModel,
  buildUpdatesRuntimeModel,
  type ReleaseInfo,
  type UpdateConfig,
  type UpdateState,
} from './updatesModel.js'

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function badge(label: string, tone: 'ok' | 'bad' | 'muted'): string {
  const className = tone === 'ok' ? 'rw-ok' : tone === 'bad' ? 'rw-bad' : 'rw-muted'
  return `<span class="rw-badge ${className}">${esc(label)}</span>`
}

export function renderUpdatesPanelShell(): string {
  return `
    <div class="rw-panel-head">
      <h2>Updates & Trust</h2>
      <p class="rw-sub">Configure automatic updates where supported and keep the release story honest.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-gap">
        <button id="rw-updates-check" class="rw-btn">Check for Updates</button>
        <button id="rw-updates-install" class="rw-btn rw-btn-primary" disabled>Install & Restart</button>
        <button id="rw-updates-verify" class="rw-btn rw-btn-ghost">Verify Release</button>
        <button id="rw-updates-save" class="rw-btn">Save Settings</button>
        <div id="rw-updates-status" class="rw-muted"></div>
      </div>

      <div id="rw-updates-config"></div>
      <div id="rw-updates-runtime"></div>
      <div id="rw-updates-release"></div>
    </div>

    <div class="rw-card">
      <h3>How Updates Work</h3>
      <div class="rw-prose">
        <p>RinaWarp Terminal Pro supports real in-app updates on the install types we can prove today:</p>
        <ul>
          <li><strong>Windows NSIS</strong>: check, download, and install from the app</li>
          <li><strong>Linux AppImage</strong>: check, download, and apply on restart</li>
          <li><strong>Linux .deb</strong>: manual/package-manager update path</li>
          <li><strong>Beta / Alpha</strong>: preview channels check the public channel feed and open the matching download when an update is ready</li>
        </ul>
        <p>The release site publishes public manifests and checksums so the app and the website point to the same artifact truth.</p>
      </div>
    </div>
  `
}

export function renderUpdateConfig(config: UpdateConfig): string {
  const model = buildUpdatesConfigModel(config)
  return `
    <div class="rw-panel-section">
      <h3>Update Channel</h3>
      <div class="rw-radio-group">
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="stable" ${model.channel === 'stable' ? 'checked' : ''}>
          <span>Stable (Recommended)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="beta" ${model.channel === 'beta' ? 'checked' : ''}>
          <span>Beta (Early access)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="alpha" ${model.channel === 'alpha' ? 'checked' : ''}>
          <span>Alpha (Experimental)</span>
        </label>
      </div>
    </div>

    <div class="rw-panel-section">
      <h3>Auto-Update</h3>
      <div class="rw-kv"><div class="rw-k">Auto-check for updates</div><div class="rw-v"><input type="checkbox" id="rw-update-auto-check" ${model.autoCheck ? 'checked' : ''}></div></div>
      <div class="rw-kv"><div class="rw-k">Auto-download updates</div><div class="rw-v"><input type="checkbox" id="rw-update-auto-download" ${model.autoDownload ? 'checked' : ''}></div></div>
    </div>
  `
}

export function renderReleaseInfo(info: ReleaseInfo | null): string {
  const model = buildUpdatesReleaseModel(info)
  if (model.state === 'empty') {
    return `<div class="rw-muted">No release info available.</div>`
  }
  return `
    <div class="rw-panel-section">
      <h3>Current Release</h3>
      <div class="rw-kv"><div class="rw-k">Version</div><div class="rw-v">${esc(model.version)}</div></div>
      <div class="rw-kv"><div class="rw-k">Platform</div><div class="rw-v">${esc(model.platformLabel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Published</div><div class="rw-v">${esc(model.publishedLabel)}</div></div>
    </div>

    <div class="rw-panel-section">
      <h3>Trust & Verification</h3>
      <div class="rw-kv"><div class="rw-k">Installer trust</div><div class="rw-v">${badge(model.installerTrustLabel, model.installerTrustTone)}</div></div>
      <div class="rw-kv"><div class="rw-k">Release metadata</div><div class="rw-v">${badge(model.releaseMetadataLabel, model.releaseMetadataTone)}</div></div>
      ${model.verificationPath ? `<div class="rw-kv"><div class="rw-k">Verification path</div><div class="rw-v">${esc(model.verificationPath)}</div></div>` : ''}
    </div>
  `
}

export function renderRuntimeState(state: UpdateState | null): string {
  const model = buildUpdatesRuntimeModel(state)
  if (model.state === 'empty') {
    return `<div class="rw-panel-section"><div class="rw-muted">Not checked yet.</div></div>`
  }
  return `
    <div class="rw-panel-section">
      <h3>Runtime Status</h3>
      <div class="rw-kv"><div class="rw-k">Status</div><div class="rw-v">${esc(model.statusLabel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Channel</div><div class="rw-v">${esc(model.channel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Auto updates</div><div class="rw-v">${esc(model.autoUpdatesLabel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Current version</div><div class="rw-v">${esc(model.currentVersion)}</div></div>
      <div class="rw-kv"><div class="rw-k">Latest version</div><div class="rw-v">${esc(model.latestVersion)}</div></div>
      <div class="rw-kv"><div class="rw-k">Last checked</div><div class="rw-v">${esc(model.lastChecked)}</div></div>
      ${model.downloadLabel ? `<div class="rw-kv"><div class="rw-k">Download</div><div class="rw-v">${esc(model.downloadLabel)}</div></div>` : ''}
      ${model.note ? `<div class="rw-kv"><div class="rw-k">Note</div><div class="rw-v">${esc(model.note)}</div></div>` : ''}
    </div>
  `
}
